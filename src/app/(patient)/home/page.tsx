'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCalendar, FiVideo, FiUsers, FiCheckCircle,
  FiPlus, FiArrowRight, FiAlertCircle, FiBell,
  FiDroplet, FiHeart, FiActivity, FiEye,
  FiTrash2, FiUpload, FiFile, FiImage, FiFileText,
  FiEdit2, FiPhone, FiMapPin, FiUser,
} from 'react-icons/fi';
import '@/styles/patient/dashboard.css';

/* ── helpers ─────────────────────────────────────────────── */
const RELATION_LABEL: Record<string, string> = {
  SELF: 'Self', SPOUSE: 'Spouse', CHILD: 'Child',
  PARENT: 'Parent', SIBLING: 'Sibling', OTHER: 'Other',
};

const BADGE_CLASS: Record<string, string> = {
  SCHEDULED:   'badge-scheduled',
  CREATED:     'badge-created',
  CHECKED_IN:  'badge-checked_in',
  IN_PROGRESS: 'badge-in_progress',
  COMPLETED:   'badge-completed',
  CANCELLED:   'badge-cancelled',
  NO_SHOW:     'badge-no_show',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/** Dedup phone that got stored twice: "+91xxx+91xxx" → "+91xxx" */
function cleanPhone(raw: string | undefined): string {
  if (!raw) return '—';
  const half = Math.floor(raw.length / 2);
  if (raw.length > 6 && raw.slice(0, half) === raw.slice(half)) return raw.slice(0, half);
  return raw;
}

function fileIcon(type = '') {
  if (type.startsWith('image/')) return <FiImage size={16} />;
  if (type.includes('pdf'))      return <FiFileText size={16} />;
  return <FiFile size={16} />;
}

function fileThumbnail(f: any) {
  if (f.type?.startsWith('image/')) {
    return <img src={f.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />;
  }
  return fileIcon(f.type);
}

/** Days until a date */
function daysUntil(iso: string) {
  const diff = new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
  return Math.ceil(diff / 86400000);
}

type MedFile = { url: string; name: string; type: string; uploadedAt: string };

/* ── shimmer loader ──────────────────────────────────────── */
const ShimmerBlock = ({ h = 16, w = '80%', r = 6 }: { h?: number; w?: string | number; r?: number }) => (
  <div className="shimmer" style={{ height: h, width: w, borderRadius: r }} />
);

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export default function PatientDashboard() {
  const router = useRouter();
  const [loading, setLoading]               = useState(true);
  const [profile, setProfile]               = useState<any>(null);
  const [familyProfiles, setFamilyProfiles] = useState<any[]>([]);
  const [appointments, setAppointments]     = useState<any[]>([]);
  const [consultations, setConsultations]   = useState<any[]>([]);
  const [notifications, setNotifications]   = useState<any[]>([]);
  const [showNotifs, setShowNotifs]         = useState(false);
  const [showMedicalEdit, setShowMedicalEdit] = useState(false);
  const [deleting, setDeleting]             = useState<string | null>(null);
  const uploadRef                           = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]           = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('patient_token') ?? '' : '';
  const role  = typeof window !== 'undefined' ? localStorage.getItem('patient_role') ?? '' : '';
  const auth  = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    if (!token || role !== 'PATIENT') { router.replace('/login'); return; }
    try {
      const [profRes, apptRes, consultRes, notifRes] = await Promise.all([
        fetch('/api/patients/family', { headers: auth }),
        fetch('/api/appointments',    { headers: auth }),
        fetch('/api/consultations',   { headers: auth }),
        fetch('/api/notifications',   { headers: auth }),
      ]);
      const profiles: any[] = profRes.ok  ? await profRes.json()   : [];
      const appts: any[]    = apptRes.ok  ? await apptRes.json()   : [];
      const consults: any[] = consultRes.ok ? await consultRes.json() : [];
      const notifs: any[]   = notifRes.ok ? await notifRes.json()  : [];

      const self = profiles.find((p) => p.relation === 'SELF') ?? profiles[0] ?? null;
      if (self) {
        localStorage.setItem('patientId', self.id);
        localStorage.setItem('patient_userName', self.firstName);
      }
      setProfile(self);
      setFamilyProfiles(profiles.filter((p) => p.id !== self?.id));
      setAppointments(Array.isArray(appts) ? appts : []);
      setConsultations(Array.isArray(consults) ? consults : []);
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch { /**/ } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Poll notifications every 30 s
  useEffect(() => {
    const t = setInterval(async () => {
      if (!token) return;
      const res = await fetch('/api/notifications', { headers: auth });
      if (res.ok) setNotifications(await res.json());
    }, 30000);
    return () => clearInterval(t);
  }, [token]);

  const dismissNotif = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  };

  // Upload a new medical file directly from dashboard
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const upRes = await fetch('/api/upload', { method: 'POST', headers: auth, body: fd });
      if (!upRes.ok) return;
      const { url, fileName, fileType } = await upRes.json();
      const existing: MedFile[] = Array.isArray(profile.medicalFiles) ? profile.medicalFiles : [];
      const updated = [...existing, { url, name: fileName, type: fileType, uploadedAt: new Date().toISOString() }];
      const res = await fetch(`/api/patients/${profile.id}`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalFiles: updated }),
      });
      if (res.ok) setProfile((p: any) => ({ ...p, medicalFiles: updated }));
    } catch { /**/ } finally { setUploading(false); e.target.value = ''; }
  };

  // Delete a medical file
  const handleFileDelete = async (url: string) => {
    if (!profile) return;
    setDeleting(url);
    const existing: MedFile[] = Array.isArray(profile.medicalFiles) ? profile.medicalFiles : [];
    const updated = existing.filter((f) => f.url !== url);
    const res = await fetch(`/api/patients/${profile.id}`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicalFiles: updated }),
    });
    if (res.ok) setProfile((p: any) => ({ ...p, medicalFiles: updated }));
    setDeleting(null);
  };

  /* ── loading skeleton ─────────────────────────────────── */
  if (loading) return (
    <div className="dash">
      <div className="dash-inner">
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div className="shimmer" style={{ height: 148, borderRadius: 22, marginBottom: 22 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 12, marginBottom: 22 }}>
          {[1,2,3,4].map((i) => <div key={i} className="shimmer" style={{ height: 86, borderRadius: 16 }} />)}
        </div>
        {[1,2,3].map((i) => (
          <div key={i} className="dash-section" style={{ marginBottom: 16, padding: 20 }}>
            <ShimmerBlock h={14} w="40%" r={6} />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ShimmerBlock h={12} w="75%" /> <ShimmerBlock h={12} w="55%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── no profile yet ───────────────────────────────────── */
  if (!profile) {
    return (
      <div className="dash">
        <div className="dash-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: '#fff', borderRadius: 28, padding: '48px 40px', textAlign: 'center', maxWidth: 440, boxShadow: '0 20px 60px rgba(15,23,42,0.12)', border: '1px solid #e2e8f0' }}
          >
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36 }}>🏥</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Welcome to HMS!</h2>
            <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
              Complete your patient profile to get started.
            </p>
            <button onClick={() => router.push('/patient-intake')} style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Set Up My Profile →
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const upcoming    = appointments.filter((a) => ['SCHEDULED','CREATED','CHECKED_IN','IN_PROGRESS'].includes(a.status));
  const completed   = appointments.filter((a) => a.status === 'COMPLETED');
  const activeCalls = consultations.filter((c) => c.status === 'ACTIVE' || c.status === 'PENDING');
  const unread      = notifications.filter((n) => !n.read).length;
  const medFiles: MedFile[] = Array.isArray(profile.medicalFiles) ? profile.medicalFiles : [];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const nextAppt = upcoming[0];

  return (
    <>
    <div className="dash">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="dash-inner">

        {/* ── NOTIFICATIONS DROPDOWN ── */}
        <AnimatePresence>
          {showNotifs && notifications.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ position: 'fixed', top: 76, right: 24, zIndex: 500, width: 340, background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(15,23,42,0.16)', overflow: 'hidden' }}
            >
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, fontSize: 13, color: '#1e293b', display: 'flex', justifyContent: 'space-between' }}>
                Notifications
                <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>×</button>
              </div>
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📹</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: '#1e293b', lineHeight: 1.4 }}>{n.message}</p>
                    {n.roomId && <button onClick={() => { router.push(`/consultation/${n.roomId}`); setShowNotifs(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 12, fontWeight: 600, padding: 0 }}>Join →</button>}
                  </div>
                  <button onClick={() => dismissNotif(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: 16, flexShrink: 0 }}>×</button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ HERO ═════════════════════════════════════════════ */}
        <div className="dash-hero">
          <div className="dash-hero-left">
            <h1 className="dash-greeting">{greeting()}, {profile.firstName}!</h1>
            <p className="dash-date">{today}</p>
            {nextAppt && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', fontSize: 12, color: '#fff', fontWeight: 600, marginBottom: 16 }}>
                <FiCalendar size={12} />
                Next: Dr. {nextAppt.doctor?.fullname} in {daysUntil(nextAppt.appointmentDate) === 0 ? 'Today' : daysUntil(nextAppt.appointmentDate) === 1 ? 'Tomorrow' : `${daysUntil(nextAppt.appointmentDate)} days`}
              </div>
            )}
            <div className="dash-hero-actions">
              <button className="dash-cta white" onClick={() => router.push('/DoctorsAppointment')}>
                <FiCalendar size={14} /> Book Appointment
              </button>
              <button className="dash-cta primary" onClick={() => router.push('/consultation')}>
                <FiVideo size={14} /> Video Consult
              </button>
            </div>
          </div>
          <div className="dash-hero-right">
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifs((v) => !v)} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiBell size={18} />
              </button>
              {unread > 0 && <div className="notif-badge">{unread > 9 ? '9+' : unread}</div>}
            </div>
            <div className="dash-hero-avatar">{profile.firstName?.charAt(0)?.toUpperCase()}</div>
          </div>
        </div>

        {/* ══ STATS ════════════════════════════════════════════ */}
        <div className="dash-stats">
          {[
            { icon: <FiCalendar size={20} />, value: upcoming.length,           label: 'Upcoming Visits',   color: '#6366f1', bg: '#eef2ff' },
            { icon: <FiVideo size={20} />,    value: activeCalls.length,         label: 'Active Calls',      color: '#0ea5e9', bg: '#f0f9ff' },
            { icon: <FiUsers size={20} />,    value: familyProfiles.length + 1,  label: 'Family Profiles',   color: '#f59e0b', bg: '#fffbeb' },
            { icon: <FiCheckCircle size={20}/>, value: completed.length,         label: 'Completed Visits',  color: '#22c55e', bg: '#f0fdf4' },
          ].map((s, i) => (
            <motion.div key={i} className="stat-card" whileHover={{ y: -2 }} style={{ color: s.color }}>
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.value === 0 ? '#94a3b8' : s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ══ HMS QUICK-ACCESS FEATURES ════════════════════════ */}
        <div className="hms-features-row">
          {[
            { icon: '📋', bg: '#eff6ff', title: 'My Appointments', desc: 'View & manage all visits', href: '/my-appointments' },
            { icon: '📹', bg: '#f0fdf4', title: 'Video Consult',   desc: 'Talk to a doctor now',     href: '/consultation' },
            { icon: '👨‍👩‍👧', bg: '#fffbeb',  title: 'Family Members', desc: 'Manage family profiles',  href: '/profile' },
            { icon: '🧾', bg: '#fdf4ff', title: 'Reports & Files', desc: 'All uploaded documents',   action: () => document.getElementById('medical-profile')?.scrollIntoView({ behavior: 'smooth' }) },
          ].map((f, i) => (
            <motion.div key={i} className="hms-feature-card" whileHover={{ y: -2 }}
              onClick={f.action ?? (() => router.push(f.href!))}
              style={{ cursor: 'pointer' }}
            >
              <div className="hms-feature-icon" style={{ background: f.bg }}>{f.icon}</div>
              <div>
                <div className="hms-feature-title">{f.title}</div>
                <div className="hms-feature-desc">{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ══ ACTIVE VIDEO CALLS ═══════════════════════════════ */}
        {activeCalls.length > 0 && (
          <div className="dash-section" style={{ borderColor: '#86efac', boxShadow: '0 4px 20px rgba(34,197,94,0.12)' }}>
            <div className="dash-section-head">
              <span className="dash-section-title">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                Active Consultations
              </span>
            </div>
            {activeCalls.map((c) => (
              <div key={c.id} className="consult-row">
                <div className={`consult-status-dot ${c.status === 'ACTIVE' ? 'dot-active' : 'dot-pending'}`} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Dr. {c.doctor?.fullname}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{c.doctor?.specialization}{c.slot?.startTime ? ` · ${fmtTime(c.slot.startTime)}` : ''}</div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.status === 'ACTIVE' ? '#f0fdf4' : '#fef9c3', color: c.status === 'ACTIVE' ? '#16a34a' : '#854d0e', marginRight: 8 }}>
                  {c.status}
                </span>
                <button onClick={() => router.push(`/consultation/${c.id}`)} style={{ padding: '8px 16px', borderRadius: 10, background: c.status === 'ACTIVE' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#f1f5f9', color: c.status === 'ACTIVE' ? '#fff' : '#475569', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {c.status === 'ACTIVE' ? 'Join Call' : 'View'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ══ UPCOMING APPOINTMENTS ════════════════════════════ */}
        <div className="dash-section">
          <div className="dash-section-head">
            <span className="dash-section-title"><FiCalendar size={14} /> Upcoming Appointments</span>
            <Link href="/my-appointments" className="dash-section-link">View all <FiArrowRight size={11} /></Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">📅</div>
              <p>No upcoming appointments</p>
              <button onClick={() => router.push('/DoctorsAppointment')} style={{ marginTop: 12, padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Book Now
              </button>
            </div>
          ) : (
            upcoming.slice(0, 4).map((a) => {
              const rel = a.patient?.relation;
              const patName = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : null;
              const daysLeft = daysUntil(a.appointmentDate);
              return (
                <div key={a.id} className="appt-row">
                  <div className="appt-icon" style={{ background: daysLeft === 0 ? '#fef9c3' : '#eef2ff', color: daysLeft === 0 ? '#854d0e' : '#6366f1' }}>
                    <FiCalendar size={17} />
                  </div>
                  <div className="appt-info">
                    <div className="appt-doctor">Dr. {a.doctor?.fullname || 'N/A'}</div>
                    <div className="appt-meta">
                      <span>{a.doctor?.specialization}</span>
                      <span>·</span>
                      <span>{fmtDate(a.appointmentDate)}</span>
                      <span>·</span>
                      <span>{fmtTime(a.slotStart)}</span>
                      {daysLeft === 0 && <span style={{ padding: '1px 7px', borderRadius: 99, background: '#fef9c3', color: '#854d0e', fontSize: 10, fontWeight: 800 }}>TODAY</span>}
                      {daysLeft === 1 && <span style={{ padding: '1px 7px', borderRadius: 99, background: '#eff6ff', color: '#2563eb', fontSize: 10, fontWeight: 800 }}>TOMORROW</span>}
                    </div>
                    {patName && rel && rel !== 'SELF' && (
                      <div className="appt-for">
                        <FiUser size={10} />
                        {patName} ({RELATION_LABEL[rel] ?? rel})
                      </div>
                    )}
                  </div>
                  <span className={`appt-badge ${BADGE_CLASS[a.status] ?? ''}`}>{a.status.replace(/_/g, ' ')}</span>
                </div>
              );
            })
          )}
        </div>

        {/* ══ FAMILY MEMBERS ═══════════════════════════════════ */}
        <div className="dash-section">
          <div className="dash-section-head">
            <span className="dash-section-title"><FiUsers size={14} /> Family Members</span>
            <Link href="/profile" className="dash-section-link">Manage</Link>
          </div>
          <div className="family-grid">
            <div className="family-chip" onClick={() => { localStorage.setItem('patientId', profile.id); router.push('/DoctorsAppointment'); }}>
              <div className="family-avatar" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff' }}>{profile.firstName?.charAt(0)}</div>
              <div>
                <div className="family-name">{profile.firstName} {profile.lastName}</div>
                <div className="family-rel">Self</div>
              </div>
              <button className="family-book-btn" onClick={(e) => { e.stopPropagation(); localStorage.setItem('patientId', profile.id); router.push('/DoctorsAppointment'); }}>Book</button>
            </div>
            {familyProfiles.map((m) => (
              <div key={m.id} className="family-chip" onClick={() => { localStorage.setItem('patientId', m.id); router.push('/DoctorsAppointment'); }}>
                <div className="family-avatar">{m.firstName?.charAt(0)}</div>
                <div>
                  <div className="family-name">{m.firstName} {m.lastName}</div>
                  <div className="family-rel">{RELATION_LABEL[m.relation] ?? m.relation}</div>
                </div>
                <button className="family-book-btn" onClick={(e) => { e.stopPropagation(); localStorage.setItem('patientId', m.id); router.push('/DoctorsAppointment'); }}>Book</button>
              </div>
            ))}
            <button className="add-family-chip" onClick={() => router.push('/patient-intake')}>
              <FiPlus size={16} /> Add Member
            </button>
          </div>
        </div>

        {/* ══ MEDICAL PROFILE ══════════════════════════════════ */}
        <div className="dash-section" id="medical-profile">
          <div className="dash-section-head">
            <span className="dash-section-title"><FiHeart size={14} /> Medical Profile</span>
            <button className="dash-section-link" onClick={() => setShowMedicalEdit(true)}>
              <FiEdit2 size={12} /> Edit
            </button>
          </div>

          {/* ── Condition card — MOST IMPORTANT ── */}
          <div className={`condition-card ${profile.medicalNotes ? 'has-condition' : 'no-condition'}`}>
            <div className="condition-icon">
              {profile.medicalNotes ? '🩺' : '⚠️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="condition-label">
                {profile.medicalNotes ? 'Current Condition / Symptoms' : 'No condition on file'}
              </div>
              <div className="condition-text">
                {profile.medicalNotes
                  ? profile.medicalNotes
                  : 'Tap "Edit" to add your current symptoms — this will be shared with your doctor.'}
              </div>
            </div>
            <button className="condition-update-btn" onClick={() => setShowMedicalEdit(true)}>
              Update
            </button>
          </div>

          {/* ── Vitals strip ── */}
          <div className="vitals-strip">
            {[
              { icon: '🩸', label: 'Blood Group', value: profile.bloodGroup || '—', bg: '#fef2f2', color: '#dc2626' },
              { icon: '📏', label: 'Height',      value: profile.heightCm ? `${profile.heightCm} cm` : '—', bg: '#eff6ff', color: '#2563eb' },
              { icon: '⚖️', label: 'Weight',      value: profile.weightKg ? `${profile.weightKg} kg` : '—', bg: '#f0fdf4', color: '#16a34a' },
              { icon: '👤', label: 'Gender',      value: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : '—', bg: '#fdf4ff', color: '#9333ea' },
              { icon: '📅', label: 'DOB',         value: profile.dateOfBirth?.slice(0, 10) || '—', bg: '#fffbeb', color: '#d97706' },
              { icon: '📞', label: 'Phone',       value: cleanPhone(profile.phone), bg: '#f0f9ff', color: '#0284c7' },
              { icon: '🏙️', label: 'City',        value: profile.city || '—', bg: '#f8fafc', color: '#475569' },
            ].map(({ icon, label, value, bg, color }) => (
              <div key={label} className="vital-chip">
                <div className="vital-icon" style={{ background: bg, color }}>{icon}</div>
                <div>
                  <span className="vital-val">{value}</span>
                  <span className="vital-lbl">{label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Medical files / reports ── */}
          <div className="med-files-section">
            <div className="med-files-header">
              <span className="med-files-title">
                Reports & Uploads {medFiles.length > 0 && `(${medFiles.length})`}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="med-file-add-btn"
                  onClick={() => uploadRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? '⏳ Uploading…' : <><FiUpload size={12} /> Upload File</>}
                </button>
              </div>
            </div>
            <input ref={uploadRef} type="file" style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} />

            {medFiles.length === 0 ? (
              <div className="med-files-empty" onClick={() => uploadRef.current?.click()}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>No reports uploaded yet</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Click to upload X-rays, blood tests, prescriptions…</div>
              </div>
            ) : (
              <div className="med-files-grid">
                {medFiles.map((f, i) => (
                  <motion.div key={`${f.url}-${i}`} className="med-file-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                    <div className="med-file-thumb">{fileThumbnail(f)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="med-file-name" title={f.name}>{f.name}</div>
                      <div className="med-file-date">{f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
                    </div>
                    <div className="med-file-actions">
                      <a href={f.url} target="_blank" rel="noreferrer" className="med-file-btn view" title="View file">
                        <FiEye size={12} />
                      </a>
                      <button
                        className="med-file-btn delete"
                        title="Delete file"
                        disabled={deleting === f.url}
                        onClick={() => handleFileDelete(f.url)}
                      >
                        {deleting === f.url ? '⏳' : <FiTrash2 size={12} />}
                      </button>
                    </div>
                  </motion.div>
                ))}
                {/* Add more button */}
                <div
                  onClick={() => uploadRef.current?.click()}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px', border: '2px dashed #c7d2fe', borderRadius: 12, cursor: 'pointer', color: '#6366f1', fontSize: 12, fontWeight: 700, minHeight: 80, transition: 'all 0.18s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f0f0ff')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <FiPlus size={20} />
                  Add More
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ QUICK INFO CARDS (new HMS features) ══════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>

          {/* Emergency Info */}
          <div className="dash-section" style={{ margin: 0 }}>
            <div className="dash-section-head">
              <span className="dash-section-title">🚨 Emergency Info</span>
            </div>
            <div style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Blood Group', value: profile.bloodGroup || 'Not set', urgent: true },
                  { label: 'Allergies', value: 'Update in profile' },
                  { label: 'Emergency Contact', value: 'Add in profile' },
                ].map(({ label, value, urgent }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: urgent ? '#dc2626' : '#374151' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Health Stats */}
          <div className="dash-section" style={{ margin: 0 }}>
            <div className="dash-section-head">
              <span className="dash-section-title"><FiActivity size={14} /> Health Overview</span>
            </div>
            <div style={{ padding: '14px 20px' }}>
              {[
                { label: 'Total Visits',         value: appointments.length,   color: '#6366f1' },
                { label: 'Doctors Consulted',    value: new Set(appointments.map((a) => a.doctorId)).size, color: '#0ea5e9' },
                { label: 'Reports Uploaded',     value: medFiles.length,       color: '#22c55e' },
                { label: 'Family Members',       value: familyProfiles.length + 1, color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>

    {/* ══ MEDICAL EDIT MODAL ═══════════════════════════════════ */}
    <AnimatePresence>
      {showMedicalEdit && profile && (
        <MedicalEditModal
          profile={profile}
          token={token}
          onClose={() => setShowMedicalEdit(false)}
          onSave={(updated: any) => { setProfile(updated); setShowMedicalEdit(false); }}
        />
      )}
    </AnimatePresence>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   MEDICAL EDIT MODAL
   ══════════════════════════════════════════════════════════ */
function MedicalEditModal({ profile, token, onClose, onSave }: {
  profile: any; token: string; onClose: () => void; onSave: (p: any) => void;
}) {
  const [notes, setNotes]         = useState(profile.medicalNotes || '');
  const [newFiles, setNewFiles]   = useState<MedFile[]>([]);
  const [removedUrls, setRemovedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [dragging, setDragging]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const auth = { Authorization: `Bearer ${token}` };

  const existingFiles: MedFile[] = Array.isArray(profile.medicalFiles) ? profile.medicalFiles : [];
  const visibleExisting = existingFiles.filter((f) => !removedUrls.includes(f.url));
  const allFiles = [...visibleExisting, ...newFiles];

  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError('Max file size is 10 MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', headers: auth, body: fd });
      if (!res.ok) { setError('Upload failed'); return; }
      const { url, fileName, fileType } = await res.json();
      setNewFiles((p) => [...p, { url, name: fileName, type: fileType, uploadedAt: new Date().toISOString() }]);
    } catch { setError('Upload failed'); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/patients/${profile.id}`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalNotes: notes, medicalFiles: allFiles }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed'); return; }
      onSave(data);
    } catch { setError('Network error'); } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(15,23,42,0.22)', overflow: 'hidden' }}
      >
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Update Medical Information</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Current Symptoms / Condition
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe your symptoms, current condition, medications, allergies…"
            rows={5}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
          />
          <p style={{ margin: '6px 0 18px', fontSize: 12, color: '#94a3b8' }}>This will be shared with your doctor before consultations.</p>

          {/* Existing files */}
          {visibleExisting.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Existing Reports</label>
              {visibleExisting.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', marginBottom: 6 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    {f.type?.startsWith('image/') ? <FiImage size={14}/> : f.type?.includes('pdf') ? <FiFileText size={14}/> : <FiFile size={14}/>}
                  </div>
                  <a href={f.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1d4ed8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>{f.name}</a>
                  <button onClick={() => setRemovedUrls((p) => [...p, f.url])} style={{ background: '#fef2f2', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                    <FiTrash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload zone */}
          <div
            style={{ border: `2px dashed ${dragging ? '#6366f1' : '#c7d2fe'}`, borderRadius: 14, padding: '20px', textAlign: 'center', cursor: 'pointer', background: dragging ? '#f0f0ff' : '#fafbff', transition: 'all 0.2s' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{uploading ? '⏳' : '📁'}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>{uploading ? 'Uploading…' : 'Click or drag & drop'}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Images, PDF, Word · max 10 MB</div>
          </div>
          <input ref={fileRef} type="file" style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />

          {newFiles.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {newFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac' }}>
                  <div style={{ fontSize: 18 }}>{f.type?.startsWith('image/') ? '🖼️' : f.type?.includes('pdf') ? '📄' : '📝'}</div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <button onClick={() => setNewFiles((p) => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13, marginTop: 14 }}>
              <FiAlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#f1f5f9', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#475569' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#fff', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
