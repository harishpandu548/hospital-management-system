'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer, fadeUp } from '@/lib/animations';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;

const DoctorSettingsPage = () => {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') || '' : '';
  const role = typeof window !== 'undefined' ? localStorage.getItem('hms_role') || '' : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.newPassword !== form.confirmPassword) { setError('New passwords do not match.'); return; }
    if (form.newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    setSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to change password.'); return; }
      setSuccess('Password changed successfully.');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <div style={{ marginBottom: 28 }}>
        <motion.h2
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}
        >
          Settings
        </motion.h2>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Manage your account preferences</p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 800 }}
      >
        {/* Profile info */}
        <motion.div
          variants={fadeUp}
          whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
          style={{ background: '#fff', borderRadius: 16, padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)' }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 20px', color: '#0f172a' }}>Account Info</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.15 }}
              style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22 }}
            >
              {userName.charAt(0).toUpperCase() || 'D'}
            </motion.div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{userName || '—'}</div>
              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 2 }}>{role}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
            <div><strong style={{ color: '#374151' }}>Login ID:</strong> {userName}</div>
            <div style={{ marginTop: 6 }}><strong style={{ color: '#374151' }}>Role:</strong> {role}</div>
            <div style={{ marginTop: 6 }}><strong style={{ color: '#374151' }}>Portal:</strong> Doctor</div>
          </div>
        </motion.div>

        {/* Change password */}
        <motion.div
          variants={fadeUp}
          whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
          style={{ background: '#fff', borderRadius: 16, padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)' }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 20px', color: '#0f172a' }}>Change Password</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { name: 'oldPassword', label: 'Current Password' },
              { name: 'newPassword', label: 'New Password' },
              { name: 'confirmPassword', label: 'Confirm New Password' },
            ].map(({ name, label }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
              >
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
                <motion.input
                  type="password"
                  name={name}
                  value={form[name as keyof typeof form]}
                  onChange={handleChange}
                  placeholder="••••••••"
                  whileFocus={{ scale: 1.01 }}
                  transition={{ duration: 0.15 }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </motion.div>
            ))}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', color: '#16a34a', fontSize: 13 }}
              >
                ✓ {success}
              </motion.div>
            )}
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              style={{ padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', marginTop: 4 }}
            >
              {submitting ? 'Changing…' : 'Change Password'}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default DoctorSettingsPage;
