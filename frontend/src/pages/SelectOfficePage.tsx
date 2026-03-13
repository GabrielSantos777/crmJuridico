import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Gavel } from "lucide-react";
import { toast } from "sonner";

type OfficeOption = { id: string; name: string };

export default function SelectOfficePage() {
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectOffice } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const raw = sessionStorage.getItem("office_options") || localStorage.getItem("office_options");
    if (!raw) {
      navigate("/login");
      return;
    }
    try {
      setOffices(JSON.parse(raw) ?? []);
    } catch {
      setOffices([]);
    }
  }, [navigate]);

  const handleSelect = async (officeId: string) => {
    setLoading(true);
    try {
      const user = await selectOffice(officeId);
      if (user) {
        toast.success("Escritorio selecionado com sucesso!");
        navigate("/dashboard");
      } else {
        toast.error("Nao foi possivel selecionar o escritorio");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Gavel className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Selecione o escritorio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha o escritorio para entrar</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-3">
            {offices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum escritorio disponivel.</p>
            ) : (
              offices.map((office) => (
                <button
                  key={office.id}
                  onClick={() => handleSelect(office.id)}
                  disabled={loading}
                  className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <span>{office.name}</span>
                  <span className="text-xs text-muted-foreground">Entrar</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
