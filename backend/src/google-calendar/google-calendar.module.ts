import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';

@Module({
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService, PrismaService],
})
export class GoogleCalendarModule {}
