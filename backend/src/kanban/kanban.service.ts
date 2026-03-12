import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrelloService } from '../integrations/trello.service';

@Injectable()
export class KanbanService {
  constructor(private prisma: PrismaService, private trello: TrelloService) {}

  private boardId() {
    return process.env.TRELLO_BOARD_ID;
  }

  async listBoard(officeId: string) {
    const columns = await this.prisma.kanbanColumn.findMany({
      where: { officeId },
      orderBy: { order: 'asc' },
      include: { cards: { orderBy: { order: 'asc' } } },
    });
    return columns;
  }

  async createColumn(title: string, officeId: string) {
    const count = await this.prisma.kanbanColumn.count({ where: { officeId } });
    const column = await this.prisma.kanbanColumn.create({
      data: { title, order: count + 1, officeId },
    });

    const boardId = this.boardId();
    if (boardId) {
      try {
        const list = await this.trello.createList(title, boardId);
        await this.prisma.kanbanColumn.update({
          where: { id: column.id },
          data: { externalId: list.id },
        });
      } catch {
        // ignore sync errors
      }
    }

    return column;
  }

  async updateColumn(id: string, title: string, officeId: string) {
    const existing = await this.prisma.kanbanColumn.findFirst({ where: { id, officeId } });
    if (!existing) throw new Error('Coluna nÃ£o encontrada');
    const column = await this.prisma.kanbanColumn.update({
      where: { id },
      data: { title },
    });

    if (column.externalId) {
      try {
        await this.trello.updateList(column.externalId, title);
      } catch {
        // ignore sync errors
      }
    }
    return column;
  }

  async createCard(data: {
    columnId: string;
    title: string;
    description?: string;
    dueAt?: string;
  }, officeId: string) {
    const count = await this.prisma.kanbanCard.count({
      where: { columnId: data.columnId },
    });

    const card = await this.prisma.kanbanCard.create({
      data: {
        columnId: data.columnId,
        title: data.title,
        description: data.description,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        order: count + 1,
        officeId,
      },
    });

    const column = await this.prisma.kanbanColumn.findFirst({
      where: { id: data.columnId, officeId },
    });

    if (column?.externalId) {
      try {
        const trelloCard = await this.trello.createTrelloCard({
          name: data.title,
          desc: data.description,
          listId: column.externalId,
          due: data.dueAt,
        });
        await this.prisma.kanbanCard.update({
          where: { id: card.id },
          data: { externalId: trelloCard.id },
        });
      } catch {
        // ignore sync errors
      }
    }

    await this.prisma.notification.create({
      data: {
        type: 'KANBAN_CARD_NEW',
        title: 'Novo card no Trello',
        body: data.title,
        link: '/trello',
        officeId,
      },
    });

    return card;
  }

  async updateCard(id: string, data: { title?: string; description?: string; dueAt?: string }, officeId: string) {
    const existing = await this.prisma.kanbanCard.findFirst({ where: { id, officeId } });
    if (!existing) throw new Error('Card nÃ£o encontrado');
    const card = await this.prisma.kanbanCard.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      },
    });

    if (card.externalId) {
      try {
        await this.trello.updateTrelloCard({
          id: card.externalId,
          name: card.title,
          desc: card.description || undefined,
          due: card.dueAt ? card.dueAt.toISOString() : null,
        });
      } catch {
        // ignore sync errors
      }
    }
    return card;
  }

  async moveCard(id: string, toColumnId: string, order: number, officeId: string) {
    const existing = await this.prisma.kanbanCard.findFirst({ where: { id, officeId } });
    if (!existing) throw new Error('Card nÃ£o encontrado');
    const card = await this.prisma.kanbanCard.update({
      where: { id },
      data: {
        columnId: toColumnId,
        order,
      },
    });

    const column = await this.prisma.kanbanColumn.findFirst({
      where: { id: toColumnId, officeId },
    });

    if (card.externalId && column?.externalId) {
      try {
        await this.trello.updateTrelloCard({
          id: card.externalId,
          listId: column.externalId,
        });
      } catch {
        // ignore sync errors
      }
    }

    return card;
  }

  async deleteCard(id: string, officeId: string) {
    const existing = await this.prisma.kanbanCard.findFirst({ where: { id, officeId } });
    if (!existing) throw new Error('Card nÃ£o encontrado');
    const card = await this.prisma.kanbanCard.delete({ where: { id } });
    if (card.externalId) {
      try {
        await this.trello.deleteTrelloCard(card.externalId);
      } catch {
        // ignore
      }
    }
    return card;
  }

  async deleteColumn(id: string, officeId: string) {
    const column = await this.prisma.kanbanColumn.findFirst({ where: { id, officeId } });
    if (!column) throw new Error('Coluna nÃ£o encontrada');
    await this.prisma.kanbanColumn.delete({ where: { id } });
    if (column?.externalId) {
      try {
        await this.trello.closeList(column.externalId);
      } catch {
        // ignore
      }
    }
    return { ok: true };
  }

  async syncFromTrello(officeId: string) {
    const boardId = this.boardId();
    if (!boardId) return { synced: 0 };

    const lists = await this.trello.listLists(boardId);
    let synced = 0;

    for (let i = 0; i < lists.length; i += 1) {
      const list = lists[i];
      let column = await this.prisma.kanbanColumn.findFirst({
        where: { externalId: list.id, officeId },
      });

      if (!column) {
        column = await this.prisma.kanbanColumn.create({
          data: { title: list.name, order: i + 1, externalId: list.id, officeId },
        });
      } else {
        column = await this.prisma.kanbanColumn.update({
          where: { id: column.id },
          data: { title: list.name, order: i + 1 },
        });
      }

      const cards = await this.trello.listCardsByList(list.id);
      for (let c = 0; c < cards.length; c += 1) {
        const card = cards[c];
        const existing = await this.prisma.kanbanCard.findFirst({
          where: { externalId: card.id, officeId },
        });
        if (!existing) {
          await this.prisma.kanbanCard.create({
            data: {
              columnId: column.id,
              title: card.name,
              description: card.desc || undefined,
              dueAt: card.due ? new Date(card.due) : undefined,
              order: c + 1,
              externalId: card.id,
              officeId,
            },
          });
        } else {
          await this.prisma.kanbanCard.update({
            where: { id: existing.id },
            data: {
              columnId: column.id,
              title: card.name,
              description: card.desc || undefined,
              dueAt: card.due ? new Date(card.due) : undefined,
              order: c + 1,
            },
          });
        }
        synced += 1;
      }
    }
    return { synced };
  }
}

