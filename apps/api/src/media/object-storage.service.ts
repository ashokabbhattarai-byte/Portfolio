import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from '../storage/storage.service';
import { fail } from '../publishing/common';
export interface ObjectStorage { upload(key:string,bytes:Buffer,mimeType:string):Promise<string>; delete(key:string):Promise<void>; getPublicUrl(key:string):string; }
@Injectable()
export class ObjectStorageService implements ObjectStorage {
  readonly provider:string;
  private readonly s3?:S3Client;
  constructor(private readonly config:ConfigService,private readonly legacy:StorageService) {
    this.provider=config.get('MEDIA_STORAGE_PROVIDER') || 'supabase';
    if(this.provider==='s3' && config.get('S3_ACCESS_KEY_ID') && config.get('S3_SECRET_ACCESS_KEY')) this.s3=new S3Client({endpoint:config.get('S3_ENDPOINT'),region:config.get('S3_REGION')||'auto',forcePathStyle:config.get('S3_FORCE_PATH_STYLE')==='true',credentials:{accessKeyId:config.getOrThrow('S3_ACCESS_KEY_ID'),secretAccessKey:config.getOrThrow('S3_SECRET_ACCESS_KEY')}});
  }
  configured(){return this.provider==='supabase' ? this.legacy.isEnabled():!!(this.s3&&this.config.get('S3_BUCKET')&&this.config.get('MEDIA_PUBLIC_URL'));}
  private key(key:string){if(!/^media\/[a-zA-Z0-9_-]+\.webp$/.test(key)) fail('INVALID_OBJECT_KEY','Invalid media object key.');}
  getPublicUrl(key:string){this.key(key);return this.provider==='supabase'?this.legacy.getPublicUrl(key):`${this.config.getOrThrow<string>('MEDIA_PUBLIC_URL').replace(/\/$/,'')}/${key}`;}
  async upload(key:string,bytes:Buffer,mimeType:string) {
    this.key(key);if(!this.configured()) fail('STORAGE_NOT_CONFIGURED','Media storage is not configured.',503);
    if(this.provider==='supabase') return (await this.legacy.upload(key,bytes,mimeType)).publicUrl;
    await this.s3!.send(new PutObjectCommand({Bucket:this.config.getOrThrow('S3_BUCKET'),Key:key,Body:bytes,ContentType:mimeType,CacheControl:'public, max-age=31536000, immutable'}));
    return this.getPublicUrl(key);
  }
  async delete(key:string){this.key(key);if(this.provider==='supabase')return this.legacy.remove([key]);if(!this.s3)fail('STORAGE_NOT_CONFIGURED','Media storage is not configured.',503);await this.s3.send(new DeleteObjectCommand({Bucket:this.config.getOrThrow('S3_BUCKET'),Key:key}));}
}
