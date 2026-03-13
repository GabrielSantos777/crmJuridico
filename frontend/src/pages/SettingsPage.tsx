import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FormInput } from '@/components/FormInput';
import { createGroup, getOfficeSettings, listGroups, inviteToGroup, updateOfficeSettings, uploadOfficeLogo, listUsers, createUser, updateUser, deleteUser, removeGroupMember, updateMyPassword, updateGroup, deleteGroup } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState({
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    workingHours: '09:00-18:00',
  });
  const [groups, setGroups] = useState<any[]>([]);
  const [groupForm, setGroupForm] = useState({ name: '', role: 'BASIC' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [userForm, setUserForm] = useState({ name: '', email: '', cpf: '', password: '', groupId: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    getOfficeSettings()
      .then((data) => {
        setForm({
          name: data.name || '',
          cnpj: data.cnpj || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          logoUrl: data.logoUrl || '',
          workingHours: data.workingHours || '09:00-18:00',
        });
      })
      .catch(() => toast.error('Erro ao carregar configuracoes'));
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'LAWYER') {
      listGroups().then(setGroups).catch(() => {});
      listUsers().then(setUsers).catch(() => {});
    }
  }, [user?.role]);

  const handleSave = async () => {
    try {
      await updateOfficeSettings({
        name: form.name,
        cnpj: form.cnpj,
        address: form.address,
        phone: form.phone,
        email: form.email,
        logoUrl: form.logoUrl || null,
        workingHours: form.workingHours,
      });
      toast.success('Configuracoes salvas');
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const handleLogoUpload = async (file?: File | null) => {
    if (!file) return;
    try {
      const data = await uploadOfficeLogo(file);
      setForm((prev) => ({ ...prev, logoUrl: data.logoUrl || '' }));
      toast.success('Logo atualizada');
    } catch {
      toast.error('Erro ao enviar logo');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupForm.name) return;
    try {
      await createGroup(groupForm);
      setGroupForm({ name: '', role: 'BASIC' });
      const data = await listGroups();
      setGroups(data);
      toast.success('Grupo criado');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao criar grupo');
    }
  };

  const handleInvite = async () => {
    if (!selectedGroupId || !inviteEmail) return;
    try {
      await inviteToGroup(selectedGroupId, inviteEmail);
      setInviteEmail('');
      toast.success('Convite enviado');
      const data = await listGroups();
      setGroups(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao convidar');
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password || !userForm.cpf) {
      toast.error('Preencha nome, email, CPF e senha');
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(userForm.password)) {
      toast.error('Senha fraca. Use 8+ caracteres, maiuscula, numero e especial.');
      return;
    }
    try {
      await createUser(userForm);
      setUserForm({ name: '', email: '', cpf: '', password: '', groupId: '' });
      const data = await listUsers();
      setUsers(data);
      const refreshedGroups = await listGroups();
      setGroups(refreshedGroups);
      toast.success('Usuario criado');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao criar usuario');
    }
  };

  const handleUpdateUser = async (id: string, email: string, role: string) => {
    try {
      await updateUser(id, { email, role });
      const data = await listUsers();
      setUsers(data);
      const refreshedGroups = await listGroups();
      setGroups(refreshedGroups);
    } catch {
      toast.error('Erro ao atualizar usuario');
    }
  };

  const handleDeleteUser = async (id: string) => {
    const confirm = window.confirm('Excluir usuario permanentemente?');
    if (!confirm) return;
    await deleteUser(id);
    const data = await listUsers();
    setUsers(data);
    const refreshedGroups = await listGroups();
    setGroups(refreshedGroups);
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Preencha a senha atual e a nova senha');
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(passwordForm.newPassword)) {
      toast.error('Senha fraca. Use 8+ caracteres, maiuscula, numero e especial.');
      return;
    }
    try {
      await updateMyPassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      toast.success('Senha atualizada');
    } catch {
      toast.error('Erro ao atualizar senha');
    }
  };

  return (
    <DashboardLayout title="Configuracoes">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
        <div className="rounded-xl border bg-card p-6 min-w-0">
          <h3 className="mb-4 text-base font-semibold text-card-foreground">Dados do Escritorio</h3>
          <div className="space-y-4">
            <FormInput label="Nome do Escritorio" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FormInput label="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            <FormInput label="Endereco" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <FormInput label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <FormInput label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <FormInput label="Horarios de atendimento" value={form.workingHours} onChange={(e) => setForm({ ...form, workingHours: e.target.value })} />
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Salvar</button>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 min-w-0">
          <h3 className="mb-4 text-base font-semibold text-card-foreground">Logo</h3>
          <div className="space-y-3">
            <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
            <p className="text-xs text-muted-foreground">Envie um arquivo de imagem (PNG, JPG, SVG).</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold text-card-foreground">Alterar senha</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <FormInput label="Senha atual" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
          <FormInput label="Nova senha" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
          <div className="flex items-end">
            <button onClick={handlePasswordChange} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Atualizar senha</button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold text-card-foreground">Aparencia</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`rounded-lg border px-4 py-2 text-sm ${theme === 'light' ? 'bg-primary text-primary-foreground' : ''}`}
          >
            Modo claro
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`rounded-lg border px-4 py-2 text-sm ${theme === 'dark' ? 'bg-primary text-primary-foreground' : ''}`}
          >
            Modo escuro
          </button>
        </div>
      </div>

      {(user?.role === 'ADMIN' || user?.role === 'LAWYER') && (
        <div className="mt-6 rounded-xl border bg-card p-6">
          <h3 className="mb-4 text-base font-semibold text-card-foreground">Grupos e permissões</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <FormInput label="Nome do grupo" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} />
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Perfil</label>
              <select
                value={groupForm.role}
                onChange={(e) => setGroupForm({ ...groupForm, role: e.target.value })}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="BASIC">Acesso básico</option>
                <option value="LAWYER">Advogado</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleCreateGroup} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Criar grupo</button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Grupo</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="">Selecione</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.role})</option>
                ))}
              </select>
            </div>
            <FormInput label="Email do estagiário" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <div className="flex items-end">
              <button onClick={handleInvite} className="rounded-lg border px-4 py-2 text-sm">Convidar</button>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold">Grupos e membros</h4>
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.id} className="rounded-lg border p-3 text-sm">
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_140px] items-center">
                    <input
                      className="w-full rounded border bg-background px-2 py-1 text-xs"
                      defaultValue={g.name}
                      onBlur={async (e) => {
                        await updateGroup(g.id, { name: e.target.value });
                        const data = await listGroups();
                        setGroups(data);
                      }}
                    />
                    <select
                      defaultValue={g.role}
                      onChange={async (e) => {
                        await updateGroup(g.id, { role: e.target.value });
                        const data = await listGroups();
                        setGroups(data);
                      }}
                      className="h-8 w-full rounded border bg-background px-2 text-xs"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="LAWYER">LAWYER</option>
                      <option value="BASIC">BASIC</option>
                      <option value="UNASSIGNED">UNASSIGNED</option>
                    </select>
                    <div className="flex items-center justify-end">
                      <button
                        className="text-xs text-destructive"
                        onClick={async () => {
                          const confirm = window.confirm('Excluir este grupo permanentemente?');
                          if (!confirm) return;
                          await deleteGroup(g.id);
                          const data = await listGroups();
                          setGroups(data);
                        }}
                      >
                        Excluir grupo
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {g.members?.map((m: any) => (
                      <div key={m.id} className="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_140px_140px]">
                        <input
                          className="w-full rounded border bg-background px-2 py-1 text-xs"
                          defaultValue={m.user.email}
                          onBlur={(e) => handleUpdateUser(m.userId, e.target.value, m.user.role)}
                        />
                        <select
                          defaultValue={m.user.role}
                          onChange={(e) => handleUpdateUser(m.userId, m.user.email, e.target.value)}
                          className="h-8 w-full rounded border bg-background px-2 text-xs"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="LAWYER">LAWYER</option>
                          <option value="BASIC">BASIC</option>
                          <option value="UNASSIGNED">UNASSIGNED</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs text-destructive"
                            onClick={async () => {
                              await removeGroupMember(g.id, m.userId);
                              const data = await listGroups();
                              setGroups(data);
                            }}
                          >
                            Remover
                          </button>
                          <button
                            className="text-xs text-destructive"
                            onClick={() => handleDeleteUser(m.userId)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                    {g.members?.length === 0 && <span className="text-xs text-muted-foreground">Sem membros</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h4 className="mb-2 text-sm font-semibold">Criar usuario</h4>
            <div className="grid gap-4 md:grid-cols-5">
              <FormInput label="Nome" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
              <FormInput label="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              <FormInput label="CPF" value={userForm.cpf} onChange={(e) => setUserForm({ ...userForm, cpf: e.target.value })} />
              <FormInput label="Senha" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Grupo</label>
                <select
                  value={userForm.groupId}
                  onChange={(e) => setUserForm({ ...userForm, groupId: e.target.value })}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                >
                  <option value="">Sem grupo</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={handleCreateUser} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Criar usuario</button>
            </div>
          </div>

          <div className="mt-8">
            <h4 className="mb-2 text-sm font-semibold">Usuarios</h4>
            <div className="rounded-lg border overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>
                        <input
                          className="w-full rounded border bg-background px-2 py-1 text-xs"
                          defaultValue={u.email}
                          onBlur={(e) => handleUpdateUser(u.id, e.target.value, u.role)}
                        />
                      </td>
                      <td>
                        <select
                          defaultValue={u.role}
                          onChange={(e) => handleUpdateUser(u.id, u.email, e.target.value)}
                          className="h-8 w-full rounded border bg-background px-2 text-xs"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="LAWYER">LAWYER</option>
                          <option value="BASIC">BASIC</option>
                          <option value="UNASSIGNED">UNASSIGNED</option>
                        </select>
                      </td>
                      <td>
                        <button onClick={() => handleDeleteUser(u.id)} className="text-xs text-destructive">Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
