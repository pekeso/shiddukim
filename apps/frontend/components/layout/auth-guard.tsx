'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Spinner } from '@/components/ui/spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  /** If set, only these roles can access; others are redirected */
  allowedRoles?: string[];
  redirectTo?: string;
}

export function AuthGuard({ children, allowedRoles, redirectTo = '/connexion' }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Redirect members to their profile, others to dashboard
      const fallback = user.role === 'MEMBER' ? '/mon-profil' : '/tableau-de-bord';
      router.replace(fallback);
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, redirectTo, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" className="text-[#003B8E]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
