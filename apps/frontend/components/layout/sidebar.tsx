'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
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
  const [collapsed, setCollapsed] = useState(false);

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
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r border-border bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border transition-all duration-200',
          collapsed ? 'justify-center px-0' : 'gap-3 px-5',
        )}
      >
        <Image
          src="/brand/logo.jpeg"
          alt="Shiddukim"
          width={48}
          height={48}
          priority
          className="h-10 w-10 shrink-0 object-contain"
        />
        {!collapsed && (
          <span className="text-lg font-bold text-[#003B8E] whitespace-nowrap">Shiddukim</span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
        className="absolute -right-3 top-[4.75rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white shadow-sm hover:bg-[#F5F7FA] transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5 text-[#003B8E]" />
        ) : (
          <ChevronLeft className="size-3.5 text-[#003B8E]" />
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    collapsed ? 'justify-center' : 'gap-3',
                    active
                      ? 'bg-[#003B8E] text-white'
                      : 'text-[#1F2937] hover:bg-[#F5F7FA] hover:text-[#003B8E]',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="border-t border-border p-3">
        {!collapsed && (
          <div className="mb-3 px-1">
            <p className="truncate text-xs font-medium text-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Déconnexion' : undefined}
          className={cn(
            'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-[#B91C1C] hover:bg-red-50 transition-colors',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && 'Déconnexion'}
        </button>
      </div>
    </aside>
  );
}
