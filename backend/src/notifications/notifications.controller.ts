import { Controller, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OfficeGuard } from '../auth/office.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard, OfficeGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @Request() req,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.list({
      unreadOnly: unreadOnly === 'true',
      limit: limit ? Number(limit) : undefined,
      officeId: req.user.officeId,
    });
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markRead(id, req.user.officeId);
  }

  @Patch('read-all')
  markAllRead(@Request() req) {
    return this.notificationsService.markAllRead(req.user.officeId);
  }
}
