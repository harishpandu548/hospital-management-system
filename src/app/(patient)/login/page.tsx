'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import '@/styles/patient/login-modal.css';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const ROLE_LABELS: Record<string, string> = {
  PATIENT: 'Patient',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Receptionist',
  ADMIN: 'Admin',
};

const LoginPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  const doLogin = async (phone: string, password: string, activeRole?: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, activeRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Multi-role: show role picker
      if (data.roles && !data.token) {
        setAvailableRoles(data.roles);
        setLoading(false);
        return;
      }

      const displayName = data.name && !/^\+?\d{7,}$/.test(data.name) ? data.name : undefined;
      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('hms_role', data.activeRole);
      localStorage.setItem('userName', displayName || phone);
      localStorage.setItem('hms_welcome', JSON.stringify({ role: data.activeRole, name: displayName }));

      if (data.activeRole === 'ADMIN') {
        router.push('/admin');
      } else if (data.activeRole === 'RECEPTIONIST') {
        router.push('/receptionist');
      } else if (data.activeRole === 'DOCTOR') {
        router.push('/doctor');
      } else if (data.activeRole === 'PATIENT') {
        router.push('/patient-intake');
      } else {
        setError('Unknown account type. Please contact support.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(formData.phone, formData.password);
  };

  const handleRoleSelect = (role: string) => {
    setAvailableRoles([]);
    doLogin(formData.phone, formData.password, role);
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      >
        <motion.div className="avatar-wrap" custom={0} variants={fadeUp} initial="hidden" animate="show">
          <div className="avatar">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.8" fill="rgba(255,255,255,0.9)" />
              <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
        </motion.div>

        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-sub">Sign in to your patient account</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {availableRoles.length > 0 ? (
            <motion.div
              key="role-select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <p style={{ textAlign: 'center', fontSize: 14, color: '#475569', marginBottom: 16 }}>
                Your account has multiple roles. Please select one to continue:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSelect(role)}
                    disabled={loading}
                    style={{
                      padding: '12px 20px', borderRadius: 12, border: '2px solid #e2e8f0',
                      background: '#f8fafc', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                      color: '#1e293b', transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { (e.currentTarget.style.borderColor = '#6366f1'); (e.currentTarget.style.background = '#f0f0ff'); }}
                    onMouseOut={(e) => { (e.currentTarget.style.borderColor = '#e2e8f0'); (e.currentTarget.style.background = '#f8fafc'); }}
                  >
                    {ROLE_LABELS[role] ?? role}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setAvailableRoles([])}
                style={{ marginTop: 14, width: '100%', background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Back to login
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="login-form"
              className="auth-form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
                <label className="field-label">Phone Number</label>
                <input
                  className="input"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                  required
                />
              </motion.div>

              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
                <label className="field-label">Password</label>
                <input
                  className="input"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
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

              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
                <button type="submit" className="btn primary" disabled={loading}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign In'}
                </button>
              </motion.div>
            </motion.form>
          )}
        </AnimatePresence>

        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
          <div className="auth-divider"><span>or</span></div>
          <p className="auth-sub" style={{ marginBottom: '8px' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="auth-link">Create account</Link>
          </p>
          <p className="auth-sub" style={{ marginBottom: 0 }}>
            Staff?{' '}
            <Link href="/receptionist/login" className="auth-link">Receptionist login →</Link>
          </p>
        </motion.div>
      </motion.div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LoginPage;
