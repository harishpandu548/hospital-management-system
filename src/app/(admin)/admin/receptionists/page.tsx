'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none',
};

const ReceptionistsPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users?role=RECEPTIONIST', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUsers(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const active = users.filter(u => u.status === 'ACTIVE');
  const inactive = users.filter(u => u.status !== 'ACTIVE');
  const pool = showInactive ? inactive : active;

  const q = search.trim().toLowerCase();
  const filtered = q ? pool.filter(u => u.phone?.includes(q) || u.email?.toLowerCase().includes(q)) : pool;

  return (
    <div style={{ padding: '20px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Receptionists</h2>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Manage staff accounts and access</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text" placeholder="Search by phone or email…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, width: 220, outline: 'none' }}
          />
          <button
            onClick={() => setShowInactive(p => !p)}
            style={{ padding: '9px 16px', borderRadius: 10, background: showInactive ? '#fef3c7' : '#f1f5f9', color: showInactive ? '#92400e' : '#475569', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            {showInactive ? `Active (${active.length})` : `Inactive (${inactive.length})`}
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            style={{ padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            + Add Receptionist
          </button>
        </div>
      </motion.div>

      {/* List */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        {loading && [1,2,3,4,5].map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
              <div>
                <div style={{ height: 13, width: 120, borderRadius: 4, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', marginBottom: 6 }} />
                <div style={{ height: 11, width: 180, borderRadius: 4, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ height: 26, width: 60, borderRadius: 99, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              <div style={{ height: 32, width: 90, borderRadius: 8, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            {showInactive ? 'No inactive receptionists.' : pool.length === 0 ? 'No receptionists yet. Add one above.' : 'No results match your search.'}
          </div>
        )}
        {!loading && filtered.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 24px', borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {u.phone?.charAt(0) || 'R'}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{u.phone}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {u.email || 'No email'} &nbsp;·&nbsp;
                  Joined {new Date(u.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                background: u.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2',
                color: u.status === 'ACTIVE' ? '#16a34a' : '#dc2626',
                border: `1px solid ${u.status === 'ACTIVE' ? '#bbf7d0' : '#fecaca'}`,
              }}>
                {u.status}
              </span>
              <button
                onClick={() => setStatusTarget(u)}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: u.status === 'ACTIVE' ? '#fef2f2' : '#f0fdf4',
                  color: u.status === 'ACTIVE' ? '#dc2626' : '#16a34a',
                }}
              >
                {u.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {createOpen && (
          <CreateReceptionistModal
            onClose={() => setCreateOpen(false)}
            onCreated={() => { setCreateOpen(false); fetchUsers(); }}
          />
        )}
        {statusTarget && (
          <UserStatusModal
            user={statusTarget}
            onClose={() => setStatusTarget(null)}
            onDone={() => { setStatusTarget(null); fetchUsers(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const Overlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }}
      style={{ background: '#fff', borderRadius: 20, padding: '32px', width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(15,23,42,0.2)' }}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </motion.div>
);

const CreateReceptionistModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [form, setForm] = useState({ phone: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.phone || !form.password) { setError('Phone and password are required.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ phone: form.phone, password: form.password, roleName: 'RECEPTIONIST' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create receptionist.'); return; }
      setSuccess(`Receptionist created! They can login at /receptionist/login`);
      setTimeout(onCreated, 1500);
    } catch { setError('Network error.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <h3 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Add Receptionist</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          { name: 'phone', label: 'Phone (Login ID)', type: 'tel', placeholder: '9876543210' },
          { name: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters' },
          { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Re-enter password' },
        ].map(f => (
          <div key={f.name}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label} <span style={{ color: '#ef4444' }}>*</span></label>
            <input type={f.type} value={form[f.name as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} required />
          </div>
        ))}
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', color: '#16a34a', fontSize: 13 }}>✓ {success}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="submit" disabled={submitting || !!success}
            style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            {submitting ? 'Creating…' : 'Create Account'}
          </button>
          <button type="button" onClick={onClose}
            style={{ padding: '11px 20px', borderRadius: 10, background: '#f1f5f9', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#475569' }}>
            Cancel
          </button>
        </div>
      </form>
    </Overlay>
  );
};

const UserStatusModal = ({ user, onClose, onDone }: { user: any; onClose: () => void; onDone: () => void }) => {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const willDeactivate = user.status === 'ACTIVE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) { setError('Enter your admin password to confirm.'); return; }
    setSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: willDeactivate ? 'SUSPENDED' : 'ACTIVE', adminPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Action failed.'); return; }
      setSuccess(`Account ${willDeactivate ? 'deactivated' : 'reactivated'} successfully.`);
      setTimeout(onDone, 1500);
    } catch { setError('Network error.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
        {willDeactivate ? 'Deactivate' : 'Reactivate'} Receptionist
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
        {willDeactivate
          ? `${user.phone} will be suspended and cannot log in until reactivated.`
          : `${user.phone} will be able to log in again.`}
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Admin Password (to confirm)</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Enter your admin password" style={inputStyle} required
          />
        </div>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', color: '#16a34a', fontSize: 13 }}>✓ {success}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="submit" disabled={submitting || !!success}
            style={{ flex: 1, padding: '11px', borderRadius: 10, background: willDeactivate ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            {submitting ? 'Processing…' : willDeactivate ? 'Yes, Deactivate' : 'Yes, Reactivate'}
          </button>
          <button type="button" onClick={onClose}
            style={{ padding: '11px 20px', borderRadius: 10, background: '#f1f5f9', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#475569' }}>
            Cancel
          </button>
        </div>
      </form>
    </Overlay>
  );
};

export default ReceptionistsPage;
