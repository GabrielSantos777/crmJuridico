import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FormInput } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  RefreshCw,
  Unplug,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  connectGoogleCalendar,
  createGoogleCalendarEvent,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  type GoogleCalendarEvent,
  type GoogleCalendarStatus,
  listGoogleCalendarEvents,
} from '@/services/googleCalendar';

type ViewMode = 'week' | 'list';

const DAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const MONTH_LABEL = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const LIST_DAY_LABEL = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

const START_HOUR = 7;
const END_HOUR = 22;
const SLOT_HEIGHT = 56;

const pad2 = (value: number) => String(value).padStart(2, '0');

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const startOfWeek = (date: Date) => {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
};

const endOfWeek = (date: Date) => endOfDay(addDays(startOfWeek(date), 6));

const toInputDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const parseEventDate = (value: string, isAllDay: boolean) => {
  if (!value) return null;

  if (isAllDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatHour = (hour: number) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized} ${suffix}`;
};

const formatEventWhen = (event: GoogleCalendarEvent) => {
  const start = parseEventDate(event.startAt, event.isAllDay);
  if (!start) return 'Horario invalido';

  if (event.isAllDay) {
    return `${start.toLocaleDateString('pt-BR')} (dia inteiro)`;
  }

  const end = parseEventDate(event.endAt || '', false);
  if (!end) {
    return `${start.toLocaleDateString('pt-BR')} as ${start.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return `${start.toLocaleDateString('pt-BR')} ${start.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function AgendaPage() {
  const [status, setStatus] = useState<GoogleCalendarStatus>({ connected: false });
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(() => ({
    title: '',
    description: '',
    location: '',
    date: toInputDate(new Date()),
    startTime: '09:00',
    endTime: '10:00',
  }));

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const miniMonthDays = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const total = last.getDate();
    const leading = first.getDay();

    const grid: Array<{ date: Date | null; label: string }> = [];

    for (let i = 0; i < leading; i++) {
      grid.push({ date: null, label: '' });
    }

    for (let day = 1; day <= total; day++) {
      grid.push({
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
        label: String(day),
      });
    }

    while (grid.length % 7 !== 0) {
      grid.push({ date: null, label: '' });
    }

    return grid;
  }, [currentDate]);

  const filteredEvents = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return events;

    return events.filter((event) => {
      return (
        event.title.toLowerCase().includes(text) ||
        String(event.description || '').toLowerCase().includes(text) ||
        String(event.location || '').toLowerCase().includes(text)
      );
    });
  }, [events, search]);

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, GoogleCalendarEvent[]>();

    filteredEvents.forEach((event) => {
      const start = parseEventDate(event.startAt, event.isAllDay);
      if (!start) return;
      const key = localDateKey(start);
      const list = grouped.get(key) || [];
      list.push(event);
      grouped.set(key, list);
    });

    grouped.forEach((list) => {
      list.sort((a, b) => {
        const aStart = parseEventDate(a.startAt, a.isAllDay)?.getTime() ?? 0;
        const bStart = parseEventDate(b.startAt, b.isAllDay)?.getTime() ?? 0;
        return aStart - bStart;
      });
    });

    return grouped;
  }, [filteredEvents]);

  const groupedListEvents = useMemo(() => {
    const entries = Array.from(eventsByDay.entries());
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [eventsByDay]);

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        const data = await getGoogleCalendarStatus();
        if (!active) return;
        setStatus(data);
      } catch {
        if (!active) return;
        setStatus({ connected: false });
      }
    };

    loadStatus();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!status.connected) {
      setEvents([]);
      return () => {
        active = false;
      };
    }

    const from = viewMode === 'week' ? weekStart : startOfDay(currentDate);
    const to = viewMode === 'week' ? weekEnd : endOfDay(addDays(currentDate, 30));

    setLoadingEvents(true);

    listGoogleCalendarEvents({
      from: from.toISOString(),
      to: to.toISOString(),
      maxResults: 500,
      interactiveAuth: false,
    })
      .then((data) => {
        if (!active) return;
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch((err: any) => {
        if (!active) return;
        if (String(err?.message).includes('google_not_connected')) {
          setStatus({ connected: false });
          setEvents([]);
          toast.error('Sua sessao Google expirou. Conecte novamente.');
          return;
        }
        toast.error('Erro ao carregar eventos do Google Calendar');
      })
      .finally(() => {
        if (!active) return;
        setLoadingEvents(false);
      });

    return () => {
      active = false;
    };
  }, [status.connected, viewMode, currentDate, weekStart, weekEnd, reloadKey]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const data = await connectGoogleCalendar();
      setStatus(data);
      setReloadKey((prev) => prev + 1);
      toast.success('Conta Google conectada');
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
    const ok = window.confirm('Deseja desconectar a conta Google deste navegador?');
    if (!ok) return;

    await disconnectGoogleCalendar();
    setStatus({ connected: false });
    setEvents([]);
    toast.success('Conta Google desconectada');
  };

  const handleCreateEvent = async () => {
    if (!status.connected) {
      toast.error('Conecte sua conta Google primeiro');
      return;
    }

    if (!createForm.title || !createForm.date || !createForm.startTime || !createForm.endTime) {
      toast.error('Preencha titulo, data e horarios');
      return;
    }

    const start = new Date(`${createForm.date}T${createForm.startTime}:00`);
    const end = new Date(`${createForm.date}T${createForm.endTime}:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      toast.error('Horario invalido');
      return;
    }

    try {
      await createGoogleCalendarEvent({
        title: createForm.title,
        description: createForm.description,
        location: createForm.location,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });

      setIsCreateModalOpen(false);
      setCreateForm({
        title: '',
        description: '',
        location: '',
        date: toInputDate(start),
        startTime: createForm.startTime,
        endTime: createForm.endTime,
      });
      setCurrentDate(start);
      setReloadKey((prev) => prev + 1);
      toast.success('Evento criado no Google Calendar');
    } catch (err: any) {
      if (String(err?.message).includes('google_not_connected')) {
        setStatus({ connected: false });
        toast.error('Sua sessao Google expirou. Conecte novamente.');
        return;
      }
      toast.error('Erro ao criar evento');
    }
  };

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => setCurrentDate((prev) => addDays(prev, viewMode === 'week' ? -7 : -30));
  const goNext = () => setCurrentDate((prev) => addDays(prev, viewMode === 'week' ? 7 : 30));

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const timelineHeight = (END_HOUR - START_HOUR) * SLOT_HEIGHT;

  return (
    <DashboardLayout title="Agenda">
      <div className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl dark:border-slate-800 dark:bg-[#0f1117] dark:text-slate-100">
        <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-border p-5 lg:border-b-0 lg:border-r dark:border-slate-800">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!status.connected}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f6feb] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a7df4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Criar evento
            </button>

            <div className="space-y-2 rounded-xl border border-border bg-background p-4 dark:border-slate-800 dark:bg-[#141922]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground dark:text-slate-400">Conta Google</p>
              {status.connected ? (
                <>
                  <p className="text-sm text-foreground dark:text-slate-200">{status.googleEmail || 'Conectada'}</p>
                  <div className="grid gap-2">
                    <button
                      onClick={() => setReloadKey((prev) => prev + 1)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Atualizar
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10"
                    >
                      <Unplug className="h-3.5 w-3.5" /> Desconectar
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Calendar className="h-3.5 w-3.5" /> {connecting ? 'Conectando...' : 'Conectar conta'}
                </button>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-background p-4 dark:border-slate-800 dark:bg-[#141922]">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold capitalize text-foreground dark:text-slate-200">{MONTH_LABEL.format(currentDate)}</p>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground dark:text-slate-500">
                {DAY_NAMES.map((day) => (
                  <span key={day}>{day.slice(0, 1)}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {miniMonthDays.map((item, index) => {
                  const isSelected = item.date && localDateKey(item.date) === localDateKey(currentDate);
                  const isToday = item.date && localDateKey(item.date) === localDateKey(new Date());

                  return (
                    <button
                      key={`${item.label}-${index}`}
                      disabled={!item.date}
                      onClick={() => item.date && setCurrentDate(item.date)}
                      className={`h-8 rounded-md text-xs transition ${
                        !item.date
                          ? 'cursor-default opacity-0'
                          : isSelected
                            ? 'bg-[#1f6feb] font-semibold text-white'
                            : isToday
                              ? 'border border-[#1f6feb] text-[#7db4ff]'
                              : 'text-foreground hover:bg-accent dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewMode('week')}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    viewMode === 'week'
                      ? 'bg-[#1f6feb] text-white'
                      : 'border border-border hover:bg-accent dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Semana
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    viewMode === 'list'
                      ? 'bg-[#1f6feb] text-white'
                      : 'border border-border hover:bg-accent dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <List className="h-3.5 w-3.5" /> Lista
                </button>
              </div>

              <FormInput
                label="Pesquisar"
                placeholder="Titulo ou local"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </aside>

          <section className="min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={goToday}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Hoje
                </button>
                <button
                  onClick={goPrev}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goNext}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <h2 className="text-lg font-semibold capitalize text-foreground dark:text-slate-100">
                {viewMode === 'week'
                  ? `${weekStart.toLocaleDateString('pt-BR')} - ${weekEnd.toLocaleDateString('pt-BR')}`
                  : MONTH_LABEL.format(currentDate)}
              </h2>
            </div>

            {!status.connected ? (
              <div className="flex h-[520px] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground dark:border-slate-800 dark:bg-[#141922] dark:text-slate-400">
                Conecte sua conta Google para visualizar e criar eventos.
              </div>
            ) : loadingEvents ? (
              <div className="flex h-[520px] items-center justify-center rounded-2xl border border-border bg-card dark:border-slate-800 dark:bg-[#141922]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f6feb] border-t-transparent" />
              </div>
            ) : viewMode === 'week' ? (
              <div className="overflow-auto rounded-2xl border border-border bg-card dark:border-slate-800 dark:bg-[#0d1016]">
                <div className="grid min-w-[960px] grid-cols-[80px_repeat(7,minmax(0,1fr))]">
                  <div className="border-b border-r border-border bg-muted/50 p-2 text-[11px] uppercase tracking-wide text-muted-foreground dark:border-slate-800 dark:bg-[#0f131b] dark:text-slate-500">
                    GMT-03
                  </div>
                  {weekDays.map((day, idx) => {
                    const isToday = localDateKey(day) === localDateKey(new Date());
                    return (
                      <div
                        key={localDateKey(day)}
                        className="border-b border-r border-border bg-muted/50 p-2 text-center dark:border-slate-800 dark:bg-[#0f131b]"
                      >
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground dark:text-slate-500">{DAY_NAMES[idx]}</p>
                        <p className={`text-xl ${isToday ? 'font-bold text-[#8ab4f8]' : 'text-foreground dark:text-slate-100'}`}>
                          {day.getDate()}
                        </p>
                      </div>
                    );
                  })}

                  <div className="border-r border-border dark:border-slate-800">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="h-14 border-b border-border px-2 pt-1 text-right text-[11px] text-muted-foreground dark:border-slate-800 dark:text-slate-500"
                      >
                        {formatHour(hour)}
                      </div>
                    ))}
                  </div>

                  {weekDays.map((day) => {
                    const key = localDateKey(day);
                    const dayEvents = eventsByDay.get(key) || [];
                    const allDayEvents = dayEvents.filter((event) => event.isAllDay);
                    const timedEvents = dayEvents.filter((event) => !event.isAllDay);

                    return (
                      <div key={key} className="relative border-r border-border dark:border-slate-800">
                        <div className="absolute left-1 right-1 top-1 z-20 space-y-1">
                          {allDayEvents.slice(0, 2).map((event) => (
                            <div key={event.id} className="truncate rounded bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground dark:bg-[#2e3a55] dark:text-slate-200">
                              {event.title}
                            </div>
                          ))}
                        </div>

                        <div className="relative" style={{ height: `${timelineHeight}px` }}>
                          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                            <div
                              key={i}
                              className="h-14 border-b border-border dark:border-slate-800"
                            />
                          ))}

                          {timedEvents.map((event) => {
                            const start = parseEventDate(event.startAt, false);
                            const end = parseEventDate(event.endAt || '', false);

                            if (!start) return null;

                            const startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
                            const fallbackEnd = new Date(start.getTime() + 30 * 60 * 1000);
                            const endDate = end || fallbackEnd;
                            const endMinutes = (endDate.getHours() - START_HOUR) * 60 + endDate.getMinutes();

                            const boundedStart = Math.max(0, Math.min(startMinutes, (END_HOUR - START_HOUR) * 60));
                            const boundedEnd = Math.max(
                              boundedStart + 15,
                              Math.min(endMinutes, (END_HOUR - START_HOUR) * 60),
                            );

                            const top = (boundedStart / 60) * SLOT_HEIGHT;
                            const height = Math.max(24, ((boundedEnd - boundedStart) / 60) * SLOT_HEIGHT);

                            return (
                              <a
                                key={event.id}
                                href={event.htmlLink || '#'}
                                target={event.htmlLink ? '_blank' : undefined}
                                rel={event.htmlLink ? 'noreferrer' : undefined}
                                className="absolute left-1 right-1 rounded-md border border-[#7db4ff]/40 bg-[#5f9cf0]/80 px-2 py-1 text-[11px] text-slate-950 shadow"
                                style={{ top: `${top}px`, height: `${height}px` }}
                              >
                                <p className="truncate font-semibold">{event.title}</p>
                                <p className="text-[10px] opacity-80">{formatEventWhen(event)}</p>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-border bg-card p-4 dark:border-slate-800 dark:bg-[#141922]">
                {groupedListEvents.length === 0 ? (
                  <div className="rounded-xl border border-border bg-background p-8 text-center text-sm text-muted-foreground dark:border-slate-700 dark:bg-[#0f131b] dark:text-slate-400">
                    Nenhum evento encontrado
                  </div>
                ) : (
                  groupedListEvents.map(([dayKey, list]) => {
                    const [year, month, day] = dayKey.split('-').map(Number);
                    const dayDate = new Date(year, month - 1, day);
                    return (
                      <div key={dayKey} className="space-y-2">
                        <h3 className="text-sm font-semibold capitalize text-foreground dark:text-slate-300">
                          {LIST_DAY_LABEL.format(dayDate)}
                        </h3>
                        <div className="space-y-2">
                          {list.map((event) => (
                            <div key={event.id} className="rounded-xl border border-border bg-background p-3 dark:border-slate-700 dark:bg-[#0f131b]">
                              <p className="text-sm font-semibold text-foreground dark:text-slate-100">{event.title}</p>
                              <p className="text-xs text-muted-foreground dark:text-slate-400">{formatEventWhen(event)}</p>
                              {event.location && <p className="mt-1 text-xs text-muted-foreground dark:text-slate-500">{event.location}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Novo Evento">
        <div className="space-y-4">
          <FormInput
            label="Titulo"
            value={createForm.title}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Reuniao com cliente"
          />

          <FormInput
            label="Descricao"
            value={createForm.description}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Detalhes"
          />

          <FormInput
            label="Local"
            value={createForm.location}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="Endereco ou link"
          />

          <div className="grid gap-4 md:grid-cols-3">
            <FormInput
              label="Data"
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))}
            />
            <FormInput
              label="Inicio"
              type="time"
              value={createForm.startTime}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, startTime: e.target.value }))}
            />
            <FormInput
              label="Fim"
              type="time"
              value={createForm.endTime}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, endTime: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateEvent}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Criar evento
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

