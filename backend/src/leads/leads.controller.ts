import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OfficeGuard } from '../auth/office.guard';

@Controller('leads')
@UseGuards(JwtAuthGuard, OfficeGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() data: CreateLeadDto, @Request() req) {
    return this.leadsService.create(data, req.user.officeId);
  }

  @Get()
  findAll(@Request() req, @Query('q') q?: string) {
    return this.leadsService.findAll(req.user.officeId, q);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.leadsService.findOne(id, req.user.officeId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateLeadDto, @Request() req) {
    return this.leadsService.update(id, data, req.user.officeId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.leadsService.remove(id, req.user.officeId);
  }

  @Post(':code/convert')
  convert(@Param('code') code: string, @Request() req) {
    return this.leadsService.convertToClient(code, req.user.officeId);
  }
}
