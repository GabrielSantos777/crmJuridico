import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CNJService } from '../integrations/cnj.service';

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

  private cnj = new CNJService();

  async syncFromCNJ(number: string) {
    const data = await this.cnj.getProcess(number);

    const process = await this.prisma.process.findFirst({
      where: { number },
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

  async importFromCNJ(number: string, clientCode: string) {
    const data = await this.cnj.getProcess(number);
    const client = await this.prisma.client.findUnique({ where: { code: clientCode } });
    if (!client) {
      throw new Error('Cliente nÃ£o encontrado');
    }
    const existing = await this.prisma.process.findFirst({ where: { number } });
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

  async create(data: any) {
    // procurar cliente pelo CODE
    const client = await this.prisma.client.findUnique({
      where: { code: data.clientCode },
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
      },
    });
  }

  async addEvent(code: string, description: string) {
    const process = await this.prisma.process.findUnique({
      where: { code },
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

  async findAll() {
    return this.prisma.process.findMany({
      include: {
        client: true,
        court: true,
        events: true,
      },
    });
  }

  async findOne(code: string) {
    return this.prisma.process.findUnique({
      where: { code },
      include: {
        client: true,
        court: true,
        events: true,
      },
    });
  }
}
