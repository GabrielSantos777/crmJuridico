import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async list(params?: { unreadOnly?: boolean; limit?: number; officeId?: string }) {
    const { unreadOnly, limit, officeId } = params ?? {};
    return this.prisma.notification.findMany({
      where: {
        ...(officeId ? { officeId } : {}),
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async create(data: { type: string; title: string; body?: string; link?: string; officeId: string }) {
    return this.prisma.notification.create({ data });
  }

  async markRead(id: string, officeId: string) {
    const existing = await this.prisma.notification.findFirst({ where: { id, officeId } });
    if (!existing) {
      return null;
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(officeId: string) {
    return this.prisma.notification.updateMany({
      where: { readAt: null, officeId },
      data: { readAt: new Date() },
    });
  }
}
