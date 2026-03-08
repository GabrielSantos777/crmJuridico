import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

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

  async addEvent(processId: string, description: string) {
    return this.prisma.processEvent.create({
      data: {
        processId,
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

  async findOne(id: string) {
    return this.prisma.process.findUnique({
      where: { id },
      include: {
        client: true,
        court: true,
        events: true,
      },
    });
  }
}
