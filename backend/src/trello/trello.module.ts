import { Module } from '@nestjs/common';
import { TrelloController } from './trello.controller';
import { TrelloService } from '../integrations/trello.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TrelloController],
  providers: [TrelloService, PrismaService],
})
export class TrelloModule {}
