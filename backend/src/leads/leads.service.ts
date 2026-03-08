import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  private async generateLeadCode() {
    const result: any = await this.prisma.$queryRaw`
    SELECT nextval('lead_code_seq') as seq
  `;

    const seq = result[0].seq;

    const year = new Date().getFullYear();

    const number = String(seq).padStart(4, '0');

    return `L-${year}-${number}`;
  }

  async create(data: CreateLeadDto) {
    const code = await this.generateLeadCode();

    return this.prisma.lead.create({
      data: {
        ...data,
        code,
      },
    });
  }

  async findAll() {
    return this.prisma.lead.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.lead.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: UpdateLeadDto) {
    return this.prisma.lead.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.lead.delete({
      where: { id },
    });
  }

  // CLIENT CODE
  private async generateClientCode() {
    const result: any = await this.prisma.$queryRaw`
    SELECT nextval('client_code_seq') as seq
  `;

    const seq = result[0].seq;

    const year = new Date().getFullYear();

    const number = String(seq).padStart(4, '0');

    return `C-${year}-${number}`;
  }

  async convertToClient(code: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { code },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const clientCode = await this.generateClientCode();

    const client = await this.prisma.client.create({
      data: {
        code: clientCode,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        leadId: lead.id,
      },
    });

    await this.prisma.lead.update({
      where: { code },
      data: {
        status: 'CONVERTED',
      },
    });

    return client;
  }
}

