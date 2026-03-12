import { Body, Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { TrelloService } from '../integrations/trello.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OfficeGuard } from '../auth/office.guard';

@Controller('trello')
@UseGuards(JwtAuthGuard, OfficeGuard)
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
    @Request() req,
  ) {
    return this.trelloService.createCard({ ...body, officeId: req.user.officeId });
  }

  @Post('sync')
  sync(@Body() body: { listId?: string }, @Request() req) {
    return this.trelloService.syncDueCardsToAgenda(body.listId, req.user.officeId);
  }
}
