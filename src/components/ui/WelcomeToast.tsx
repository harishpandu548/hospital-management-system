'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  name?: string;
  role?: string;
}

const ROLE_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  PATIENT:       { color: '#6366f1', emoji: '🏥', label: 'Patient Portal' },
  RECEPTIONIST:  { color: '#6366f1', emoji: '👩‍💼', label: 'Receptionist Portal' },
  ADMIN:         { color: '#f59e0b', emoji: '🛡️', label: 'Admin Portal' },
  DOCTOR:        { color: '#10b981', emoji: '👨‍⚕️', label: 'Doctor Portal' },
};

const WelcomeToast = ({ name, role }: Props) => {
  const [visible, setVisible] = useState(true);
  const cfg = ROLE_CONFIG[role || ''] || { color: '#6366f1', emoji: '👋', label: 'HMS' };

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(t);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            top: 76,
            right: 24,
            zIndex: 9999,
            background: '#fff',
            borderRadius: 16,
            padding: '14px 18px 12px',
            boxShadow: '0 12px 40px rgba(15,23,42,0.16)',
            border: `1px solid ${cfg.color}22`,
            borderLeft: `4px solid ${cfg.color}`,
            minWidth: 280,
            maxWidth: 340,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{cfg.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                {greeting}{name ? `, ${name}` : ''}!
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Welcome back to {cfg.label}
              </div>
              <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 4.5, ease: 'linear' }}
                  style={{ height: '100%', background: cfg.color, borderRadius: 2 }}
                />
              </div>
            </div>
            <button
              onClick={() => setVisible(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', fontSize: 16, lineHeight: 1,
                padding: '2px 4px', marginTop: -2, flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeToast;
