import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  list(
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
    });
  }

  @Get('upcoming')
  upcoming(@Query('limit') limit?: string) {
    return this.appointmentsService.upcoming(Number(limit ?? 5));
  }

  @Get('available')
  available(@Query('from') from?: string, @Query('to') to?: string) {
    return this.appointmentsService.listAvailable(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Post()
  create(@Body() data: CreateAppointmentDto) {
    return this.appointmentsService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, data);
  }

  @Post(':id/book')
  book(@Param('id') id: string, @Body() data: UpdateAppointmentDto) {
    return this.appointmentsService.book(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}
