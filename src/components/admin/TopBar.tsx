'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import '@/styles/admin/top-bar.css';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

const AdminTopBar = () => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [todayAppts, setTodayAppts] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchToday = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/appointments', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const today = new Date().toLocaleDateString();
      const mapped = data
        .filter((a: any) => {
          const d = a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString() : '';
          return d === today;
        })
        .slice(0, 10)
        .map((a: any) => ({
          id: a.id,
          name: `${a.patient?.firstName || ''} ${a.patient?.lastName || ''}`.trim() || 'Unknown',
          doctor: a.doctor?.fullname || '-',
          status: a.status || '-',
          time: a.slotStart ? new Date(a.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        }));
      setTodayAppts(mapped);
    } catch {}
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const statusColor: Record<string, string> = {
    SCHEDULED: '#6366f1', CHECKED_IN: '#f59e0b', IN_PROGRESS: '#3b82f6',
    COMPLETED: '#10b981', CANCELLED: '#ef4444', NO_SHOW: '#94a3b8',
  };

  const activeCount = todayAppts.filter(a => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW').length;

  return (
    <motion.header
      className="topbar"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="topbar__left">
        <div className="topbar__title">Admin Portal</div>
        <div className="topbar__subtitle">Hospital Management System</div>
      </div>
      <div className="topbar__actions">
        <div className="topbar__search">
          <svg className="topbar__search-icon" width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search doctors, receptionists…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && search.trim()) {
                router.push(`/admin/doctors`);
              }
            }}
          />
        </div>
        <div className="topbar__divider" />

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="topbar__icon-btn"
            title={`${activeCount} appointment${activeCount !== 1 ? 's' : ''} today`}
            onClick={() => setNotifOpen(p => !p)}
          >
            <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            {activeCount > 0 && (
              <span className="topbar__badge">{activeCount > 9 ? '9+' : activeCount}</span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  width: 340, background: '#fff', borderRadius: 14,
                  boxShadow: '0 12px 40px rgba(15,23,42,0.18)', border: '1px solid #e2e8f0',
                  zIndex: 1000, overflow: 'hidden',
                }}
              >
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Today&apos;s Appointments</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <span style={{ background: '#eef2ff', color: '#6366f1', borderRadius: 99, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>
                    {activeCount}
                  </span>
                </div>

                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {todayAppts.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      No appointments scheduled for today.
                    </div>
                  ) : (
                    todayAppts.map(a => {
                      const color = statusColor[a.status] || '#6366f1';
                      return (
                        <div
                          key={a.id}
                          style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#6366f1', flexShrink: 0 }}>
                            {a.name?.charAt(0) || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>Dr. {a.doctor} · {a.time}</div>
                          </div>
                          <span style={{ background: `${color}18`, color, borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                            {a.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => { setNotifOpen(false); router.push('/admin'); }}
                    style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#eef2ff', color: '#6366f1', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    View All Appointments →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
};

export default AdminTopBar;
