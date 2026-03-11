import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async list(params?: { unreadOnly?: boolean; limit?: number }) {
    const { unreadOnly, limit } = params ?? {};
    return this.prisma.notification.findMany({
      where: unreadOnly ? { readAt: null } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async create(data: { type: string; title: string; body?: string; link?: string }) {
    return this.prisma.notification.create({ data });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead() {
    return this.prisma.notification.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });
  }
}
