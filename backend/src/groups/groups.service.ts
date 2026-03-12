import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async list(officeId: string) {
    return this.prisma.group.findMany({
      where: { officeId },
      include: {
        members: { include: { user: true } },
        invites: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { name: string; role: string }, officeId: string) {
    const allowed = ['ADMIN', 'LAWYER', 'BASIC', 'UNASSIGNED'];
    if (!allowed.includes(data.role)) {
      throw new BadRequestException('Perfil invalido');
    }
    return this.prisma.group.create({
      data: {
        name: data.name,
        role: data.role as any,
        officeId,
      },
    });
  }

  async inviteEmail(groupId: string, email: string, officeId: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, officeId } });
    if (!group) throw new BadRequestException('Grupo nao encontrado');
    return this.prisma.groupInvite.create({
      data: { groupId, email },
    });
  }

  async addMember(groupId: string, userId: string, officeId: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, officeId } });
    if (!group) throw new BadRequestException('Grupo nao encontrado');
    const member = await this.prisma.groupMember.create({
      data: { groupId, userId },
    });
    await this.prisma.userOffice.upsert({
      where: { userId_officeId: { userId, officeId } },
      update: { role: group.role as any },
      create: { userId, officeId, role: group.role as any },
    });
    return member;
  }

  async removeMember(groupId: string, userId: string, officeId: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, officeId } });
    if (!group) throw new BadRequestException('Grupo nao encontrado');
    return this.prisma.groupMember.delete({
      where: {
        userId_groupId: { userId, groupId },
      },
    });
  }

  async update(groupId: string, data: { name?: string; role?: string }, officeId: string) {
    const allowed = ['ADMIN', 'LAWYER', 'BASIC', 'UNASSIGNED'];
    if (data.role && !allowed.includes(data.role)) {
      throw new BadRequestException('Perfil invalido');
    }
    const existing = await this.prisma.group.findFirst({ where: { id: groupId, officeId } });
    if (!existing) throw new BadRequestException('Grupo nao encontrado');
    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        name: data.name,
        role: data.role as any,
      },
    });
  }

  async remove(groupId: string, officeId: string) {
    const existing = await this.prisma.group.findFirst({ where: { id: groupId, officeId } });
    if (!existing) throw new BadRequestException('Grupo nao encontrado');
    await this.prisma.groupInvite.deleteMany({ where: { groupId } });
    await this.prisma.groupMember.deleteMany({ where: { groupId } });
    return this.prisma.group.delete({ where: { id: groupId } });
  }

  async assertCanManage(userRole: string) {
    if (userRole !== 'ADMIN' && userRole !== 'LAWYER') {
      throw new ForbiddenException('Acesso negado');
    }
  }
}
