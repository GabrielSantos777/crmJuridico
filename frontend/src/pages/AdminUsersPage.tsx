import { useEffect, useState } from "react";
import { adminAddUserToOffice, adminCreateUser, adminDeleteUser, adminListUsers, adminRemoveUserFromOffice, listOffices } from "@/services/api";
import { toast } from "sonner";
import { FormInput } from "@/components/FormInput";
import AdminLayout from "@/components/AdminLayout";

const roles = ["ADMIN", "LAWYER", "BASIC"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", cpf: "", officeId: "", role: "BASIC" });

  const load = async () => {
    const [u, o] = await Promise.all([adminListUsers(), listOffices()]);
    setUsers(u ?? []);
    setOffices(o ?? []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password || !form.cpf) {
      toast.error("Preencha nome, email, CPF e senha");
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password)) {
      toast.error("Senha fraca. Use 8+ caracteres, maiuscula, numero e especial.");
      return;
    }
    await adminCreateUser({
      name: form.name,
      email: form.email,
      password: form.password,
      cpf: form.cpf || undefined,
      officeId: form.officeId || undefined,
      role: form.role,
    });
    setForm({ name: "", email: "", password: "", cpf: "", officeId: "", role: "BASIC" });
    await load();
  };

  const handleAttach = async (userId: string, officeId: string, role: string) => {
    await adminAddUserToOffice(userId, officeId, role);
    await load();
  };

  const handleRemoveOffice = async (userId: string, officeId: string) => {
    await adminRemoveUserFromOffice(userId, officeId);
    await load();
  };

  const handleDelete = async (userId: string) => {
    await adminDeleteUser(userId);
    await load();
  };

  return (
    <AdminLayout title="Usuarios">
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Criar usuario</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FormInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <FormInput label="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
          <FormInput label="Senha" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium">Escritorio</label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={form.officeId}
              onChange={(e) => setForm({ ...form, officeId: e.target.value })}
            >
              <option value="">Sem escritorio</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Perfil</label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Criar usuario
        </button>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Usuarios</h2>
        <div className="space-y-4">
          {users.map((u) => (
            <div key={u.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                  {u.cpf && <div className="text-xs text-muted-foreground">CPF: {u.cpf}</div>}
                </div>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-xs text-red-600"
                >
                  Excluir usuario
                </button>
              </div>

              <div className="mt-3">
                <div className="text-xs font-medium text-muted-foreground">Escritorios</div>
                <div className="mt-2 space-y-2">
                  {(u.offices ?? []).map((m) => (
                    <div key={`${u.id}-${m.officeId}`} className="flex items-center justify-between text-sm">
                      <span>{m.office?.name ?? m.officeId} ({m.role})</span>
                      <button
                        onClick={() => handleRemoveOffice(u.id, m.officeId)}
                        className="text-xs text-red-600"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" defaultValue="">
                  <option value="">Escolha um escritorio</option>
                  {offices.map((o) => (
                    <option key={`${u.id}-${o.id}`} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" defaultValue="BASIC">
                  {roles.map((r) => (
                    <option key={`${u.id}-${r}`} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  onClick={(e) => {
                    const container = (e.currentTarget.parentElement as HTMLElement) ?? undefined;
                    if (!container) return;
                    const selects = container.querySelectorAll("select");
                    const officeId = (selects[0] as HTMLSelectElement).value;
                    const role = (selects[1] as HTMLSelectElement).value;
                    if (!officeId) {
                      toast.error("Selecione um escritorio");
                      return;
                    }
                    handleAttach(u.id, officeId, role).catch(() => {
                      toast.error("Erro ao vincular usuario");
                    });
                  }}
                >
                  Vincular
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
