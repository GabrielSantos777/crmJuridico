import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getOffice() {
    const existing = await this.prisma.officeSettings.findUnique({
      where: { id: 'office' },
    });
    return (
      existing ?? {
        id: 'office',
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

  async updateOffice(data: any) {
    return this.prisma.officeSettings.upsert({
      where: { id: 'office' },
      update: data,
      create: {
        id: 'office',
        ...data,
      },
    });
  }
}
