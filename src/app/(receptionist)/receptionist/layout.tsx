'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import TopBar from '@/components/receptionist/TopBar';
import SideBar from '@/components/receptionist/SideBar';
import Footer from '@/components/receptionist/Footer';
import { DoctorsProvider } from '@/context/receptionist/DoctorsContext';
import { AppointmentsProvider } from '@/context/receptionist/AppointmentsContext';
import { PatientsProvider } from '@/context/receptionist/PatientsContext';
import WelcomeGuard from '@/components/ui/WelcomeGuard';

export default function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  const isLoginPage = pathname === '/receptionist/login';

  useEffect(() => {
    if (isLoginPage) {
      setAuthed(false);
      return;
    }
    const token = localStorage.getItem('hms_token');
    const role = localStorage.getItem('hms_role');
    if (!token || role !== 'RECEPTIONIST') {
      // Admin users have their own portal — redirect them there
      if (token && role === 'ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/receptionist/login');
      }
    } else {
      setAuthed(true);
    }
  }, [router, pathname, isLoginPage]);

  if (isLoginPage) return <>{children}</>;
  if (!authed) return null;

  return (
    <PatientsProvider>
      <DoctorsProvider>
        <AppointmentsProvider>
          <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg, #f8fafc)' }}>
            <SideBar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <TopBar />
              <main style={{ flex: 1, overflow: 'hidden auto' }}>
                {children}
              </main>
              <WelcomeGuard />
              <Footer />
            </div>
          </div>
        </AppointmentsProvider>
      </DoctorsProvider>
    </PatientsProvider>
  );
}
