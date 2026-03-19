import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappMessageDto } from './dto/whatsapp-message.dto';
import { TriageDto } from './dto/triage.dto';
import { CreateAppointmentDto } from './dto/appointment.dto';
import { UploadClientFileDto } from './dto/upload-client-file.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class IntegrationsService {
  private readonly availabilityWindowDays = 4; // hoje + 3 dias
  private readonly availabilityWorkStart = '09:00';
  private readonly availabilityWorkEnd = '18:00';
  private readonly availabilityIntervalMinutes = 60;

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

  async getProcessSummariesByClientCode(code: string, officeId: string) {
    officeId = this.requireOfficeId(officeId);

    const processes = await this.prisma.process.findMany({
      where: { client: { code }, officeId },
      include: {
        client: true,
        events: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      total: processes.length,
      processes: processes.map((process) => ({
        id: process.id,
        code: process.code,
        number: process.number,
        title: process.title,
        area: process.area,
        status: process.status,
        client: {
          id: process.client.id,
          code: process.client.code,
          name: process.client.name,
        },
        latestEvent: process.events[0] ?? null,
        latestMovementSummary:
          process.events[0]?.description ?? 'Sem movimentacoes recentes',
        recentEvents: process.events,
      })),
    };
  }

  async getLatestProcessUpdateByPhone(phone: string, officeId: string) {
    officeId = this.requireOfficeId(officeId);
    const existing = await this.findClientOrLeadByPhone(phone, officeId);
    if (!existing || existing.type !== 'client') return null;

    return this.getLatestProcessUpdateByClientCode(existing.record.code, officeId);
  }

  async getProcessSummariesByPhone(phone: string, officeId: string) {
    officeId = this.requireOfficeId(officeId);
    const existing = await this.findClientOrLeadByPhone(phone, officeId);
    if (!existing || existing.type !== 'client') return null;

    return this.getProcessSummariesByClientCode(existing.record.code, officeId);
  }

  async listAvailability(params: {
    officeId: string;
  }) {
    this.requireOfficeId(params.officeId);

    const intervalMinutes = this.availabilityIntervalMinutes;
    const durationMinutes = intervalMinutes;
    const now = new Date();
    const windowStart = this.startOfDay(now);
    const windowEndExclusive = this.startOfDay(
      this.addDays(windowStart, this.availabilityWindowDays),
    );

    const [wsH, wsM] = this.parseClock(this.availabilityWorkStart);
    const [weH, weM] = this.parseClock(this.availabilityWorkEnd);
    const firstTodaySlot = this.roundUpToInterval(now, intervalMinutes);
    const windowEnd = new Date(windowEndExclusive.getTime() - 1);

    const existing = await this.prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        startAt: { lt: windowEndExclusive },
        endAt: { gt: now },
        officeId: params.officeId,
      },
      orderBy: { startAt: 'asc' },
    });

    const slots: { startAt: string; endAt: string }[] = [];
    const msPerMin = 60 * 1000;

    const current = new Date(windowStart);
    const endDate = this.addDays(windowStart, this.availabilityWindowDays - 1);

    while (current <= endDate) {
      if (!this.isWeekday(current)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      const dayStart = new Date(current);
      dayStart.setHours(wsH, wsM, 0, 0);

      const dayEnd = new Date(current);
      dayEnd.setHours(weH, weM, 0, 0);

      const loopStart =
        this.isSameDay(current, now) && firstTodaySlot > dayStart
          ? firstTodaySlot
          : dayStart;

      for (
        let t = new Date(loopStart);
        t.getTime() + durationMinutes * msPerMin <= dayEnd.getTime();
        t = new Date(t.getTime() + intervalMinutes * msPerMin)
      ) {
        const slotStart = new Date(t);
        const slotEnd = new Date(t.getTime() + durationMinutes * msPerMin);

        if (slotStart < firstTodaySlot && this.isSameDay(slotStart, now))
          continue;
        if (slotStart > windowEnd) continue;

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

  private parseClock(value: string): [number, number] {
    const [hours, minutes] = value.split(':').map(Number);
    const safeHours = Number.isFinite(hours) ? hours : 9;
    const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
    return [safeHours, safeMinutes];
  }

  private startOfDay(value: Date) {
    const day = new Date(value);
    day.setHours(0, 0, 0, 0);
    return day;
  }

  private addDays(value: Date, days: number) {
    const out = new Date(value);
    out.setDate(out.getDate() + days);
    return out;
  }

  private isWeekday(value: Date) {
    const dayOfWeek = value.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  private isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private roundUpToInterval(value: Date, intervalMinutes: number) {
    const rounded = new Date(value);
    rounded.setSeconds(0, 0);

    const minutes = rounded.getMinutes();
    const next = Math.ceil(minutes / intervalMinutes) * intervalMinutes;

    if (next >= 60) {
      rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
      return rounded;
    }

    rounded.setMinutes(next, 0, 0);
    return rounded;
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

  private resolveFileExtension(mimeType?: string) {
    const map: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/ogg; codecs=opus': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'mp4',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    return map[(mimeType ?? '').toLowerCase()] ?? 'bin';
  }

  private sanitizeFilename(fileName: string) {
    return fileName.replace(/[^\w.\-]/g, '_');
  }

  async uploadClientFile(data: UploadClientFileDto, officeId: string) {
    officeId = this.requireOfficeId(officeId);

    let clientId = data.clientId;
    if (!clientId) {
      if (!data.phone) {
        return { stored: false, reason: 'phone_or_clientId_required' };
      }
      const existing = await this.findClientOrLeadByPhone(data.phone, officeId);
      if (!existing || existing.type !== 'client') {
        return { stored: false, reason: 'not_a_client' };
      }
      clientId = existing.record.id;
    }

    const client = await this.prisma.client.findFirst({
      where: { id: clientId, officeId },
    });
    if (!client) {
      return { stored: false, reason: 'client_not_found' };
    }

    const cleanedBase64 = (data.base64 ?? '')
      .replace(/^data:[^;]+;base64,/, '')
      .trim();
    const buffer = Buffer.from(cleanedBase64, 'base64');
    if (!buffer.length) {
      return { stored: false, reason: 'invalid_base64' };
    }

    const fallbackExt = this.resolveFileExtension(data.mimeType);
    const requestedName = data.fileName?.trim() || `arquivo.${fallbackExt}`;
    const safeOriginalName = this.sanitizeFilename(requestedName);
    const finalFilename = `${Date.now()}-${safeOriginalName}`;
    const destDir = path.join(process.cwd(), 'uploads', 'clients', client.id);
    await fs.mkdir(destDir, { recursive: true });

    const storagePath = path.join(destDir, finalFilename);
    await fs.writeFile(storagePath, buffer);

    const file = await this.prisma.clientFile.create({
      data: {
        clientId: client.id,
        filename: finalFilename,
        originalName: safeOriginalName,
        mimeType: data.mimeType ?? 'application/octet-stream',
        size: buffer.length,
        storagePath,
      },
    });

    return { stored: true, clientId: client.id, file };
  }
}
