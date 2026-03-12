import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrelloService } from '../integrations/trello.service';

@Injectable()
export class DeadlinesService {
  constructor(
    private prisma: PrismaService,
    private trello: TrelloService,
  ) {}

  async create(data: any, officeId: string) {
    const deadline = await this.prisma.legalDeadline.create({
      data: {
        ...data,
        officeId,
      },
    });

    try {
      const trelloCard = await this.trello.createCard({
        name: data.title,
        desc: `Prazo do processo ${data.processId}`,
        officeId,
      });

      await this.prisma.legalDeadline.update({
        where: { id: deadline.id },
        data: {
          trelloCardId: trelloCard.id,
        },
      });
    } catch (error) {
      console.error('Erro ao criar card no Trello:', error.message);
    }

    return deadline;
  }

  async findAll(officeId: string) {
    return this.prisma.legalDeadline.findMany({
      where: { officeId },
      include: {
        process: true,
      },
    });
  }

  async update(id: string, data: any, officeId: string) {
    const existing = await this.prisma.legalDeadline.findFirst({ where: { id, officeId } });
    if (!existing) throw new Error('Prazo nÃ£o encontrado');
    return this.prisma.legalDeadline.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, officeId: string) {
    const existing = await this.prisma.legalDeadline.findFirst({ where: { id, officeId } });
    if (!existing) throw new Error('Prazo nÃ£o encontrado');
    return this.prisma.legalDeadline.delete({
      where: { id },
    });
  }
}
