'use client';

import { AuthGuard } from './auth-guard';
import { Sidebar } from './sidebar';
import { useAuth } from '@/contexts/auth-context';

function ShellContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const variant = user?.role === 'MEMBER' ? 'member' : 'admin';

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
      <Sidebar variant={variant} />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ShellContent>{children}</ShellContent>
    </AuthGuard>
  );
}
