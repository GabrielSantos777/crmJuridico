import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Response } from 'express';
import type { Multer } from 'multer';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OfficeGuard } from '../auth/office.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard, OfficeGuard)
export class ClientsController {

  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@Request() req, @Query('q') q?: string) {
    return this.clientsService.findAll(req.user.officeId, q);
  }

  @Post()
  create(@Body() data: any, @Request() req) {
    return this.clientsService.create(data, req.user.officeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.clientsService.findOne(id, req.user.officeId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any, @Request() req) {
    return this.clientsService.update(id, data, req.user.officeId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.clientsService.remove(id, req.user.officeId);
  }

  @Get(':id/files')
  listFiles(@Param('id') id: string, @Request() req) {
    return this.clientsService.listFiles(id, req.user.officeId);
  }

  @Post(':id/files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: async (req, _file, cb) => {
          const normalizedClientId = Array.isArray(clientId) ? clientId[0] : clientId;
          const dest = path.join(process.cwd(), 'uploads', 'clients', normalizedClientId);
          try {
            await fs.mkdir(dest, { recursive: true });
            cb(null, dest);
          } catch (err) {
            cb(err as Error, dest);
          }
        },
        filename: (_req, file, cb) => {
          const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const unique = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}_${safe}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.Fil
    @Request() req,
  ) {
    return this.clientsService.attachFile(id, file, req.user.officeId);
  }

  @Get(':id/files/:fileId/download')
  async downloadFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
    @Request() req,
  ) {
    const file = await this.clientsService.getFile(id, fileId, req.user.officeId);
    return res.download(file.storagePath, file.originalName);
  }

  @Delete(':id/files/:fileId')
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Request() req,
  ) {
    return this.clientsService.deleteFile(id, fileId, req.user.officeId);
  }
}
