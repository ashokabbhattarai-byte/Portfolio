import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { actorFrom, type PublisherRequest } from './common';
import { CreateKeyDto, RotateKeyDto } from './publisher-keys.dto';
import { PublisherKeysService } from './publisher-keys.service';
import { SCOPES, SCOPE_DESCRIPTIONS } from './scopes';
import { AdminPageQuery } from '../common/admin-page.dto';

/** Admin-only. Issuing a key is an ADMIN action specifically — an EDITOR who
 *  could mint a key could grant themselves publish rights they do not have. */
@Controller('publisher-keys')
@Roles('ADMIN')
export class PublisherKeysController {
  constructor(private readonly keys: PublisherKeysService) {}

  @Get('scopes')
  scopes() {
    return SCOPES.map((scope) => ({
      scope,
      description: SCOPE_DESCRIPTIONS[scope],
    }));
  }

  @Get()
  list() {
    return this.keys.list();
  }

  @Get('search')
  search(@Query() query: AdminPageQuery) {
    return this.keys.search(query);
  }

  /** The only response that ever contains a usable key. */
  @Post()
  create(@Body() dto: CreateKeyDto, @Req() req: PublisherRequest) {
    return this.keys.create(dto, actorFrom(req));
  }

  @Post(':id/rotate')
  rotate(
    @Param('id') id: string,
    @Body() dto: RotateKeyDto,
    @Req() req: PublisherRequest,
  ) {
    return this.keys.rotate(id, dto, actorFrom(req));
  }

  @Delete(':id')
  revoke(@Param('id') id: string, @Req() req: PublisherRequest) {
    return this.keys.revoke(id, actorFrom(req));
  }
}
