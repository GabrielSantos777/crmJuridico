import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Search } from 'lucide-react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/api';

export function AppHeader({ title }: { title: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const data = await getNotifications(true, 20);
    setItems(data);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const unreadCount = items.length;

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    await load();
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    await load();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6">
      <h2 className="text-xl font-semibold text-card-foreground">{title}</h2>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="h-9 w-64 rounded-lg border bg-secondary pl-9 pr-4 text-sm text-secondary-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-card p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Notificacoes</span>
                <button onClick={handleReadAll} className="text-xs text-primary">Marcar todas</button>
              </div>
              <div className="max-h-64 space-y-2 overflow-auto">
                {items.length === 0 && (
                  <div className="text-xs text-muted-foreground">Nenhuma notificacao</div>
                )}
                {items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className="w-full rounded-lg border bg-secondary p-2 text-left text-xs"
                  >
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="text-muted-foreground">{n.body}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
