'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import '@/styles/receptionist/notification.css';

interface Notif {
  id: string;
  message: string;
  time: string;
  read: boolean;
  href: string;
  action: string;
}

function actionToMessage(action: string, entityType: string, entityName: string) {
  if (action === 'CREATE' && entityType === 'APPOINTMENT') return `New appointment booked: ${entityName}`;
  if (action === 'STATUS_CHANGE') return `Status updated: ${entityName}`;
  if (action === 'APPOINTMENT_CANCELLED') return `Appointment cancelled: ${entityName}`;
  if (action === 'CREATE' && entityType === 'DOCTOR') return `New doctor added: ${entityName}`;
  if (action === 'UPDATE') return `Updated: ${entityType.toLowerCase()} ${entityName}`;
  if (action === 'DELETE') return `Deleted: ${entityType.toLowerCase()} ${entityName}`;
  return `${action.replace(/_/g, ' ')}: ${entityName}`;
}

function actionToHref(action: string, entityType: string) {
  if (entityType === 'APPOINTMENT' || action === 'STATUS_CHANGE' || action === 'APPOINTMENT_CANCELLED') {
    return '/receptionist/appointments';
  }
  if (entityType === 'DOCTOR') return '/receptionist/doctors';
  return '/receptionist';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const Notification = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('receptionist_token') : null;
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const logs: any[] = await res.json();
      const mapped: Notif[] = logs.slice(0, 20).map((log) => ({
        id: log.id,
        message: actionToMessage(log.action, log.entityType, log.entityName || log.entityId?.slice(0, 8)),
        time: timeAgo(log.createdAt),
        read: false,
        href: actionToHref(log.action, log.entityType),
        action: log.action,
      }));
      setNotifications(mapped);
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const handleClick = (notif: Notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
    router.push(notif.href);
  };

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <div className="notification-container" ref={containerRef}>
      <motion.span
        className="notification-icon-btn"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => { setIsOpen((o) => !o); if (!isOpen) fetchNotifs(); }}
        style={{ cursor: 'pointer' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <motion.span
            className="notification-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.span>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="notification-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="notification-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4>Notifications</h4>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', fontSize: 11, color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map((k) => (
                  <div key={k} style={{ height: 14, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No recent activity
              </div>
            ) : (
              <ul className="notification-list">
                {notifications.map((note, i) => (
                  <motion.li
                    key={note.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`notification-item ${note.read ? 'read' : 'unread'}`}
                    onClick={() => handleClick(note)}
                    style={{ cursor: 'pointer' }}
                  >
                    {!note.read && <span className="unread-indicator" />}
                    <div className="notification-content">
                      <p className="notification-message">{note.message}</p>
                      <span className="notification-time">{note.time}</span>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', flexShrink: 0, paddingLeft: 6 }}>›</span>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
};

export default Notification;
