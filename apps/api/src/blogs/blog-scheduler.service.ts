import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlogsService } from './blogs.service';
import { AuditService } from '../publishing/audit.service';
import { systemActor } from '../publishing/common';
@Injectable()
export class BlogScheduler implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running=false;
  private readonly logger=new Logger(BlogScheduler.name);
  constructor(private readonly blogs:BlogsService,private readonly config:ConfigService,private readonly audit:AuditService) {}
  onModuleInit() {
    if(this.config.get('BLOG_SCHEDULER_ENABLED')==='false') return;
    const interval=Math.max(5000,Number(this.config.get('BLOG_SCHEDULER_INTERVAL_MS')||15000));
    this.timer=setInterval(()=>void this.tick(),Number.isFinite(interval)?interval:15000);this.timer.unref();void this.tick();
  }
  async tick() {
    if(this.running) return;this.running=true;
    try {const count=await this.blogs.publishDue();if(count) this.logger.log(`Published ${count} scheduled article(s).`);}
    catch {this.logger.error('Scheduled publishing failed; the next tick will retry.');await this.audit.record(systemActor(),'SCHEDULER_FAILED','BLOG',undefined,false).catch(()=>this.logger.error('Scheduler failure audit unavailable.'));}
    finally{this.running=false;}
  }
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
}
