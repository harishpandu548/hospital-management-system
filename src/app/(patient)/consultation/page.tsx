'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiVideo, FiClock, FiCalendar,
  FiArrowLeft, FiCheck, FiZap, FiUser,
} from 'react-icons/fi';
import '@/styles/patient/consultation.css';

type Mode = 'home' | 'scheduled' | 'instant';

const TIMER_SECONDS = 300; // 5-minute wait window for instant consult

export default function ConsultationPage() {
  const router = useRouter();
  const [mode, setMode]               = useState<Mode>('home');
  const [doctors, setDoctors]         = useState<any[]>([]);
  const [availIds, setAvailIds]       = useState<string[]>([]);
  const [myRooms, setMyRooms]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [slots, setSlots]             = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [pickedSlot, setPickedSlot]   = useState('');
  const [profiles, setProfiles]       = useState<any[]>([]);
  const [chosenPatient, setChosenPatient] = useState('');
  const [initiating, setInitiating]   = useState(false);
  const [err, setErr]                 = useState('');
  // Instant consult waiting state
  const [waitingRoom, setWaitingRoom] = useState<any>(null);
  const [countdown, setCountdown]     = useState(TIMER_SECONDS);
  const timerRef                      = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('patient_token') ?? '' : '';
  const H = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    Promise.all([
      fetch('/api/doctors',                { headers: H }).then(r => r.ok ? r.json() : []),
      fetch('/api/consultations',          { headers: H }).then(r => r.ok ? r.json() : []),
      fetch('/api/patients/family',        { headers: H }).then(r => r.ok ? r.json() : []),
      fetch('/api/doctors/availability-status', { headers: H }).then(r => r.ok ? r.json() : { availableIds: [] }),
    ]).then(([docs, rooms, profs, avail]) => {
      setDoctors(Array.isArray(docs) ? docs : []);
      setMyRooms(Array.isArray(rooms) ? rooms : []);
      const list = Array.isArray(profs) ? profs : [];
      setProfiles(list);
      const self = list.find((p: any) => p.relation === 'SELF') ?? list[0];
      if (self) setChosenPatient(self.id);
      setAvailIds(avail?.availableIds ?? []);
    }).catch(() => setErr('Failed to load.')).finally(() => setLoading(false));
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, []);

  const startCountdown = useCallback((room: any) => {
    setWaitingRoom(room);
    setCountdown(TIMER_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          // Auto-cancel if no response
          fetch(`/api/consultations/${room.id}`, {
            method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ENDED' }),
          });
          setWaitingRoom(null);
          setMode('home');
          setErr('No doctor responded. Please try again or choose another doctor.');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    // Poll room status
    if (statusPollRef.current) clearInterval(statusPollRef.current);
    statusPollRef.current = setInterval(async () => {
      const res = await fetch(`/api/consultations/${room.id}`, { headers: H });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'ACTIVE') {
        clearInterval(timerRef.current!);
        clearInterval(statusPollRef.current!);
        router.push(`/consultation/${room.id}`);
      } else if (data.status === 'DECLINED') {
        clearInterval(timerRef.current!);
        clearInterval(statusPollRef.current!);
        setWaitingRoom(null);
        setMode('instant');
        setErr(`Dr. ${data.doctor?.fullname} is unavailable. Please choose another doctor.`);
      }
    }, 3000);
  }, [router]);

  const requestInstant = async (doc: any) => {
    setInitiating(true); setErr('');
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: doc.id, patientId: chosenPatient || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed'); return; }

      // Emit real-time notification to the doctor
      import('socket.io-client').then(({ io }) => {
        const socket = io('http://localhost:3001');
        socket.emit('request-consultation', { doctorId: doc.id, consultation: data });
        setTimeout(() => socket.disconnect(), 1500);
      });

      startCountdown(data);
    } catch { setErr('Network error.'); } finally { setInitiating(false); }
  };

  const requestScheduled = async () => {
    if (!selectedDoc) return;
    setInitiating(true); setErr('');
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoc.id,
          patientId: chosenPatient || undefined,
          slotId: pickedSlot || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed'); return; }
      router.push(`/consultation/${data.id}`);
    } catch { setErr('Network error.'); } finally { setInitiating(false); }
  };

  const loadSlots = async (doc: any) => {
    setSelectedDoc(doc); setPickedSlot(''); setSlots([]); setErr('');
    setSlotsLoading(true);
    const res = await fetch(`/api/doctors/${doc.id}/consultation-slots`, { headers: H });
    setSlots(res.ok ? await res.json() : []);
    setSlotsLoading(false);
  };

  const activeRooms = myRooms.filter(r => r.status === 'PENDING' || r.status === 'ACTIVE');
  const availDocs = doctors.filter(d => availIds.includes(d.id));
  const filteredDocs = doctors.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.fullname?.toLowerCase().includes(q) || d.specialization?.toLowerCase().includes(q);
  });
  const filteredAvail = availDocs.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.fullname?.toLowerCase().includes(q) || d.specialization?.toLowerCase().includes(q);
  });

  const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (loading) return (
    <div className="consultation-page">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="shimmer" style={{ height: 32, width: 240, borderRadius: 8, marginBottom: 24 }} />
      <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
        {[1, 2].map(i => <div key={i} className="shimmer" style={{ flex: 1, height: 120, borderRadius: 20 }} />)}
      </div>
      <div className="consult-doctors-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: 18, padding: '24px 20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="shimmer" style={{ width: 64, height: 64, borderRadius: '50%' }} />
            <div className="shimmer" style={{ width: '70%', height: 14, borderRadius: 6 }} />
            <div className="shimmer" style={{ width: '100%', height: 40, borderRadius: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );

  // ── INSTANT WAITING SCREEN ────────────────────────────────
  if (waitingRoom) {
    return (
      <div className="consultation-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ background: '#fff', borderRadius: 28, padding: '40px 36px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(15,23,42,0.12)', border: '1px solid #e2e8f0' }}
        >
          <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 24px' }}>
            <svg style={{ position: 'absolute', inset: 0, animation: 'spin 2s linear infinite' }} viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" stroke="#eef2ff" strokeWidth="8" />
              <path d="M50 5 A45 45 0 0 1 95 50" stroke="#6366f1" strokeWidth="8" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📹</div>
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Connecting you with</h2>
          <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#6366f1' }}>Dr. {waitingRoom.doctor?.fullname}</p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>{waitingRoom.doctor?.specialization}</p>

          <div style={{ background: '#f8fafc', borderRadius: 16, padding: '16px 20px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Time remaining</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: countdown < 60 ? '#ef4444' : '#0f172a', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
              {fmtCountdown(countdown)}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Doctor will join within 5 minutes</div>
          </div>

          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, padding: '10px 14px', background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
            ✓ Doctor has been notified and can see your medical information
          </div>

          <button
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              if (statusPollRef.current) clearInterval(statusPollRef.current);
              fetch(`/api/consultations/${waitingRoom.id}`, {
                method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ENDED' }),
              });
              setWaitingRoom(null); setMode('home');
            }}
            style={{ width: '100%', padding: '12px', borderRadius: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Cancel Request
          </button>
        </motion.div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── HOME: choose mode ─────────────────────────────────────
  if (mode === 'home') {
    return (
      <div className="consultation-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Video Consultation</h1>
            <p className="subtitle">Consult a doctor from the comfort of your home.</p>
          </div>
          <Link href="/home" style={{ padding: '9px 16px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            ← Home
          </Link>
        </div>

        {/* Active rooms */}
        {activeRooms.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Your Active Consultations</div>
            {activeRooms.map(r => (
              <div key={r.id} style={{ background: '#fff', border: `1px solid ${r.status === 'ACTIVE' ? '#86efac' : '#fde047'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>Dr. {r.doctor?.fullname}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{r.doctor?.specialization} · {r.status}</div>
                </div>
                <button onClick={() => router.push(`/consultation/${r.id}`)} style={{ padding: '9px 18px', borderRadius: 10, background: r.status === 'ACTIVE' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#f1f5f9', color: r.status === 'ACTIVE' ? '#fff' : '#475569', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {r.status === 'ACTIVE' ? 'Join Call' : 'View Status'}
                </button>
              </div>
            ))}
          </div>
        )}

        {err && <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>{err}</div>}

        {/* Two option cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
          {/* Instant */}
          <motion.div
            whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(251,146,60,0.2)' }}
            onClick={() => setMode('instant')}
            style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '2px solid #fed7aa', borderRadius: 22, padding: '28px 22px', cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 6px 16px rgba(249,115,22,0.3)' }}>
              <FiZap size={24} color="#fff" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#9a3412', marginBottom: 6 }}>Instant Consult</div>
            <div style={{ fontSize: 13, color: '#c2410c', lineHeight: 1.5 }}>
              Connect with an available doctor right now. Wait 2–5 minutes.
            </div>
            {availIds.length > 0 && (
              <div style={{ marginTop: 12, padding: '5px 10px', background: '#fff', borderRadius: 20, display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#ea580c' }}>
                {availIds.length} doctor{availIds.length !== 1 ? 's' : ''} available now
              </div>
            )}
          </motion.div>

          {/* Scheduled */}
          <motion.div
            whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(99,102,241,0.18)' }}
            onClick={() => setMode('scheduled')}
            style={{ background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '2px solid #c7d2fe', borderRadius: 22, padding: '28px 22px', cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 6px 16px rgba(99,102,241,0.3)' }}>
              <FiCalendar size={24} color="#fff" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#3730a3', marginBottom: 6 }}>Book a Slot</div>
            <div style={{ fontSize: 13, color: '#4338ca', lineHeight: 1.5 }}>
              Schedule a video call at a time that works for you.
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── INSTANT MODE ──────────────────────────────────────────
  if (mode === 'instant') {
    const instantDocs = search.trim() ? filteredDocs : (availDocs.length > 0 ? filteredAvail : filteredDocs);
    return (
      <div className="consultation-page">
        <button onClick={() => { setMode('home'); setErr(''); setSearch(''); }} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20, padding: '9px 16px', borderRadius: 10, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <FiArrowLeft size={14} /> Back
        </button>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiZap size={16} color="#fff" /></div>
            Instant Consultation
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
            {availDocs.length > 0
              ? `${availDocs.length} doctor${availDocs.length !== 1 ? 's are' : ' is'} available right now. Select one to connect.`
              : 'No doctors are marked as available right now. You can still send a request — they\'ll be notified.'}
          </p>
        </div>

        {err && <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>{err}</div>}

        {/* Who is this for */}
        {profiles.length > 1 && (
          <div style={{ marginBottom: 18, padding: '14px 16px', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10 }}>Consultation for:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profiles.map((p: any) => (
                <button key={p.id} onClick={() => setChosenPatient(p.id)} style={{ padding: '7px 14px', borderRadius: 20, border: '2px solid', borderColor: chosenPatient === p.id ? '#6366f1' : '#e2e8f0', background: chosenPatient === p.id ? '#eef2ff' : '#f8fafc', color: chosenPatient === p.id ? '#4f46e5' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {chosenPatient === p.id && <FiCheck size={12} />}
                  {p.firstName} {p.relation !== 'SELF' ? `(${p.relation.charAt(0) + p.relation.slice(1).toLowerCase()})` : '(Me)'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input type="text" placeholder="Search doctor or specialty…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 16px 10px 38px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          <FiSearch style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={15} />
        </div>

        <div className="consult-doctors-grid">
          {instantDocs.map((doc, i) => {
            const isAvail = availIds.includes(doc.id);
            const existing = myRooms.find(r => r.doctorId === doc.id && (r.status === 'PENDING' || r.status === 'ACTIVE'));
            return (
              <motion.div key={doc.id} className="consult-doctor-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div style={{ position: 'relative' }}>
                  <div className="consult-avatar">{doc.fullname?.charAt(0)?.toUpperCase()}</div>
                  {isAvail && (
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }} />
                  )}
                </div>
                <div className="consult-doctor-name">Dr. {doc.fullname}</div>
                <div className="consult-specialty">{doc.specialization}</div>
                <div className="consult-exp">{doc.experienceYears}+ yrs exp</div>
                {isAvail
                  ? <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} /> Available Now</div>
                  : <div style={{ fontSize: 11, color: '#94a3b8' }}>Will be notified</div>
                }
                {existing ? (
                  <button className="consult-call-btn" onClick={() => router.push(`/consultation/${existing.id}`)} style={{ background: existing.status === 'ACTIVE' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#f1f5f9', color: existing.status === 'ACTIVE' ? '#fff' : '#475569', border: 'none' }}>
                    {existing.status === 'ACTIVE' ? 'Join Call' : '⏳ Waiting…'}
                  </button>
                ) : (
                  <button className="consult-call-btn" onClick={() => requestInstant(doc)} disabled={initiating} style={{ background: isAvail ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                    <FiZap size={14} />
                    {initiating ? 'Sending…' : isAvail ? 'Connect Now' : 'Send Request'}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
        {instantDocs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🩺</div>
            <p>No doctors match your search.</p>
          </div>
        )}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    );
  }

  // ── SCHEDULED MODE ────────────────────────────────────────
  return (
    <div className="consultation-page">
      <button onClick={() => { setMode('home'); setSelectedDoc(null); setSlots([]); setErr(''); setSearch(''); }} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20, padding: '9px 16px', borderRadius: 10, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        <FiArrowLeft size={14} /> Back
      </button>

      {selectedDoc ? (
        <>
          {/* Selected doctor + slot picker */}
          <div style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)', borderRadius: 20, padding: '22px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
              {selectedDoc.fullname?.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Dr. {selectedDoc.fullname}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{selectedDoc.specialization} · {selectedDoc.experienceYears}+ yrs</div>
            </div>
            <button onClick={() => { setSelectedDoc(null); setSlots([]); }} style={{ padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Change</button>
          </div>

          {/* Who is this for */}
          {profiles.length > 1 && (
            <div style={{ marginBottom: 18, padding: '14px 16px', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10 }}>Consultation for:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {profiles.map((p: any) => (
                  <button key={p.id} onClick={() => setChosenPatient(p.id)} style={{ padding: '7px 14px', borderRadius: 20, border: '2px solid', borderColor: chosenPatient === p.id ? '#6366f1' : '#e2e8f0', background: chosenPatient === p.id ? '#eef2ff' : '#f8fafc', color: chosenPatient === p.id ? '#4f46e5' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    {chosenPatient === p.id && <FiCheck size={12} style={{ marginRight: 4 }} />}
                    {p.firstName} {p.relation !== 'SELF' ? `(${p.relation.charAt(0) + p.relation.slice(1).toLowerCase()})` : '(Me)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slots */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FiCalendar size={14} /> Available Time Slots
            </div>
            {slotsLoading ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: 64, width: 140, borderRadius: 14 }} />)}
              </div>
            ) : slots.length === 0 ? (
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: 14, border: '1px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No pre-scheduled slots. You can still send an instant consultation request.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {slots.map((slot: any) => {
                  const date  = new Date(slot.slotDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const start = new Date(slot.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  const end   = new Date(slot.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  const picked = pickedSlot === slot.id;
                  return (
                    <motion.button
                      key={slot.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setPickedSlot(picked ? '' : slot.id)}
                      style={{ padding: '12px 16px', borderRadius: 14, border: `2px solid ${picked ? '#6366f1' : '#e2e8f0'}`, background: picked ? '#eef2ff' : '#fff', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: picked ? '#6366f1' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        {picked && <FiCheck size={11} style={{ marginRight: 4 }} />}{date}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: picked ? '#4f46e5' : '#1e293b', fontWeight: 700, fontSize: 15 }}>
                        <FiClock size={13} /> {start} – {end}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {err && <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>{err}</div>}

          <motion.button whileTap={{ scale: 0.97 }} onClick={requestScheduled} disabled={initiating} style={{ width: '100%', padding: '14px', borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: initiating ? 0.7 : 1 }}>
            <FiVideo size={18} />
            {initiating ? 'Booking…' : pickedSlot ? 'Book Slot & Request' : 'Send Consultation Request'}
          </motion.button>
        </>
      ) : (
        <>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiCalendar size={16} color="#fff" /></div>
            Book a Scheduled Slot
          </h2>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>Select a doctor and choose from their available slots.</p>

          {err && <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>{err}</div>}

          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input type="text" placeholder="Search doctor or specialty…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 16px 10px 38px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            <FiSearch style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={15} />
          </div>

          <div className="consult-doctors-grid">
            {filteredDocs.map((doc, i) => (
              <motion.div key={doc.id} className="consult-doctor-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="consult-avatar">{doc.fullname?.charAt(0)?.toUpperCase()}</div>
                <div className="consult-doctor-name">Dr. {doc.fullname}</div>
                <div className="consult-specialty">{doc.specialization}</div>
                <div className="consult-exp">{doc.experienceYears}+ yrs exp</div>
                <button className="consult-call-btn" onClick={() => loadSlots(doc)} disabled={slotsLoading && selectedDoc?.id === doc.id}>
                  <FiCalendar size={14} /> View Slots
                </button>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
