import { Body, Controller, Get, Post, Delete, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @Roles('ADMIN', 'LAWYER')
  list(@Request() req) {
    return this.groupsService.list();
  }

  @Post()
  @Roles('ADMIN', 'LAWYER')
  create(@Body() body: { name: string; role: string }) {
    return this.groupsService.create(body);
  }

  @Post(':id/invite')
  @Roles('ADMIN', 'LAWYER')
  invite(@Param('id') id: string, @Body() body: { email: string }) {
    return this.groupsService.inviteEmail(id, body.email);
  }

  @Post(':id/members')
  @Roles('ADMIN', 'LAWYER')
  addMember(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.groupsService.addMember(id, body.userId);
  }

  @Delete(':id/members/:userId')
  @Roles('ADMIN', 'LAWYER')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.groupsService.removeMember(id, userId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'LAWYER')
  update(@Param('id') id: string, @Body() body: { name?: string; role?: string }) {
    return this.groupsService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'LAWYER')
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }
}
