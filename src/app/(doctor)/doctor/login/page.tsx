'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { pageVariants } from '@/lib/animations';
import '@/styles/patient/login-modal.css';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

/* Floating medical cross orb */
const MedCross = ({ style }: { style: React.CSSProperties }) => (
  <motion.div
    animate={{ y: [0, -12, 0], rotate: [0, 8, 0], scale: [1, 1.05, 1] }}
    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      position: 'absolute', pointerEvents: 'none',
      color: 'rgba(16,185,129,0.18)', fontSize: 48, lineHeight: 1,
      ...style,
    }}
  >
    ✚
  </motion.div>
);

const DoctorLoginPage = () => {
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
        body: JSON.stringify({ phone: formData.phone, password: formData.password, activeRole: 'DOCTOR' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed. Make sure you have doctor access.');
        return;
      }
      if (data.activeRole !== 'DOCTOR') {
        setError('This account does not have doctor access.');
        return;
      }
      const displayName = data.name && !/^\+?\d{7,}$/.test(data.name) ? data.name : undefined;
      localStorage.setItem('doctor_token', data.token);
      localStorage.setItem('doctor_role', data.activeRole);
      if (displayName) localStorage.setItem('doctor_userName', displayName);
      localStorage.setItem('doctor_welcome', JSON.stringify({ role: data.activeRole, name: displayName }));
      router.push('/doctor');
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
      {/* Floating medical cross orbs */}
      <MedCross style={{ top: '8%', left: '6%' }} />
      <MedCross style={{ top: '20%', right: '8%', animationDelay: '1.2s', fontSize: 32 }} />
      <MedCross style={{ bottom: '15%', left: '12%', animationDelay: '2s', fontSize: 28 }} />
      <MedCross style={{ bottom: '25%', right: '6%', animationDelay: '0.6s', fontSize: 40 }} />

      {/* Background glow */}
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          top: '-100px', left: '-100px', pointerEvents: 'none',
        }}
      />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      >
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <div className="auth-role-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', borderColor: 'rgba(16,185,129,0.25)' }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            Doctor Portal
          </div>
        </motion.div>

        {/* Heartbeat icon animation */}
        <motion.div
          className="avatar-wrap"
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <motion.div
            className="avatar"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}
            animate={{ scale: [1, 1.05, 0.98, 1.05, 1], boxShadow: ['0 8px 24px rgba(16,185,129,0.35)', '0 12px 32px rgba(16,185,129,0.55)', '0 8px 24px rgba(16,185,129,0.35)', '0 12px 32px rgba(16,185,129,0.55)', '0 8px 24px rgba(16,185,129,0.35)'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 12v6M9 15h6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </motion.div>
        </motion.div>

        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
          <h2 className="auth-title">Doctor Sign In</h2>
          <p className="auth-sub">Access your patient management dashboard</p>
        </motion.div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
            <label className="field-label">Phone Number</label>
            <motion.input
              className="input"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Enter your phone number"
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
            <motion.div className="auth-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
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
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
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
      </motion.div>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

export default DoctorLoginPage;
