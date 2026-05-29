'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, staggerContainer, fadeUp } from '@/lib/animations';
import '@/styles/patient/my-appointments.css';

const STATUS_BADGE_COLORS: Record<string, string> = {
  SCHEDULED: 'scheduled',
  CREATED: 'created',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

const MyAppointmentsPage = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [loading, setLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('hms_token');
    if (!token) { router.replace('/login'); return; }
    setLoading(true);

    fetch('/api/appointments', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        if (Array.isArray(data)) {
          const filtered = data.filter((appt: any) => {
            if (activeTab === 'UPCOMING') return ['CREATED', 'SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'].includes(appt.status);
            if (activeTab === 'COMPLETED') return appt.status === 'COMPLETED';
            if (activeTab === 'CANCELLED') return appt.status === 'CANCELLED' || appt.status === 'NO_SHOW';
            return true;
          });
          setAppointments(filtered);
        }
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [activeTab, router]);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError('');
    const token = localStorage.getItem('hms_token');
    try {
      const res = await fetch(`/api/appointments/${cancelTarget.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setCancelError(data.error || 'Cancellation failed. Please try again.');
        return;
      }
      setAppointments((prev) => prev.filter((a) => a.id !== cancelTarget.id));
      setCancelTarget(null);
    } catch {
      setCancelError('Network error. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const patientName = (appt: any) => {
    if (!appt.patient) return null;
    const name = `${appt.patient.firstName} ${appt.patient.lastName}`;
    const rel = appt.patient.relation;
    return rel && rel !== 'SELF' ? `${name} (${rel.charAt(0) + rel.slice(1).toLowerCase()})` : name;
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="my-appointments-container">
        <div className="appointments-header">
          <motion.h2
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            My Appointments
          </motion.h2>
          <motion.button
            className="book-appointment-btn"
            onClick={() => router.push('/DoctorsAppointment')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            + Book an Appointment
          </motion.button>
        </div>

        {/* Animated tab switching */}
        <div className="tabs">
          {['UPCOMING', 'COMPLETED', 'CANCELLED'].map((tab) => (
            <motion.button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </motion.button>
          ))}
        </div>

        {loading ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="appointments-table">
              <thead>
                <tr><th>#</th><th>Booked For</th><th>Doctor</th><th>Speciality</th><th>Date</th><th>Time</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[30, 100, 130, 110, 90, 60, 70, 60].map((w, j) => (
                      <td key={j}>
                        <div style={{ height: 12, borderRadius: 6, width: w, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : appointments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="empty-state"
          >
            <div className="empty-icon">📅</div>
            <h3>No {activeTab.toLowerCase()} appointments</h3>
            <p>You don&apos;t have any {activeTab.toLowerCase()} appointments.</p>
            {activeTab === 'UPCOMING' && (
              <motion.button
                className="book-btn"
                onClick={() => router.push('/DoctorsAppointment')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
              >
                Book New Appointment
              </motion.button>
            )}
          </motion.div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>#</th><th>Booked For</th><th>Doctor</th><th>Speciality</th>
                  <th>Date</th><th>Time</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {appointments.map((appt: any, idx: number) => (
                    <motion.tr
                      key={appt.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40, transition: { duration: 0.3 } }}
                      transition={{ delay: idx * 0.03, duration: 0.35 }}
                    >
                      <td style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem' }}>#{String(idx + 1).padStart(3, '0')}</td>
                      <td style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                        {patientName(appt) ?? <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td>{appt.doctor?.fullname || 'N/A'}</td>
                      <td>{appt.doctor?.specialization || 'N/A'}</td>
                      <td>{new Date(appt.appointmentDate).toLocaleDateString()}</td>
                      <td>{new Date(appt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td><span className={`status-badge ${STATUS_BADGE_COLORS[appt.status] ?? appt.status.toLowerCase()}`}>{appt.status}</span></td>
                      <td>
                        {activeTab === 'UPCOMING' && (
                          <motion.button
                            className="cancel-btn"
                            onClick={() => { setCancelTarget(appt); setCancelError(''); }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                          >
                            Cancel
                          </motion.button>
                        )}
                        {(activeTab === 'COMPLETED' || activeTab === 'CANCELLED') && (
                          <motion.button
                            className="rebook-btn"
                            onClick={() => router.push('/DoctorsAppointment')}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                          >
                            Book Again
                          </motion.button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setCancelTarget(null); setCancelError(''); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: 380, boxShadow: '0 24px 64px rgba(15,23,42,0.22)', textAlign: 'center' }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.1 }}
                style={{ width: 52, height: 52, borderRadius: 16, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}
              >
                ❌
              </motion.div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Cancel Appointment?</h3>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#64748b' }}>
                With <strong>Dr. {cancelTarget.doctor?.fullname}</strong>
              </p>
              {cancelTarget.patient && (
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6366f1', fontWeight: 600 }}>
                  For: {patientName(cancelTarget)}
                </p>
              )}
              <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b' }}>
                {new Date(cancelTarget.appointmentDate).toLocaleDateString()} at {new Date(cancelTarget.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              {cancelError && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                  {cancelError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button
                  onClick={() => { setCancelTarget(null); setCancelError(''); }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, background: '#f1f5f9', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#475569' }}
                >
                  Keep It
                </motion.button>
                <motion.button
                  onClick={handleCancelConfirm}
                  disabled={cancelling}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: cancelling ? 0.7 : 1 }}
                >
                  {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MyAppointmentsPage;
