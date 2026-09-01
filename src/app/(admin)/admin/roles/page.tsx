'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  ADMIN:        { bg: '#fef3c7', color: '#92400e' },
  RECEPTIONIST: { bg: '#eff6ff', color: '#2563eb' },
  DOCTOR:       { bg: '#ecfdf5', color: '#059669' },
  PATIENT:      { bg: '#eef2ff', color: '#6366f1' },
};

const ALL_ROLES = ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT'];

const RoleAssignmentPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assignModal, setAssignModal] = useState<{ open: boolean; user: any }>({ open: false, user: null });
  const [selectedRole, setSelectedRole] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  const fetchUsers = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUsers(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? users.filter(u => u.phone?.includes(q) || u.email?.toLowerCase().includes(q))
    : users;

  const handleAssign = async () => {
    if (!assignModal.user || !selectedRole) return;
    setAssigning(true);
    setAssignError('');
    setAssignSuccess('');
    const token = getToken();
    try {
      const res = await fetch('/api/admin/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: assignModal.user.id, roleName: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAssignError(data.error || 'Failed to assign role.');
      } else {
        setAssignSuccess(`Role "${selectedRole}" assigned successfully.`);
        await fetchUsers();
        setTimeout(() => {
          setAssignModal({ open: false, user: null });
          setSelectedRole('');
          setAssignSuccess('');
        }, 1200);
      }
    } catch {
      setAssignError('Network error. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div style={{ padding: '20px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Role Management</h2>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Assign additional roles to users (e.g. receptionist → doctor)</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="Search by phone or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, width: 240, outline: 'none' }}
          />
          <button
            onClick={fetchUsers}
            style={{ padding: '9px 16px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', overflow: 'hidden' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['#', 'Phone / Email', 'Current Roles', 'Status', 'Joined', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {[30, 180, 200, 80, 110, 80].map((w, j) => (
                    <td key={j} style={{ padding: '12px 16px' }}>
                      <div style={{ height: 12, borderRadius: 6, width: w, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>No users found.</td></tr>
              )}
              {!loading && filtered.map((user, i) => {
                const roles: string[] = user.roles?.map((r: any) => r.role?.name).filter(Boolean) || [];
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#fafafa')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>#{i + 1}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{user.phone || '—'}</div>
                      {user.email && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{user.email}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {roles.length === 0 ? (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>No roles</span>
                        ) : roles.map(r => {
                          const rc = ROLE_COLORS[r] || { bg: '#f1f5f9', color: '#475569' };
                          return (
                            <span key={r} style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: rc.bg, color: rc.color }}>
                              {r}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: user.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2',
                        color: user.status === 'ACTIVE' ? '#16a34a' : '#dc2626',
                      }}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => { setAssignModal({ open: true, user }); setSelectedRole(''); setAssignError(''); setAssignSuccess(''); }}
                        style={{ padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                      >
                        Assign Role
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8' }}>
            {filtered.length} user{filtered.length !== 1 ? 's' : ''} shown
          </div>
        )}
      </motion.div>

      {/* Assign Role Modal */}
      <AnimatePresence>
        {assignModal.open && assignModal.user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={e => { if (e.target === e.currentTarget) setAssignModal({ open: false, user: null }); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: 420, boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}
            >
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Assign Role</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
                User: <strong>{assignModal.user.phone}</strong>
                {assignModal.user.email && <> · {assignModal.user.email}</>}
              </p>

              {/* Current roles */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Current Roles</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(assignModal.user.roles?.map((r: any) => r.role?.name).filter(Boolean) || []).length === 0 ? (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>No roles assigned</span>
                  ) : assignModal.user.roles?.map((r: any) => r.role?.name).filter(Boolean).map((role: string) => {
                    const rc = ROLE_COLORS[role] || { bg: '#f1f5f9', color: '#475569' };
                    return <span key={role} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: rc.bg, color: rc.color }}>{role}</span>;
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add Role</div>
              <select
                value={selectedRole}
                onChange={e => { setSelectedRole(e.target.value); setAssignError(''); setAssignSuccess(''); }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, marginBottom: 16, outline: 'none' }}
              >
                <option value="">Select role to add…</option>
                {ALL_ROLES.map(r => {
                  const alreadyHas = assignModal.user.roles?.some((ur: any) => ur.role?.name === r);
                  return (
                    <option key={r} value={r} disabled={alreadyHas}>
                      {r}{alreadyHas ? ' (already assigned)' : ''}
                    </option>
                  );
                })}
              </select>

              {assignError && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {assignError}
                </div>
              )}
              {assignSuccess && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM14.707 8.293a1 1 0 00-1.414-1.414L9 11.172 6.707 8.879a1 1 0 00-1.414 1.414L9 14 14.707 8.293z" clipRule="evenodd" />
                  </svg>
                  {assignSuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleAssign}
                  disabled={!selectedRole || assigning}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: (!selectedRole || assigning) ? 0.6 : 1 }}
                >
                  {assigning ? 'Assigning…' : 'Assign Role'}
                </button>
                <button
                  onClick={() => setAssignModal({ open: false, user: null })}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, background: '#f1f5f9', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#475569' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoleAssignmentPage;
