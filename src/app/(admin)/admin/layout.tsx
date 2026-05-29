'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSideBar from '@/components/admin/SideBar';
import AdminTopBar from '@/components/admin/TopBar';
import WelcomeGuard from '@/components/ui/WelcomeGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setAuthed(false);
      return;
    }
    const token = localStorage.getItem('hms_token');
    const role = localStorage.getItem('hms_role');
    if (!token || role !== 'ADMIN') {
      router.replace('/admin/login');
    } else {
      setAuthed(true);
    }
  }, [router, pathname, isLoginPage]);

  // Login page renders bare
  if (isLoginPage) return <>{children}</>;

  // Waiting for auth check
  if (!authed) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <AdminSideBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AdminTopBar />
        <main style={{ flex: 1, overflow: 'hidden auto' }}>
          {children}
        </main>
        <WelcomeGuard />
        <footer style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
          © {new Date().getFullYear()} HMS Admin Portal
        </footer>
      </div>
    </div>
  );
}
