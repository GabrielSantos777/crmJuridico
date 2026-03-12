import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OfficesService {
  constructor(private prisma: PrismaService, private usersService: UsersService) {}

  async list() {
    return this.prisma.office.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.office.findUnique({ where: { id } });
  }

  async create(data: {
    name: string;
    cnpj: string;
    domain?: string;
    email?: string;
    phone?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    const existing = await this.prisma.office.findUnique({ where: { cnpj: data.cnpj } });
    if (existing) {
      throw new BadRequestException('CNPJ ja cadastrado');
    }
    const office = await this.prisma.office.create({
      data: {
        name: data.name,
        cnpj: data.cnpj,
        domain: data.domain,
        email: data.email,
        phone: data.phone,
      },
    });

    const hash = await bcrypt.hash(data.adminPassword, 10);
    const admin = await this.prisma.user.create({
      data: {
        name: data.adminName,
        email: data.adminEmail,
        password: hash,
        role: 'ADMIN' as any,
        officeId: office.id,
      },
    });
    await this.usersService.addUserToOffice({
      userId: admin.id,
      officeId: office.id,
      role: 'ADMIN',
    });

    return office;
  }

  async update(id: string, data: { name?: string; cnpj?: string; domain?: string; email?: string; phone?: string }) {
    return this.prisma.office.update({
      where: { id },
      data: {
        name: data.name,
        cnpj: data.cnpj,
        domain: data.domain,
        email: data.email,
        phone: data.phone,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.office.delete({ where: { id } });
  }
}
