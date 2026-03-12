import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async list(params: {
    from?: Date;
    to?: Date;
    status?: string;
    type?: string;
    officeId: string;
  }) {
    const { from, to, status, type, officeId } = params;
    return this.prisma.appointment.findMany({
      where: {
        officeId,
        ...(from || to
          ? {
              startAt: {
                gte: from,
                lte: to,
              },
            }
          : {}),
        ...(status ? { status: status as any } : {}),
        ...(type ? { type: type as any } : {}),
      },
      orderBy: { startAt: 'asc' },
      include: {
        lead: true,
        client: true,
      },
    });
  }

  async upcoming(officeId: string, limit = 5) {
    const now = new Date();
    return this.prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        startAt: { gte: now },
        officeId,
      },
      orderBy: { startAt: 'asc' },
      take: limit,
      include: {
        lead: true,
        client: true,
      },
    });
  }

  async listAvailable(officeId: string, from?: Date, to?: Date) {
    return this.prisma.appointment.findMany({
      where: {
        status: 'AVAILABLE',
        officeId,
        ...(from || to
          ? {
              startAt: {
                gte: from,
                lte: to,
              },
            }
          : {}),
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async create(data: CreateAppointmentDto, officeId: string) {
    const appt = await this.prisma.appointment.create({
      data: {
        title: data.title,
        description: data.description,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        status: (data.status as any) ?? 'SCHEDULED',
        type: (data.type as any) ?? 'CONSULTATION',
        mode: (data.mode as any) ?? 'ONLINE',
        channel: data.channel,
        phone: data.phone,
        location: data.location,
        notes: data.notes,
        leadId: data.leadId,
        clientId: data.clientId,
        externalSource: data.externalSource,
        externalId: data.externalId,
        officeId,
      },
    });
    if (appt.status === 'SCHEDULED') {
      await this.prisma.notification.create({
        data: {
          type: 'APPOINTMENT_NEW',
          title: 'Novo evento na agenda',
          body: `${appt.title} - ${appt.startAt.toISOString()}`,
          link: '/agenda',
          officeId,
        },
      });
    }
    return appt;
  }

  async update(id: string, data: UpdateAppointmentDto, officeId: string) {
    const existing = await this.prisma.appointment.findFirst({ where: { id, officeId } });
    if (!existing) throw new NotFoundException('Evento nÃ£o encontrado');
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...data,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        endAt: data.endAt ? new Date(data.endAt) : undefined,
      },
    });
  }

  async remove(id: string, officeId: string) {
    const existing = await this.prisma.appointment.findFirst({ where: { id, officeId } });
    if (!existing) throw new NotFoundException('Evento nÃ£o encontrado');
    return this.prisma.appointment.delete({
      where: { id },
    });
  }

  async book(id: string, data: UpdateAppointmentDto, officeId: string) {
    const appt = await this.prisma.appointment.findFirst({ where: { id, officeId } });
    if (!appt) throw new NotFoundException('Evento nÃ£o encontrado');
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        leadId: data.leadId,
        clientId: data.clientId,
        phone: data.phone,
        channel: data.channel,
        notes: data.notes,
      },
    });
  }
}
