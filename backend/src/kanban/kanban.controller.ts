import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { KanbanService } from './kanban.service';

@Controller('kanban')
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Get()
  list() {
    return this.kanbanService.listBoard();
  }

  @Post('columns')
  createColumn(@Body() body: { title: string }) {
    return this.kanbanService.createColumn(body.title);
  }

  @Patch('columns')
  updateColumn(@Body() body: { id: string; title: string }) {
    return this.kanbanService.updateColumn(body.id, body.title);
  }

  @Post('cards')
  createCard(
    @Body()
    body: { columnId: string; title: string; description?: string; dueAt?: string },
  ) {
    return this.kanbanService.createCard(body);
  }

  @Patch('cards')
  updateCard(
    @Body()
    body: { id: string; title?: string; description?: string; dueAt?: string },
  ) {
    return this.kanbanService.updateCard(body.id, body);
  }

  @Patch('cards/move')
  moveCard(@Body() body: { id: string; toColumnId: string; order: number }) {
    return this.kanbanService.moveCard(body.id, body.toColumnId, body.order);
  }

  @Post('cards/delete')
  deleteCard(@Body() body: { id: string }) {
    return this.kanbanService.deleteCard(body.id);
  }

  @Post('columns/delete')
  deleteColumn(@Body() body: { id: string }) {
    return this.kanbanService.deleteColumn(body.id);
  }

  @Post('sync')
  sync() {
    return this.kanbanService.syncFromTrello();
  }
}
