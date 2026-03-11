import { Module } from '@nestjs/common';
import { KanbanController } from './kanban.controller';
import { KanbanService } from './kanban.service';
import { PrismaService } from '../prisma/prisma.service';
import { TrelloService } from '../integrations/trello.service';

@Module({
  controllers: [KanbanController],
  providers: [KanbanService, PrismaService, TrelloService],
})
export class KanbanModule {}
