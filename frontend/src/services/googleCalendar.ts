import {
  createGoogleCalendarEvent as createGoogleCalendarEventApi,
  deleteGoogleCalendarEvent as deleteGoogleCalendarEventApi,
  disconnectGoogleCalendar as disconnectGoogleCalendarApi,
  getGoogleCalendarAuthUrl,
  getGoogleCalendarStatus as getGoogleCalendarStatusApi,
  listGoogleCalendarEvents as listGoogleCalendarEventsApi,
  listGoogleCalendarUpcoming as listGoogleCalendarUpcomingApi,
  updateGoogleCalendarEvent as updateGoogleCalendarEventApi,
} from './api';

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  status: 'confirmed' | 'tentative' | 'cancelled' | string;
  htmlLink?: string | null;
  startAt: string;
  endAt?: string | null;
  isAllDay: boolean;
  organizerEmail?: string | null;
  creatorEmail?: string | null;
  source: 'GOOGLE';
};

export type GoogleCalendarStatus = {
  connected: boolean;
  googleEmail?: string | null;
  expiresAt?: string | null;
  connectedAt?: string | null;
  hasRefreshToken?: boolean;
  connectedByUserId?: string | null;
};

export type CreateGoogleCalendarEventInput = {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
};

export type UpdateGoogleCalendarEventInput = {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
};

const extractErrorText = (error: any) => {
  const responseMessage = error?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(' ');
  if (typeof responseMessage === 'string') return responseMessage;
  return String(error?.message || '');
};

const isNotConnectedError = (error: any) => {
  const status = Number(error?.response?.status || 0);
  const message = extractErrorText(error).toLowerCase();

  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    message.includes('nao conectada') ||
    message.includes('expirou') ||
    message.includes('reconecte')
  );
};

const throwNormalizedGoogleError = (error: any, fallback: string) => {
  if (isNotConnectedError(error)) {
    throw new Error('google_not_connected');
  }
  throw new Error(fallback);
};

export const isGoogleCalendarConnected = async () => {
  const status = await getGoogleCalendarStatus();
  return Boolean(status.connected);
};

export const getGoogleCalendarEmail = async () => {
  const status = await getGoogleCalendarStatus();
  return status.googleEmail || null;
};

export const getGoogleCalendarStatus = async (): Promise<GoogleCalendarStatus> => {
  try {
    const data = await getGoogleCalendarStatusApi();
    return {
      connected: Boolean(data?.connected),
      googleEmail: data?.googleEmail ?? null,
      expiresAt: data?.expiresAt ?? null,
      connectedAt: data?.connectedAt ?? null,
      hasRefreshToken: Boolean(data?.hasRefreshToken),
      connectedByUserId: data?.connectedByUserId ?? null,
    };
  } catch (error: any) {
    if (isNotConnectedError(error)) {
      return { connected: false, googleEmail: null };
    }
    throw error;
  }
};

export const connectGoogleCalendar = async () => {
  const data = await getGoogleCalendarAuthUrl();
  const targetUrl = String(data?.url || '').trim();

  if (!targetUrl) {
    throw new Error('google_auth_url_missing');
  }

  window.location.assign(targetUrl);
  return { connected: false } as GoogleCalendarStatus;
};

export const disconnectGoogleCalendar = async () => {
  return disconnectGoogleCalendarApi();
};

export const listGoogleCalendarEvents = async (params?: {
  from?: string;
  to?: string;
  q?: string;
  maxResults?: number;
  interactiveAuth?: boolean;
}) => {
  try {
    return await listGoogleCalendarEventsApi({
      from: params?.from,
      to: params?.to,
      q: params?.q,
      maxResults: params?.maxResults,
    });
  } catch (error: any) {
    throwNormalizedGoogleError(error, 'google_calendar_fetch_error');
  }
};

export const createGoogleCalendarEvent = async (payload: CreateGoogleCalendarEventInput) => {
  try {
    return await createGoogleCalendarEventApi({
      ...payload,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
    });
  } catch (error: any) {
    throwNormalizedGoogleError(error, 'google_calendar_create_error');
  }
};

export const updateGoogleCalendarEvent = async (
  eventId: string,
  payload: UpdateGoogleCalendarEventInput,
) => {
  try {
    return await updateGoogleCalendarEventApi(eventId, {
      ...payload,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
    });
  } catch (error: any) {
    throwNormalizedGoogleError(error, 'google_calendar_update_error');
  }
};

export const deleteGoogleCalendarEvent = async (eventId: string) => {
  try {
    return await deleteGoogleCalendarEventApi(eventId);
  } catch (error: any) {
    throwNormalizedGoogleError(error, 'google_calendar_delete_error');
  }
};

export const listGoogleCalendarUpcoming = async (limit = 5) => {
  try {
    return await listGoogleCalendarUpcomingApi(limit);
  } catch (error: any) {
    throwNormalizedGoogleError(error, 'google_calendar_fetch_error');
  }
};
