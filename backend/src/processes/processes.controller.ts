import { Controller, Post, Body, Param, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OfficeGuard } from '../auth/office.guard';

@Controller('processes')
@UseGuards(JwtAuthGuard, OfficeGuard)
export class ProcessesController {
  constructor(private processesService: ProcessesService) {}

  @Post()
  create(@Body() data: any, @Request() req) {
    return this.processesService.create(data, req.user.officeId);
  }

  @Post(':code/events')
  addEvent(
    @Param('code') code: string,
    @Body('description') description: string,
    @Request() req,
  ) {
    return this.processesService.addEvent(code, description, req.user.officeId);
  }

  @Get()
  findAll(@Request() req) {
    return this.processesService.findAll(req.user.officeId);
  }

  @Get('cnj/:number')
  async getFromCNJ(@Param('number') number: string, @Request() req) {
    return this.processesService.syncFromCNJ(number, req.user.officeId);
  }

  @Post('import')
  importFromCnj(@Body() body: { number: string; clientCode: string }, @Request() req) {
    return this.processesService.importFromCNJ(body.number, body.clientCode, req.user.officeId);
  }

  @Get('search/oab')
  searchByOab(@Query('value') oab: string, @Request() req) {
    return this.processesService.searchByOab(oab, req.user.officeId);
  }

  @Post('import/oab')
  importByOab(
    @Body() body: { oab: string; clientCode: string; limit?: number },
    @Request() req,
  ) {
    return this.processesService.importByOab(
      body.oab,
      body.clientCode,
      req.user.officeId,
      body.limit,
    );
  }

  @Get('client/:clientCode/summary')
  findByClientCode(@Param('clientCode') clientCode: string, @Request() req) {
    return this.processesService.findByClientCode(clientCode, req.user.officeId);
  }

  @Get(':code')
  findOne(@Param('code') code: string, @Request() req) {
    return this.processesService.findOne(code, req.user.officeId);
  }
}
