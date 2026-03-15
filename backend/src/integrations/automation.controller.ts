import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { LeadsService } from '../leads/leads.service';
import { AutomationLeadDto } from './dto/automation-lead.dto';

@Controller('automation')
@UseGuards(ApiKeyGuard)
export class AutomationController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('lead')
  async createLead(
    @Body() data: AutomationLeadDto,
    @Headers('x-office-id') headerOfficeId?: string,
  ) {
    const officeId = headerOfficeId ?? data.officeId;
    if (!officeId) {
      throw new BadRequestException(
        'officeId is required (x-office-id header or officeId field)',
      );
    }

    const lead = await this.leadsService.create(
      {
        name: data.name,
        phone: data.phone,
        email: data.email,
        source: data.source ?? 'N8N',
        classification: data.classification,
        notes: data.notes,
      },
      officeId,
    );

    return {
      ok: true,
      id: lead.id,
      code: lead.code,
      officeId: lead.officeId,
    };
  }
}
