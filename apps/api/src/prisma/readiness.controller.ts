import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from './prisma.service';
@Controller('health')
export class ReadinessController {
  constructor(private readonly prisma: PrismaService) {}
  @Public()
  @Get('live')
  @Header('Cache-Control', 'no-store')
  live() {
    return { status: 'ok' };
  }
  @Public()
  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
