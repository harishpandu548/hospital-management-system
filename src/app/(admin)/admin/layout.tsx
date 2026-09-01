'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSideBar from '@/components/admin/SideBar';
import AdminTopBar from '@/components/admin/TopBar';
import WelcomeGuard from '@/components/ui/WelcomeGuard';
import LiveAuditPanel from '@/components/admin/LiveAuditPanel';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [toasts, setToasts] = useState<{ id: number, message: string }[]>([]);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setAuthed(false);
      return;
    }
    const token = localStorage.getItem('admin_token');
    const role = localStorage.getItem('admin_role');
    if (!token || role !== 'ADMIN') {
      router.replace('/admin/login');
    } else {
      setAuthed(true);
    }
  }, [router, pathname, isLoginPage]);

  useEffect(() => {
    if (!authed) return;
    const socket = io('http://localhost:3001');
    socket.emit('join-admin');
    
    socket.on('ai-booking-alert', (data) => {
      const id = Date.now();
      setToasts(p => [...p, { id, message: data.message }]);
      setTimeout(() => {
        setToasts(p => p.filter(t => t.id !== id));
      }, 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, [authed]);

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
        <LiveAuditPanel />
        <WelcomeGuard storageKey="admin_welcome" />
        <footer style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
          © {new Date().getFullYear()} HMS Admin Portal
        </footer>
      </div>

      {/* Global Toast Container */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              style={{
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                color: '#fff',
                padding: '16px 20px',
                borderRadius: 12,
                boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)',
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <span>🤖</span>
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
