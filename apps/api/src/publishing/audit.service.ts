import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../prisma/prisma-client';
import type { Actor } from './common';
export function auditData(actor: Actor, action: string, resourceType: string, resourceId?: string, success = true, metadata?: Prisma.InputJsonValue) {
  return { actorType:actor.type,actorId:actor.id,apiKeyId:actor.apiKeyId,correlationId:actor.correlationId,action,resourceType,resourceId,success,metadata };
}
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly prisma: PrismaService) {}
  async record(actor: Actor, action: string, resourceType: string, resourceId?: string, success = true, metadata?: Prisma.InputJsonValue) {
    await this.prisma.auditEvent.create({data:auditData(actor,action,resourceType,resourceId,success,metadata)});
    this.logger.log(`${action} ${success ? 'success':'failure'} correlation=${actor.correlationId}`);
  }
}
@Global()
@Module({providers:[AuditService],exports:[AuditService]})
export class AuditModule {}
