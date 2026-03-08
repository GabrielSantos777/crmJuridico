import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { ProcessesService } from './processes.service';

@Controller('processes')
export class ProcessesController {
  constructor(private processesService: ProcessesService) {}

  @Post()
  create(@Body() data: any) {
    return this.processesService.create(data);
  }

  @Post(':id/events')
  addEvent(@Param('id') id: string, @Body('description') description: string) {
    return this.processesService.addEvent(id, description);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.processesService.findOne(id);
  }
  @Get()
  findAll() {
    return this.processesService.findAll();
  }
}
