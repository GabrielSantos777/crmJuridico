import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappMessageDto } from './dto/whatsapp-message.dto';
import { TriageDto } from './dto/triage.dto';
import { CreateAppointmentDto } from './dto/appointment.dto';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  private normalizePhone(phone?: string) {
    return phone ? phone.replace(/\D/g, '') : undefined;
  }

  private requireOfficeId(officeId?: string) {
    if (!officeId) {
      throw new Error('officeId obrigatorio');
    }
    return officeId;
  }

  async findClientOrLeadByPhone(phone: string, officeId: string) {
    this.requireOfficeId(officeId);
    const normalized = this.normalizePhone(phone);

    const client =
      (normalized &&
        (await this.prisma.client.findFirst({
          where: { phoneNormalized: normalized, officeId },
        }))) ||
      (await this.prisma.client.findFirst({
        where: { phone, officeId },
      }));

    if (client) return { type: 'client', record: client };

    const lead =
      (normalized &&
        (await this.prisma.lead.findFirst({
          where: { phoneNormalized: normalized, officeId },
        }))) ||
      (await this.prisma.lead.findFirst({
        where: { phone, officeId },
      }));

    if (lead) return { type: 'lead', record: lead };

    return null;
  }

  async registerWhatsappMessage(data: WhatsappMessageDto, officeId: string) {
    officeId = this.requireOfficeId(officeId);
    const normalized = this.normalizePhone(data.phone);
    const direction = data.direction ?? 'IN';

    let linkedLeadId: string | undefined;
    let linkedClientId: string | undefined;

    const existing = await this.findClientOrLeadByPhone(data.phone, officeId);
    function generateLeadCode() {
      return `LEAD-${Math.floor(Math.random() * 1000000)}`;
    }

    if (!existing) {
      const lead = await this.prisma.lead.create({
        data: {
          code: generateLeadCode(),
          name: data.name ?? 'Contato WhatsApp',
          phone: data.phone,
          phoneNormalized: normalized,
          source: 'WHATSAPP',
          status: 'NEW',
          notes: 'Criado automaticamente via WhatsApp',
          officeId,
        },
      });
      linkedLeadId = lead.id;
    } else if (existing.type === 'client') {
      linkedClientId = existing.record.id;
    } else {
      linkedLeadId = existing.record.id;
    }

    const conversation = await this.prisma.conversation.upsert({
      where: {
        officeId_channel_phone: {
          officeId,
          channel: 'WHATSAPP',
          phone: normalized ?? data.phone,
        },
      },
      update: {
        name: data.name ?? undefined,
        leadId: linkedLeadId,
        clientId: linkedClientId,
        status: 'OPEN',
        lastMessageAt: new Date(),
      },
      create: {
        channel: 'WHATSAPP',
        phone: normalized ?? data.phone,
        name: data.name ?? undefined,
        leadId: linkedLeadId,
        clientId: linkedClientId,
        status: 'OPEN',
        lastMessageAt: new Date(),
        officeId,
      },
    });

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction,
        text: data.text,
        meta: data.meta ?? undefined,
      },
    });

    return { conversation, message };
  }

  async closeConversation(phone: string, officeId: string) {
    officeId = this.requireOfficeId(officeId);
    const normalized = this.normalizePhone(phone);
    return this.prisma.conversation.update({
      where: {
        officeId_channel_phone: {
          officeId,
          channel: 'WHATSAPP',
          phone: normalized ?? phone,
        },
      },
      data: {
        status: 'CLOSED',
      },
    });
  }

  async triageLead(data: TriageDto, officeId: string) {
    officeId = this.requireOfficeId(officeId);
    const existing = await this.prisma.lead.findFirst({
      where: { id: data.leadId, officeId },
    });
    if (!existing) {
      throw new Error('Lead nao encontrado');
    }
    return this.prisma.lead.update({
      where: { id: data.leadId },
      data: {
        classification: data.classification,
        status: data.status,
        notes: data.notes,
      },
    });
  }

  async getLatestProcessUpdateByClientCode(code: string, officeId: string) {
    officeId = this.requireOfficeId(officeId);
    const process = await this.prisma.process.findFirst({
      where: { client: { code }, officeId },
      include: {
        client: true,
        events: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!process) return null;

    const latestEvent = process.events.sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    )[0];

    return {
      process,
      latestEvent: latestEvent ?? null,
    };
  }

  async getLatestProcessUpdateByPhone(phone: string, officeId: string) {
    officeId = this.requireOfficeId(officeId);
    const existing = await this.findClientOrLeadByPhone(phone, officeId);
    if (!existing || existing.type !== 'client') return null;

    return this.getLatestProcessUpdateByClientCode(existing.record.code, officeId);
  }

  async listAvailability(params: {
    from: Date;
    to: Date;
    durationMinutes: number;
    workStart: string;
    workEnd: string;
    intervalMinutes: number;
    officeId: string;
  }) {
    this.requireOfficeId(params.officeId);
    const { from, to, durationMinutes, workStart, workEnd, intervalMinutes } =
      params;

    const existing = await this.prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        startAt: { lt: to },
        endAt: { gt: from },
        officeId: params.officeId,
      },
      orderBy: { startAt: 'asc' },
    });

    const slots: { startAt: string; endAt: string }[] = [];
    const msPerMin = 60 * 1000;

    const current = new Date(from);
    current.setHours(0, 0, 0, 0);

    const endDate = new Date(to);
    endDate.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      const [wsH, wsM] = workStart.split(':').map(Number);
      const [weH, weM] = workEnd.split(':').map(Number);

      const dayStart = new Date(current);
      dayStart.setHours(wsH, wsM, 0, 0);

      const dayEnd = new Date(current);
      dayEnd.setHours(weH, weM, 0, 0);

      for (
        let t = new Date(dayStart);
        t.getTime() + durationMinutes * msPerMin <= dayEnd.getTime();
        t = new Date(t.getTime() + intervalMinutes * msPerMin)
      ) {
        const slotStart = new Date(t);
        const slotEnd = new Date(t.getTime() + durationMinutes * msPerMin);

        if (slotEnd <= from || slotStart >= to) continue;

        const overlaps = existing.some(
          (a) => slotStart < a.endAt && slotEnd > a.startAt,
        );

        if (!overlaps) {
          slots.push({
            startAt: slotStart.toISOString(),
            endAt: slotEnd.toISOString(),
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  async listAppointments(from: Date, to: Date, officeId: string) {
    officeId = this.requireOfficeId(officeId);
    return this.prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        startAt: { gte: from, lte: to },
        officeId,
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async createAppointment(data: CreateAppointmentDto, officeId: string) {
    officeId = this.requireOfficeId(officeId);
    const normalized = this.normalizePhone(data.phone);
    let leadId = data.leadId;
    let clientId = data.clientId;

    if (!leadId && !clientId && data.phone) {
      const existing = await this.findClientOrLeadByPhone(data.phone, officeId);
      if (existing?.type === 'client') clientId = existing.record.id;
      if (existing?.type === 'lead') leadId = existing.record.id;
    }

    return this.prisma.appointment.create({
      data: {
        title: data.title,
        description: data.description,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        status: (data.status as any) ?? 'SCHEDULED',
        type: (data.type as any) ?? 'CONSULTATION',
        mode: (data.mode as any) ?? 'ONLINE',
        channel: data.channel ?? 'WHATSAPP',
        phone: normalized ?? data.phone,
        leadId,
        clientId,
        officeId,
      },
    });
  }
}
