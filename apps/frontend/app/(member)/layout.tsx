import { AuthGuard } from '@/components/layout/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['MEMBER']}>
      <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
        <Sidebar variant="member" />
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
