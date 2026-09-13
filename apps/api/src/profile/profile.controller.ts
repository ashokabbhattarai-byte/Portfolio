import { Body, Controller, Get, Header, Patch } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Public()
  @Get()
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  get() {
    return this.profile.get();
  }

  @Patch()
  @Roles('ADMIN', 'EDITOR')
  update(@Body() dto: UpdateProfileDto) {
    return this.profile.update(dto);
  }
}
