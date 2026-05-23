'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  FileText,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const adminNavItems: NavItem[] = [
  { href: '/tableau-de-bord', label: 'Tableau de bord', icon: BarChart3 },
  {
    href: '/fideles',
    label: 'Fidèles',
    icon: Users,
    roles: ['SUPER_ADMIN', 'CHURCH_ADMIN', 'SECRETARY', 'COMMUNITY_LEADER'],
  },
  {
    href: '/communautes',
    label: 'Communautés',
    icon: Building2,
    roles: ['SUPER_ADMIN', 'CHURCH_ADMIN'],
  },
  { href: '/dossiers-matrimoniaux', label: 'Dossiers matrimoniaux', icon: BookOpen },
  { href: '/rendez-vous', label: 'Rendez-vous', icon: CalendarDays },
  { href: '/documents', label: 'Documents', icon: FileText },
];

const memberNavItems: NavItem[] = [
  { href: '/mon-profil', label: 'Mon profil', icon: Users },
  { href: '/dossiers-matrimoniaux', label: 'Dossiers matrimoniaux', icon: BookOpen },
  { href: '/rendez-vous', label: 'Rendez-vous', icon: CalendarDays },
  { href: '/documents', label: 'Documents', icon: FileText },
];

export function Sidebar({ variant = 'admin' }: { variant?: 'admin' | 'member' }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const items = variant === 'member' ? memberNavItems : adminNavItems;
  const filteredItems = items.filter((item) => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore — still clear local state
    }
    logout();
    window.location.href = '/connexion';
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-white">
      {/* Logo area */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <span className="text-lg font-bold" style={{ color: '#003B8E' }}>
          ✦ Shiddukim
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[#003B8E] text-white'
                      : 'text-[#1F2937] hover:bg-[#F5F7FA] hover:text-[#003B8E]',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="border-t border-border p-4">
        <div className="mb-3 px-1">
          <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
          <p className="text-xs text-muted-foreground">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#B91C1C] hover:bg-red-50 transition-colors"
        >
          <LogOut className="size-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
