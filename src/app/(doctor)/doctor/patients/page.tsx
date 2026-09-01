'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, staggerContainer, fadeUp, scaleUp } from '@/lib/animations';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null;

function calcAge(dob: string) {
  if (!dob) return '-';
  return String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

const DoctorPatientsPage = () => {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/doctor/login'); return; }
    fetch('/api/patients', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setPatients(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = search
    ? patients.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search)
      )
    : patients;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <motion.h2
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}
          >
            My Patients
          </motion.h2>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Patients assigned to you through appointments</p>
        </div>
        <motion.input
          type="text"
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          whileFocus={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, width: 240, outline: 'none' }}
        />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}
      >
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', marginBottom: 8 }} />
                <div style={{ height: 11, borderRadius: 6, width: '60%', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[80, 60, 70].map((w, j) => (
                <div key={j} style={{ height: 11, borderRadius: 6, width: `${w}%`, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              ))}
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && <div style={{ color: '#94a3b8', padding: '2rem' }}>No patients found.</div>}
        {!loading && filtered.map((p, i) => (
          <motion.div
            key={p.id}
            variants={fadeUp}
            whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
            whileTap={{ scale: 0.97 }}
            style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', cursor: 'pointer' }}
            onClick={() => setSelected(p)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>
                {p.firstName?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{p.firstName} {p.lastName}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Age {calcAge(p.dateOfBirth)} · {p.gender}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#64748b' }}>
              <div><strong style={{ color: '#374151' }}>Phone:</strong> {p.phone}</div>
              <div><strong style={{ color: '#374151' }}>Blood Group:</strong> {p.bloodGroup || '-'}</div>
              {p.medicalNotes && <div><strong style={{ color: '#374151' }}>Notes:</strong> {p.medicalNotes.slice(0, 60)}{p.medicalNotes.length > 60 ? '…' : ''}</div>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Patient detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              style={{ background: '#fff', borderRadius: 20, padding: '32px', maxWidth: 500, width: '100%', boxShadow: '0 24px 64px rgba(15,23,42,0.2)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22 }}>
                  {selected.firstName?.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{selected.firstName} {selected.lastName}</h3>
                  <p style={{ margin: '2px 0 0', color: '#10b981', fontSize: 13, fontWeight: 600 }}>Age {calcAge(selected.dateOfBirth)} · {selected.gender}</p>
                </div>
              </div>
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}
              >
                {[
                  ['Phone', selected.phone],
                  ['Email', selected.email || '-'],
                  ['Blood Group', selected.bloodGroup || '-'],
                  ['DOB', selected.dateOfBirth?.slice(0, 10) || '-'],
                  ['Address', selected.address || '-'],
                  ['City / State', `${selected.city || '-'} / ${selected.state || '-'}`],
                ].map(([label, val]) => (
                  <motion.div key={label} variants={fadeUp} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div style={{ color: '#0f172a', fontWeight: 500 }}>{val}</div>
                  </motion.div>
                ))}
              </motion.div>
              {selected.medicalNotes && (
                <div style={{ marginTop: 12, padding: '12px', background: '#f0fdf4', borderRadius: 10, fontSize: 13, color: '#166534' }}>
                  <strong>Medical Notes:</strong> {selected.medicalNotes}
                </div>
              )}
              <motion.button
                onClick={() => setSelected(null)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                style={{ marginTop: 20, width: '100%', padding: '11px', borderRadius: 10, background: '#f1f5f9', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#475569' }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DoctorPatientsPage;
