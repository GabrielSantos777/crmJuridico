import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, PrismaService, ApiKeyGuard],
})
export class IntegrationsModule {}
