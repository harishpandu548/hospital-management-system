'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppointments } from '@/context/receptionist/AppointmentsContext';
import '@/styles/receptionist/top-bar.css';

const TopBar = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { appointments } = useAppointments();

  const today = new Date().toLocaleDateString();

  const todayAppointments = useMemo(
    () => appointments.filter((a: any) => a.date === today),
    [appointments, today],
  );

  const todayCount = todayAppointments.filter(
    (a: any) => a.status !== 'Cancelled' && a.status !== 'No show',
  ).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const statusColor: Record<string, string> = {
    scheduled: '#6366f1', 'checked in': '#f59e0b', 'in progress': '#3b82f6',
    completed: '#10b981', cancelled: '#ef4444', 'no show': '#94a3b8',
  };

  return (
    <motion.header
      className="topbar"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="topbar__left">
        <div className="topbar__title">Receptionist Portal</div>
        <div className="topbar__subtitle">Hospital Management System</div>
      </div>

      <div className="topbar__actions">
        {/* Search */}
        <div className="topbar__search">
          <svg className="topbar__search-icon" width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search patients, doctors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                router.push(`/receptionist/appointments?q=${encodeURIComponent(query.trim())}`);
              }
            }}
          />
        </div>

        <div className="topbar__divider" />

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="topbar__icon-btn"
            title={`${todayCount} appointment${todayCount !== 1 ? 's' : ''} today`}
            onClick={() => setNotifOpen((p) => !p)}
          >
            <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            {todayCount > 0 && (
              <span className="topbar__badge">{todayCount > 9 ? '9+' : todayCount}</span>
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
                {/* Header */}
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Today's Appointments</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <span style={{ background: '#eef2ff', color: '#6366f1', borderRadius: 99, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>
                    {todayCount}
                  </span>
                </div>

                {/* List */}
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {todayAppointments.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      No appointments scheduled for today.
                    </div>
                  ) : (
                    todayAppointments.map((a: any) => {
                      const sKey = a.status?.toLowerCase().replace(/\s+/g, ' ');
                      const color = statusColor[sKey] || '#6366f1';
                      return (
                        <div
                          key={a.id}
                          onClick={() => { setNotifOpen(false); router.push('/receptionist/appointments'); }}
                          style={{
                            padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                            cursor: 'pointer', transition: 'background 0.15s',
                            display: 'flex', alignItems: 'center', gap: 12,
                          }}
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
                            {a.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => { setNotifOpen(false); router.push('/receptionist/appointments'); }}
                    style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#eef2ff', color: '#6366f1', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    View All Appointments →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Help */}
        <button className="topbar__icon-btn" title="Help">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </motion.header>
  );
};

export default TopBar;
