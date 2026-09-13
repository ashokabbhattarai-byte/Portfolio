import { ReadinessController } from './readiness.controller';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseExceptionFilter } from './database-exception.filter';
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  controllers: [ReadinessController],
  providers: [
    PrismaService,
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
