import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CNJService } from '../integrations/cnj.service';

type ExternalMovement = {
  description: string;
  date: Date;
};

type ExternalProcessPayload = {
  number: string;
  title: string;
  area: string;
  status: string;
  movements: ExternalMovement[];
  lastMovementAt: string | null;
  lastMovementDescription: string | null;
  latestMovementSummary: string;
  raw: any;
};

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

  private cnj = new CNJService();

  private normalizeText(value: any) {
    if (typeof value !== 'string') return '';
    return value.trim();
  }

  private normalizeProcessNumber(value: any) {
    const text = this.normalizeText(value);
    return text || null;
  }

  private parseDate(value: any) {
    if (!value) return null;

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;

    if (typeof value === 'string') {
      const isoGuess = value.replace(' ', 'T');
      const retry = new Date(isoGuess);
      if (!Number.isNaN(retry.getTime())) return retry;
    }

    return null;
  }

  private extractMovements(raw: any): ExternalMovement[] {
    const list =
      (Array.isArray(raw?.movimentacoes) && raw.movimentacoes) ||
      (Array.isArray(raw?.movements) && raw.movements) ||
      (Array.isArray(raw?.eventos) && raw.eventos) ||
      [];

    const mapped = list
      .map((item: any) => {
        const description =
          this.normalizeText(item?.descricao) ||
          this.normalizeText(item?.description) ||
          this.normalizeText(item?.movimento) ||
          this.normalizeText(item?.titulo) ||
          '';
        const date =
          this.parseDate(item?.data) ||
          this.parseDate(item?.date) ||
          this.parseDate(item?.dataHora) ||
          this.parseDate(item?.updatedAt);

        if (!description || !date) return null;
        return { description, date } as ExternalMovement;
      })
      .filter(Boolean) as ExternalMovement[];

    mapped.sort((a, b) => b.date.getTime() - a.date.getTime());
    return mapped;
  }

  private mapExternalProcess(raw: any, fallbackNumber?: string): ExternalProcessPayload | null {
    const number =
      this.normalizeProcessNumber(raw?.numeroProcesso) ||
      this.normalizeProcessNumber(raw?.numero) ||
      this.normalizeProcessNumber(raw?.number) ||
      this.normalizeProcessNumber(raw?.processNumber) ||
      this.normalizeProcessNumber(raw?.cnjNumber) ||
      this.normalizeProcessNumber(fallbackNumber);

    if (!number) return null;

    const movements = this.extractMovements(raw);
    const latestMovement = movements[0] ?? null;

    const title =
      this.normalizeText(raw?.classe) ||
      this.normalizeText(raw?.titulo) ||
      this.normalizeText(raw?.title) ||
      this.normalizeText(raw?.assunto) ||
      'Processo importado';
    const area =
      this.normalizeText(raw?.area) ||
      this.normalizeText(raw?.ramoJustica) ||
      this.normalizeText(raw?.tribunal) ||
      'N/A';
    const status =
      this.normalizeText(raw?.status) ||
      this.normalizeText(raw?.situacao) ||
      this.normalizeText(raw?.statusProcessual) ||
      'Em andamento';

    return {
      number,
      title,
      area,
      status,
      movements,
      lastMovementAt: latestMovement ? latestMovement.date.toISOString() : null,
      lastMovementDescription: latestMovement?.description ?? null,
      latestMovementSummary: latestMovement?.description ?? 'Sem movimentacoes recentes',
      raw,
    };
  }

  private async nextProcessCode(officeId: string) {
    let sequence = (await this.prisma.process.count({ where: { officeId } })) + 1;

    while (true) {
      const code = `PROC-${String(sequence).padStart(4, '0')}`;
      const exists = await this.prisma.process.findFirst({
        where: { code, officeId },
        select: { id: true },
      });

      if (!exists) return code;
      sequence += 1;
    }
  }

  private async appendMovements(processId: string, movements: ExternalMovement[]) {
    if (!movements.length) return 0;

    const existingEvents = await this.prisma.processEvent.findMany({
      where: { processId },
      select: { description: true, date: true },
    });

    const existingSet = new Set(
      existingEvents.map((event) => `${event.date.toISOString()}|${event.description.trim().toLowerCase()}`),
    );

    const toCreate = movements
      .filter((movement) => {
        const key = `${movement.date.toISOString()}|${movement.description.trim().toLowerCase()}`;
        if (existingSet.has(key)) return false;
        existingSet.add(key);
        return true;
      })
      .map((movement) => ({
        processId,
        description: movement.description,
        date: movement.date,
      }));

    if (!toCreate.length) return 0;

    await this.prisma.processEvent.createMany({ data: toCreate });
    return toCreate.length;
  }

  private mapStoredProcessSummary(process: any) {
    const latestEvent = Array.isArray(process.events)
      ? [...process.events].sort((a: any, b: any) => b.date.getTime() - a.date.getTime())[0]
      : null;

    return {
      ...process,
      lastMovementAt: latestEvent?.date?.toISOString?.() ?? null,
      lastMovementDescription: latestEvent?.description ?? null,
      latestMovementSummary: latestEvent?.description ?? 'Sem movimentacoes recentes',
    };
  }

  private async upsertExternalProcess(
    payload: ExternalProcessPayload,
    clientId: string,
    officeId: string,
  ) {
    const existing = await this.prisma.process.findFirst({
      where: { number: payload.number, officeId },
    });

    if (existing) {
      const updated = await this.prisma.process.update({
        where: { id: existing.id },
        data: {
          title: payload.title || existing.title,
          area: payload.area || existing.area,
          status: payload.status || existing.status,
          clientId,
        },
      });

      const eventsImported = await this.appendMovements(updated.id, payload.movements);
      return { process: updated, created: false, eventsImported };
    }

    const code = await this.nextProcessCode(officeId);
    const created = await this.prisma.process.create({
      data: {
        code,
        number: payload.number,
        title: payload.title,
        area: payload.area,
        status: payload.status,
        clientId,
        officeId,
      },
    });

    const eventsImported = await this.appendMovements(created.id, payload.movements);
    return { process: created, created: true, eventsImported };
  }

  async syncFromCNJ(number: string, officeId: string) {
    const data = await this.cnj.getProcess(number);
    const mapped = this.mapExternalProcess(data, number);

    const process = await this.prisma.process.findFirst({
      where: { number, officeId },
    });

    if (!process) {
      return mapped ?? data;
    }

    const importedEvents = await this.appendMovements(process.id, mapped?.movements ?? []);
    return {
      ...(mapped ?? { number }),
      syncedWithProcessCode: process.code,
      importedEvents,
    };
  }

  async importFromCNJ(number: string, clientCode: string, officeId: string) {
    const client = await this.prisma.client.findFirst({ where: { code: clientCode, officeId } });
    if (!client) {
      throw new BadRequestException('Cliente nao encontrado');
    }

    const data = await this.cnj.getProcess(number);
    const mapped = this.mapExternalProcess(data, number);

    if (!mapped) {
      throw new BadRequestException('Nao foi possivel importar processo pelo numero informado');
    }

    const result = await this.upsertExternalProcess(mapped, client.id, officeId);

    return {
      ...result.process,
      importedEvents: result.eventsImported,
      created: result.created,
    };
  }

  async searchByOab(oab: string, officeId: string) {
    const normalizedOab = this.normalizeText(oab).toUpperCase();
    if (!normalizedOab) {
      throw new BadRequestException('Informe um numero OAB valido');
    }

    const remote = await this.cnj.searchByOab(normalizedOab);
    const mapped = remote
      .map((item: any) => this.mapExternalProcess(item))
      .filter(Boolean) as ExternalProcessPayload[];

    const deduped = Array.from(
      mapped.reduce((acc, item) => acc.set(item.number, item), new Map<string, ExternalProcessPayload>()).values(),
    );

    if (!deduped.length) {
      return [];
    }

    const existing = await this.prisma.process.findMany({
      where: {
        officeId,
        number: { in: deduped.map((item) => item.number) },
      },
      include: {
        client: true,
        events: true,
      },
    });

    const existingMap = new Map(existing.map((item) => [item.number, this.mapStoredProcessSummary(item)]));

    return deduped.map((item) => ({
      oab: normalizedOab,
      number: item.number,
      title: item.title,
      area: item.area,
      status: item.status,
      lastMovementAt: item.lastMovementAt,
      lastMovementDescription: item.lastMovementDescription,
      latestMovementSummary: item.latestMovementSummary,
      imported: existingMap.has(item.number),
      localProcess: existingMap.get(item.number) ?? null,
    }));
  }

  async importByOab(oab: string, clientCode: string, officeId: string, limit = 20) {
    const client = await this.prisma.client.findFirst({ where: { code: clientCode, officeId } });
    if (!client) {
      throw new BadRequestException('Cliente nao encontrado');
    }

    const normalizedOab = this.normalizeText(oab).toUpperCase();
    if (!normalizedOab) {
      throw new BadRequestException('Informe um numero OAB valido');
    }

    const safeLimit = Math.max(1, Math.min(Math.floor(limit || 20), 100));
    const searchResults = await this.searchByOab(normalizedOab, officeId);

    const imported: Array<{ number: string; code: string; created: boolean; importedEvents: number }> = [];
    let skipped = 0;

    for (const item of searchResults.slice(0, safeLimit)) {
      if (!item?.number) {
        skipped += 1;
        continue;
      }

      let mapped = this.mapExternalProcess(item, item.number);
      if (!mapped || !mapped.movements.length) {
        const details = await this.cnj.getProcess(item.number);
        mapped = this.mapExternalProcess(details, item.number);
      }

      if (!mapped) {
        skipped += 1;
        continue;
      }

      const result = await this.upsertExternalProcess(mapped, client.id, officeId);
      imported.push({
        number: result.process.number,
        code: result.process.code,
        created: result.created,
        importedEvents: result.eventsImported,
      });
    }

    return {
      oab: normalizedOab,
      processed: Math.min(searchResults.length, safeLimit),
      importedCount: imported.length,
      createdCount: imported.filter((item) => item.created).length,
      updatedCount: imported.filter((item) => !item.created).length,
      skippedCount: skipped,
      imported,
    };
  }

  async create(data: any, officeId: string) {
    const client = await this.prisma.client.findFirst({
      where: { code: data.clientCode, officeId },
    });

    if (!client) {
      throw new BadRequestException('Cliente nao encontrado');
    }

    const code = await this.nextProcessCode(officeId);

    return this.prisma.process.create({
      data: {
        code,
        number: data.number,
        title: data.title,
        area: data.area,
        status: data.status,
        clientId: client.id,
        officeId,
      },
    });
  }

  async addEvent(code: string, description: string, officeId: string) {
    const process = await this.prisma.process.findFirst({
      where: { code, officeId },
    });

    if (!process) {
      throw new NotFoundException('Processo nao encontrado');
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
    const processes = await this.prisma.process.findMany({
      where: { officeId },
      include: {
        client: true,
        court: true,
        events: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return processes.map((process) => this.mapStoredProcessSummary(process));
  }

  async findByClientCode(clientCode: string, officeId: string) {
    const client = await this.prisma.client.findFirst({
      where: { code: clientCode, officeId },
    });

    if (!client) {
      throw new BadRequestException('Cliente nao encontrado');
    }

    const processes = await this.prisma.process.findMany({
      where: { officeId, clientId: client.id },
      include: {
        client: true,
        court: true,
        events: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      client: {
        id: client.id,
        code: client.code,
        name: client.name,
      },
      total: processes.length,
      processes: processes.map((process) => this.mapStoredProcessSummary(process)),
    };
  }

  async findOne(code: string, officeId: string) {
    const process = await this.prisma.process.findFirst({
      where: { code, officeId },
      include: {
        client: true,
        court: true,
        events: true,
      },
    });

    if (!process) return null;
    return this.mapStoredProcessSummary(process);
  }
}
