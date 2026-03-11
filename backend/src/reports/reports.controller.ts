import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private prisma: PrismaService) {}

  private parseRange(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    let toDate = to ? new Date(to) : undefined;
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }
    return {
      from: fromDate,
      to: toDate,
    };
  }

  @Get('clients')
  @Roles('ADMIN', 'LAWYER')
  async clients(@Query('from') from?: string, @Query('to') to?: string) {
    const range = this.parseRange(from, to);
    const where = range.from || range.to ? { createdAt: { gte: range.from, lte: range.to } } : {};
    const total = await this.prisma.client.count({ where });
    const active = await this.prisma.client.count({ where: { ...where, status: 'ACTIVE' } });
    const inactive = await this.prisma.client.count({ where: { ...where, status: 'INACTIVE' } });
    const list = await this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { total, active, inactive, list };
  }

  @Get('processes')
  @Roles('ADMIN', 'LAWYER')
  async processes(@Query('from') from?: string, @Query('to') to?: string) {
    const range = this.parseRange(from, to);
    const where = range.from || range.to ? { createdAt: { gte: range.from, lte: range.to } } : {};

    const byArea = await this.prisma.process.groupBy({
      by: ['area'],
      where,
      _count: { area: true },
    });

    const byStatus = await this.prisma.process.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const list = await this.prisma.process.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { byArea, byStatus, list };
  }

  @Get('performance')
  @Roles('ADMIN', 'LAWYER')
  async performance(@Query('from') from?: string, @Query('to') to?: string) {
    const range = this.parseRange(from, to);
    const where = range.from || range.to ? { createdAt: { gte: range.from, lte: range.to } } : {};
    const leads = await this.prisma.lead.count({ where });
    const clients = await this.prisma.client.count({ where });
    const convertedClients = await this.prisma.client.count({
      where: {
        ...where,
        leadId: { not: null },
      },
    });
    const convertedList = await this.prisma.client.findMany({
      where: {
        ...where,
        leadId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const conversionRate = leads === 0 ? 0 : Number(((clients / leads) * 100).toFixed(1));
    return { leads, clients, convertedClients, convertedList, conversionRate, revenue: 0 };
  }

  @Get('financial')
  @Roles('ADMIN', 'LAWYER')
  async financial(@Query('from') from?: string, @Query('to') to?: string) {
    return { revenue: 0, fees: 0 };
  }
}
