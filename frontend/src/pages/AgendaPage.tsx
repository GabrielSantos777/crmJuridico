import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FormInput } from '@/components/FormInput';
import { Calendar, Link as LinkIcon, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarEmail,
  isGoogleCalendarConnected,
  listGoogleCalendarEvents,
  type GoogleCalendarEvent,
} from '@/services/googleCalendar';

type GoogleCalendarStatus = {
  connected: boolean;
  googleEmail?: string | null;
};

const statusClass = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'status-active';
    case 'tentative':
      return 'status-info';
    case 'cancelled':
      return 'status-urgent';
    default:
      return 'status-pending';
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'Confirmado';
    case 'tentative':
      return 'Pendente';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
};

const toInputDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const toRangeDateTime = (date: string, endOfDay = false) => {
  if (!date) return undefined;
  const clock = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  return new Date(`${date}${clock}`).toISOString();
};

const formatEventWhen = (event: GoogleCalendarEvent) => {
  if (event.isAllDay) {
    const [year, month, day] = event.startAt.split('-').map(Number);
    if (year && month && day) {
      const value = new Date(year, month - 1, day);
      return `${value.toLocaleDateString('pt-BR')} (dia inteiro)`;
    }
    return 'Dia inteiro';
  }

  const start = new Date(event.startAt);
  return `${start.toLocaleDateString('pt-BR')} as ${start.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export default function AgendaPage() {
  const [status, setStatus] = useState<GoogleCalendarStatus>({ connected: false });
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [search, setSearch] = useState('');

  const [range, setRange] = useState(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 30);

    return {
      from: toInputDate(from),
      to: toInputDate(to),
    };
  });

  const loadStatus = () => {
    const connected = isGoogleCalendarConnected();
    const googleEmail = getGoogleCalendarEmail();
    setStatus({ connected, googleEmail });
    return connected;
  };

  const loadEvents = async () => {
    if (!status.connected) {
      setEvents([]);
      return;
    }

    setLoadingEvents(true);
    try {
      const data = await listGoogleCalendarEvents({
        from: toRangeDateTime(range.from),
        to: toRangeDateTime(range.to, true),
        maxResults: 250,
      });
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (String(err?.message).includes('google_not_connected')) {
        setStatus({ connected: false });
        setEvents([]);
        toast.error('Sua sessao Google expirou. Conecte novamente.');
        return;
      }
      toast.error('Erro ao carregar eventos do Google Calendar');
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    const connected = loadStatus();
    if (connected) {
      loadEvents();
    }
  }, []);

  const filteredEvents = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) {
      return events;
    }

    return events.filter((event) => {
      return (
        event.title.toLowerCase().includes(text) ||
        String(event.description ?? '').toLowerCase().includes(text) ||
        String(event.location ?? '').toLowerCase().includes(text)
      );
    });
  }, [events, search]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const data = await connectGoogleCalendar();
      setStatus(data);
      toast.success('Conta Google conectada com sucesso');
      await loadEvents();
    } catch (err: any) {
      if (String(err?.message).includes('missing_google_client_id')) {
        toast.error('Configure VITE_GOOGLE_CLIENT_ID no frontend');
      } else {
        toast.error('Nao foi possivel conectar com Google Calendar');
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const ok = window.confirm('Deseja desconectar sua conta Google Calendar deste navegador?');
    if (!ok) return;

    try {
      await disconnectGoogleCalendar();
      setStatus({ connected: false });
      setEvents([]);
      toast.success('Conta Google desconectada');
    } catch {
      toast.error('Erro ao desconectar conta Google');
    }
  };

  return (
    <DashboardLayout title="Agenda">
      <div className="mb-4 rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-card-foreground">Google Calendar</h3>
            <p className="text-sm text-muted-foreground">
              Clique em conectar e veja os eventos reais da sua conta Google.
            </p>
            {status.connected && (
              <p className="mt-1 text-xs text-muted-foreground">
                Conectado como <span className="font-medium text-foreground">{status.googleEmail || 'Conta Google'}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status.connected ? (
              <>
                <button
                  onClick={loadEvents}
                  disabled={loadingEvents}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingEvents ? 'animate-spin' : ''}`} /> Atualizar
                </button>
                <a
                  href="https://calendar.google.com/calendar/u/0/r"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  <LinkIcon className="h-4 w-4" /> Abrir no Google
                </a>
                <button
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Unplug className="h-4 w-4" /> Desconectar
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <Calendar className="h-4 w-4" /> {connecting ? 'Conectando...' : 'Conectar Google Calendar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {status.connected && (
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <FormInput
            label="Pesquisar"
            placeholder="Titulo, descricao ou local"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FormInput
            label="Data inicial"
            type="date"
            value={range.from}
            onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
          />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <FormInput
                label="Data final"
                type="date"
                value={range.to}
                onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <button
              onClick={loadEvents}
              disabled={loadingEvents}
              className="h-10 rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-60"
            >
              Buscar
            </button>
          </div>
        </div>
      )}

      {!status.connected ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Conecte sua conta Google para visualizar os eventos da sua agenda.
        </div>
      ) : loadingEvents ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <div key={event.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-secondary">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground">{formatEventWhen(event)}</p>
                {event.location && <p className="text-xs text-muted-foreground">{event.location}</p>}
                {event.htmlLink && (
                  <a
                    className="text-xs text-primary underline"
                    href={event.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir evento no Google
                  </a>
                )}
              </div>

              <span className={`status-badge ${statusClass(event.status)}`}>
                {statusLabel(event.status)}
              </span>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
              Nenhum evento encontrado no periodo selecionado
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
