import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Clock, AlertTriangle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { FormInput } from '@/components/FormInput';
import { toast } from 'sonner';
import { listDeadlines, createDeadline, updateDeadline, deleteDeadline, listProcesses } from '@/services/api';

function getDaysUntil(date: string) {
  const diff = new Date(date).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', processId: '', startDate: '', dueDate: '', status: 'Pendente' });

  const load = async () => {
    try {
      const [d, p] = await Promise.all([listDeadlines(), listProcesses()]);
      setDeadlines(d);
      setProcesses(p);
    } catch {
      toast.error('Erro ao carregar prazos');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Vencido': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'Cumprido': return <CheckCircle className="h-5 w-5 text-success" />;
      default: return <Clock className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Vencido': return 'status-urgent';
      case 'Cumprido': return 'status-active';
      default: return 'status-pending';
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.processId || !form.startDate || !form.dueDate) {
      toast.error('Preencha os campos obrigatorios');
      return;
    }
    await createDeadline({
      title: form.title,
      processId: form.processId,
      startDate: new Date(form.startDate),
      dueDate: new Date(form.dueDate),
      status: form.status,
    });
    setIsModalOpen(false);
    setForm({ title: '', processId: '', startDate: '', dueDate: '', status: 'Pendente' });
    await load();
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm('Excluir prazo?');
    if (!confirm) return;
    await deleteDeadline(id);
    await load();
  };

  return (
    <DashboardLayout title="Prazos Juridicos">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{deadlines.filter(d => d.status === 'Pendente').length} prazos pendentes</p>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Novo Prazo
        </button>
      </div>
      <div className="space-y-3">
        {deadlines.map((d) => {
          const daysLeft = getDaysUntil(d.dueDate);
          const isUrgent = d.status === 'Pendente' && daysLeft <= 5;
          return (
            <div
              key={d.id}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-sm ${
                isUrgent ? 'border-destructive/30 bg-destructive/5' : d.status === 'Vencido' ? 'border-destructive/20 bg-destructive/5' : 'bg-card'
              }`}
            >
              {getStatusIcon(d.status)}
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{d.title}</p>
                <p className="text-xs text-muted-foreground">Processo: {d.process?.number || d.processId}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs text-muted-foreground">Inicio: {new Date(d.startDate).toLocaleDateString('pt-BR')}</p>
                <p className="text-xs font-medium text-foreground">Limite: {new Date(d.dueDate).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`status-badge ${getStatusBadge(d.status)}`}>{d.status}</span>
                {d.status === 'Pendente' && (
                  <span className={`text-xs font-medium ${daysLeft <= 3 ? 'text-destructive' : daysLeft <= 7 ? 'text-warning' : 'text-muted-foreground'}`}>
                    {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Vence hoje'}
                  </span>
                )}
                <button onClick={() => handleDelete(d.id)} className="text-xs text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Prazo">
        <div className="space-y-4">
          <FormInput label="Titulo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Processo</label>
            <select
              value={form.processId}
              onChange={(e) => setForm({ ...form, processId: e.target.value })}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">Selecione</option>
              {processes.map((p: any) => (
                <option key={p.id} value={p.id}>{p.number} - {p.client?.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Inicio" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <FormInput label="Limite" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="Pendente">Pendente</option>
              <option value="Cumprido">Cumprido</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsModalOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">Cancelar</button>
            <button onClick={handleCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Salvar</button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
