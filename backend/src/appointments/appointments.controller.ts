import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OfficeGuard } from '../auth/office.guard';

@Controller('appointments')
@UseGuards(JwtAuthGuard, OfficeGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  list(
    @Request() req,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.appointmentsService.list({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      status,
      type,
      officeId: req.user.officeId,
    });
  }

  @Get('upcoming')
  upcoming(@Request() req, @Query('limit') limit?: string) {
    return this.appointmentsService.upcoming(req.user.officeId, Number(limit ?? 5));
  }

  @Get('available')
  available(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
    return this.appointmentsService.listAvailable(
      req.user.officeId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Post()
  create(@Body() data: CreateAppointmentDto, @Request() req) {
    return this.appointmentsService.create(data, req.user.officeId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateAppointmentDto, @Request() req) {
    return this.appointmentsService.update(id, data, req.user.officeId);
  }

  @Post(':id/book')
  book(@Param('id') id: string, @Body() data: UpdateAppointmentDto, @Request() req) {
    return this.appointmentsService.book(id, data, req.user.officeId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.appointmentsService.remove(id, req.user.officeId);
  }
}
