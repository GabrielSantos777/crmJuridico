import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DataTable } from '@/components/DataTable';
import { Eye, Filter, ListChecks, Search, UploadCloud } from 'lucide-react';
import { FormInput } from '@/components/FormInput';
import { toast } from 'sonner';
import {
  importProcess,
  importProcessesByOab,
  listClients,
  listProcesses,
  searchProcessesByOab,
} from '@/services/api';

type ProcessTab = 'all' | 'imports' | 'filters';

const statusClass = (s: string) => {
  const normalized = String(s || '').toLowerCase();
  if (normalized.includes('andamento')) return 'status-active';
  if (normalized.includes('suspenso')) return 'status-pending';
  if (normalized.includes('erro')) return 'status-urgent';
  if (normalized.includes('arquivado') || normalized.includes('encerrado')) return 'status-info';
  return '';
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const resolveApiError = (error: any, fallback: string) => {
  const raw = error?.response?.data?.message;
  if (Array.isArray(raw)) return raw.join(' ');
  if (typeof raw === 'string' && raw.trim()) return raw;
  return fallback;
};

export default function ProcessesPage() {
  const [activeTab, setActiveTab] = useState<ProcessTab>('all');
  const [processes, setProcesses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  const [importNumberForm, setImportNumberForm] = useState({ number: '', clientCode: '' });
  const [importByOabForm, setImportByOabForm] = useState({
    oab: '',
    clientCode: '',
    limit: '20',
  });

  const [importingByNumber, setImportingByNumber] = useState(false);
  const [searchingByOab, setSearchingByOab] = useState(false);
  const [importingByOab, setImportingByOab] = useState(false);
  const [oabResults, setOabResults] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([listProcesses(), listClients()]);
      setProcesses(Array.isArray(p) ? p : []);
      setClients(Array.isArray(c) ? c : []);
    } catch {
      toast.error('Erro ao carregar processos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const processRows = useMemo(() => {
    return processes.map((process) => {
      const latestEvent = Array.isArray(process.events)
        ? [...process.events].sort(
            (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )[0]
        : null;

      return {
        ...process,
        latestMovementAt:
          process.lastMovementAt || latestEvent?.date || process.updatedAt || process.createdAt || null,
        latestMovementSummary:
          process.latestMovementSummary ||
          process.lastMovementDescription ||
          latestEvent?.description ||
          'Sem movimentacoes recentes',
      };
    });
  }, [processes]);

  const searchedRows = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    if (!text) return processRows;

    return processRows.filter((item) => {
      return (
        String(item.number || '').toLowerCase().includes(text) ||
        String(item.title || '').toLowerCase().includes(text) ||
        String(item.client?.name || '').toLowerCase().includes(text) ||
        String(item.latestMovementSummary || '').toLowerCase().includes(text)
      );
    });
  }, [processRows, searchText]);

  const filteredRows = useMemo(() => {
    return searchedRows.filter((item) => {
      const statusMatch =
        statusFilter === 'all' ||
        String(item.status || '').toLowerCase() === statusFilter.toLowerCase();
      const areaMatch =
        areaFilter === 'all' || String(item.area || '').toLowerCase() === areaFilter.toLowerCase();
      const clientMatch = clientFilter === 'all' || String(item.client?.code || '') === clientFilter;
      return statusMatch && areaMatch && clientMatch;
    });
  }, [searchedRows, statusFilter, areaFilter, clientFilter]);

  const statuses = useMemo(() => {
    return Array.from(new Set(processRows.map((item) => String(item.status || '').trim()).filter(Boolean)));
  }, [processRows]);

  const areas = useMemo(() => {
    return Array.from(new Set(processRows.map((item) => String(item.area || '').trim()).filter(Boolean)));
  }, [processRows]);

  const metrics = useMemo(() => {
    const inProgress = processRows.filter((item) =>
      String(item.status || '').toLowerCase().includes('andamento'),
    ).length;
    const monitored = processRows.filter((item) => Boolean(item.latestMovementAt)).length;
    const errors = processRows.filter((item) =>
      String(item.status || '').toLowerCase().includes('erro'),
    ).length;

    return { inProgress, monitored, errors };
  }, [processRows]);

  const columns = [
    { key: 'number', header: 'Numero do processo' },
    {
      key: 'client',
      header: 'Cliente',
      render: (item: any) => item.client?.name || '-',
    },
    { key: 'area', header: 'Area' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge ${statusClass(item.status)}`}>{item.status || '-'}</span>
      ),
    },
    {
      key: 'latestMovement',
      header: 'Ultima movimentacao',
      render: (item: any) => (
        <div className="max-w-[360px]">
          <p className="text-xs text-muted-foreground">{formatDateTime(item.latestMovementAt)}</p>
          <p className="truncate text-sm">{item.latestMovementSummary}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Acoes',
      render: () => (
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleImportByNumber = async () => {
    if (!importNumberForm.number || !importNumberForm.clientCode) {
      toast.error('Informe numero do processo e cliente');
      return;
    }

    setImportingByNumber(true);
    try {
      await importProcess(importNumberForm.number, importNumberForm.clientCode);
      toast.success('Processo importado com sucesso');
      setImportNumberForm({ number: '', clientCode: importNumberForm.clientCode });
      await load();
      setActiveTab('all');
    } catch (error: any) {
      toast.error(resolveApiError(error, 'Erro ao importar processo por numero'));
    } finally {
      setImportingByNumber(false);
    }
  };

  const handleSearchByOab = async () => {
    if (!importByOabForm.oab.trim()) {
      toast.error('Informe um numero OAB para buscar');
      return;
    }

    setSearchingByOab(true);
    try {
      const data = await searchProcessesByOab(importByOabForm.oab.trim());
      const rows = Array.isArray(data) ? data : [];
      setOabResults(rows);
      if (rows.length === 0) {
        toast('Nenhum processo encontrado para esta OAB');
      } else {
        toast.success(`${rows.length} processo(s) encontrado(s) para a OAB informada`);
      }
    } catch (error: any) {
      toast.error(resolveApiError(error, 'Erro ao buscar processos por OAB'));
    } finally {
      setSearchingByOab(false);
    }
  };

  const handleImportByOab = async () => {
    if (!importByOabForm.oab.trim() || !importByOabForm.clientCode) {
      toast.error('Informe OAB e cliente para importar');
      return;
    }

    const limit = Number(importByOabForm.limit || 20);

    setImportingByOab(true);
    try {
      const result = await importProcessesByOab({
        oab: importByOabForm.oab.trim(),
        clientCode: importByOabForm.clientCode,
        limit: Number.isNaN(limit) ? 20 : limit,
      });

      const importedCount = Number(result?.importedCount || 0);
      const createdCount = Number(result?.createdCount || 0);
      const updatedCount = Number(result?.updatedCount || 0);
      toast.success(
        `${importedCount} processo(s) sincronizado(s) por OAB (${createdCount} novos, ${updatedCount} atualizados)`,
      );

      await load();
      setActiveTab('all');
    } catch (error: any) {
      toast.error(resolveApiError(error, 'Erro ao importar processos por OAB'));
    } finally {
      setImportingByOab(false);
    }
  };

  const hasActiveFilters =
    statusFilter !== 'all' || areaFilter !== 'all' || clientFilter !== 'all' || Boolean(searchText.trim());

  return (
    <DashboardLayout title="Processos">
      <div className="space-y-6">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Base de Processos</h2>
              <p className="text-sm text-muted-foreground">
                {processRows.length} processo(s) cadastrado(s)
              </p>
            </div>

            <div className="inline-flex rounded-xl border bg-background p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                <ListChecks className="mr-1 inline h-4 w-4" />
                Todos os processos
              </button>
              <button
                onClick={() => setActiveTab('imports')}
                className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === 'imports' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                <UploadCloud className="mr-1 inline h-4 w-4" />
                Importacoes
              </button>
              <button
                onClick={() => setActiveTab('filters')}
                className={`rounded-lg px-3 py-1.5 text-sm ${activeTab === 'filters' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                <Filter className="mr-1 inline h-4 w-4" />
                Filtros
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'all' && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-blue-100/60 p-4 text-sm">
                <p className="text-muted-foreground">Em andamento</p>
                <p className="text-2xl font-semibold text-blue-700">{metrics.inProgress}</p>
              </div>
              <div className="rounded-xl bg-emerald-100/60 p-4 text-sm">
                <p className="text-muted-foreground">Monitorados</p>
                <p className="text-2xl font-semibold text-emerald-700">{metrics.monitored}</p>
              </div>
              <div className="rounded-xl bg-rose-100/60 p-4 text-sm">
                <p className="text-muted-foreground">Erros</p>
                <p className="text-2xl font-semibold text-rose-700">{metrics.errors}</p>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[280px] flex-1">
                  <FormInput
                    label="Busca rapida"
                    placeholder="Pesquise por numero, cliente ou movimentacao"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => setActiveTab('imports')}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <UploadCloud className="h-4 w-4" />
                  Importar processo
                </button>
              </div>

              <DataTable columns={columns} data={searchedRows} isLoading={loading} />
            </div>
          </div>
        )}

        {activeTab === 'imports' && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">Importar por numero do processo</h3>
                <div className="space-y-3">
                  <FormInput
                    label="Numero do Processo"
                    placeholder="0000000-00.0000.0.00.0000"
                    value={importNumberForm.number}
                    onChange={(e) =>
                      setImportNumberForm((prev) => ({ ...prev, number: e.target.value }))
                    }
                  />

                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Cliente</label>
                    <select
                      value={importNumberForm.clientCode}
                      onChange={(e) =>
                        setImportNumberForm((prev) => ({ ...prev, clientCode: e.target.value }))
                      }
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    >
                      <option value="">Selecione o cliente</option>
                      {clients.map((client: any) => (
                        <option key={client.id} value={client.code}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleImportByNumber}
                    disabled={importingByNumber}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  >
                    {importingByNumber ? 'Importando...' : 'Importar por numero'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">Buscar e importar por OAB</h3>
                <div className="space-y-3">
                  <FormInput
                    label="Numero OAB"
                    placeholder="Ex: 123456/SP"
                    value={importByOabForm.oab}
                    onChange={(e) =>
                      setImportByOabForm((prev) => ({ ...prev, oab: e.target.value }))
                    }
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Cliente</label>
                      <select
                        value={importByOabForm.clientCode}
                        onChange={(e) =>
                          setImportByOabForm((prev) => ({ ...prev, clientCode: e.target.value }))
                        }
                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                      >
                        <option value="">Selecione o cliente</option>
                        {clients.map((client: any) => (
                          <option key={client.id} value={client.code}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <FormInput
                      label="Limite de processos"
                      type="number"
                      value={importByOabForm.limit}
                      onChange={(e) =>
                        setImportByOabForm((prev) => ({ ...prev, limit: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      onClick={handleSearchByOab}
                      disabled={searchingByOab}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
                    >
                      <Search className="h-4 w-4" />
                      {searchingByOab ? 'Buscando...' : 'Buscar por OAB'}
                    </button>
                    <button
                      onClick={handleImportByOab}
                      disabled={importingByOab}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                      <UploadCloud className="h-4 w-4" />
                      {importingByOab ? 'Importando...' : 'Importar resultados OAB'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Resultados da busca por OAB</h3>
              {oabResults.length === 0 ? (
                <div className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
                  Nenhum resultado carregado. Use "Buscar por OAB" para listar processos.
                </div>
              ) : (
                <div className="space-y-2">
                  {oabResults.map((item: any, index: number) => (
                    <div
                      key={`${item.number}-${index}`}
                      className="rounded-lg border bg-background p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{item.number || '-'}</p>
                          <p className="text-xs text-muted-foreground">{item.title || 'Sem titulo'}</p>
                        </div>
                        <span
                          className={`status-badge ${item.imported ? 'status-info' : 'status-active'}`}
                        >
                          {item.imported ? 'Ja importado' : 'Novo'}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                        <p>Area: {item.area || '-'}</p>
                        <p>Status: {item.status || '-'}</p>
                        <p>Ultima mov.: {formatDateTime(item.lastMovementAt)}</p>
                      </div>
                      <p className="mt-1 text-sm">{item.latestMovementSummary || '-'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4">
              <div className="mb-4 grid gap-3 md:grid-cols-4">
                <FormInput
                  label="Texto"
                  placeholder="Numero, cliente ou movimentacao"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="all">Todos</option>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Area</label>
                  <select
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="all">Todas</option>
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Cliente</label>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="all">Todos</option>
                    {clients.map((client: any) => (
                      <option key={client.id} value={client.code}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between rounded-lg bg-secondary p-3 text-sm">
                <p>
                  {filteredRows.length} processo(s) encontrado(s) com os filtros atuais
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSearchText('');
                      setStatusFilter('all');
                      setAreaFilter('all');
                      setClientFilter('all');
                    }}
                    className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-accent"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              <DataTable columns={columns} data={filteredRows} isLoading={loading} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
