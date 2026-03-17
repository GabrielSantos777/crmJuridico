import {
  Controller,
  Delete,
  Get,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OfficeGuard } from '../auth/office.guard';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('auth-url')
  @UseGuards(JwtAuthGuard, OfficeGuard)
  getAuthUrl(@Request() req) {
    return this.googleCalendarService.getAuthUrl(req.user.userId, req.user.officeId);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, OfficeGuard)
  status(@Request() req) {
    return this.googleCalendarService.getStatus(req.user.userId, req.user.officeId);
  }

  @Get('events')
  @UseGuards(JwtAuthGuard, OfficeGuard)
  events(
    @Request() req,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('maxResults') maxResults?: string,
  ) {
    return this.googleCalendarService.listEvents({
      userId: req.user.userId,
      officeId: req.user.officeId,
      from,
      to,
      q,
      maxResults: maxResults ? Number(maxResults) : undefined,
    });
  }

  @Get('upcoming')
  @UseGuards(JwtAuthGuard, OfficeGuard)
  upcoming(@Request() req, @Query('limit') limit?: string) {
    return this.googleCalendarService.upcoming(
      req.user.userId,
      req.user.officeId,
      limit ? Number(limit) : 5,
    );
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard, OfficeGuard)
  disconnect(@Request() req) {
    return this.googleCalendarService.disconnect(req.user.userId, req.user.officeId);
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.googleCalendarService.handleOAuthCallback({
      code,
      state,
      error,
    });
    return res.redirect(redirectUrl);
  }
}
