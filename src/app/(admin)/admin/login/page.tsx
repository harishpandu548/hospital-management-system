'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { pageVariants, pulseScale } from '@/lib/animations';
import '@/styles/patient/login-modal.css';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

/* Floating orb */
const Orb = ({ style }: { style: React.CSSProperties }) => (
  <motion.div
    animate={{ y: [0, -14, 0], scale: [1, 1.05, 1] }}
    transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      position: 'absolute', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
      pointerEvents: 'none', ...style,
    }}
  />
);

const AdminLoginPage = () => {
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
        body: JSON.stringify({ phone: formData.phone, password: formData.password, activeRole: 'ADMIN' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed. Make sure you have admin access.');
        return;
      }
      if (data.activeRole !== 'ADMIN') {
        setError('This account does not have admin access.');
        return;
      }
      const displayName = data.name && !/^\+?\d{7,}$/.test(data.name) ? data.name : undefined;
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_role', data.activeRole);
      if (displayName) localStorage.setItem('admin_userName', displayName);
      localStorage.setItem('admin_welcome', JSON.stringify({ role: data.activeRole, name: displayName }));
      router.push('/admin');
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
      <Orb style={{ width: 380, height: 380, top: '-120px', left: '-100px' }} />
      <Orb style={{ width: 260, height: 260, bottom: '-60px', right: '-70px', animationDelay: '1.6s' }} />
      <Orb style={{ width: 180, height: 180, top: '50%', right: '12%', animationDelay: '1s' }} />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      >
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <div className="auth-role-badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', borderColor: 'rgba(245,158,11,0.25)' }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Admin Portal
          </div>
        </motion.div>

        {/* Pulsing logo avatar */}
        <motion.div className="avatar-wrap" custom={1} variants={fadeUp} initial="hidden" animate="show">
          <motion.div
            className="avatar"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}
            variants={pulseScale}
            animate="animate"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M12 7v10M7 9.5l5 2.5 5-2.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </motion.div>

        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
          <h2 className="auth-title">Admin Sign In</h2>
          <p className="auth-sub">Access the administration dashboard</p>
        </motion.div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
            <label className="field-label">Admin Phone Number</label>
            <motion.input
              className="input"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Enter admin phone number"
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
            <motion.div className="auth-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
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
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 16px rgba(245,158,11,0.35)' }}
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
              ) : 'Sign In as Admin'}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

export default AdminLoginPage;
