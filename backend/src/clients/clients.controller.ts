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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Response } from 'express';
import type { Multer } from 'multer';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {

  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@Query('q') q?: string) {
    return this.clientsService.findAll(q);
  }

  @Post()
  create(@Body() data: any) {
    return this.clientsService.create(data);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.clientsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  @Get(':id/files')
  listFiles(@Param('id') id: string) {
    return this.clientsService.listFiles(id);
  }

  @Post(':id/files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: async (req, _file, cb) => {
          const clientId = req.params.id;
          const dest = path.join(process.cwd(), 'uploads', 'clients', clientId);
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
    @UploadedFile() file: Multer.File,
  ) {
    return this.clientsService.attachFile(id, file);
  }

  @Get(':id/files/:fileId/download')
  async downloadFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const file = await this.clientsService.getFile(id, fileId);
    return res.download(file.storagePath, file.originalName);
  }

  @Delete(':id/files/:fileId')
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    return this.clientsService.deleteFile(id, fileId);
  }
}
