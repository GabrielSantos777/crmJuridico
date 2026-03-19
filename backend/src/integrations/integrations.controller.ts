import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { ApiKeyGuard } from './api-key.guard';
import { WhatsappMessageDto } from './dto/whatsapp-message.dto';
import { TriageDto } from './dto/triage.dto';
import { CreateAppointmentDto } from './dto/appointment.dto';
import { UploadClientFileDto } from './dto/upload-client-file.dto';

@Controller('integrations')
@UseGuards(ApiKeyGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  private resolveOfficeId(headerOfficeId?: string, bodyOfficeId?: string, queryOfficeId?: string) {
    const officeId = headerOfficeId ?? bodyOfficeId ?? queryOfficeId
    if (!officeId) {
      throw new BadRequestException('officeId is required (x-office-id header or officeId field)')
    }
    return officeId
  }

  @Post('whatsapp/message')
  registerMessage(@Body() data: WhatsappMessageDto & { officeId?: string }, @Headers('x-office-id') officeId?: string) {
    const resolved = this.resolveOfficeId(officeId, data.officeId);
    return this.integrationsService.registerWhatsappMessage(data, resolved);
  }

  @Post('whatsapp/close')
  closeConversation(@Body() data: { phone: string; officeId?: string }, @Headers('x-office-id') officeId?: string) {
    const resolved = this.resolveOfficeId(officeId, data.officeId);
    return this.integrationsService.closeConversation(data.phone, resolved);
  }

  @Post('triage')
  triage(@Body() data: TriageDto & { officeId?: string }, @Headers('x-office-id') officeId?: string) {
    const resolved = this.resolveOfficeId(officeId, data.officeId);
    return this.integrationsService.triageLead(data, resolved);
  }

  @Get('client-by-phone')
  findClientOrLead(@Query('phone') phone: string, @Query('officeId') officeId: string, @Headers('x-office-id') headerOfficeId?: string) {
    const resolved = this.resolveOfficeId(headerOfficeId, undefined, officeId);
    return this.integrationsService.findClientOrLeadByPhone(phone, resolved);
  }

  @Get('process/latest-by-client')
  latestByClient(@Query('clientCode') clientCode: string, @Query('officeId') officeId: string, @Headers('x-office-id') headerOfficeId?: string) {
    const resolved = this.resolveOfficeId(headerOfficeId, undefined, officeId);
    return this.integrationsService.getLatestProcessUpdateByClientCode(
      clientCode,
      resolved,
    );
  }

  @Get('process/latest-by-phone')
  latestByPhone(@Query('phone') phone: string, @Query('officeId') officeId: string, @Headers('x-office-id') headerOfficeId?: string) {
    const resolved = this.resolveOfficeId(headerOfficeId, undefined, officeId);
    return this.integrationsService.getLatestProcessUpdateByPhone(phone, resolved);
  }

  @Get('process/summaries-by-client')
  summariesByClient(@Query('clientCode') clientCode: string, @Query('officeId') officeId: string, @Headers('x-office-id') headerOfficeId?: string) {
    const resolved = this.resolveOfficeId(headerOfficeId, undefined, officeId);
    return this.integrationsService.getProcessSummariesByClientCode(clientCode, resolved);
  }

  @Get('process/summaries-by-phone')
  summariesByPhone(@Query('phone') phone: string, @Query('officeId') officeId: string, @Headers('x-office-id') headerOfficeId?: string) {
    const resolved = this.resolveOfficeId(headerOfficeId, undefined, officeId);
    return this.integrationsService.getProcessSummariesByPhone(phone, resolved);
  }

  @Get('appointments/availability')
  availability(
    @Query('officeId') officeId?: string,
    @Headers('x-office-id') headerOfficeId?: string,
  ) {
    const resolved = this.resolveOfficeId(headerOfficeId, undefined, officeId);
    return this.integrationsService.listAvailability({ officeId: resolved });
  }

  @Get('appointments')
  listAppointments(@Query('from') from: string, @Query('to') to: string, @Query('officeId') officeId: string, @Headers('x-office-id') headerOfficeId?: string) {
    const resolved = this.resolveOfficeId(headerOfficeId, undefined, officeId);
    return this.integrationsService.listAppointments(new Date(from), new Date(to), resolved);
  }

  @Post('appointments')
  createAppointment(@Body() data: CreateAppointmentDto & { officeId?: string }, @Headers('x-office-id') officeId?: string) {
    const resolved = this.resolveOfficeId(officeId, data.officeId);
    return this.integrationsService.createAppointment(data, resolved);
  }

  @Post('client-file')
  uploadClientFile(@Body() data: UploadClientFileDto, @Headers('x-office-id') officeId?: string) {
    const resolved = this.resolveOfficeId(officeId, data.officeId);
    return this.integrationsService.uploadClientFile(data, resolved);
  }
}
