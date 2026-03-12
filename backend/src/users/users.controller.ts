import { Body, Controller, Post, Get, UseGuards, Request, Patch, Param, Delete, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OfficeGuard } from '../auth/office.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, OfficeGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LAWYER')
  create(@Body() data: any, @Request() req) {
    return this.usersService.createManagedUser(data, req.user.officeId);
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
  list(@Request() req) {
    return this.usersService.listUsers(req.user.officeId);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LAWYER')
  createManaged(@Body() data: { name: string; email: string; password: string; cpf?: string; groupId?: string }, @Request() req) {
    return this.usersService.createManagedUser(data, req.user.officeId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LAWYER')
  async update(@Param('id') id: string, @Body() data: { email?: string; name?: string; cpf?: string; role?: string }, @Request() req) {
    if (data.role) {
      await this.usersService.addUserToOffice({ userId: id, officeId: req.user.officeId, role: data.role });
    }
    return this.usersService.updateUser(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LAWYER')
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.userId === id) {
      throw new BadRequestException('Nao e permitido remover a si mesmo do escritorio');
    }
    return this.usersService.removeUserFromOffice(id, req.user.officeId);
  }
}
