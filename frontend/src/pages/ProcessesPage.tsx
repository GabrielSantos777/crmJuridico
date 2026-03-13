import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DataTable } from '@/components/DataTable';
import { Eye, Plus } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { FormInput } from '@/components/FormInput';
import { toast } from 'sonner';
import { listClients, listProcesses, importProcess } from '@/services/api';

const statusClass = (s: string) => {
  switch (s) {
    case 'Em andamento': return 'status-active';
    case 'Suspenso': return 'status-pending';
    case 'Arquivado': return 'status-info';
    case 'Encerrado': return 'status-info';
    default: return '';
  }
};

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ number: '', clientCode: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([listProcesses(), listClients()]);
      setProcesses(p);
      setClients(c);
    } catch {
      toast.error('Erro ao carregar processos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleImport = async () => {
    if (!form.number || !form.clientCode) {
      toast.error('Informe o numero e o cliente');
      return;
    }
    try {
      await importProcess(form.number, form.clientCode);
      toast.success('Processo importado');
      setIsModalOpen(false);
      setForm({ number: '', clientCode: '' });
      await load();
    } catch {
      toast.error('Erro ao importar processo');
    }
  };

  const columns = [
    { key: 'number', header: 'Numero do Processo' },
    { key: 'client', header: 'Cliente', render: (item: any) => item.client?.name || '-' },
    { key: 'area', header: 'Area' },
    { key: 'status', header: 'Status', render: (item: any) => <span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span> },
    { key: 'court', header: 'Tribunal', render: (item: any) => item.court?.name || '-' },
    { key: 'actions', header: 'Acoes', render: () => (
      <div className="flex items-center gap-1">
        <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"><Eye className="h-4 w-4" /></button>
      </div>
    ) },
  ];

  return (
    <DashboardLayout title="Processos">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{processes.length} processos cadastrados</p>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Importar Processo
        </button>
      </div>
      <DataTable columns={columns} data={processes} isLoading={loading} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Importar Processo (CNJ)">
        <div className="space-y-4">
          <FormInput label="Numero do Processo" placeholder="0000000-00.0000.0.00.0000" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Cliente</label>
            <select
              value={form.clientCode}
              onChange={(e) => setForm({ ...form, clientCode: e.target.value })}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">Selecione</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsModalOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">Cancelar</button>
            <button onClick={handleImport} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Importar</button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
