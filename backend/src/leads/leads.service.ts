import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  private async generateLeadCode() {
    let seq: number;
    try {
      const result: any = await this.prisma.$queryRaw`
        SELECT nextval('lead_code_seq') as seq
      `;
      seq = Number(result[0].seq);
    } catch {
      const count = await this.prisma.lead.count();
      seq = count + 1;
    }

    const year = new Date().getFullYear();

    const number = String(seq).padStart(4, '0');

    return `L-${year}-${number}`;
  }

  async create(data: CreateLeadDto) {
    const code = await this.generateLeadCode();
    const phoneNormalized = data.phone ? data.phone.replace(/\D/g, '') : undefined;

    const lead = await this.prisma.lead.create({
      data: {
        ...data,
        code,
        phoneNormalized,
      },
    });
    await this.prisma.notification.create({
      data: {
        type: 'LEAD_NEW',
        title: 'Novo lead',
        body: `${lead.name} - ${lead.phone}`,
        link: '/leads',
      },
    });
    const status = (data as any)?.status;
    if (status && String(status).toLowerCase().includes('convert')) {
      await this.convertToClient(lead.code);
    }
    return lead;
  }

  async findAll(q?: string) {
    return this.prisma.lead.findMany({
      where: q
        ? { name: { contains: q, mode: 'insensitive' } }
        : undefined,
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
    const lead = await this.prisma.lead.update({
      where: { id },
      data,
    });
    const status = (data as any)?.status;
    if (status && String(status).toLowerCase().includes('convert')) {
      const existingClient = await this.prisma.client.findFirst({
        where: { leadId: lead.id },
      });
      if (!existingClient) {
        await this.convertToClient(lead.code);
      }
    }
    return lead;
  }

  async remove(id: string) {
    return this.prisma.lead.delete({
      where: { id },
    });
  }

  // CLIENT CODE
  private async generateClientCode() {
    let seq: number;
    try {
      const result: any = await this.prisma.$queryRaw`
        SELECT nextval('client_code_seq') as seq
      `;
      seq = Number(result[0].seq);
    } catch {
      const count = await this.prisma.client.count();
      seq = count + 1;
    }

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
    const existing = await this.prisma.client.findFirst({ where: { leadId: lead.id } });
    if (existing) return existing;

    const clientCode = await this.generateClientCode();

    const client = await this.prisma.client.create({
      data: {
        code: clientCode,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        phoneNormalized: lead.phoneNormalized,
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

