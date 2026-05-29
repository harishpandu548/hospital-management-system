'use client';
import { usePathname } from 'next/navigation';
import DoctorSideBar from '@/components/doctor/SideBar';
import WelcomeGuard from '@/components/ui/WelcomeGuard';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/doctor/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <DoctorSideBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height: 64,
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 90,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>Doctor Portal</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Hospital Management System</div>
          </div>
        </header>
        <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {children}
        </main>
        <footer style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
          © {new Date().getFullYear()} HMS Doctor Portal
        </footer>
      </div>
      <WelcomeGuard />
    </div>
  );
}
