import { BadRequestException, Body, Controller, Get, Patch, Post, UseInterceptors, UploadedFile, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import type { Multer } from 'multer';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OfficeGuard } from '../auth/office.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard, OfficeGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('office')
  getOffice(@Request() req) {
    return this.settingsService.getOffice(req.user.officeId);
  }

  @Patch('office')
  updateOffice(@Body() data: any, @Request() req) {
    return this.settingsService.updateOffice(req.user.officeId, data);
  }

  @Post('office/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: async (_req, _file, cb) => {
          const dest = path.join(process.cwd(), 'uploads', 'office');
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
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('Arquivo nao enviado');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Formato de arquivo invalido');
    }
    const logoUrl = `/uploads/office/${file.filename}`;
    return this.settingsService.updateOffice(req.user.officeId, { logoUrl });
  }
}
