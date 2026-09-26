import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from './prisma.service';
@Controller('health')
export class ReadinessController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @Header('Cache-Control', 'no-store')
  async health() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'down';
    }
    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('live')
  @Header('Cache-Control', 'no-store')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
