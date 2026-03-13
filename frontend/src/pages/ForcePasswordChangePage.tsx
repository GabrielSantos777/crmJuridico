import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormInput } from "@/components/FormInput";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ForcePasswordChangePage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { forceChangePassword } = useAuth();
  const navigate = useNavigate();

  const isStrong = (value: string) => /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirm) {
      toast.error("Preencha a nova senha");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas nao conferem");
      return;
    }
    if (!isStrong(password)) {
      toast.error("Senha fraca. Use 8+ caracteres, maiuscula, numero e especial.");
      return;
    }
    setLoading(true);
    try {
      await forceChangePassword(password);
      toast.success("Senha atualizada. Faca login novamente.");
      navigate("/login");
    } catch {
      toast.error("Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Defina uma nova senha</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Nova senha"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormInput
            label="Confirmar senha"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Mostrar senha
          </label>
          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Atualizar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
