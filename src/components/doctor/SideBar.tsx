'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, navItem } from '@/lib/animations';
import '@/styles/doctor/side-bar.css';

const navItems = [
  {
    href: '/doctor', label: 'Dashboard', exact: true,
    icon: (
      <svg className="sidebar__icon" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
  },
  {
    href: '/doctor/appointments', label: 'Appointments',
    icon: (
      <svg className="sidebar__icon" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/doctor/patients', label: 'My Patients',
    icon: (
      <svg className="sidebar__icon" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/doctor/consultation', label: 'Consultations',
    icon: (
      <svg className="sidebar__icon" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
      </svg>
    ),
  },
  {
    href: '/doctor/settings', label: 'Settings',
    icon: (
      <svg className="sidebar__icon" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  },
];

const DoctorSideBar = () => {
  const pathname = usePathname();
  const router   = useRouter();
  const [username, setUsername] = React.useState('Doctor');
  
  React.useEffect(() => {
    const stored = localStorage.getItem('doctor_userName') || localStorage.getItem('userName');
    if (stored) setUsername(stored);
  }, []);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const handleLogout = () => {
    localStorage.clear();
    router.push('/doctor/login');
  };

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 32 }}
    >
      {/* Brand */}
      <motion.div
        className="sidebar__brand"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <motion.div className="sidebar__logo" whileHover={{ rotate: 10, scale: 1.1 }} transition={{ type: 'spring', stiffness: 400 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M12 12v6M9 15h6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.div>
        <div className="sidebar__brand-text">
          <span className="sidebar__title">Doctor Portal</span>
          <span className="sidebar__subtitle">Hospital Management</span>
        </div>
      </motion.div>

      {/* Nav */}
      <nav className="sidebar__nav">
        <motion.div
          className="sidebar__section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          My Work
        </motion.div>

        {navItems.map((item, i) => {
          const active = isActive(item.href, item.exact);
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18 + i * 0.06, duration: 0.35, ease: 'easeOut' }}
            >
              <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                <Link href={item.href} className={`sidebar__item${active ? ' active' : ''}`}>
                  <motion.span
                    animate={active ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {item.icon}
                  </motion.span>
                  <span className="sidebar__label">{item.label}</span>
                  {active && (
                    <motion.div
                      layoutId="doctor-nav-indicator"
                      style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: 2, background: '#10b981' }}
                    />
                  )}
                </Link>
              </motion.div>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer user */}
      <motion.div
        className="sidebar__footer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
      >
        <div className="sidebar__user">
          <motion.div
            className="sidebar__avatar"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            {username.charAt(0).toUpperCase()}
          </motion.div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{username}</div>
            <div className="sidebar__user-role">DOCTOR</div>
          </div>
          <motion.button
            className="sidebar__logout-btn"
            onClick={handleLogout}
            title="Sign out"
            whileHover={{ scale: 1.15, color: '#ef4444' }}
            whileTap={{ scale: 0.9 }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
          </motion.button>
        </div>
      </motion.div>
    </motion.aside>
  );
};

export default DoctorSideBar;
