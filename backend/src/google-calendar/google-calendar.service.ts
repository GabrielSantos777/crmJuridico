import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type GoogleOAuthToken = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleStatePayload = {
  userId: string;
  officeId: string;
  nonce: string;
};

@Injectable()
export class GoogleCalendarService {
  constructor(private prisma: PrismaService) {}

  async getAuthUrl(userId: string, officeId: string) {
    const { clientId, redirectUri } = this.getGoogleOAuthConfig();

    const state = jwt.sign(
      {
        userId,
        officeId,
        nonce: randomUUID(),
      } as GoogleStatePayload,
      this.getJwtSecret(),
      { expiresIn: '10m' },
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);

    return {
      url: url.toString(),
      scopes,
    };
  }

  async handleOAuthCallback(params: {
    code?: string;
    state?: string;
    error?: string;
  }) {
    if (params.error) {
      return this.buildAgendaRedirect('error', params.error);
    }

    if (!params.code || !params.state) {
      return this.buildAgendaRedirect('error', 'missing_code_or_state');
    }

    let statePayload: GoogleStatePayload;
    try {
      statePayload = jwt.verify(params.state, this.getJwtSecret()) as GoogleStatePayload;
    } catch {
      return this.buildAgendaRedirect('error', 'invalid_state');
    }

    if (!statePayload.userId || !statePayload.officeId) {
      return this.buildAgendaRedirect('error', 'invalid_state_payload');
    }

    try {
      const token = await this.exchangeAuthCodeForToken(params.code);

      if (!token.access_token) {
        return this.buildAgendaRedirect('error', 'missing_access_token');
      }

      const existing = await this.prisma.googleCalendarConnection.findUnique({
        where: {
          userId_officeId: {
            userId: statePayload.userId,
            officeId: statePayload.officeId,
          },
        },
      });

      const refreshToken = token.refresh_token ?? existing?.refreshToken ?? null;
      const googleEmail = await this.fetchGoogleUserEmail(token.access_token).catch(
        () => existing?.googleEmail ?? null,
      );

      await this.prisma.googleCalendarConnection.upsert({
        where: {
          userId_officeId: {
            userId: statePayload.userId,
            officeId: statePayload.officeId,
          },
        },
        create: {
          userId: statePayload.userId,
          officeId: statePayload.officeId,
          googleEmail,
          accessToken: token.access_token,
          refreshToken,
          scope: token.scope ?? null,
          tokenType: token.token_type ?? null,
          expiryDate: this.resolveExpiryDate(token.expires_in),
        },
        update: {
          googleEmail,
          accessToken: token.access_token,
          refreshToken,
          scope: token.scope ?? null,
          tokenType: token.token_type ?? null,
          expiryDate: this.resolveExpiryDate(token.expires_in),
        },
      });
    } catch {
      return this.buildAgendaRedirect('error', 'token_exchange_failed');
    }

    return this.buildAgendaRedirect('connected');
  }

