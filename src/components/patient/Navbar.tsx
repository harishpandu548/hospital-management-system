'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiCalendar, FiVideo, FiUser, FiLogOut, FiChevronDown } from 'react-icons/fi';
import '@/styles/patient/navbar.css';

export default function Navbar() {
  const [menuOpen, setMenuOpen]         = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [username, setUsername]         = useState('User');
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();

  // Read username from localStorage only after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem('patient_userName') || localStorage.getItem('userName');
    if (stored) setUsername(stored);
  }, []);

  const pathname = usePathname();
  const path     = pathname.toLowerCase().replace(/\/+$/, '');
  const hide     = ['/login', '/signup'].includes(path);

  // Real-time notifications via WebSockets
  useEffect(() => {
    if (hide) return;
    const fetchNotifs = async () => {
      const token = localStorage.getItem('patient_token');
      if (!token) return;
      try {
        const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setNotifications(await res.json());
      } catch (e) { /**/ }
    };
    fetchNotifs();

    // Setup WebSocket
    let socket: any = null;
    import('socket.io-client').then(({ io }) => {
      socket = io('http://localhost:3001');
      const token = localStorage.getItem('patient_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.id || payload.userId) {
            socket.emit('join-notifications', payload.id || payload.userId);
            socket.on('new-notification', (notif: any) => {
              setNotifications((prev) => [notif, ...prev]);
            });
          }
        } catch (e) { /**/ }
      }
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [hide]);

  const dismissNotif = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const token = localStorage.getItem('patient_token');
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false); setDropdownOpen(false); setNotifOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <motion.header
      className="navbar"
      ref={navRef}
      initial={{ y: -68, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    >
      <div className="navbar__inner">
        {/* Logo */}
        <Link href="/home" className="navbar__logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="url(#logoGrad)" />
            <path d="M12 7v10M7 9.5l5 2.5 5-2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="24" y2="24">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          HMS
        </Link>

        {/* Mobile toggle */}
        <button
          className={`navbar__toggle ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <span className="hamburger" />
        </button>

        {/* Menu */}
        <nav className={`navbar__menu ${menuOpen ? 'open' : ''}`}>
          {!hide && (
            <>
              <Link className={`navbar__link ${path === '/my-appointments' ? 'active' : ''}`} href="/my-appointments">
                <FiCalendar size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Appointments
              </Link>

              <Link className={`navbar__link ${path.startsWith('/consultation') ? 'active' : ''}`} href="/consultation">
                <FiVideo size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Video Consult
              </Link>

              {/* Notification bell */}
              <div style={{ position: 'relative', marginLeft: 4 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setNotifOpen((v) => !v); setDropdownOpen(false); }}
                  style={{ width: 38, height: 38, borderRadius: 10, background: 'transparent', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', color: '#64748b', transition: 'all 0.18s' }}
                >
                  <FiBell size={17} />
                  {unread > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -4, width: 17, height: 17, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>

                {/* Notification dropdown */}
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 320, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(15,23,42,0.14)', overflow: 'hidden', zIndex: 200 }}
                    >
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Notifications</span>
                        {notifications.length > 0 && (
                          <button onClick={() => setNotifications([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>Clear all</button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                          No notifications
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              📹
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#1e293b', lineHeight: 1.4 }}>{n.message}</p>
                              {n.roomId && (
                                <button onClick={() => { router.push(`/consultation/${n.roomId}`); setNotifOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 12, fontWeight: 600, padding: 0 }}>
                                  Join consultation →
                                </button>
                              )}
                            </div>
                            <button onClick={() => dismissNotif(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile dropdown */}
              <div className="navbar__profile">
                <button
                  className="avatar-btn"
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen((v) => !v); setNotifOpen(false); }}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  <div className="profile">{username.charAt(0).toUpperCase()}</div>
                  <span className="navbar__username">{username}</span>
                  <FiChevronDown size={13} color="#94a3b8" />
                </button>

                <div className={`dropdown ${dropdownOpen ? 'open' : ''}`}>
                  <button className="dropdown__item" onClick={() => { router.push('/home'); setDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiUser size={13} /> Dashboard
                  </button>
                  <button className="dropdown__item" onClick={() => { router.push('/profile'); setDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiUser size={13} /> My Profile
                  </button>
                  <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
                  <button className="dropdown__item dropdown__logout" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiLogOut size={13} /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </nav>
      </div>
    </motion.header>
  );
}
