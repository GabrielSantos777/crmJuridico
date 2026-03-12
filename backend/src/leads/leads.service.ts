import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  private async generateLeadCode(officeId: string) {
    let seq: number;
    try {
      const result: any = await this.prisma.$queryRaw`
        SELECT nextval('lead_code_seq') as seq
      `;
      seq = Number(result[0].seq);
    } catch {
      const count = await this.prisma.lead.count({ where: { officeId } });
      seq = count + 1;
    }

    const year = new Date().getFullYear();

    const number = String(seq).padStart(4, '0');

    return `L-${year}-${number}`;
  }

  async create(data: CreateLeadDto, officeId: string) {
    const code = await this.generateLeadCode(officeId);
    const phoneNormalized = data.phone ? data.phone.replace(/\D/g, '') : undefined;

    const lead = await this.prisma.lead.create({
      data: {
        ...data,
        code,
        phoneNormalized,
        officeId,
      },
    });
    await this.prisma.notification.create({
      data: {
        type: 'LEAD_NEW',
        title: 'Novo lead',
        body: `${lead.name} - ${lead.phone}`,
        link: '/leads',
        officeId,
      },
    });
    const status = (data as any)?.status;
    if (status && String(status).toLowerCase().includes('convert')) {
      await this.convertToClient(lead.code, officeId);
    }
    return lead;
  }

  async findAll(officeId: string, q?: string) {
    return this.prisma.lead.findMany({
      where: q
        ? { officeId, name: { contains: q, mode: 'insensitive' } }
        : { officeId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, officeId: string) {
    return this.prisma.lead.findFirst({
      where: { id, officeId },
    });
  }

  async update(id: string, data: UpdateLeadDto, officeId: string) {
    const existing = await this.prisma.lead.findFirst({ where: { id, officeId } });
    if (!existing) {
      throw new Error('Lead not found');
    }
    const lead = await this.prisma.lead.update({
      where: { id },
      data,
    });
    const status = (data as any)?.status;
    if (status && String(status).toLowerCase().includes('convert')) {
      const existingClient = await this.prisma.client.findFirst({
        where: { leadId: lead.id, officeId },
      });
      if (!existingClient) {
        await this.convertToClient(lead.code, officeId);
      }
    }
    return lead;
  }

  async remove(id: string, officeId: string) {
    const existing = await this.prisma.lead.findFirst({ where: { id, officeId } });
    if (!existing) {
      throw new Error('Lead not found');
    }
    return this.prisma.lead.delete({
      where: { id },
    });
  }

  // CLIENT CODE
  private async generateClientCode(officeId: string) {
    let seq: number;
    try {
      const result: any = await this.prisma.$queryRaw`
        SELECT nextval('client_code_seq') as seq
      `;
      seq = Number(result[0].seq);
    } catch {
      const count = await this.prisma.client.count({ where: { officeId } });
      seq = count + 1;
    }

    const year = new Date().getFullYear();

    const number = String(seq).padStart(4, '0');

    return `C-${year}-${number}`;
  }

  async convertToClient(code: string, officeId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { code, officeId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }
    const existing = await this.prisma.client.findFirst({ where: { leadId: lead.id, officeId } });
    if (existing) return existing;

    const clientCode = await this.generateClientCode(officeId);

    const client = await this.prisma.client.create({
      data: {
        code: clientCode,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        phoneNormalized: lead.phoneNormalized,
        leadId: lead.id,
        officeId,
      },
    });

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'CONVERTED',
      },
    });

    return client;
  }
}

