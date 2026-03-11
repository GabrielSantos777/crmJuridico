import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { ProcessesService } from './processes.service';

@Controller('processes')
export class ProcessesController {
  constructor(private processesService: ProcessesService) {}

  @Post()
  create(@Body() data: any) {
    return this.processesService.create(data);
  }

  @Post(':code/events')
  addEvent(
    @Param('code') code: string,
    @Body('description') description: string,
  ) {
    return this.processesService.addEvent(code, description);
  }

  @Get()
  findAll() {
    return this.processesService.findAll();
  }

  @Get('cnj/:number')
  async getFromCNJ(@Param('number') number: string) {
    return this.processesService.syncFromCNJ(number);
  }

  @Post('import')
  importFromCnj(@Body() body: { number: string; clientCode: string }) {
    return this.processesService.importFromCNJ(body.number, body.clientCode);
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.processesService.findOne(code);
  }
}
