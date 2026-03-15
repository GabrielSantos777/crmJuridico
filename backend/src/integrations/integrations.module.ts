import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyGuard } from './api-key.guard';
import { AutomationController } from './automation.controller';
import { LeadsService } from '../leads/leads.service';

@Module({
  controllers: [IntegrationsController, AutomationController],
  providers: [IntegrationsService, PrismaService, ApiKeyGuard, LeadsService],
})
export class IntegrationsModule {}
