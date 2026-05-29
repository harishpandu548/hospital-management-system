'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { pageVariants, staggerContainer, fadeUp, scaleUp } from '@/lib/animations';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;

function calcAge(dob: string) {
  if (!dob) return '-';
  return String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SCHEDULED: { bg: '#eff6ff', color: '#2563eb' },
  CHECKED_IN: { bg: '#ecfdf5', color: '#059669' },
  IN_PROGRESS: { bg: '#fffbeb', color: '#d97706' },
  COMPLETED: { bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED: { bg: '#fef2f2', color: '#dc2626' },
  NO_SHOW: { bg: '#fef3c7', color: '#92400e' },
};

/* Animated counter — counts up from 0 to target */
const AnimatedCounter = ({ value, color }: { value: number; color: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const step = Math.ceil(end / 20);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}
    >
      {display}
    </motion.div>
  );
};

const DoctorDashboard = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [availableForCalls, setAvailableForCalls] = useState(false);
  const [availToggling, setAvailToggling] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/doctor/login'); return; }
    Promise.all([
      fetch('/api/doctors/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch('/api/appointments', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch('/api/consultations', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([prof, appts, consults]) => {
      setProfile(prof);
      if (prof?.fullname) localStorage.setItem('userName', prof.fullname.split(' ')[0]);
      setAppointments(Array.isArray(appts) ? appts : []);
      setConsultations(Array.isArray(consults) ? consults : []);
    }).then(() => {
      fetch('/api/doctors/availability-status', { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setAvailableForCalls(!!d.available); })
        .catch(() => {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  const today = new Date().toDateString();
  const todayAppts = appointments.filter(a => new Date(a.appointmentDate).toDateString() === today);
  const pending = appointments.filter(a => ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status));
  const patients = new Set(appointments.map(a => a.patientId)).size;

  if (loading) return (
    <div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 18, width: 200, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', marginBottom: 8 }} />
          <div style={{ height: 13, width: 150, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 22, width: 40, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', marginBottom: 6 }} />
              <div style={{ height: 11, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      {/* Availability toggle — slide in */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: 20, padding: '14px 18px', background: availableForCalls ? '#f0fdf4' : '#f8fafc', borderRadius: 16, border: `1px solid ${availableForCalls ? '#86efac' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: availableForCalls ? '#166534' : '#374151' }}>
            {availableForCalls ? '🟢 Available for Instant Calls' : '⚪ Not Available for Instant Calls'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {availableForCalls ? 'Patients can request an instant consultation with you right now.' : 'Toggle on to accept instant consultation requests from patients.'}
          </div>
        </div>
        <motion.button
          onClick={async () => {
            setAvailToggling(true);
            const token = getToken();
            const next = !availableForCalls;
            await fetch('/api/doctors/availability-status', {
              method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ available: next }),
            });
            setAvailableForCalls(next);
            setAvailToggling(false);
          }}
          disabled={availToggling}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          style={{ padding: '10px 20px', borderRadius: 12, background: availableForCalls ? '#fef2f2' : 'linear-gradient(135deg,#10b981,#059669)', color: availableForCalls ? '#dc2626' : '#fff', border: availableForCalls ? '1px solid #fecaca' : 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: availToggling ? 0.7 : 1, whiteSpace: 'nowrap' }}
        >
          {availToggling ? '…' : availableForCalls ? 'Go Offline' : 'Go Online'}
        </motion.button>
      </motion.div>

      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 700 }}>
            {profile.fullname?.charAt(0) || 'D'}
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}
            >
              Dr. {profile.fullname}
            </motion.h2>
            <p style={{ color: '#10b981', margin: '2px 0 0', fontSize: 14, fontWeight: 600 }}>{profile.specialization} · {profile.experienceYears} yrs exp</p>
          </div>
        </motion.div>
      )}

      {/* Stats with animated counters */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}
      >
        {[
          { label: "Today's Appointments", value: todayAppts.length, color: '#10b981', icon: '📅' },
          { label: 'Active Cases', value: pending.length, color: '#f59e0b', icon: '⏳' },
          { label: 'Total Patients', value: patients, color: '#6366f1', icon: '🧑‍🤝‍🧑' },
          { label: 'Completed', value: appointments.filter(a => a.status === 'COMPLETED').length, color: '#06b6d4', icon: '✅' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
            whileTap={{ scale: 0.97 }}
            style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', gap: 14, alignItems: 'center' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
            <div>
              <AnimatedCounter value={s.value} color={s.color} />
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Pending video consultations */}
      {consultations.filter(c => c.status === 'PENDING').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ background: '#fff', borderRadius: 16, border: '2px solid #fde047', boxShadow: '0 2px 12px rgba(234,179,8,0.12)', overflow: 'hidden', marginBottom: 20 }}
        >
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #fef9c3', background: '#fefce8', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308', animation: 'pulse 1.5s infinite' }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#854d0e' }}>Incoming Video Consultation Requests</h3>
          </div>
          <div style={{ padding: 12 }}>
            {consultations.filter(c => c.status === 'PENDING').map((consult, i) => (
              <motion.div
                key={consult.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderRadius: 10, marginBottom: 6, background: '#fafafa', border: '1px solid #f1f5f9' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📹</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                    {consult.patient?.firstName} {consult.patient?.lastName}
                    {consult.patient?.relation && consult.patient.relation !== 'SELF' && (
                      <span style={{ fontSize: 11, color: '#6366f1', marginLeft: 6, fontWeight: 700 }}>({consult.patient.relation})</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(consult.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Video Consultation</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button
                    onClick={async () => {
                      setAccepting(consult.id);
                      const token = getToken();
                      const res = await fetch(`/api/consultations/${consult.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ status: 'ACTIVE' }),
                      });
                      if (res.ok) { router.push(`/doctor/consultation/${consult.id}`); }
                      else { setAccepting(null); }
                    }}
                    disabled={accepting === consult.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: accepting === consult.id ? 0.7 : 1 }}
                  >
                    {accepting === consult.id ? 'Accepting…' : 'Accept'}
                  </motion.button>
                  <motion.button
                    onClick={async () => {
                      const token = getToken();
                      await fetch(`/api/consultations/${consult.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ status: 'DECLINED' }),
                      });
                      setConsultations((prev) => prev.filter(c => c.id !== consult.id));
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    style={{ padding: '7px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    Decline
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Today's schedule */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', overflow: 'hidden' }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <motion.h3
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}
          >
            Today&apos;s Schedule
          </motion.h3>
          <motion.button
            onClick={() => router.push('/doctor/appointments')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            style={{ fontSize: 13, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            View all →
          </motion.button>
        </div>
        {todayAppts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No appointments today.</div>
        ) : (
          <div style={{ padding: '12px' }}>
            {todayAppts.slice(0, 5).map((a, i) => {
              const sc = STATUS_COLORS[a.status] || { bg: '#f8fafc', color: '#475569' };
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.32 + i * 0.03 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderRadius: 10, marginBottom: 6, background: '#fafafa' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                      {a.patient?.firstName} {a.patient?.lastName}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {new Date(a.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Age {calcAge(a.patient?.dateOfBirth)}
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{a.status}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default DoctorDashboard;
