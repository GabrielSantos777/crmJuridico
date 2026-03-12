import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { Multer } from 'multer'

@Injectable()
export class ClientsService {

  constructor(private prisma: PrismaService) {}

  private async generateClientCode(officeId: string) {
    let seq: number
    try {
      const result: any = await this.prisma.$queryRaw`
        SELECT nextval('client_code_seq') as seq
      `
      seq = Number(result[0].seq)
    } catch {
      const count = await this.prisma.client.count({ where: { officeId } })
      seq = count + 1
    }
    const year = new Date().getFullYear()
    const number = String(seq).padStart(4, '0')

    return `C-${year}-${number}`
  }

  async create(data: any, officeId: string) {
    const code = await this.generateClientCode(officeId)
    const phoneNormalized = data?.phone
      ? String(data.phone).replace(/\D/g, '')
      : undefined
    const client = await this.prisma.client.create({
      data: { ...data, code, phoneNormalized, officeId },
    })
    await this.prisma.notification.create({
      data: {
        type: 'CLIENT_NEW',
        title: 'Novo cliente',
        body: `${client.name} - ${client.phone}`,
        link: '/clients',
        officeId,
      },
    })
    return client
  }

  async findAll(officeId: string, q?: string) {
    return this.prisma.client.findMany({
      where: q
        ? { officeId, name: { contains: q, mode: 'insensitive' } }
        : { officeId },
      include: {
        lead: true,
      },
    })
  }

  async findOne(id: string, officeId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, officeId },
    })
    if (!client) throw new NotFoundException('Cliente nao encontrado')
    return client
  }

  async update(id: string, data: any, officeId: string) {
    const existing = await this.prisma.client.findFirst({ where: { id, officeId } })
    if (!existing) throw new NotFoundException('Cliente nao encontrado')
    const phoneNormalized = data?.phone
      ? String(data.phone).replace(/\D/g, '')
      : undefined
    return this.prisma.client.update({
      where: { id },
      data: { ...data, phoneNormalized },
    })
  }

  async remove(id: string, officeId: string) {
    const existing = await this.prisma.client.findFirst({ where: { id, officeId } })
    if (!existing) throw new NotFoundException('Cliente nao encontrado')
    return this.prisma.client.delete({
      where: { id },
    })
  }

  async listFiles(clientId: string, officeId: string) {
    return this.prisma.clientFile.findMany({
      where: { clientId, client: { officeId } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async attachFile(clientId: string, file: Multer.File, officeId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, officeId },
    })
    if (!client) throw new NotFoundException('Cliente nao encontrado')

    return this.prisma.clientFile.create({
      data: {
        clientId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath: file.path,
      },
    })
  }

  async getFile(clientId: string, fileId: string, officeId: string) {
    const file = await this.prisma.clientFile.findUnique({
      where: { id: fileId },
    })
    if (!file || file.clientId !== clientId) {
      throw new NotFoundException('Arquivo nao encontrado')
    }
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, officeId },
    })
    if (!client) {
      throw new NotFoundException('Arquivo nao encontrado')
    }
    return file
  }

  async deleteFile(clientId: string, fileId: string, officeId: string) {
    const file = await this.getFile(clientId, fileId, officeId)

    await this.prisma.clientFile.delete({
      where: { id: fileId },
    })

    try {
      await fs.unlink(path.resolve(file.storagePath))
    } catch {
      // ignore missing files
    }

    return { ok: true }
  }
}
