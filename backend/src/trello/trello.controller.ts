import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TrelloService } from '../integrations/trello.service';

@Controller('trello')
export class TrelloController {
  constructor(private readonly trelloService: TrelloService) {}

  @Get('cards')
  listCards(@Query('listId') listId?: string) {
    return this.trelloService.listCards(listId);
  }

  @Post('cards')
  createCard(
    @Body()
    body: {
      name: string;
      desc?: string;
      listId?: string;
      due?: string;
      createAppointment?: boolean;
    },
  ) {
    return this.trelloService.createCard(body);
  }

  @Post('sync')
  sync(@Body() body: { listId?: string }) {
    return this.trelloService.syncDueCardsToAgenda(body.listId);
  }
}
