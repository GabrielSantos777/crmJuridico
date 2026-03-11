import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetricsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'LAWYER')
  async getMetrics() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const leadsMonth = await this.prisma.lead.count({
      where: { createdAt: { gte: start, lte: end } },
    });

    const newClients = await this.prisma.client.count({
      where: { createdAt: { gte: start, lte: end } },
    });

    const conversionRate =
      leadsMonth === 0 ? 0 : Number(((newClients / leadsMonth) * 100).toFixed(1));

    return {
      leadsMonth,
      newClients,
      conversionRate,
      estimatedRevenue: 0,
    };
  }
}
