import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { FormInput } from '@/components/FormInput';
import { Pencil, Trash2, Plus, FolderOpen, Upload } from 'lucide-react';
import { Client } from '@/types';
import { toast } from 'sonner';
import {
  createClient,
  deleteClient,
  listClients,
  updateClient,
  listClientFiles,
  uploadClientFile,
  deleteClientFile,
  downloadClientFile,
} from '@/services/api';

type ClientFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', document: '', address: '' });
  const [editing, setEditing] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const [filesModalClient, setFilesModalClient] = useState<Client | null>(null);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listClients(search.trim() || undefined);
      const mapped = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        document: c.cpfCnpj,
        address: c.address,
        code: c.code,
        createdAt: new Date(c.createdAt).toISOString().split('T')[0],
      }));
      setClients(mapped);
    } catch {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', document: '', address: '' });
    setEditing(null);
  };

  const handleCreateOrUpdate = async () => {
    if (!form.name || !form.phone) {
      toast.error('Preencha os campos obrigatorios');
      return;
    }

    try {
      if (editing) {
        await updateClient(editing.id, {
          name: form.name,
          email: form.email || undefined,
          phone: form.phone,
          cpfCnpj: form.document || undefined,
          address: form.address || undefined,
        });
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await createClient({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone,
          cpfCnpj: form.document || undefined,
          address: form.address || undefined,
        });
        toast.success('Cliente criado com sucesso!');
      }
      setIsModalOpen(false);
      resetForm();
      await load();
    } catch {
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteClient(deleteTarget.id);
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success('Cliente removido');
    } catch {
      toast.error('Erro ao remover cliente');
    } finally {
      setDeleteTarget(null);
    }
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email || '',
      phone: client.phone,
      document: client.document || '',
      address: client.address || '',
    });
    setIsModalOpen(true);
  };

  const openFiles = async (client: Client) => {
    setFilesModalClient(client);
    setFilesLoading(true);
    try {
      const data = await listClientFiles(client.id);
      setFiles(data);
    } catch {
      toast.error('Erro ao carregar arquivos');
    } finally {
      setFilesLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!filesModalClient || !selectedFile) return;
    try {
      const file = await uploadClientFile(filesModalClient.id, selectedFile);
      setFiles((prev) => [file, ...prev]);
      setSelectedFile(null);
      toast.success('Arquivo enviado');
    } catch {
      toast.error('Erro ao enviar arquivo');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!filesModalClient) return;
    const confirm = window.confirm('Excluir este arquivo permanentemente?');
    if (!confirm) return;
    try {
      await deleteClientFile(filesModalClient.id, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success('Arquivo removido');
    } catch {
      toast.error('Erro ao remover arquivo');
    }
  };

  const handleDownload = async (fileId: string, name: string) => {
    if (!filesModalClient) return;
    try {
      const response = await downloadClientFile(filesModalClient.id, fileId);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar arquivo');
    }
  };

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, search]);

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Telefone' },
    { key: 'document', header: 'CPF/CNPJ' },
    { key: 'createdAt', header: 'Data de Criacao' },
    {
      key: 'actions',
      header: 'Acoes',
      render: (item: Client) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openFiles(item)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <FolderOpen className="h-4 w-4" />
          </button>
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
    <DashboardLayout title="Clientes">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{clients.length} clientes cadastrados</p>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Novo Cliente
        </button>
      </div>
      <div className="mb-4">
        <FormInput
          label="Pesquisar"
          placeholder="Buscar por nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <DataTable columns={columns} data={filteredClients} isLoading={loading} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Editar Cliente' : 'Novo Cliente'}>
        <div className="space-y-4">
          <FormInput label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
          <FormInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
          <FormInput label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-0000" />
          <FormInput label="CPF/CNPJ" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} placeholder="000.000.000-00" />
          <FormInput label="Endereco" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, numero, bairro" />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsModalOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">Cancelar</button>
            <button onClick={handleCreateOrUpdate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Salvar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmar exclusao">
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir este cliente permanentemente?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className="rounded-lg border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">Cancelar</button>
          <button onClick={handleDelete} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90">Excluir</button>
        </div>
      </Modal>

      <Modal isOpen={!!filesModalClient} onClose={() => setFilesModalClient(null)} title="Fichario do Cliente">
        <div className="space-y-4">
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{filesModalClient?.name}</p>
            <p className="text-muted-foreground">{filesModalClient?.email || 'Sem email'}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="flex-1 text-sm"
            />
            <button
              onClick={handleUpload}
              disabled={!selectedFile}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> Enviar
            </button>
          </div>
          {filesLoading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum arquivo anexado</p>
          ) : (
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{f.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(f.size / 1024).toFixed(1)} KB • {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDownload(f.id, f.originalName)} className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-secondary">
                      Baixar
                    </button>
                    <button onClick={() => handleDeleteFile(f.id)} className="rounded-lg border px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10">
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