  async getStatus(userId: string, officeId: string) {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId_officeId: { userId, officeId } },
    });

    if (!connection) {
      return {
        connected: false,
      };
    }

    return {
      connected: true,
      googleEmail: connection.googleEmail,
      expiresAt: connection.expiryDate?.toISOString() ?? null,
      connectedAt: connection.createdAt.toISOString(),
      hasRefreshToken: Boolean(connection.refreshToken),
    };
  }

  async disconnect(userId: string, officeId: string) {
    await this.prisma.googleCalendarConnection.deleteMany({
      where: { userId, officeId },
    });
    return {
      connected: false,
    };
  }

  async listEvents(params: {
    userId: string;
    officeId: string;
    from?: string;
    to?: string;
    q?: string;
    maxResults?: number;
  }) {
    const accessToken = await this.getAccessToken(params.userId, params.officeId);
    const maxResults = this.clampMaxResults(params.maxResults);
    const timeMin = params.from ?? new Date().toISOString();
    const timeMax = params.to;

    try {
      const response = await axios.get(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            singleEvents: true,
            orderBy: 'startTime',
            showDeleted: false,
            maxResults,
            timeMin,
            ...(timeMax ? { timeMax } : {}),
            ...(params.q?.trim() ? { q: params.q.trim() } : {}),
          },
        },
      );

      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      return items.map((item: any) => this.mapGoogleEvent(item));
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        throw new UnauthorizedException('Acesso ao Google Calendar expirou. Reconecte sua conta.');
      }
      throw new BadRequestException('Nao foi possivel carregar eventos do Google Calendar.');
    }
  }

  async upcoming(userId: string, officeId: string, limit = 5) {
    return this.listEvents({
      userId,
      officeId,
      from: new Date().toISOString(),
      maxResults: Math.max(1, Math.min(limit, 50)),
    });
  }

  private async getAccessToken(userId: string, officeId: string) {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId_officeId: { userId, officeId } },
    });

    if (!connection) {
      throw new BadRequestException('Conta Google Calendar nao conectada');
    }

    const now = Date.now();
    const expiresAt = connection.expiryDate?.getTime() ?? 0;
    const hasValidAccessToken =
      Boolean(connection.accessToken) &&
      (!expiresAt || expiresAt - now > 60_000);

    if (hasValidAccessToken) {
      return connection.accessToken as string;
    }

    if (!connection.refreshToken) {
      throw new UnauthorizedException('Conexao Google expirada. Reconecte sua conta.');
    }

    const refreshed = await this.refreshAccessToken(connection.refreshToken);

    if (!refreshed.access_token) {
      throw new UnauthorizedException('Nao foi possivel renovar o token do Google.');
    }

    const updated = await this.prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? connection.refreshToken,
        scope: refreshed.scope ?? connection.scope,
        tokenType: refreshed.token_type ?? connection.tokenType,
        expiryDate: this.resolveExpiryDate(refreshed.expires_in) ?? connection.expiryDate,
      },
    });

    return updated.accessToken as string;
  }

  private async exchangeAuthCodeForToken(code: string) {
    const { clientId, clientSecret, redirectUri } = this.getGoogleOAuthConfig();

    const body = new URLSearchParams();
    body.set('code', code);
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('redirect_uri', redirectUri);
    body.set('grant_type', 'authorization_code');

    const response = await axios.post<GoogleOAuthToken>(
      'https://oauth2.googleapis.com/token',
      body.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  }

  private async refreshAccessToken(refreshToken: string) {
    const { clientId, clientSecret } = this.getGoogleOAuthConfig();

    const body = new URLSearchParams();
    body.set('refresh_token', refreshToken);
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('grant_type', 'refresh_token');

    const response = await axios.post<GoogleOAuthToken>(
      'https://oauth2.googleapis.com/token',
      body.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  }

  private async fetchGoogleUserEmail(accessToken: string) {
    const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const email = response.data?.email;
    return typeof email === 'string' && email.trim() ? email.trim() : null;
  }

  private mapGoogleEvent(item: any) {
    const startAt = item?.start?.dateTime ?? item?.start?.date ?? null;
    const endAt = item?.end?.dateTime ?? item?.end?.date ?? null;
    const isAllDay = Boolean(item?.start?.date && !item?.start?.dateTime);

    return {
      id: item?.id ?? randomUUID(),
      title: item?.summary ?? '(Sem titulo)',
      description: item?.description ?? null,
      location: item?.location ?? null,
      status: item?.status ?? 'confirmed',
      htmlLink: item?.htmlLink ?? null,
      startAt,
      endAt,
      isAllDay,
      organizerEmail: item?.organizer?.email ?? null,
      creatorEmail: item?.creator?.email ?? null,
      source: 'GOOGLE',
    };
  }

  private buildAgendaRedirect(status: 'connected' | 'error', reason?: string) {
    const explicit =
      status === 'connected'
        ? process.env.GOOGLE_OAUTH_SUCCESS_REDIRECT
        : process.env.GOOGLE_OAUTH_ERROR_REDIRECT;

    const fallbackOrigin = this.resolveFrontendOrigin();
    const fallbackUrl = `${fallbackOrigin}/agenda`;

    let target: URL;
    try {
      target = explicit ? new URL(explicit) : new URL(fallbackUrl);
    } catch {
      target = new URL(fallbackUrl);
    }

    target.searchParams.set('google', status);
    if (reason) {
      target.searchParams.set('reason', reason);
    }

    return target.toString();
  }

  private resolveFrontendOrigin() {
    const fromCors = (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .find(Boolean);
    return fromCors || 'http://localhost:5173';
  }

  private clampMaxResults(value?: number) {
    if (!value || Number.isNaN(value)) return 100;
    return Math.max(1, Math.min(Math.floor(value), 2500));
  }

  private resolveExpiryDate(expiresIn?: number) {
    if (!expiresIn || Number.isNaN(expiresIn)) return null;
    return new Date(Date.now() + expiresIn * 1000);
  }

  private getGoogleOAuthConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();

    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException(
        'Google OAuth nao configurado. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_OAUTH_REDIRECT_URI.',
      );
    }

    return { clientId, clientSecret, redirectUri };
  }

  private getJwtSecret() {
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET nao configurado');
    }
    return secret;
  }
}
