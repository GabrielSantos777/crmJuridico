const GOOGLE_TOKEN_KEY = 'google_calendar_access_token';
const GOOGLE_TOKEN_EXPIRES_AT_KEY = 'google_calendar_access_token_expires_at';
const GOOGLE_EMAIL_KEY = 'google_calendar_email';

const GOOGLE_CALENDAR_SCOPE = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

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

declare global {
  interface Window {
    google?: any;
  }
}

let gisLoader: Promise<void> | null = null;

const getClientId = () => (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID?.trim();

const getStoredToken = () => localStorage.getItem(GOOGLE_TOKEN_KEY);
const getStoredExpiresAt = () => Number(localStorage.getItem(GOOGLE_TOKEN_EXPIRES_AT_KEY) || 0);

const saveToken = (accessToken: string, expiresInSec: number) => {
  const expiresAt = Date.now() + Math.max(1, expiresInSec - 30) * 1000;
  localStorage.setItem(GOOGLE_TOKEN_KEY, accessToken);
  localStorage.setItem(GOOGLE_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
};

const clearStoredAuth = () => {
  localStorage.removeItem(GOOGLE_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(GOOGLE_EMAIL_KEY);
};

const hasValidToken = () => {
  const token = getStoredToken();
  if (!token) return false;
  return getStoredExpiresAt() > Date.now();
};

const ensureConfigured = () => {
  if (!getClientId()) {
    throw new Error('missing_google_client_id');
  }
};

const loadGoogleScript = async () => {
  if (window.google?.accounts?.oauth2) {
    return;
  }

  if (!gisLoader) {
    gisLoader = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-google-gsi="1"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('google_script_load_error')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleGsi = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('google_script_load_error'));
      document.head.appendChild(script);
    });
  }

  await gisLoader;
};

const requestToken = async (mode: 'silent' | 'consent' | 'select_account') => {
  ensureConfigured();
  await loadGoogleScript();

  return new Promise<{ accessToken: string; expiresIn: number }>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response: GoogleTokenResponse) => {
        if (response?.error || !response?.access_token) {
          reject(new Error(response?.error_description || response?.error || 'google_token_error'));
          return;
        }

        resolve({
          accessToken: response.access_token,
          expiresIn: response.expires_in ?? 3600,
        });
      },
    });

    const prompt =
      mode === 'silent' ? '' : mode === 'select_account' ? 'select_account consent' : 'consent';

    client.requestAccessToken({ prompt });
  });
};

const fetchGoogleEmail = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;
  const data = await response.json();
  return typeof data?.email === 'string' ? data.email : null;
};

const ensureEmail = async (accessToken: string) => {
  const cachedEmail = localStorage.getItem(GOOGLE_EMAIL_KEY);
  if (cachedEmail) return cachedEmail;

  const email = await fetchGoogleEmail(accessToken);
  if (email) {
    localStorage.setItem(GOOGLE_EMAIL_KEY, email);
  }
  return email;
};

const ensureAccessToken = async (interactive: boolean) => {
  if (hasValidToken()) {
    return getStoredToken() as string;
  }

  try {
    const token = await requestToken(interactive ? 'consent' : 'silent');
    saveToken(token.accessToken, token.expiresIn);
    return token.accessToken;
  } catch {
    if (!interactive) {
      return null;
    }
    throw new Error('google_token_error');
  }
};

