import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrelloService {
  constructor(private prisma: PrismaService) {}

  private getAuth() {
    const key = process.env.TRELLO_KEY;
    const token = process.env.TRELLO_TOKEN;
    return { key, token };
  }

  async createList(name: string, boardId: string) {
    const { key, token } = this.getAuth();
    const response = await axios.post(`https://api.trello.com/1/lists`, null, {
      params: { name, idBoard: boardId, key, token },
    });
    return response.data;
  }

  async listLists(boardId: string) {
    const { key, token } = this.getAuth();
    const response = await axios.get(`https://api.trello.com/1/boards/${boardId}/lists`, {
      params: { key, token },
    });
    return response.data;
  }

  async listCardsByList(listId: string) {
    const { key, token } = this.getAuth();
    const response = await axios.get(`https://api.trello.com/1/lists/${listId}/cards`, {
      params: { key, token },
    });
    return response.data;
  }

  async updateList(id: string, name: string) {
    const { key, token } = this.getAuth();
    const response = await axios.put(`https://api.trello.com/1/lists/${id}`, null, {
      params: { name, key, token },
    });
    return response.data;
  }

  async createTrelloCard(params: {
    name: string;
    desc?: string;
    listId: string;
    due?: string;
  }) {
    const { key, token } = this.getAuth();
    const response = await axios.post(`https://api.trello.com/1/cards`, null, {
      params: {
        name: params.name,
        desc: params.desc,
        idList: params.listId,
        due: params.due,
        key,
        token,
      },
    });
    return response.data;
  }

  async updateTrelloCard(params: {
    id: string;
    name?: string;
    desc?: string;
    listId?: string;
    due?: string | null;
  }) {
    const { key, token } = this.getAuth();
    const response = await axios.put(`https://api.trello.com/1/cards/${params.id}`, null, {
      params: {
        name: params.name,
        desc: params.desc,
        idList: params.listId,
        due: params.due,
        key,
        token,
      },
    });
    return response.data;
  }

  async deleteTrelloCard(id: string) {
    const { key, token } = this.getAuth();
    await axios.delete(`https://api.trello.com/1/cards/${id}`, {
      params: { key, token },
    });
  }

  async closeList(id: string) {
    const { key, token } = this.getAuth();
    await axios.put(`https://api.trello.com/1/lists/${id}/closed`, null, {
      params: { value: true, key, token },
    });
  }

  async listCards(listId?: string) {
    const { key, token } = this.getAuth();
    const idList = listId ?? process.env.TRELLO_LIST_ID;
    const response = await axios.get(`https://api.trello.com/1/lists/${idList}/cards`, {
      params: { key, token },
    });
    return response.data;
  }

  async createCard(params: {
    name: string;
    desc?: string;
    listId?: string;
    due?: string;
    createAppointment?: boolean;
  }) {
    const { key, token } = this.getAuth();
    const idList = params.listId ?? process.env.TRELLO_LIST_ID;
    const response = await axios.post(`https://api.trello.com/1/cards`, null, {
      params: {
        name: params.name,
        desc: params.desc,
        idList,
        due: params.due,
        key,
        token,
      },
    });

    const card = response.data;

    if (params.createAppointment && card?.due) {
      const startAt = new Date(card.due);
      const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
      await this.prisma.appointment.upsert({
        where: {
          externalSource_externalId: {
            externalSource: 'TRELLO',
            externalId: card.id,
          },
        },
        update: {
          title: card.name,
          description: card.desc || undefined,
          startAt,
          endAt,
          status: 'SCHEDULED',
          type: 'OTHER',
          mode: 'ONLINE',
        },
        create: {
          title: card.name,
          description: card.desc || undefined,
          startAt,
          endAt,
          status: 'SCHEDULED',
          type: 'OTHER',
          mode: 'ONLINE',
          externalSource: 'TRELLO',
          externalId: card.id,
        },
      });
    }

    return card;
  }

  async syncDueCardsToAgenda(listId?: string) {
    const cards = await this.listCards(listId);
    const created: any[] = [];
    for (const card of cards) {
      if (!card?.due) continue;
      const startAt = new Date(card.due);
      const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
      const appt = await this.prisma.appointment.upsert({
        where: {
          externalSource_externalId: {
            externalSource: 'TRELLO',
            externalId: card.id,
          },
        },
        update: {
          title: card.name,
          description: card.desc || undefined,
          startAt,
          endAt,
          status: 'SCHEDULED',
          type: 'OTHER',
          mode: 'ONLINE',
        },
        create: {
          title: card.name,
          description: card.desc || undefined,
          startAt,
          endAt,
          status: 'SCHEDULED',
          type: 'OTHER',
          mode: 'ONLINE',
          externalSource: 'TRELLO',
          externalId: card.id,
        },
      });
      created.push(appt);
    }
    return created;
  }
}
