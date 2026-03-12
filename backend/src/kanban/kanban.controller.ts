import { Body, Controller, Get, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { KanbanService } from './kanban.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OfficeGuard } from '../auth/office.guard';

@Controller('kanban')
@UseGuards(JwtAuthGuard, OfficeGuard)
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Get()
  list(@Request() req) {
    return this.kanbanService.listBoard(req.user.officeId);
  }

  @Post('columns')
  createColumn(@Body() body: { title: string }, @Request() req) {
    return this.kanbanService.createColumn(body.title, req.user.officeId);
  }

  @Patch('columns')
  updateColumn(@Body() body: { id: string; title: string }, @Request() req) {
    return this.kanbanService.updateColumn(body.id, body.title, req.user.officeId);
  }

  @Post('cards')
  createCard(
    @Body()
    body: { columnId: string; title: string; description?: string; dueAt?: string },
    @Request() req,
  ) {
    return this.kanbanService.createCard(body, req.user.officeId);
  }

  @Patch('cards')
  updateCard(
    @Body()
    body: { id: string; title?: string; description?: string; dueAt?: string },
    @Request() req,
  ) {
    return this.kanbanService.updateCard(body.id, body, req.user.officeId);
  }

  @Patch('cards/move')
  moveCard(@Body() body: { id: string; toColumnId: string; order: number }, @Request() req) {
    return this.kanbanService.moveCard(body.id, body.toColumnId, body.order, req.user.officeId);
  }

  @Post('cards/delete')
  deleteCard(@Body() body: { id: string }, @Request() req) {
    return this.kanbanService.deleteCard(body.id, req.user.officeId);
  }

  @Post('columns/delete')
  deleteColumn(@Body() body: { id: string }, @Request() req) {
    return this.kanbanService.deleteColumn(body.id, req.user.officeId);
  }

  @Post('sync')
  sync(@Request() req) {
    return this.kanbanService.syncFromTrello(req.user.officeId);
  }
}
