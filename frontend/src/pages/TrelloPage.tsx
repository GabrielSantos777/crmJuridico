import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Modal } from '@/components/Modal';
import { FormInput } from '@/components/FormInput';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  createKanbanCard,
  createKanbanColumn,
  deleteKanbanCard,
  deleteKanbanColumn,
  getKanbanBoard,
  moveKanbanCard,
  syncKanbanFromTrello,
  updateKanbanCard,
  updateKanbanColumn,
} from '@/services/api';

type Column = {
  id: string;
  title: string;
  order: number;
  cards: Card[];
};

type Card = {
  id: string;
  title: string;
  description?: string;
  dueAt?: string;
  order: number;
};

export default function TrelloPage() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [columnTitle, setColumnTitle] = useState('');
  const [cardForm, setCardForm] = useState({ title: '', description: '', dueAt: '' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getKanbanBoard();
      setColumns(data);
    } catch {
      toast.error('Erro ao carregar kanban');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNewCard = (columnId: string) => {
    setActiveColumnId(columnId);
    setEditingCard(null);
    setCardForm({ title: '', description: '', dueAt: '' });
    setNewCardOpen(true);
  };

  const openGlobalNewCard = () => {
    if (columns.length === 0) {
      toast.error('Crie uma coluna primeiro');
      return;
    }
    setActiveColumnId(columns[0].id);
    setEditingCard(null);
    setCardForm({ title: '', description: '', dueAt: '' });
    setNewCardOpen(true);
  };

  const openEditCard = (card: Card, columnId: string) => {
    setActiveColumnId(columnId);
    setEditingCard(card);
    setCardForm({
      title: card.title,
      description: card.description || '',
      dueAt: card.dueAt ? new Date(card.dueAt).toISOString().slice(0, 16) : '',
    });
    setNewCardOpen(true);
  };

  const handleCreateColumn = async () => {
    if (!columnTitle.trim()) return;
    try {
      await createKanbanColumn(columnTitle.trim());
      setColumnTitle('');
      setNewColumnOpen(false);
      await load();
    } catch {
      toast.error('Erro ao criar coluna');
    }
  };

  const handleSaveCard = async () => {
    if (!cardForm.title.trim() || !activeColumnId) return;
    try {
      if (editingCard) {
        await updateKanbanCard({
          id: editingCard.id,
          title: cardForm.title,
          description: cardForm.description || undefined,
          dueAt: cardForm.dueAt ? new Date(cardForm.dueAt).toISOString() : undefined,
        });
      } else {
        await createKanbanCard({
          columnId: activeColumnId,
          title: cardForm.title,
          description: cardForm.description || undefined,
          dueAt: cardForm.dueAt ? new Date(cardForm.dueAt).toISOString() : undefined,
        });
      }
      setNewCardOpen(false);
      await load();
    } catch {
      toast.error('Erro ao salvar card');
    }
  };

  const handleDragStart = (e: React.DragEvent, cardId: string, fromColumnId: string) => {
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.setData('fromColumnId', fromColumnId);
  };

  const handleDrop = async (e: React.DragEvent, toColumnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId) return;
    try {
      await moveKanbanCard({ id: cardId, toColumnId, order: 9999 });
      await load();
    } catch {
      toast.error('Erro ao mover card');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const confirm = window.confirm('Excluir este card permanentemente?');
    if (!confirm) return;
    await deleteKanbanCard(cardId);
    await load();
  };

  const handleDeleteColumn = async (columnId: string) => {
    const confirm = window.confirm('Excluir esta coluna e todos os cards?');
    if (!confirm) return;
    await deleteKanbanColumn(columnId);
    await load();
  };

  return (
    <DashboardLayout title="Trello">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Kanban interno (sincronizado com Trello)</div>
        <div className="flex items-center gap-2">
          <button onClick={openGlobalNewCard} className="rounded-lg border px-3 py-2 text-sm">
            Novo card
          </button>
          <button
            onClick={async () => { await syncKanbanFromTrello(); await load(); }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Sincronizar do Trello
          </button>
          <button onClick={() => setNewColumnOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Nova coluna
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.id} className="min-w-[280px] flex-1 rounded-xl border bg-card p-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.id)}>
              <div className="mb-3 flex items-center justify-between">
                <input
                  className="w-full bg-transparent text-sm font-semibold"
                  value={col.title}
                  onChange={(e) => {
                    const value = e.target.value;
                    setColumns((prev) => prev.map((c) => (c.id === col.id ? { ...c, title: value } : c)));
                  }}
                  onBlur={() => updateKanbanColumn(col.id, col.title)}
                />
                <div className="flex items-center gap-1">
                  <button onClick={() => openNewCard(col.id)} className="rounded-lg p-1 hover:bg-secondary">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDeleteColumn(col.id)} className="rounded-lg p-1 text-destructive hover:bg-destructive/10">
                    x
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {col.cards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id, col.id)}
                    className="rounded-lg border bg-secondary p-3 text-sm"
                    onClick={() => openEditCard(card, col.id)}
                  >
                    <p className="font-medium">{card.title}</p>
                    {card.description && <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>}
                    {card.dueAt && <p className="mt-2 text-xs text-muted-foreground">Vencimento: {new Date(card.dueAt).toLocaleString('pt-BR')}</p>}
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }} className="mt-2 text-xs text-destructive">Excluir</button>
                  </div>
                ))}
                {col.cards.length === 0 && (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Sem cards</div>
                )}
              </div>
            </div>
          ))}
          {columns.length === 0 && (
            <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Crie sua primeira coluna</div>
          )}
        </div>
      )}

      <Modal isOpen={newColumnOpen} onClose={() => setNewColumnOpen(false)} title="Nova coluna">
        <div className="space-y-4">
          <FormInput label="Titulo" value={columnTitle} onChange={(e) => setColumnTitle(e.target.value)} placeholder="Ex: A fazer" />
          <div className="flex justify-end">
            <button onClick={handleCreateColumn} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Criar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={newCardOpen} onClose={() => setNewCardOpen(false)} title={editingCard ? 'Editar card' : 'Novo card'}>
        <div className="space-y-4">
          <FormInput label="Titulo" value={cardForm.title} onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })} />
          <FormInput label="Descricao" value={cardForm.description} onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })} />
          <FormInput label="Vencimento" type="datetime-local" value={cardForm.dueAt} onChange={(e) => setCardForm({ ...cardForm, dueAt: e.target.value })} />
          <div className="flex justify-end">
            <button onClick={handleSaveCard} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Salvar</button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
