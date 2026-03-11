import { Controller, Post, Body, Get, Patch, Param, Delete } from '@nestjs/common';
import { DeadlinesService } from './deadlines.service';

@Controller('deadlines')
export class DeadlinesController {
  constructor(private deadlinesService: DeadlinesService) {}

  @Post()
  create(@Body() data: any) {
    return this.deadlinesService.create(data);
  }

  @Get()
  findAll() {
    return this.deadlinesService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.deadlinesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deadlinesService.remove(id);
  }
}
