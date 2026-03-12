import { Body, Controller, Get, Post, Delete, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OfficeGuard } from '../auth/office.guard';

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard, OfficeGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @Roles('ADMIN', 'LAWYER')
  list(@Request() req) {
    return this.groupsService.list(req.user.officeId);
  }

  @Post()
  @Roles('ADMIN', 'LAWYER')
  create(@Body() body: { name: string; role: string }, @Request() req) {
    return this.groupsService.create(body, req.user.officeId);
  }

  @Post(':id/invite')
  @Roles('ADMIN', 'LAWYER')
  invite(@Param('id') id: string, @Body() body: { email: string }, @Request() req) {
    return this.groupsService.inviteEmail(id, body.email, req.user.officeId);
  }

  @Post(':id/members')
  @Roles('ADMIN', 'LAWYER')
  addMember(@Param('id') id: string, @Body() body: { userId: string }, @Request() req) {
    return this.groupsService.addMember(id, body.userId, req.user.officeId);
  }

  @Delete(':id/members/:userId')
  @Roles('ADMIN', 'LAWYER')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
    return this.groupsService.removeMember(id, userId, req.user.officeId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'LAWYER')
  update(@Param('id') id: string, @Body() body: { name?: string; role?: string }, @Request() req) {
    return this.groupsService.update(id, body, req.user.officeId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'LAWYER')
  remove(@Param('id') id: string, @Request() req) {
    return this.groupsService.remove(id, req.user.officeId);
  }
}
