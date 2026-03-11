import { Module } from '@nestjs/common';
import { DeadlinesController } from './deadlines.controller';
import { DeadlinesService } from './deadlines.service';
import { PrismaService } from '../prisma/prisma.service';
import { TrelloService } from '../integrations/trello.service';

@Module({
  controllers: [DeadlinesController],
  providers: [DeadlinesService, PrismaService, TrelloService],
})
export class DeadlinesModule {}
