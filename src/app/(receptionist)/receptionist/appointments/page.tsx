'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, staggerContainer, fadeUp } from '@/lib/animations';
import { useAppointments } from '@/context/receptionist/AppointmentsContext';
import AppointmentModal from '@/components/receptionist/AppointmentModal';
import '@/styles/receptionist/appointments.css';

// Per-role allowed transitions (receptionist view)
const RECEPTIONIST_TRANSITIONS: Record<string, string[]> = {
  CREATED:    ['SCHEDULED', 'CANCELLED'],
  SCHEDULED:  ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: [],
  COMPLETED:  [],
  CANCELLED:  [],
  NO_SHOW:    [],
};

const Sk = ({ w = 80 }: { w?: number }) => (
  <div style={{ height: 13, width: w, borderRadius: 4, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
);
const SkeletonRow = () => (
  <tr>
    {[30,60,100,40,90,80,70,70,100,70,50].map((w,i)=>(
      <td key={i}><Sk w={w}/></td>
    ))}
  </tr>
);

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('receptionist_token') : null;

const AppointmentsPage = () => {
  const router = useRouter();
  const { appointments, setAppointments, refetch, loading } = useAppointments();
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedApptForNotes, setSelectedApptForNotes] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<any>(null);
  const [statusModal, setStatusModal] = useState<{ open: boolean; appt: any }>({ open: false, appt: null });
  const [newStatus, setNewStatus] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredRowId, setHoveredRowId] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.('.dropdown-container')) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdate = (updated: any) =>
    setAppointments((prev: any[]) => prev.map((a: any) => (a.id === updated.id ? updated : a)));

  const handleDelete = (id: any) => {
    setAppointments((prev: any[]) => prev.filter((a: any) => a.id !== id));
    setModalOpen(false);
  };

  const handleSaveNote = () => {
    if (selectedApptForNotes) {
      const updated = { ...selectedApptForNotes, remarks: noteText };
      setAppointments((prev: any[]) =>
        prev.map((a: any) => (a.id === updated.id ? updated : a)),
      );
      setNotesModalOpen(false);
      setIsEditingNote(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusModal.appt || !newStatus) return;
    setStatusUpdating(true);
    setStatusError('');
    try {
      const token = getToken();
      const res = await fetch(`/api/appointments/${statusModal.appt._raw?.id || statusModal.appt.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newStatus }),
      });

      if (res.ok) {
        await refetch?.();
        setStatusModal({ open: false, appt: null });
        setNewStatus('');
        setStatusError('');
      } else {
        const data = await res.json();
        setStatusError(data.error || 'Status update failed.');
      }
    } catch {
      setStatusError('Network error updating status. Please try again.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filteredAppointments = appointments.filter((a: any) => {
    if (q && !a.name.toLowerCase().includes(q) && !a.doctor.toLowerCase().includes(q) && !a.condition.toLowerCase().includes(q) && !a.status.toLowerCase().includes(q)) return false;
    if (dateFilter && a.date !== new Date(dateFilter).toLocaleDateString()) return false;
    return true;
  });

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
    <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    <div className="appointments-container">
      <div className="appointments-header">
        <motion.h2
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          Appointments
        </motion.h2>
        <motion.button
          className="create-btn"
          onClick={() => router.push('/receptionist/book-appointment')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
        >
          Create Appointment
        </motion.button>
      </div>
      <div className="appointments-filters">
        <motion.input
          className="search-input"
          placeholder="Search by patient, doctor, condition…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          whileFocus={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
        />
        <input
          type="date"
          className="date-input"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>
      <div className="appointments-table-wrapper">
        <table className="appointments-table">
          <thead>
            <tr className="thead-tr">
              <th>#</th><th>Time</th><th>Patient</th><th>Age</th><th>Doctor</th><th>Condition</th>
              <th>Source</th><th>Status</th><th>Payment</th><th>Remarks</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && [1,2,3,4,5].map(k=><SkeletonRow key={k}/>)}
            {!loading && filteredAppointments.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{appointments.length === 0 ? 'No appointments yet.' : 'No results match your search.'}</td></tr>
            )}
            {!loading && filteredAppointments.map((a: any, i: number) => (
              <motion.tr
                key={a.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={hoveredRowId === a.id ? 'row-highlighted' : ''}
              >
                <td style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.8rem' }}>#{String(i + 1).padStart(3, '0')}</td>
                <td>{a.time}</td>
                <td
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setTooltipData(a);
                    setTooltipPos({ x: r.right + 10, y: r.top });
                    setHoveredRowId(a.id);
                  }}
                  onMouseLeave={() => { setTooltipData(null); setHoveredRowId(null); }}
                  style={{ cursor: 'pointer' }}
                  className="patient-name-cell"
                >
                  <span className="patient-name-hover">{a.name}</span>
                </td>
                <td>{a.age}</td>
                <td>{a.doctor}</td>
                <td>{a.condition}</td>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: a.source === 'patient' ? '#eff6ff' : '#f0fdf4',
                    color: a.source === 'patient' ? '#2563eb' : '#16a34a',
                    border: `1px solid ${a.source === 'patient' ? '#bfdbfe' : '#bbf7d0'}`,
                  }}>
                    {a.source === 'patient' ? 'Self-booked' : 'Staff'}
                  </span>
                </td>
                <td>
                  <span className={`status ${a.status?.toLowerCase().replace(/\s+/g, '-')}`}>{a.status}</span>
                </td>
                <td>
                  <span className={`payment_status ${a.payment_status?.toLowerCase()}`}>{a.payment_status}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    {a.remarks
                      ? <span className="remarks-snippet">{a.remarks.length > 40 ? a.remarks.slice(0, 40) + '…' : a.remarks}</span>
                      : <span className="no-notes">No remarks</span>
                    }
                    <button className="view-notes-link" onClick={() => { setSelectedApptForNotes(a); setNoteText(a.remarks || ''); setIsEditingNote(false); setNotesModalOpen(true); }}>
                      {a.remarks ? 'View' : 'Add'}
                    </button>
                  </div>
                </td>
                <td className="dropdown-container">
                  <button className="patient-action-btn" onClick={() => setOpenDropdownId(openDropdownId === a.id ? null : a.id)}>⋮</button>
                  {openDropdownId === a.id && (
                    <div className="dropdown-menu">
                      <button onClick={() => { setSelectedAppointment(a); setModalOpen(true); setOpenDropdownId(null); }}>View Details</button>
                      <button onClick={() => { setStatusModal({ open: true, appt: a }); setNewStatus(''); setOpenDropdownId(null); }}>Update Status</button>
                    </div>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Appointment detail modal */}
      {modalOpen && selectedAppointment && (
        <AppointmentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          appointment={selectedAppointment}
          onUpdate={handleUpdate}
          onDelete={() => handleDelete(selectedAppointment.id)}
          onSendNotification={(appt: any) => appt?.id && alert(`Notification sent to ${appt.name}`)}
        />
      )}

      {/* Notes modal */}
      <AnimatePresence>
        {notesModalOpen && selectedApptForNotes && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="notes-modal"
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            >
              <h3>Receptionist Remarks</h3>
              <div className="modal-body" style={{ padding: '18px 22px 4px' }}>
                {isEditingNote
                  ? <textarea className="notes-textarea" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                  : <div className="notes-display">{selectedApptForNotes.remarks || <span className="no-notes">No remarks added.</span>}</div>
                }
              </div>
              <div className="modal-actions">
                {!isEditingNote && <button className="edit-btn" onClick={() => setIsEditingNote(true)}>Edit</button>}
                {isEditingNote && <button className="save-btn" onClick={handleSaveNote}>Save</button>}
                <button className="cancel-btn" onClick={() => { setNotesModalOpen(false); setIsEditingNote(false); }}>Close</button>
                {!isEditingNote && selectedApptForNotes.remarks && (
                  <button className="delete-btn" onClick={() => {
                    setAppointments((prev: any[]) => prev.map((a: any) => a.id === selectedApptForNotes.id ? { ...a, remarks: '' } : a));
                    setNotesModalOpen(false);
                  }}>Delete</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status update modal */}
      <AnimatePresence>
        {statusModal.open && statusModal.appt && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="notes-modal"
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              style={{ width: '420px' }}
            >
              <h3>Update Appointment Status</h3>
              <div style={{ padding: '18px 22px 4px' }}>
                <div style={{ marginBottom: '6px', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Patient</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 14 }}>{statusModal.appt.name}</div>
                <div style={{ marginBottom: '14px', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Current status</div>
                <span className={`status ${statusModal.appt.status?.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')}`} style={{ marginBottom: '18px', display: 'inline-flex' }}>
                  {statusModal.appt.status?.replace(/_/g, ' ')}
                </span>
                {(() => {
                  const validNext = RECEPTIONIST_TRANSITIONS[statusModal.appt.status] || [];
                  return validNext.length === 0 ? (
                    <div style={{ marginTop: 18, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, fontSize: 13, color: '#64748b', border: '1px solid #e2e8f0' }}>
                      This appointment is in a terminal state and cannot be updated.
                    </div>
                  ) : (
                    <>
                      <div style={{ marginTop: '18px', marginBottom: '6px', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Change to</div>
                      <select
                        className="status-select"
                        value={newStatus}
                        onChange={(e) => { setNewStatus(e.target.value); setStatusError(''); }}
                      >
                        <option value="">Select new status…</option>
                        {validNext.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </>
                  );
                })()}
                {statusError && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {statusError}
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => { setStatusModal({ open: false, appt: null }); setStatusError(''); setNewStatus(''); }}>Cancel</button>
                {(RECEPTIONIST_TRANSITIONS[statusModal.appt.status] || []).length > 0 && (
                  <button className="save-btn" onClick={handleStatusUpdate} disabled={!newStatus || statusUpdating}>
                    {statusUpdating ? 'Updating…' : 'Update Status'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover tooltip */}
      {tooltipData && (
        <div className="patient-tooltip" style={{ position: 'fixed', left: Math.max(10, Math.min(tooltipPos.x, 1200)), top: Math.max(50, tooltipPos.y), minWidth: '280px', maxWidth: '350px' }}>
          <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}><strong>{tooltipData.name}</strong></div>
          <div style={{ fontSize: '0.85rem', color: '#555', lineHeight: '1.6' }}>
            <div><strong>Age:</strong> {tooltipData.age}</div>
            <div><strong>Doctor:</strong> {tooltipData.doctor}</div>
            <div><strong>Condition:</strong> {tooltipData.condition}</div>
            <div><strong>Phone:</strong> {tooltipData.phone || '-'}</div>
            <div><strong>Status:</strong> {tooltipData.status}</div>
          </div>
        </div>
      )}
    </div>
    </motion.div>
  );
};

export default AppointmentsPage;
