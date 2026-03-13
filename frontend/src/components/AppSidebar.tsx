import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Scale,
  Clock,
  Calendar,
  KanbanSquare,
  BarChart3,
  Settings,
  LogOut,
  Gavel,
  Pin,
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', path: '/clients', icon: Users },
  { title: 'Leads', path: '/leads', icon: UserPlus },
  { title: 'Processos', path: '/processes', icon: Scale },
  { title: 'Prazos Juridicos', path: '/deadlines', icon: Clock },
  { title: 'Agenda', path: '/agenda', icon: Calendar },
  { title: 'Trello', path: '/trello', icon: KanbanSquare },
  { title: 'Relatorios', path: '/reports', icon: BarChart3 },
  { title: 'Configuracoes', path: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const [pinned, setPinned] = useState(() => localStorage.getItem('sidebar_pinned') === 'true');
  const [hovered, setHovered] = useState(false);

  const collapsed = !pinned && !hovered;

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-sidebar-width',
      collapsed ? '64px' : '256px'
    );
  }, [collapsed]);

  const togglePinned = () => {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem('sidebar_pinned', String(next));
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-200 ${collapsed ? 'sidebar-collapsed' : ''}`}
      style={{ background: 'hsl(var(--sidebar-background))', width: collapsed ? '64px' : '256px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex h-16 items-center gap-3 border-b px-4" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'hsl(var(--sidebar-primary))' }}>
          <Gavel className="h-5 w-5" style={{ color: 'hsl(var(--sidebar-primary-foreground))' }} />
        </div>
        <div className="sidebar-label">
          <h1 className="text-base font-bold" style={{ color: 'hsl(var(--sidebar-accent-foreground))' }}>JurisCRM</h1>
          <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: 'hsl(var(--sidebar-muted))' }}>Gestao Juridica</p>
        </div>
        <button
          onClick={togglePinned}
          className="ml-auto hidden rounded-lg p-1 text-muted-foreground hover:bg-secondary md:block"
          title={pinned ? 'Desafixar' : 'Fixar'}
        >
          <Pin className={`h-4 w-4 ${pinned ? 'text-primary' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="sidebar-label">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-3 py-4" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <button
          onClick={logout}
          className="sidebar-item w-full hover:!text-destructive"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="sidebar-label">Sair</span>
        </button>
      </div>
    </aside>
  );
}
