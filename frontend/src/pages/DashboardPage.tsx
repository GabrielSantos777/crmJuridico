import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CardMetric } from '@/components/CardMetric';
import { UserPlus, Users, TrendingUp, DollarSign, CalendarClock } from 'lucide-react';
import {
  getGoogleCalendarStatus,
  getMetrics,
  listDeadlines,
  listGoogleCalendarUpcoming,
  listProcesses,
} from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const metricConfig = [
  { key: 'leadsMonth', title: 'Leads do Mes', icon: UserPlus, colorVar: '--metric-leads' },
  { key: 'newClients', title: 'Novos Clientes', icon: Users, colorVar: '--metric-clients' },
  { key: 'conversionRate', title: 'Taxa de Conversao', icon: TrendingUp, colorVar: '--metric-conversion' },
  { key: 'estimatedRevenue', title: 'Receita Estimada', icon: DollarSign, colorVar: '--metric-revenue' },
];

type Upcoming = {
  id: string;
  title: string;
  startAt: string;
  status: string;
  isAllDay?: boolean;
};

const formatUpcomingWhen = (event: Upcoming) => {
  if (event.isAllDay) {
    const [year, month, day] = event.startAt.split('-').map(Number);
    if (year && month && day) {
      return `${new Date(year, month - 1, day).toLocaleDateString('pt-BR')} (dia inteiro)`;
    }
    return 'Dia inteiro';
  }

  const start = new Date(event.startAt);
  return `${start.toLocaleDateString('pt-BR')} as ${start.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>({
    leadsMonth: 0,
    newClients: 0,
    conversionRate: 0,
    estimatedRevenue: 0,
  });
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [recentProcesses, setRecentProcesses] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    if (user?.role !== 'BASIC' && user?.role !== 'UNASSIGNED') {
      getMetrics()
        .then((data) => {
          if (active) setMetrics(data);
        })
        .catch(() => {});
    }

    const loadUpcoming = async () => {
      try {
        const status = await getGoogleCalendarStatus();
        if (!active) return;
        const connected = Boolean(status?.connected);
        setGoogleConnected(connected);

        if (!connected) {
          setUpcoming([]);
          return;
        }

        const data = await listGoogleCalendarUpcoming(5);
        if (active) setUpcoming(data);
      } catch {
        if (!active) return;
        setGoogleConnected(false);
        setUpcoming([]);
      }
    };

    loadUpcoming();

    listProcesses()
      .then((data) => {
        if (!active) return;
        const sorted = [...data].sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setRecentProcesses(sorted.slice(0, 5));
      })
      .catch(() => {});

    listDeadlines()
      .then((data) => {
        if (!active) return;
        const sorted = [...data].sort(
          (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        );
        setUpcomingDeadlines(sorted.slice(0, 5));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const checkReminders = async () => {
      try {
        const items = await listGoogleCalendarUpcoming(20);
        const now = new Date();
        items.forEach((a: any) => {
          const start = a.isAllDay ? new Date(`${a.startAt}T09:00:00`) : new Date(a.startAt);
          if (Number.isNaN(start.getTime())) return;

          const diffMs = start.getTime() - now.getTime();
          const diffMin = Math.round(diffMs / 60000);

          if (diffMin <= 1440 && diffMin > 1430) {
            const key = `reminder_${a.id}_24h`;
            if (!localStorage.getItem(key)) {
              toast(`Evento em 24 horas: ${a.title}`);
              localStorage.setItem(key, '1');
            }
          }

          if (diffMin <= 30 && diffMin > 25) {
            const key = `reminder_${a.id}_30m`;
            if (!localStorage.getItem(key)) {
              toast(`Evento em 30 minutos: ${a.title}`);
              localStorage.setItem(key, '1');
            }
          }
        });
      } catch {
        // ignore
      }
    };

    checkReminders();
    const id = setInterval(checkReminders, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <DashboardLayout title="Dashboard">
      {user?.role === 'BASIC' || user?.role === 'UNASSIGNED' ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Seu acesso nao permite visualizar metricas.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metricConfig.map((m) => (
            <CardMetric
              key={m.key}
              title={m.title}
              value={
                m.key === 'conversionRate'
                  ? `${metrics[m.key]}%`
                  : m.key === 'estimatedRevenue'
                    ? `R$ ${metrics[m.key]}`
                    : metrics[m.key]
              }
              icon={m.icon}
              trend=""
              trendUp
              colorVar={m.colorVar}
            />
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 lg:col-span-1">
          <h3 className="mb-4 text-base font-semibold text-card-foreground">Agenda Proxima</h3>
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
                {googleConnected === false
                  ? 'Conecte seu Google Calendar na Agenda para exibir eventos'
                  : 'Nenhum evento agendado'}
              </div>
            ) : (
              upcoming.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-secondary p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{formatUpcomingWhen(e)}</p>
                  </div>
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 lg:col-span-1">
          <h3 className="mb-4 text-base font-semibold text-card-foreground">Processos Recentes</h3>
          <div className="space-y-3">
            {recentProcesses.length === 0 ? (
              <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">Nenhum processo cadastrado</div>
            ) : (
              recentProcesses.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-secondary p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.client?.name ?? 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground">{p.number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{p.area}</span>
                    <span
                      className={`status-badge ${String(p.status).toLowerCase().includes('andamento') ? 'status-active' : 'status-pending'}`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 lg:col-span-1">
          <h3 className="mb-4 text-base font-semibold text-card-foreground">Prazos Proximos</h3>
          <div className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">Nenhum prazo cadastrado</div>
            ) : (
              upcomingDeadlines.map((d) => {
                const due = new Date(d.dueDate);
                const diffDays = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const urgent = diffDays <= 3;
                return (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between rounded-lg p-3 ${urgent ? 'bg-destructive/5 border border-destructive/20' : 'bg-secondary'}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.process?.code ? `Proc. ${d.process.code} • ` : ''}Vence em {due.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`status-badge ${urgent ? 'status-urgent' : 'status-info'}`}>
                      {urgent ? 'Urgente' : 'Normal'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
