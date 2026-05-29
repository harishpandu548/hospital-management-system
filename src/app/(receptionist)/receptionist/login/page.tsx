'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/animations';
import '@/styles/patient/login-modal.css';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
  }),
};

/* Floating orb */
const Orb = ({ style }: { style: React.CSSProperties }) => (
  <motion.div
    animate={{ y: [0, -16, 0], scale: [1, 1.06, 1] }}
    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      position: 'absolute', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 70%)',
      pointerEvents: 'none', ...style,
    }}
  />
);

const ReceptionistLoginPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, password: formData.password, activeRole: 'RECEPTIONIST' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Make sure you have receptionist access.');
        return;
      }

      const displayName = data.name && !/^\+?\d{7,}$/.test(data.name) ? data.name : undefined;
      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('hms_role', data.activeRole);
      if (displayName) localStorage.setItem('userName', displayName);
      localStorage.setItem('hms_welcome', JSON.stringify({ role: data.activeRole, name: displayName }));
      router.push('/receptionist');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="auth-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Floating orbs */}
      <Orb style={{ width: 360, height: 360, top: '-100px', right: '-80px' }} />
      <Orb style={{ width: 240, height: 240, bottom: '-50px', left: '-60px', animationDelay: '1.8s' }} />
      <Orb style={{ width: 160, height: 160, top: '45%', left: '5%', animationDelay: '0.9s' }} />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
      >
        {/* Badge */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <div className="auth-role-badge">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            Staff Portal
          </div>
        </motion.div>

        {/* Avatar */}
        <motion.div className="avatar-wrap" custom={1} variants={fadeUp} initial="hidden" animate="show">
          <div className="avatar" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="7" width="18" height="13" rx="2" fill="rgba(255,255,255,0.2)" />
              <path d="M8 7V5a4 4 0 018 0v2" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="13" r="2" fill="rgba(255,255,255,0.9)" />
            </svg>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
          <h2 className="auth-title">Staff Sign In</h2>
          <p className="auth-sub">Access the receptionist dashboard</p>
        </motion.div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
            <label className="field-label">Staff Phone Number</label>
            <motion.input
              className="input"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Enter staff phone number"
              required
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.15 }}
            />
          </motion.div>

          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
            <label className="field-label">Password</label>
            <motion.input
              className="input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
              placeholder="Enter your password"
              required
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.15 }}
            />
          </motion.div>

          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </motion.div>
          )}

          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
            <motion.button
              type="submit"
              className="btn primary"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}
              disabled={loading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </motion.button>
          </motion.div>
        </form>

        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show">
          <div className="auth-divider"><span>or</span></div>
          <p className="auth-sub" style={{ marginBottom: 4 }}>
            Patient?{' '}
            <Link href="/login" className="auth-link">Patient login →</Link>
          </p>
          <p className="auth-sub" style={{ marginBottom: 0 }}>
            Admin?{' '}
            <Link href="/admin/login" className="auth-link">Admin login →</Link>
          </p>
        </motion.div>
      </motion.div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};

export default ReceptionistLoginPage;
