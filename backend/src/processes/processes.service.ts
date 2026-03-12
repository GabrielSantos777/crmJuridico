import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CNJService } from '../integrations/cnj.service';

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

  private cnj = new CNJService();

  async syncFromCNJ(number: string, officeId: string) {
    const data = await this.cnj.getProcess(number);

    const process = await this.prisma.process.findFirst({
      where: { number, officeId },
    });

    if (!process) return data;

    for (const mov of data.movimentacoes) {
      await this.prisma.processEvent.create({
        data: {
          processId: process.id,
          description: mov.descricao,
          date: new Date(mov.data),
        },
      });
    }

    return data;
  }

  async importFromCNJ(number: string, clientCode: string, officeId: string) {
    const data = await this.cnj.getProcess(number);
    const client = await this.prisma.client.findFirst({ where: { code: clientCode, officeId } });
    if (!client) {
      throw new Error('Cliente nÃ£o encontrado');
    }
    const existing = await this.prisma.process.findFirst({ where: { number, officeId } });
    if (existing) return existing;

    const count = await this.prisma.process.count();
    const code = `PROC-${String(count + 1).padStart(4, '0')}`;

    const process = await this.prisma.process.create({
      data: {
        code,
        number,
        title: data?.classe || data?.titulo || 'Processo importado',
        area: data?.area || 'N/A',
        status: data?.status || 'Em andamento',
        clientId: client.id,
        officeId,
      },
    });

    if (data?.movimentacoes?.length) {
      for (const mov of data.movimentacoes) {
        await this.prisma.processEvent.create({
          data: {
            processId: process.id,
            description: mov.descricao,
            date: new Date(mov.data),
          },
        });
      }
    }

    return process;
  }

  async create(data: any, officeId: string) {
    // procurar cliente pelo CODE
    const client = await this.prisma.client.findFirst({
      where: { code: data.clientCode, officeId },
    });

    if (!client) {
      throw new Error('Cliente não encontrado');
    }

    // contar processos existentes
    const count = await this.prisma.process.count();

    // gerar código automático
    const code = `PROC-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.process.create({
      data: {
        code: code,
        number: data.number,
        title: data.title,
        area: data.area,
        status: data.status,
        clientId: client.id, // usa o ID real do cliente
        officeId,
      },
    });
  }

  async addEvent(code: string, description: string, officeId: string) {
    const process = await this.prisma.process.findFirst({
      where: { code, officeId },
    });

    if (!process) {
      throw new Error('Processo não encontrado');
    }

    return this.prisma.processEvent.create({
      data: {
        processId: process.id,
        description,
        date: new Date(),
      },
    });
  }

  async findAll(officeId: string) {
    return this.prisma.process.findMany({
      where: { officeId },
      include: {
        client: true,
        court: true,
        events: true,
      },
    });
  }

  async findOne(code: string, officeId: string) {
    return this.prisma.process.findFirst({
      where: { code, officeId },
      include: {
        client: true,
        court: true,
        events: true,
      },
    });
  }
}
