'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { FiActivity, FiX, FiClock } from 'react-icons/fi';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

export default function LiveAuditPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchLogs = () => {
    const token = getToken();
    if (token) {
      fetch('/api/audit-logs', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          if (Array.isArray(data)) setLogs(data.slice(0, 50));
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    fetchLogs();

    // Connect to websocket
    const socket = io('http://localhost:3001');
    socket.emit('join-admin');

    socket.on('audit-log', () => {
      fetchLogs(); // refetch to get resolved names
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    });

    return () => { socket.disconnect(); };
  }, [isOpen]);

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setUnreadCount(0);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        onClick={togglePanel}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.5), 0 8px 10px -6px rgba(79, 70, 229, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999
        }}
      >
        <FiActivity size={24} />
        {unreadCount > 0 && (
          <div style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 12, padding: '2px 6px', minWidth: 20, textAlign: 'center', border: '2px solid #fff' }}>
            {unreadCount}
          </div>
        )}
      </motion.button>

      {/* Slide-in Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 380,
              background: '#fff',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid #e2e8f0'
            }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiActivity size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Live Audit Feed</h3>
                  <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
                    Monitoring real-time events
                  </div>
                </div>
              </div>
              <button onClick={togglePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8 }}>
                <FiX size={20} />
              </button>
            </div>

            {/* Feed List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <FiClock size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>No activity yet.</p>
                </div>
              ) : (
                logs.map((log, i) => {
                  const isNew = i < 5; // Highlight newer logs slightly
                  return (
                    <motion.div
                      key={log.id || `${log.action}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: '14px',
                        background: '#fff',
                        borderRadius: 12,
                        border: `1px solid ${isNew ? '#e0e7ff' : '#f1f5f9'}`,
                        boxShadow: isNew ? '0 4px 12px rgba(79,70,229,0.05)' : 'none',
                        position: 'relative'
                      }}
                    >
                      <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 4, height: 24, borderRadius: 4, background: log.action === 'CREATE' ? '#10b981' : log.action?.includes('CANCEL') ? '#ef4444' : '#f59e0b' }} />
                      <div style={{ paddingLeft: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                          {log.action?.replace(/_/g, ' ')} {log.entityName ? `- ${log.entityName}` : ''}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>by {log.performedByName || log.performedBy || 'System'}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
