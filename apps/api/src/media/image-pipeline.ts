import sharp from 'sharp';
import { fail } from '../publishing/common';
export const MAX_IMAGE_BYTES=8*1024*1024;
sharp.concurrency(2);
let processing=0;
export async function optimizeImage(bytes:Buffer) {
  if(!bytes.length || bytes.length>MAX_IMAGE_BYTES) fail('IMAGE_TOO_LARGE','Upload an image smaller than 8 MiB.',413);
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  const avif=bytes.toString('ascii',4,8)==='ftyp'&&['avif','avis'].includes(bytes.toString('ascii',8,12));
  if(!png&&!jpg&&!webp&&!avif) fail('UNSUPPORTED_FILE_TYPE','Use a PNG, JPEG, WebP, or AVIF image. SVG and executable content are not accepted.');
  if(processing>=4) fail('RATE_LIMIT_EXCEEDED','Image processing is busy. Retry shortly.',429);
  processing++;
  try {
    const image=sharp(bytes,{limitInputPixels:24000000,failOn:'warning'});
    const metadata=await image.metadata();
    if(!metadata.width||!metadata.height||(metadata.pages??1)>1) fail('UNSUPPORTED_FILE_TYPE','Use a single-frame image.');
    const result=await image.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85,effort:4}).toBuffer({resolveWithObject:true});
    return {bytes:result.data,width:result.info.width,height:result.info.height,mimeType:'image/webp'};
  }catch(error){if(error && typeof error==='object' && 'getStatus' in error)throw error;fail('INVALID_IMAGE','The file could not be decoded safely. Use a valid image up to 24 megapixels.');}
  finally{processing--;}
}
