import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { assertStrongPassword } from '../auth/password.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.user.create({
      data,
    });
  }

  async createBareUser(data: { name: string; email: string; password: string; cpf?: string }) {
    if (!data.cpf) {
      throw new BadRequestException('CPF obrigatorio');
    }
    const cpfOwner = await this.findByCpf(data.cpf);
    if (cpfOwner) {
      throw new BadRequestException('CPF ja cadastrado');
    }
    assertStrongPassword(data.password);
    const hash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        cpf: data.cpf,
        password: hash,
        role: 'UNASSIGNED' as any,
        mustChangePassword: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByCpf(cpf: string) {
    return this.prisma.user.findUnique({
      where: { cpf },
    });
  }

  async findByEmailOrCpf(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { cpf: identifier }],
      },
    });
  }

  async listUserOffices(userId: string) {
    return this.prisma.userOffice.findMany({
      where: { userId },
      include: { office: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addUserToOffice(params: { userId: string; officeId: string; role: string }) {
    return this.prisma.userOffice.upsert({
      where: { userId_officeId: { userId: params.userId, officeId: params.officeId } },
      update: { role: params.role as any },
      create: { userId: params.userId, officeId: params.officeId, role: params.role as any },
    });
  }

  async removeUserFromOffice(userId: string, officeId: string) {
    await this.prisma.groupMember.deleteMany({
      where: { userId, group: { officeId } },
    });
    return this.prisma.userOffice.delete({
      where: { userId_officeId: { userId, officeId } },
    });
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { include: { group: true } },
        offices: { include: { office: true } },
      },
    });
  }

  async ensureSuperAdmin() {
    const email = 'gabrielsantos.erick12@gmail.com';
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          role: 'SUPER_ADMIN' as any,
          officeId: null,
          mustChangePassword: false,
        },
      });
    }
    const hash = await bcrypt.hash('Teste123', 10);
    return this.prisma.user.create({
      data: {
        name: 'Administrador Geral',
        email,
        password: hash,
        role: 'SUPER_ADMIN' as any,
        officeId: null,
        mustChangePassword: false,
      },
    });
  }

  async applyInviteIfAny(userId: string, email: string) {
    const invite = await this.prisma.groupInvite.findFirst({ where: { email } });
    if (!invite) return null;
    const group = await this.prisma.group.findUnique({ where: { id: invite.groupId } });
    if (!group) return null;
    await this.prisma.groupMember.create({ data: { userId, groupId: group.id } });
    await this.addUserToOffice({ userId, officeId: group.officeId, role: group.role });
    await this.prisma.groupInvite.delete({ where: { id: invite.id } });
    return group;
  }

  async listUsers(officeId?: string) {
    return this.prisma.user.findMany({
      where: officeId ? { offices: { some: { officeId } } } : undefined,
      include: {
        memberships: { include: { group: true } },
        offices: { include: { office: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createManagedUser(
    data: { name: string; email: string; password: string; cpf?: string; groupId?: string },
    officeId: string,
  ) {
    const existing = await this.findByEmailOrCpf(data.email);
    if (data.cpf) {
      const cpfOwner = await this.findByCpf(data.cpf);
      if (cpfOwner && (!existing || cpfOwner.id !== existing.id)) {
        throw new BadRequestException('CPF ja cadastrado');
      }
    }
    const role = await this.resolveRoleForGroup(data.groupId, officeId);

    if (existing) {
      if (!existing.cpf && !data.cpf) {
        throw new BadRequestException('CPF obrigatorio');
      }
      if (!existing.cpf && data.cpf) {
        await this.prisma.user.update({ where: { id: existing.id }, data: { cpf: data.cpf } });
      }
      await this.addUserToOffice({ userId: existing.id, officeId, role });
      if (data.groupId) {
        await this.ensureGroupMember(existing.id, data.groupId, officeId);
      }
      return existing;
    }

    if (!data.cpf) {
      throw new BadRequestException('CPF obrigatorio');
    }
    assertStrongPassword(data.password);
    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        cpf: data.cpf,
        password: hash,
        role: 'UNASSIGNED' as any,
        officeId,
        mustChangePassword: true,
      },
    });
    await this.addUserToOffice({ userId: user.id, officeId, role });
    if (data.groupId) {
      await this.ensureGroupMember(user.id, data.groupId, officeId);
    }
    return user;
  }

  async updateUser(id: string, data: { email?: string; role?: string; name?: string; cpf?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        name: data.name,
        cpf: data.cpf,
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
    assertStrongPassword(newPassword);
    const hash = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hash, mustChangePassword: false },
    });
  }

  async updatePassword(userId: string, hash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hash, mustChangePassword: false },
    });
  }

  private async resolveRoleForGroup(groupId: string | undefined, officeId: string) {
    if (!groupId) return 'BASIC';
    const group = await this.prisma.group.findFirst({ where: { id: groupId, officeId } });
    return group?.role ?? 'BASIC';
  }

  private async ensureGroupMember(userId: string, groupId: string, officeId: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, officeId } });
    if (!group) return;
    const exists = await this.prisma.groupMember.findFirst({ where: { userId, groupId: group.id } });
    if (!exists) {
      await this.prisma.groupMember.create({ data: { userId, groupId: group.id } });
    }
  }
}

