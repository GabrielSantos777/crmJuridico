import { Controller, Post, Body, Get, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { DeadlinesService } from './deadlines.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OfficeGuard } from '../auth/office.guard';

@Controller('deadlines')
@UseGuards(JwtAuthGuard, OfficeGuard)
export class DeadlinesController {
  constructor(private deadlinesService: DeadlinesService) {}

  @Post()
  create(@Body() data: any, @Request() req) {
    return this.deadlinesService.create(data, req.user.officeId);
  }

  @Get()
  findAll(@Request() req) {
    return this.deadlinesService.findAll(req.user.officeId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.deadlinesService.update(id, data, req.user.officeId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.deadlinesService.remove(id, req.user.officeId);
  }
}
