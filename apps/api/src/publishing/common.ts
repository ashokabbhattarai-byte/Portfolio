import { HttpException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { AuthUser } from '@portfolio/types';
export type Actor = { type: 'ADMIN' | 'AI_API_KEY' | 'SYSTEM'; id: string; correlationId: string; apiKeyId?: string };
export type PublisherRequest = Request & { user?: AuthUser; publisher?: { id: string; scopes: string[] }; correlationId?: string };
export const systemActor = (): Actor => ({type:'SYSTEM',id:'scheduler',correlationId:randomUUID()});
export function actorFrom(req: PublisherRequest): Actor {
  return {type:req.publisher ? 'AI_API_KEY':'ADMIN', id:req.publisher?.id ?? req.user?.id ?? 'unknown', apiKeyId:req.publisher?.id,correlationId:req.correlationId ?? randomUUID()};
}
export function fail(code: string, message: string, status = 400): never {
  throw new HttpException({message,error:{code,message}},status);
}
export const slugify = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120);
export function canonicalJson(value: unknown): string {
  if(Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if(value && typeof value === 'object') return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
