import { Query } from '@nestjs/common';
import { AdminPageQuery } from '../common/admin-page.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { EducationService } from './education.service';

@Controller('education')
export class EducationController {
  constructor(private readonly education: EducationService) {}

  @Get('admin/search')
  @Roles('ADMIN', 'EDITOR')
  search(@Query() query: AdminPageQuery) {
    return this.education.search(query);
  }

  @Public()
  @Get()
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  list() {
    return this.education.list();
  }

  @Public()
  @Get(':id')
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  get(@Param('id') id: string) {
    return this.education.get(id);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  create(@Body() dto: CreateEducationDto) {
    return this.education.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  update(@Param('id') id: string, @Body() dto: UpdateEducationDto) {
    return this.education.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'EDITOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.education.remove(id);
  }
}
