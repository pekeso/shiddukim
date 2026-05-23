import { AuthGuard } from '@/components/layout/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';

const STAFF_ROLES = ['SUPER_ADMIN', 'CHURCH_ADMIN', 'SECRETARY', 'PASTOR', 'COMMUNITY_LEADER'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={STAFF_ROLES}>
      <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
        <Sidebar variant="admin" />
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
