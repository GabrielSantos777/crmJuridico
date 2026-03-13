import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

interface DashboardLayoutProps {
  title: string;
  children: ReactNode;
}

export function DashboardLayout({ title, children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0 pl-0 md:pl-[var(--app-sidebar-width)]">
        <AppHeader title={title} />
        <main className="flex-1 p-6 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
