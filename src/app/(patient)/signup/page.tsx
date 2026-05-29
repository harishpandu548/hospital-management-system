'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer, fadeUp as fadeUpVar } from '@/lib/animations';
import '@/styles/patient/login-modal.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
  }),
};

/* Floating background orb */
const Orb = ({ style }: { style: React.CSSProperties }) => (
  <motion.div
    animate={{ y: [0, -14, 0], scale: [1, 1.04, 1] }}
    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      position: 'absolute', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
      pointerEvents: 'none', ...style,
    }}
  />
);

const SignupPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({ phone: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, email: formData.email || undefined, password: formData.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('hms_role', data.activeRole);
      localStorage.setItem('userName', formData.phone);
      router.push('/home');
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
      {/* Floating background orbs */}
      <Orb style={{ width: 340, height: 340, top: '-80px', left: '-100px' }} />
      <Orb style={{ width: 260, height: 260, bottom: '-60px', right: '-80px', animationDelay: '1.5s' }} />
      <Orb style={{ width: 180, height: 180, top: '40%', right: '10%', animationDelay: '0.8s' }} />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
      >
        <motion.div className="avatar-wrap" custom={0} variants={fadeUp} initial="hidden" animate="show">
          <div className="avatar">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.8" fill="rgba(255,255,255,0.9)" />
              <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" fill="rgba(255,255,255,0.7)" />
              <path d="M19 7l-2 2-1-1" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </motion.div>

        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-sub">Join as a new patient</p>
        </motion.div>

        <motion.form
          className="auth-form"
          onSubmit={handleSubmit}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {[
            { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: 'Enter phone number', required: true },
            { label: 'Email (optional)', key: 'email', type: 'email', placeholder: 'Enter your email', required: false },
            { label: 'Password', key: 'password', type: 'password', placeholder: 'Create a password', required: true },
            { label: 'Confirm Password', key: 'confirmPassword', type: 'password', placeholder: 'Confirm your password', required: true },
          ].map((field, i) => (
            <motion.div key={field.key} custom={i + 2} variants={fadeUp} initial="hidden" animate="show">
              <label className="field-label">
                {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <motion.input
                className="input"
                type={field.type}
                value={formData[field.key as keyof typeof formData]}
                onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                required={field.required}
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.15 }}
              />
            </motion.div>
          ))}

          {error && (
            <motion.div className="auth-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </motion.div>
          )}

          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show">
            <motion.button
              type="submit"
              className="btn primary"
              disabled={loading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              animate={!loading ? { scale: [1, 1.02, 1] } : {}}
              transition={!loading ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </motion.button>
          </motion.div>
        </motion.form>

        <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show">
          <div className="auth-divider"><span>or</span></div>
          <p className="auth-sub" style={{ marginBottom: 0 }}>
            Already have an account?{' '}
            <Link href="/login" className="auth-link">Sign in →</Link>
          </p>
        </motion.div>
      </motion.div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};

export default SignupPage;
