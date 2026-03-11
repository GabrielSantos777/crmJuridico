import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.group.findMany({
      include: {
        members: { include: { user: true } },
        invites: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { name: string; role: string }) {
    const allowed = ['ADMIN', 'LAWYER', 'BASIC', 'UNASSIGNED'];
    if (!allowed.includes(data.role)) {
      throw new BadRequestException('Perfil invalido');
    }
    return this.prisma.group.create({
      data: {
        name: data.name,
        role: data.role as any,
      },
    });
  }

  async inviteEmail(groupId: string, email: string) {
    return this.prisma.groupInvite.create({
      data: { groupId, email },
    });
  }

  async addMember(groupId: string, userId: string) {
    return this.prisma.groupMember.create({
      data: { groupId, userId },
    });
  }

  async removeMember(groupId: string, userId: string) {
    return this.prisma.groupMember.delete({
      where: {
        userId_groupId: { userId, groupId },
      },
    });
  }

  async update(groupId: string, data: { name?: string; role?: string }) {
    const allowed = ['ADMIN', 'LAWYER', 'BASIC', 'UNASSIGNED'];
    if (data.role && !allowed.includes(data.role)) {
      throw new BadRequestException('Perfil invalido');
    }
    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        name: data.name,
        role: data.role as any,
      },
    });
  }

  async remove(groupId: string) {
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
