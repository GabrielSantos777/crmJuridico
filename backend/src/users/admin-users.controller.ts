import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminUsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  listAll() {
    return this.usersService.listUsers();
  }

  @Post()
  async create(@Body() data: { name: string; email: string; password: string; cpf?: string; officeId?: string; role?: string }) {
    if (!data.officeId) {
      return this.usersService.createBareUser({ name: data.name, email: data.email, password: data.password, cpf: data.cpf });
    }
    const user = await this.usersService.createManagedUser(
      { name: data.name, email: data.email, password: data.password, cpf: data.cpf },
      data.officeId,
    );
    if (data.role) {
      await this.usersService.addUserToOffice({ userId: user.id, officeId: data.officeId, role: data.role });
    }
    return user;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: { email?: string; name?: string; cpf?: string }) {
    return this.usersService.updateUser(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Post(':id/offices')
  addOffice(@Param('id') id: string, @Body() data: { officeId: string; role: string }) {
    return this.usersService.addUserToOffice({ userId: id, officeId: data.officeId, role: data.role });
  }

  @Delete(':id/offices/:officeId')
  removeOffice(@Param('id') id: string, @Param('officeId') officeId: string) {
    return this.usersService.removeUserFromOffice(id, officeId);
  }
}
