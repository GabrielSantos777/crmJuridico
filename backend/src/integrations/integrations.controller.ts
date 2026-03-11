import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { ApiKeyGuard } from './api-key.guard';
import { WhatsappMessageDto } from './dto/whatsapp-message.dto';
import { TriageDto } from './dto/triage.dto';
import { CreateAppointmentDto } from './dto/appointment.dto';

@Controller('integrations')
@UseGuards(ApiKeyGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('whatsapp/message')
  registerMessage(@Body() data: WhatsappMessageDto) {
    return this.integrationsService.registerWhatsappMessage(data);
  }

  @Post('whatsapp/close')
  closeConversation(@Body() data: { phone: string }) {
    return this.integrationsService.closeConversation(data.phone);
  }

  @Post('triage')
  triage(@Body() data: TriageDto) {
    return this.integrationsService.triageLead(data);
  }

  @Get('client-by-phone')
  findClientOrLead(@Query('phone') phone: string) {
    return this.integrationsService.findClientOrLeadByPhone(phone);
  }

  @Get('process/latest-by-client')
  latestByClient(@Query('clientCode') clientCode: string) {
    return this.integrationsService.getLatestProcessUpdateByClientCode(
      clientCode,
    );
  }

  @Get('process/latest-by-phone')
  latestByPhone(@Query('phone') phone: string) {
    return this.integrationsService.getLatestProcessUpdateByPhone(phone);
  }

  @Get('appointments/availability')
  availability(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('durationMinutes') durationMinutes?: string,
    @Query('workStart') workStart?: string,
    @Query('workEnd') workEnd?: string,
    @Query('intervalMinutes') intervalMinutes?: string,
  ) {
    const parsedFrom = new Date(from);
    const parsedTo = new Date(to);
    return this.integrationsService.listAvailability({
      from: parsedFrom,
      to: parsedTo,
      durationMinutes: Number(durationMinutes ?? 30),
      workStart: workStart ?? '09:00',
      workEnd: workEnd ?? '18:00',
      intervalMinutes: Number(intervalMinutes ?? durationMinutes ?? 30),
    });
  }

  @Get('appointments')
  listAppointments(@Query('from') from: string, @Query('to') to: string) {
    return this.integrationsService.listAppointments(new Date(from), new Date(to));
  }

  @Post('appointments')
  createAppointment(@Body() data: CreateAppointmentDto) {
    return this.integrationsService.createAppointment(data);
  }
}
