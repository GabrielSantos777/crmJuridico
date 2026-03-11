import { Body, Controller, Post, Get, UseGuards, Request, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LAWYER')
  create(@Body() data: any) {
    return this.usersService.create(data);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req) {
    return this.usersService.getMe(req.user.userId);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  changeMyPassword(@Request() req, @Body() data: { currentPassword: string; newPassword: string }) {
    return this.usersService.changePassword(req.user.userId, data.currentPassword, data.newPassword);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LAWYER')
  list() {
    return this.usersService.listUsers();
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LAWYER')
  createManaged(@Body() data: { name: string; email: string; password: string; groupId?: string }) {
    return this.usersService.createManagedUser(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LAWYER')
  update(@Param('id') id: string, @Body() data: { email?: string; role?: string }) {
    return this.usersService.updateUser(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LAWYER')
  remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
