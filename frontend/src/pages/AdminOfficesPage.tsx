import { useEffect, useState } from 'react';
import { FormInput } from '@/components/FormInput';
import { createOffice, deleteOffice, listOffices } from '@/services/api';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';

export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const load = async () => {
    try {
      const data = await listOffices();
      setOffices(data);
    } catch {
      toast.error('Erro ao carregar escritorios');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.cnpj || !form.adminName || !form.adminEmail || !form.adminPassword) {
      toast.error('Preencha os campos obrigatorios');
      return;
    }
    try {
      await createOffice({
        name: form.name,
        cnpj: form.cnpj,
        email: form.email || undefined,
        phone: form.phone || undefined,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
      });
      setForm({ name: '', cnpj: '', email: '', phone: '', adminName: '', adminEmail: '', adminPassword: '' });
      await load();
      toast.success('Escritorio criado');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao criar escritorio');
    }
  };

  return (
    <AdminLayout title="Administracao de Escritorios">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-card-foreground">Novo escritorio</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Nome do escritorio" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FormInput label="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            <FormInput label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <FormInput label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <FormInput label="Admin - Nome" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
            <FormInput label="Admin - Email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
            <FormInput label="Admin - Senha" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={handleCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Criar escritorio</button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-card-foreground">Escritorios cadastrados</h2>
          <div className="space-y-3">
            {offices.length === 0 ? (
              <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">Nenhum escritorio cadastrado</div>
            ) : (
              offices.map((o) => (
                <div key={o.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">CNPJ: {o.cnpj}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{o.email || '-'}</span>
                      <button
                        onClick={async () => {
                          await deleteOffice(o.id);
                          await load();
                        }}
                        className="text-xs text-red-600"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
    </AdminLayout>
  );
}
