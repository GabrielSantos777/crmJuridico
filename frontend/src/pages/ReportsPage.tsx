import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FormInput } from '@/components/FormInput';
import { getClientReport, getFinancialReport, getPerformanceReport, getProcessReport } from '@/services/api';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useAuth } from '@/contexts/AuthContext';

export default function ReportsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'clients' | 'processes' | 'performance' | 'financial'>('clients');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<any>(null);

  const load = async () => {
    try {
      const params = { from: from || undefined, to: to || undefined };
      if (tab === 'clients') setData(await getClientReport(params));
      if (tab === 'processes') setData(await getProcessReport(params));
      if (tab === 'performance') setData(await getPerformanceReport(params));
      if (tab === 'financial') setData(await getFinancialReport(params));
    } catch {
      toast.error('Erro ao carregar relatorio');
    }
  };

  const exportPdf = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Relatorio - ${tab}`, 10, 15);
    doc.setFontSize(11);
    doc.text(`Periodo: ${from || 'inicio'} ate ${to || 'hoje'}`, 10, 24);
    let y = 34;

    if (tab === 'clients') {
      doc.text(`Total de clientes: ${data.total}`, 10, y); y += 6;
      doc.text(`Ativos: ${data.active}`, 10, y); y += 6;
      doc.text(`Inativos: ${data.inactive}`, 10, y); y += 6;
    }
    if (tab === 'processes') {
      doc.text('Por area:', 10, y); y += 6;
      data.byArea?.forEach((a: any) => { doc.text(`${a.area}: ${a._count.area}`, 12, y); y += 5; });
      y += 4;
      doc.text('Por status:', 10, y); y += 6;
      data.byStatus?.forEach((s: any) => { doc.text(`${s.status}: ${s._count.status}`, 12, y); y += 5; });
    }
    if (tab === 'performance') {
      doc.text(`Leads: ${data.leads}`, 10, y); y += 6;
      doc.text(`Clientes: ${data.clients}`, 10, y); y += 6;
      doc.text(`Clientes convertidos: ${data.convertedClients}`, 10, y); y += 6;
      doc.text(`Conversao: ${data.conversionRate}%`, 10, y); y += 6;
      doc.text(`Receita: R$ ${data.revenue}`, 10, y); y += 6;
    }
    if (tab === 'financial') {
      doc.text(`Receitas: R$ ${data.revenue}`, 10, y); y += 6;
      doc.text(`Honorarios: R$ ${data.fees}`, 10, y); y += 6;
    }

    doc.save(`relatorio_${tab}.pdf`);
  };

  useEffect(() => {
    load();
  }, [tab]);

  return (
    <DashboardLayout title="Relatorios">
      {(user?.role === 'BASIC' || user?.role === 'UNASSIGNED') && (
        <div className="mb-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Seu acesso nao permite visualizar relatorios.
        </div>
      )}
      {(user?.role === 'BASIC' || user?.role === 'UNASSIGNED') ? null : (
      <>
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setTab('clients')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'clients' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>Clientes</button>
        <button onClick={() => setTab('processes')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'processes' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>Processos</button>
        <button onClick={() => setTab('performance')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'performance' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>Performance</button>
        <button onClick={() => setTab('financial')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'financial' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>Financeiro</button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <FormInput label="De" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <FormInput label="Ate" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="flex items-end">
          <div className="flex gap-2">
            <button onClick={load} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Aplicar filtro</button>
            <button onClick={exportPdf} className="rounded-lg border px-4 py-2 text-sm font-medium">Salvar PDF</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        {tab === 'clients' && data && (
          <div className="space-y-2 text-sm">
            <div>Total de clientes: <strong>{data.total}</strong></div>
            <div>Ativos: <strong>{data.active}</strong></div>
            <div>Inativos: <strong>{data.inactive}</strong></div>
            <div className="mt-4 rounded-lg border">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>CPF/CNPJ</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.list?.map((c: any) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.email || '-'}</td>
                      <td>{c.phone || '-'}</td>
                      <td>{c.cpfCnpj || '-'}</td>
                      <td>{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'processes' && data && (
          <div className="grid gap-6 md:grid-cols-2 text-sm">
            <div>
              <h4 className="mb-2 font-semibold">Por area</h4>
              {data.byArea?.map((a: any) => (
                <div key={a.area}>{a.area}: <strong>{a._count.area}</strong></div>
              ))}
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Por status</h4>
              {data.byStatus?.map((s: any) => (
                <div key={s.status}>{s.status}: <strong>{s._count.status}</strong></div>
              ))}
            </div>
            <div className="md:col-span-2">
              <h4 className="mb-2 font-semibold">Lista de processos</h4>
              <div className="rounded-lg border">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Numero</th>
                      <th>Area</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.list?.map((p: any) => (
                      <tr key={p.id}>
                        <td>{p.code}</td>
                        <td>{p.number}</td>
                        <td>{p.area}</td>
                        <td>{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'performance' && data && (
          <div className="space-y-2 text-sm">
            <div>Leads: <strong>{data.leads}</strong></div>
            <div>Clientes: <strong>{data.clients}</strong></div>
            <div>Clientes convertidos: <strong>{data.convertedClients}</strong></div>
            <div>Conversao: <strong>{data.conversionRate}%</strong></div>
            <div>Receita: <strong>R$ {data.revenue}</strong></div>
            <div className="mt-4 rounded-lg border">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {data.convertedList?.map((c: any) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.email || '-'}</td>
                      <td>{c.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'financial' && data && (
          <div className="space-y-2 text-sm">
            <div>Receitas: <strong>R$ {data.revenue}</strong></div>
            <div>Honorarios: <strong>R$ {data.fees}</strong></div>
          </div>
        )}
      </div>
      </>
      )}
    </DashboardLayout>
  );
}
