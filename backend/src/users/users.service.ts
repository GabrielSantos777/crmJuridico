import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.user.create({
      data,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { include: { group: true } },
      },
    });
  }

  async ensureAdmin() {
    const email = 'gabrielsantos.erick12@gmail.com';
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) return existing;
    const hash = await bcrypt.hash('Teste123', 10);
    return this.prisma.user.create({
      data: {
        name: 'Administrador',
        email,
        password: hash,
        role: 'ADMIN' as any,
      },
    });
  }

  async applyInviteIfAny(userId: string, email: string) {
    const invite = await this.prisma.groupInvite.findFirst({ where: { email } });
    if (!invite) return null;
    const group = await this.prisma.group.findUnique({ where: { id: invite.groupId } });
    if (!group) return null;
    await this.prisma.groupMember.create({ data: { userId, groupId: group.id } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: group.role as any },
    });
    await this.prisma.groupInvite.delete({ where: { id: invite.id } });
    return group;
  }

  async listUsers() {
    return this.prisma.user.findMany({
      include: { memberships: { include: { group: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createManagedUser(data: { name: string; email: string; password: string; groupId?: string }) {
    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hash,
        role: 'UNASSIGNED' as any,
      },
    });
    if (data.groupId) {
      const group = await this.prisma.group.findUnique({ where: { id: data.groupId } });
      if (group) {
        await this.prisma.groupMember.create({ data: { userId: user.id, groupId: group.id } });
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role: group.role as any },
        });
      }
    }
    return user;
  }

  async updateUser(id: string, data: { email?: string; role?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        role: data.role as any,
      },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuario nao encontrado');
    }
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      throw new BadRequestException('Senha atual incorreta');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
  }
}
