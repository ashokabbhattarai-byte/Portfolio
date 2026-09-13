import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../prisma/prisma-client';
import { ObjectStorageService } from './object-storage.service';
import { optimizeImage } from './image-pipeline';
import { Actor, fail } from '../publishing/common';
import { auditData } from '../publishing/audit.service';
import { PageQuery } from '../publishing/query.dto';
import { MediaMetadataDto } from './media.dto';
@Injectable()
export class MediaService {
  private readonly logger=new Logger(MediaService.name);
  constructor(private readonly prisma:PrismaService,private readonly storage:ObjectStorageService) {}
  async upload(bytes:Buffer,filename:string,actor:Actor,meta:MediaMetadataDto={},generation?:{provider:string;model:string;prompt:string;purpose:string}) {
    const image=await optimizeImage(bytes);const key=`media/${randomUUID()}.webp`;
    let uploaded=false;
    try {
      const url=await this.storage.upload(key,image.bytes,image.mimeType);uploaded=true;
      return await this.prisma.$transaction(async tx=>{
        const asset=await tx.mediaAsset.create({data:{filename:key.split('/')[1],originalFilename:filename.replace(/[^\p{L}\p{N}._ -]/gu,'-').slice(0,200)||'image',mimeType:image.mimeType,width:image.width,height:image.height,size:image.bytes.length,provider:this.storage.provider,objectKey:key,url,alt:meta.alt??'',caption:meta.caption??'',source:generation?'AI_GENERATED':actor.type==='AI_API_KEY'?'AI_UPLOAD':'ADMIN_UPLOAD',uploadedBy:actor.id,generatedByAI:!!generation,aiProvider:generation?.provider,aiModel:generation?.model,prompt:generation?.prompt,purpose:generation?.purpose}});
        await tx.auditEvent.create({data:auditData(actor,generation?'MEDIA_GENERATED':'MEDIA_UPLOADED','MEDIA',asset.id)});
        return asset;
      });
    }catch{if(uploaded)await this.storage.delete(key).catch(()=>this.logger.error('Orphaned media cleanup failed.'));fail('MEDIA_UPLOAD_FAILED','The image could not be saved. Your article has not been changed.',503);}
  }
  async list(q:PageQuery) {
    const where:Prisma.MediaAssetWhereInput={deletedAt:null,...(q.search?{OR:[{originalFilename:{contains:q.search,mode:'insensitive'}},{alt:{contains:q.search,mode:'insensitive'}}]}:{})};
    const [rows,total]=await this.prisma.$transaction([this.prisma.mediaAsset.findMany({where,orderBy:{createdAt:'desc'},skip:(q.page-1)*q.limit,take:q.limit,include:{_count:{select:{featuredBlogs:true,ogBlogs:true,inlineBlogs:true}}}}),this.prisma.mediaAsset.count({where})]);
    return {items:rows.map(({_count,...row})=>({...row,used:Object.values(_count).some(n=>n>0)})),total,page:q.page,limit:q.limit};
  }
  async update(id:string,dto:MediaMetadataDto,actor:Actor){
    return this.prisma.$transaction(async tx=>{const row=await tx.mediaAsset.findFirst({where:{id,deletedAt:null}});if(!row)fail('MEDIA_NOT_FOUND','Image not found.',404);const updated=await tx.mediaAsset.update({where:{id},data:{alt:dto.alt,caption:dto.caption}});await tx.auditEvent.create({data:auditData(actor,'MEDIA_UPDATED','MEDIA',id)});return updated;});
  }
  async remove(id:string,actor:Actor) {
    const asset=await this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM media_assets WHERE id=${id} FOR UPDATE`;
      const row=await tx.mediaAsset.findFirst({where:{id,deletedAt:null}});if(!row)fail('MEDIA_NOT_FOUND','Image not found.',404);
      const used=await tx.blog.count({where:{OR:[{featuredImageId:id},{ogImageId:id},{inlineMedia:{some:{id}}},{content:{contains:row.url}},{coverImage:row.url},{images:{some:{url:row.url}}}]}});
      if(used)fail('MEDIA_IN_USE','This image is used by an article. Remove its references before deleting it.',409);
      await tx.mediaAsset.update({where:{id},data:{deletedAt:new Date()}});return row;
    });
    try {if(asset.provider!==this.storage.provider)fail('STORAGE_PROVIDER_MISMATCH','Switch storage to the asset’s provider before deleting it.');await this.storage.delete(asset.objectKey);}
    catch(error){await this.prisma.mediaAsset.update({where:{id},data:{deletedAt:null}});throw error;}
    await this.prisma.auditEvent.create({data:auditData(actor,'MEDIA_DELETED','MEDIA',id)});
    return {deleted:true};
  }
}
