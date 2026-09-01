'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  'Booked appointment': { bg: '#f0fdf4', color: '#16a34a' }, // Green
  'Registered new patient': { bg: '#f0fdf4', color: '#16a34a' },
  'Added new doctor': { bg: '#f0fdf4', color: '#16a34a' },
  'Updated appointment status': { bg: '#eff6ff', color: '#2563eb' }, // Blue
  'Cancelled appointment': { bg: '#fef2f2', color: '#dc2626' }, // Red
  'Logged into the system': { bg: '#fffbeb', color: '#d97706' }, // Orange/Yellow
  'Started a video consultation': { bg: '#fdf4ff', color: '#c026d3' }, // Purple
  DELETE: { bg: '#fef2f2', color: '#dc2626' },
  UPDATE: { bg: '#fffbeb', color: '#d97706' },
};

const AuditLogsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = filter
    ? logs.filter((l) =>
        l.action?.toLowerCase().includes(filter.toLowerCase()) ||
        l.entityType?.toLowerCase().includes(filter.toLowerCase()) ||
        l.entityId?.toLowerCase().includes(filter.toLowerCase()) ||
        l.performedBy?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  return (
    <div style={{ padding: '20px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Audit Logs</h2>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Track all system actions and changes</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="Search by action, entity, user…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, width: 260, outline: 'none' }}
          />
          <button
            onClick={fetchLogs}
            style={{ padding: '9px 16px', borderRadius: 10, background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', overflow: 'hidden' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['#', 'Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Performed By'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {[30, 140, 90, 110, 140, 140].map((w, j) => (
                    <td key={j} style={{ padding: '12px 16px' }}>
                      <div style={{ height: 12, borderRadius: 6, width: w, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>No audit logs found.</td></tr>
              )}
              {!loading && filtered.map((log, i) => {
                const actionStyle = ACTION_COLORS[log.action] || { bg: '#f8fafc', color: '#475569' };
                return (
                  <motion.tr
                    key={log.id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#fafafa')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>#{i + 1}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, background: actionStyle.bg, color: actionStyle.color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 500 }}>{log.entityType}</td>
                    <td style={{ padding: '12px 16px', color: '#374151', fontSize: 12, fontWeight: 500 }}>
                      {log.entityName || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151', fontSize: 12, fontWeight: 500 }}>
                      {log.performedByName || (log.performedBy?.slice(0, 14) + '…')}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8' }}>
            Showing {filtered.length} of {logs.length} entries
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AuditLogsPage;