const mapEvent = (item: any): GoogleCalendarEvent => {
  const startAt = item?.start?.dateTime ?? item?.start?.date ?? '';
  const endAt = item?.end?.dateTime ?? item?.end?.date ?? null;
  const isAllDay = Boolean(item?.start?.date && !item?.start?.dateTime);

  return {
    id: item?.id ?? crypto.randomUUID(),
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
};

export const isGoogleCalendarConnected = () => hasValidToken();

export const getGoogleCalendarEmail = () => localStorage.getItem(GOOGLE_EMAIL_KEY);

export const getGoogleCalendarStatus = async (): Promise<GoogleCalendarStatus> => {
  const accessToken = await ensureAccessToken(false);
  if (!accessToken) {
    return { connected: false, googleEmail: null };
  }

  const email = await ensureEmail(accessToken);
  return {
    connected: true,
    googleEmail: email,
  };
};

export const connectGoogleCalendar = async () => {
  const token = await requestToken('select_account');
  saveToken(token.accessToken, token.expiresIn);

  const email = await fetchGoogleEmail(token.accessToken);
  if (email) {
    localStorage.setItem(GOOGLE_EMAIL_KEY, email);
  } else {
    localStorage.removeItem(GOOGLE_EMAIL_KEY);
  }

  return {
    connected: true,
    googleEmail: email,
  } as GoogleCalendarStatus;
};

export const disconnectGoogleCalendar = async () => {
  const accessToken = getStoredToken();
  clearStoredAuth();

  if (!accessToken) return;

  try {
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `token=${encodeURIComponent(accessToken)}`,
    });
  } catch {
    // ignore revoke failure
  }
};

export const listGoogleCalendarEvents = async (params?: {
  from?: string;
  to?: string;
  q?: string;
  maxResults?: number;
  interactiveAuth?: boolean;
}) => {
  const accessToken = await ensureAccessToken(Boolean(params?.interactiveAuth));

  if (!accessToken) {
    throw new Error('google_not_connected');
  }

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('showDeleted', 'false');
  url.searchParams.set('maxResults', String(Math.max(1, Math.min(params?.maxResults ?? 100, 2500))));
  url.searchParams.set('timeMin', params?.from ?? new Date().toISOString());

  if (params?.to) {
    url.searchParams.set('timeMax', params.to);
  }
  if (params?.q?.trim()) {
    url.searchParams.set('q', params.q.trim());
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearStoredAuth();
      throw new Error('google_not_connected');
    }
    throw new Error('google_calendar_fetch_error');
  }

  const data = await response.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map(mapEvent);
};

export const createGoogleCalendarEvent = async (payload: CreateGoogleCalendarEventInput) => {
  const accessToken = await ensureAccessToken(true);

  if (!accessToken) {
    throw new Error('google_not_connected');
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: payload.title,
      description: payload.description || undefined,
      location: payload.location || undefined,
      start: {
        dateTime: payload.startAt,
        timeZone: timezone,
      },
      end: {
        dateTime: payload.endAt,
        timeZone: timezone,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearStoredAuth();
      throw new Error('google_not_connected');
    }
    throw new Error('google_calendar_create_error');
  }

  const data = await response.json();
  return mapEvent(data);
};

export const updateGoogleCalendarEvent = async (
  eventId: string,
  payload: UpdateGoogleCalendarEventInput,
) => {
  const accessToken = await ensureAccessToken(true);

  if (!accessToken) {
    throw new Error('google_not_connected');
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: payload.title,
        description: payload.description || undefined,
        location: payload.location || undefined,
        start: {
          dateTime: payload.startAt,
          timeZone: timezone,
        },
        end: {
          dateTime: payload.endAt,
          timeZone: timezone,
        },
      }),
    },
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearStoredAuth();
      throw new Error('google_not_connected');
    }
    throw new Error('google_calendar_update_error');
  }

  const data = await response.json();
  return mapEvent(data);
};

export const deleteGoogleCalendarEvent = async (eventId: string) => {
  const accessToken = await ensureAccessToken(true);

  if (!accessToken) {
    throw new Error('google_not_connected');
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    if (response.status === 401 || response.status === 403) {
      clearStoredAuth();
      throw new Error('google_not_connected');
    }
    throw new Error('google_calendar_delete_error');
  }
};

export const listGoogleCalendarUpcoming = async (limit = 5) => {
  return listGoogleCalendarEvents({
    from: new Date().toISOString(),
    maxResults: Math.max(1, Math.min(limit, 50)),
    interactiveAuth: false,
  });
};

