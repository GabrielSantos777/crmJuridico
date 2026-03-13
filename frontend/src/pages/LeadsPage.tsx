import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { FormInput } from '@/components/FormInput';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Lead } from '@/types';
import { toast } from 'sonner';
import { createLead, deleteLead, listLeads, updateLead } from '@/services/api';

const statusClass = (s: string) => {
  switch (s) {
    case 'Novo': return 'status-info';
    case 'Contatado': return 'status-pending';
    case 'Qualificado': return 'status-active';
    case 'Convertido': return 'status-active';
    case 'Perdido': return 'status-urgent';
    default: return '';
  }
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: '', status: 'Novo', classification: '', notes: '' });

  const normalizeStatus = (status?: string) => {
    if (!status) return 'Novo';
    const normalized = status.toLowerCase();
    if (normalized === 'new' || normalized === 'novo') return 'Novo';
    if (normalized.startsWith('cont')) return 'Contatado';
    if (normalized.startsWith('qual')) return 'Qualificado';
    if (normalized.includes('convert')) return 'Convertido';
    if (normalized.startsWith('perd') || normalized.startsWith('lost')) return 'Perdido';
    return status;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await listLeads(search.trim() || undefined);
      const mapped = data.map((l: any) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        source: l.source,
        status: normalizeStatus(l.status),
        classification: l.classification,
        createdAt: new Date(l.createdAt).toISOString().split('T')[0],
      })).filter((l: any) => l.status !== 'Convertido');
      setLeads(mapped);
    } catch {
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', source: '', status: 'Novo', classification: '', notes: '' });
    setEditing(null);
  };

  const handleCreateOrUpdate = async () => {
    if (!form.name || !form.phone) {
      toast.error('Preencha os campos obrigatorios');
      return;
    }

    const payload = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone,
      source: form.source || undefined,
      status: form.status,
      classification: form.classification || undefined,
      notes: form.notes || undefined,
    };

    try {
      if (editing) {
        await updateLead(editing.id, payload);
        toast.success('Lead atualizado com sucesso!');
      } else {
        await createLead(payload);
        toast.success('Lead criado com sucesso!');
      }
      setIsModalOpen(false);
      resetForm();
      await load();
    } catch {
      toast.error('Erro ao salvar lead');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLead(deleteTarget.id);
      setLeads((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      toast.success('Lead removido');
    } catch {
      toast.error('Erro ao remover lead');
    } finally {
      setDeleteTarget(null);
    }
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setForm({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone,
      source: lead.source || '',
      status: lead.status,
      classification: lead.classification || '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => l.name.toLowerCase().includes(q));
    }
    if (statusFilter) {
      result = result.filter((l) => l.status === statusFilter);
    }
    return result;
  }, [leads, search, statusFilter]);

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Telefone' },
    { key: 'source', header: 'Origem' },
    { key: 'status', header: 'Status', render: (item: Lead) => <span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span> },
    { key: 'createdAt', header: 'Data' },
    {
      key: 'actions',
      header: 'Acoes',
      render: (item: Lead) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setDeleteTarget(item)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Leads">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{leads.length} leads</p>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Novo Lead
        </button>
      </div>
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <FormInput
          label="Pesquisar"
          placeholder="Buscar por nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Filtro</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="Novo">Novo</option>
            <option value="Contatado">Contatado</option>
            <option value="Qualificado">Qualificado</option>
            <option value="Convertido">Convertido</option>
            <option value="Perdido">Perdido</option>
          </select>
        </div>
      </div>
      <DataTable columns={columns} data={filteredLeads} isLoading={loading} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Editar Lead' : 'Novo Lead'}>
        <div className="space-y-4">
          <FormInput label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
          <FormInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
          <FormInput label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-0000" />
          <FormInput label="Origem" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Google, Indicacao, Site" />
          <FormInput label="Classificacao" value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} placeholder="Trabalhista, Civil, etc" />
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="Novo">Novo</option>
              <option value="Contatado">Contatado</option>
              <option value="Qualificado">Qualificado</option>
              <option value="Convertido">Convertido</option>
              <option value="Perdido">Perdido</option>
            </select>
          </div>
          <FormInput label="Observacoes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas" />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsModalOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">Cancelar</button>
            <button onClick={handleCreateOrUpdate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Salvar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar exclusao">
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir este lead permanentemente?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">Cancelar</button>
          <button onClick={handleDelete} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90">Excluir</button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
