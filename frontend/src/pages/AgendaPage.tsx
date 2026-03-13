import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Modal } from '@/components/Modal';
import { FormInput } from '@/components/FormInput';
import { Calendar, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '@/services/api';

type Appointment = {
  id: string;
  title: string;
  description?: string;
  type: 'CONSULTATION' | 'AUDIENCE' | 'DOCUMENT' | 'MEETING' | 'OTHER';
  mode: 'ONLINE' | 'IN_PERSON';
  startAt: string;
  endAt: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'AVAILABLE';
  location?: string;
  notes?: string;
};

const statusClass = (s: string) => {
  switch (s) {
    case 'AVAILABLE': return 'status-info';
    case 'SCHEDULED': return 'status-active';
    case 'CANCELLED': return 'status-urgent';
    case 'COMPLETED': return 'status-pending';
    default: return '';
  }
};

const typeLabel = (t: Appointment['type']) => {
  switch (t) {
    case 'CONSULTATION': return 'Consulta';
    case 'AUDIENCE': return 'Audiencia';
    case 'DOCUMENT': return 'Documento';
    case 'MEETING': return 'Reuniao';
    default: return 'Outro';
  }
};

const modeLabel = (m: Appointment['mode']) => (m === 'ONLINE' ? 'Online' : 'Presencial');

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'CONSULTATION',
    mode: 'ONLINE',
    status: 'SCHEDULED',
    location: '',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 30);
      const data = await listAppointments({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setAppointments(data);
    } catch {
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      type: 'CONSULTATION',
      mode: 'ONLINE',
      status: 'SCHEDULED',
      location: '',
      notes: '',
    });
    setEditing(null);
  };

  const openEdit = (a: Appointment) => {
    const start = new Date(a.startAt);
    const end = new Date(a.endAt);
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description || '',
      date: start.toISOString().slice(0, 10),
      startTime: start.toTimeString().slice(0, 5),
      endTime: end.toTimeString().slice(0, 5),
      type: a.type,
      mode: a.mode,
      status: a.status,
      location: a.location || '',
      notes: a.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.date || !form.startTime || !form.endTime) {
      toast.error('Preencha titulo, data e horario');
      return;
    }
    const startAt = new Date(`${form.date}T${form.startTime}:00`);
    const endAt = new Date(`${form.date}T${form.endTime}:00`);

    const payload = {
      title: form.title,
      description: form.description || undefined,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      type: form.type,
      mode: form.mode,
      status: form.status,
      location: form.location || undefined,
      notes: form.notes || undefined,
    };

    try {
      if (editing) {
        await updateAppointment(editing.id, payload);
        toast.success('Evento atualizado');
      } else {
        await createAppointment(payload);
        toast.success('Evento criado');
      }
      setIsModalOpen(false);
      resetForm();
      await load();
    } catch {
      toast.error('Erro ao salvar evento');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAppointment(deleteTarget.id);
      toast.success('Evento removido');
      await load();
    } catch {
      toast.error('Erro ao remover evento');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = useMemo(() => {
    let list = appointments;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q));
    }
    if (filterStatus) {
      list = list.filter((a) => a.status === filterStatus);
    }
    return list;
  }, [appointments, search, filterStatus]);

  return (
    <DashboardLayout title="Agenda">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{appointments.length} eventos nos proximos 30 dias</div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Novo Evento
        </button>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <FormInput label="Pesquisar" placeholder="Buscar por titulo" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Filtro</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            <option value="AVAILABLE">Disponivel</option>
            <option value="SCHEDULED">Agendado</option>
            <option value="COMPLETED">Concluido</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-secondary">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.startAt).toLocaleDateString('pt-BR')} as {new Date(e.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {e.location && (e.location.startsWith('http://') || e.location.startsWith('https://')) && (
                  <a className="text-xs text-primary underline" href={e.location} target="_blank" rel="noreferrer">
                    Abrir link da reuniao
                  </a>
                )}
                <p className="text-xs text-muted-foreground">
                  {typeLabel(e.type)} • {modeLabel(e.mode)}
                </p>
              </div>
              <span className={`status-badge ${statusClass(e.status)}`}>{e.status}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteTarget(e)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Nenhum evento encontrado</div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Editar Evento' : 'Novo Evento'}>
        <div className="space-y-4">
          <FormInput label="Titulo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Consulta, audiencia, etc" />
          <FormInput label="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes" />
          <div className="grid gap-4 md:grid-cols-3">
            <FormInput label="Data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <FormInput label="Inicio" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <FormInput label="Fim" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="CONSULTATION">Consulta</option>
                <option value="AUDIENCE">Audiencia</option>
                <option value="DOCUMENT">Documento</option>
                <option value="MEETING">Reuniao</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Modo</label>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="ONLINE">Online</option>
                <option value="IN_PERSON">Presencial</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="SCHEDULED">Agendado</option>
                <option value="AVAILABLE">Disponivel</option>
                <option value="COMPLETED">Concluido</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
          </div>
          <FormInput label="Local" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Endereco ou link" />
          <FormInput label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observacoes internas" />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsModalOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">Cancelar</button>
            <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Salvar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar exclusao">
        <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este evento permanentemente?</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">Cancelar</button>
          <button onClick={handleDelete} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90">Excluir</button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
