import { Body, Controller, Get, Post, UseGuards, Patch, Param, Delete } from '@nestjs/common';
import { OfficesService } from './offices.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('offices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfficesController {
  constructor(private officesService: OfficesService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  list() {
    return this.officesService.list();
  }

  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() body: any) {
    return this.officesService.create(body);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  update(@Param('id') id: string, @Body() body: any) {
    return this.officesService.update(id, body);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.officesService.remove(id);
  }
}
