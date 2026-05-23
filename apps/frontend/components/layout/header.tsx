'use client';

import { useAuth } from '@/contexts/auth-context';
import { Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <h1 className="text-lg font-semibold text-[#1F2937]">{title}</h1>
      <div className="flex items-center gap-4">
        <button
          className="relative rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-[#003B8E] text-xs font-bold text-white uppercase">
            {user?.email?.[0] ?? '?'}
          </div>
          <span className="hidden text-sm font-medium text-foreground sm:block">{user?.email}</span>
        </div>
      </div>
    </header>
  );
}
