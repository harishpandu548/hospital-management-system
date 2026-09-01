'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFile, FiImage, FiFileText, FiExternalLink, FiChevronDown, FiChevronUp, FiHeart } from 'react-icons/fi';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null;

const DOCTOR_TRANSITIONS: Record<string, string[]> = {
  CHECKED_IN: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SCHEDULED:   { bg: '#eff6ff', color: '#2563eb' },
  CHECKED_IN:  { bg: '#ecfdf5', color: '#059669' },
  IN_PROGRESS: { bg: '#fffbeb', color: '#d97706' },
  COMPLETED:   { bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED:   { bg: '#fef2f2', color: '#dc2626' },
  NO_SHOW:     { bg: '#fef3c7', color: '#92400e' },
};

const RELATION_LABEL: Record<string, string> = {
  SELF: 'Self', SPOUSE: 'Spouse', CHILD: 'Child', PARENT: 'Parent', SIBLING: 'Sibling', OTHER: 'Other',
};

function calcAge(dob: string) {
  if (!dob) return '—';
  return String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

function fileIcon(type = '') {
  if (type.startsWith('image/')) return <FiImage size={14} />;
  if (type.includes('pdf')) return <FiFileText size={14} />;
  return <FiFile size={14} />;
}

function cleanPhone(raw: string | undefined): string {
  if (!raw) return '—';
  const half = Math.floor(raw.length / 2);
  if (raw.length > 6 && raw.slice(0, half) === raw.slice(half)) return raw.slice(0, half);
  return raw;
}

/* Patient detail panel shown when a row is expanded */
function PatientPanel({ patient }: { patient: any }) {
  if (!patient) return null;
  const files: any[] = Array.isArray(patient.medicalFiles) ? patient.medicalFiles : [];
  const relation = patient.relation && patient.relation !== 'SELF' ? RELATION_LABEL[patient.relation] ?? patient.relation : null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{ padding: '16px 20px 20px', background: 'linear-gradient(135deg,#f0fdf4,#fafbff)', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiHeart size={12} style={{ color: '#6366f1' }} /> Patient Medical Information
          {relation && <span style={{ padding: '2px 8px', borderRadius: 20, background: '#eef2ff', color: '#6366f1', fontSize: 10, fontWeight: 800, marginLeft: 4 }}>Booked for {relation}</span>}
        </div>

        {/* Vitals grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginBottom: 12 }}>
          {[
            { l: 'Blood Group', v: patient.bloodGroup || '—' },
            { l: 'Gender', v: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '—' },
            { l: 'Age', v: patient.dateOfBirth ? `${calcAge(patient.dateOfBirth)} yrs` : '—' },
            { l: 'Height', v: patient.heightCm ? `${patient.heightCm} cm` : '—' },
            { l: 'Weight', v: patient.weightKg ? `${patient.weightKg} kg` : '—' },
            { l: 'Phone', v: cleanPhone(patient.phone) },
          ].map(({ l, v }) => (
            <div key={l} style={{ padding: '8px 12px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Medical notes */}
        {patient.medicalNotes ? (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: 12, border: '1px solid #86efac', fontSize: 13, color: '#166534', lineHeight: 1.6, marginBottom: files.length ? 12 : 0 }}>
            <span style={{ fontWeight: 700 }}>Condition / Symptoms: </span>{patient.medicalNotes}
          </div>
        ) : (
          <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde047', fontSize: 12, color: '#854d0e', marginBottom: files.length ? 12 : 0 }}>
            No medical notes on file.
          </div>
        )}

        {/* Uploaded files / reports */}
        {files.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Reports & Uploads ({files.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map((f: any, i: number) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', textDecoration: 'none', color: '#1d4ed8', transition: 'all 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#eff6ff')}
                  onMouseOut={e => (e.currentTarget.style.background = '#fff')}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    {fileIcon(f.type)}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <FiExternalLink size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const DoctorAppointmentsPage = () => {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [statusModal, setStatusModal]   = useState<{ open: boolean; appt: any }>({ open: false, appt: null });
  const [newStatus, setNewStatus]       = useState('');
  const [updating, setUpdating]         = useState(false);
  const [activeTab, setActiveTab]       = useState('active');
  const [statusError, setStatusError]   = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const fetchAppts = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push('/doctor/login'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/appointments', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAppointments((await res.json()) || []);
    } catch { /**/ } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchAppts(); }, [fetchAppts]);

  const handleStatusUpdate = async () => {
    if (!statusModal.appt || !newStatus) return;
    setUpdating(true); setStatusError('');
    try {
      const token = getToken();
      const res = await fetch(`/api/appointments/${statusModal.appt.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ newStatus }),
      });
      if (res.ok) {
        await fetchAppts();
        setStatusModal({ open: false, appt: null }); setNewStatus(''); setStatusError('');
      } else {
        const d = await res.json();
        setStatusError(d.error || 'Update failed.');
      }
    } catch { setStatusError('Network error.'); } finally { setUpdating(false); }
  };

  const tabs = [
    { key: 'active',     label: 'Active',              statuses: ['SCHEDULED','CHECKED_IN','IN_PROGRESS'] },
    { key: 'completed',  label: 'Completed',            statuses: ['COMPLETED'] },
    { key: 'other',      label: 'Cancelled / No-show',  statuses: ['CANCELLED','NO_SHOW'] },
  ];
  const currentTab = tabs.find(t => t.key === activeTab)!;
  const filtered = appointments.filter(a => currentTab.statuses.includes(a.status));

  return (
    <div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>My Appointments</h2>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Click any row to view patient medical info & reports</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#f1f5f9', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: activeTab === t.key ? '#fff' : 'transparent', color: activeTab === t.key ? '#0f172a' : '#64748b', boxShadow: activeTab === t.key ? '0 1px 4px rgba(15,23,42,0.1)' : 'none', transition: 'all 0.2s' }}>
            {t.label} ({appointments.filter(a => t.statuses.includes(a.status)).length})
          </button>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['#', 'Date / Time', 'Patient', 'For', 'Condition', 'Reports', 'Status', 'Action', ''].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                {[30, 90, 110, 60, 100, 50, 80, 60, 30].map((w, j) => (
                  <td key={j} style={{ padding: '12px 14px' }}>
                    <div style={{ height: 12, borderRadius: 6, width: w, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                  </td>
                ))}
              </tr>
            ))}

            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>No appointments here.</td></tr>
            )}

            {!loading && filtered.map((a, i) => {
              const sc      = STATUS_COLORS[a.status] || { bg: '#f8fafc', color: '#475569' };
              const canUpd  = !!DOCTOR_TRANSITIONS[a.status];
              const notes   = a.patient?.medicalNotes || '';
              const condition = notes.split(':')[0]?.trim() || notes.split(',')[0]?.trim() || '—';
              const files: any[] = Array.isArray(a.patient?.medicalFiles) ? a.patient.medicalFiles : [];
              const rel     = a.patient?.relation && a.patient.relation !== 'SELF' ? RELATION_LABEL[a.patient.relation] ?? a.patient.relation : null;
              const isOpen  = expandedId === a.id;

              return (
                <React.Fragment key={a.id}>
                  <tr
                    style={{ borderBottom: isOpen ? 'none' : '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s', background: isOpen ? '#fafbff' : 'transparent' }}
                    onClick={() => setExpandedId(isOpen ? null : a.id)}
                    onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '13px 14px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>#{i + 1}</td>
                    <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{new Date(a.appointmentDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(a.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ padding: '13px 14px', fontWeight: 700, color: '#0f172a' }}>
                      {a.patient?.firstName} {a.patient?.lastName}
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      {rel
                        ? <span style={{ padding: '3px 8px', borderRadius: 20, background: '#eef2ff', color: '#6366f1', fontSize: 11, fontWeight: 700 }}>{rel}</span>
                        : <span style={{ color: '#94a3b8', fontSize: 11 }}>Self</span>
                      }
                    </td>
                    <td style={{ padding: '13px 14px', color: '#64748b', maxWidth: 150 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{condition}</div>
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      {files.length > 0
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#2563eb', fontSize: 12 }}><FiFile size={13} />{files.length}</span>
                        : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                        {a.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '13px 14px' }} onClick={e => e.stopPropagation()}>
                      {canUpd ? (
                        <button
                          onClick={() => { setStatusModal({ open: true, appt: a }); setNewStatus(''); }}
                          style={{ padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                        >
                          Update
                        </button>
                      ) : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '13px 10px', color: '#94a3b8' }}>
                      {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </td>
                  </tr>

                  {/* Expandable patient medical panel */}
                  <AnimatePresence>
                    {isOpen && (
                      <tr key={`${a.id}-panel`}>
                        <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid #e2e8f0' }}>
                          <PatientPanel patient={a.patient} />
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </motion.div>

      {/* Status update modal */}
      <AnimatePresence>
        {statusModal.open && statusModal.appt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={e => { if (e.target === e.currentTarget) { setStatusModal({ open: false, appt: null }); setStatusError(''); } }}
          >
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#fff', borderRadius: 20, padding: '28px', width: 400, boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}
            >
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Update Appointment Status</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
                Patient: <strong>{statusModal.appt.patient?.firstName} {statusModal.appt.patient?.lastName}</strong><br />
                Current: <strong style={{ color: '#10b981' }}>{statusModal.appt.status}</strong>
              </p>
              <select value={newStatus} onChange={e => { setNewStatus(e.target.value); setStatusError(''); }} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, marginBottom: statusError ? 12 : 20, outline: 'none' }}>
                <option value="">Select new status…</option>
                {(DOCTOR_TRANSITIONS[statusModal.appt.status] || []).map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              {statusError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{statusError}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleStatusUpdate} disabled={!newStatus || updating} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: (!newStatus || updating) ? 0.6 : 1 }}>
                  {updating ? 'Updating…' : 'Confirm'}
                </button>
                <button onClick={() => { setStatusModal({ open: false, appt: null }); setStatusError(''); setNewStatus(''); }} style={{ flex: 1, padding: '11px', borderRadius: 10, background: '#f1f5f9', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#475569' }}>
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

export default DoctorAppointmentsPage;
