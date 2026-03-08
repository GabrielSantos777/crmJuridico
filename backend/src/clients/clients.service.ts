import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ClientsService {

  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.client.create({
      data
    })
  }

  async findAll() {
    return this.prisma.client.findMany({
      include: {
        lead: true
      }
    })
  }

}