import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getOffice(officeId: string) {
    const existing = await this.prisma.officeSettings.findUnique({
      where: { officeId },
    });
    return (
      existing ?? {
        officeId,
        name: '',
        cnpj: '',
        address: '',
        phone: '',
        email: '',
        logoUrl: null,
        workingHours: null,
      }
    );
  }

  async updateOffice(officeId: string, data: any) {
    return this.prisma.officeSettings.upsert({
      where: { officeId },
      update: data,
      create: {
        officeId,
        name: data.name ?? '',
        cnpj: data.cnpj ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        logoUrl: data.logoUrl ?? null,
        workingHours: data.workingHours ?? null,
      },
    });
  }
}
