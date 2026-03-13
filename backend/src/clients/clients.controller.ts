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
import * as fs from 'fs';
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

  @Post(':clientId/files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const clientIdParam = req.params.clientId;
          const normalizedClientId = Array.isArray(clientIdParam)
            ? clientIdParam[0]
            : clientIdParam;

          const dest = path.join(
            process.cwd(),
            'uploads',
            'clients',
            normalizedClientId,
          );
          fs.mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  async uploadFile(
    @Param('clientId') clientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.clientsService.attachFile(clientId, file, req.user.officeId);
  }

  @Get(':id/files/:fileId/download')
  async downloadFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
    @Request() req,
  ) {
    const file = await this.clientsService.getFile(
      id,
      fileId,
      req.user.officeId,
    );
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
