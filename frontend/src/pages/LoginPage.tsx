import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormInput } from '@/components/FormInput';
import { useAuth } from '@/contexts/AuthContext';
import { Gavel } from 'lucide-react';
import { toast } from 'sonner';
import { getOfficeLock } from '@/services/api';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [lockedOfficeName, setLockedOfficeName] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getOfficeLock()
      .then((data) => {
        if (data?.locked && data.office?.name) {
          setLockedOfficeName(data.office.name);
        }
      })
      .catch(() => {});
  }, []);

  const validate = () => {
    const errs: typeof errors = {};
    if (!identifier) errs.identifier = 'Email ou CPF obrigatorio';
    if (!password) errs.password = 'Senha obrigatoria';
    else if (password.length < 6) errs.password = 'Minimo 6 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const result = await login(identifier, password, remember);
      if (result.requiresPasswordChange) {
        toast.info('Defina uma nova senha para continuar.');
        navigate('/force-password');
        return;
      }
      if (result.requiresOfficeSelection) {
        toast.success('Selecione o escritorio para continuar.');
        navigate('/select-office');
      } else {
        toast.success('Login realizado com sucesso!');
        navigate('/dashboard');
      }
    } catch {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Gavel className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">JurisCRM</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestao Juridica Inteligente</p>
        </div>

        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-card-foreground">
            {lockedOfficeName ? `Login — ${lockedOfficeName}` : 'Entrar na sua conta'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Email ou CPF"
              type="text"
              placeholder="seu@email.com ou CPF"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              error={errors.identifier}
            />
            <FormInput
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                Mostrar senha
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Manter conectado
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                'Entrar'
              )}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Solicite seu acesso ao administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
