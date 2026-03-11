import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrelloService } from '../integrations/trello.service';

@Injectable()
export class DeadlinesService {
  constructor(
    private prisma: PrismaService,
    private trello: TrelloService,
  ) {}

  async create(data: any) {
    const deadline = await this.prisma.legalDeadline.create({
      data,
    });

    try {
      const trelloCard = await this.trello.createCard({
        name: data.title,
        desc: `Prazo do processo ${data.processId}`,
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

  async findAll() {
    return this.prisma.legalDeadline.findMany({
      include: {
        process: true,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.legalDeadline.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.legalDeadline.delete({
      where: { id },
    });
  }
}
