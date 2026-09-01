'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePatients } from '@/context/receptionist/PatientsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, staggerContainer, fadeUp, fadeLeft } from '@/lib/animations';
import { FiFile, FiImage, FiFileText, FiExternalLink, FiHeart } from 'react-icons/fi';

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('receptionist_token') : null;

function calculateAge(dob: string | null | undefined): string {
  if (!dob) return '-';
  return String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

function cleanPhone(raw: string | undefined): string {
  if (!raw) return '-';
  const half = Math.floor(raw.length / 2);
  if (raw.length > 6 && raw.slice(0, half) === raw.slice(half)) return raw.slice(0, half);
  return raw;
}

function fileIcon(type = '') {
  if (type.startsWith('image/')) return <FiImage size={14} />;
  if (type.includes('pdf')) return <FiFileText size={14} />;
  return <FiFile size={14} />;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SCHEDULED:   { bg: '#eff6ff', color: '#2563eb' },
  CHECKED_IN:  { bg: '#ecfdf5', color: '#059669' },
  IN_PROGRESS: { bg: '#fffbeb', color: '#d97706' },
  COMPLETED:   { bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED:   { bg: '#fef2f2', color: '#dc2626' },
  NO_SHOW:     { bg: '#fef3c7', color: '#92400e' },
};

const PatientDetailsPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { patientsData } = usePatients();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const token = getToken();
    if (token) {
      fetch(`/api/patients/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setPatient({
              id: data.id,
              patientId: `P-${data.id.slice(-6).toUpperCase()}`,
              name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              firstName: data.firstName || '',
              age: calculateAge(data.dateOfBirth),
              dob: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '-',
              gender: data.gender || '-',
              bloodGroup: data.bloodGroup || '-',
              condition: data.medicalNotes?.split(':')[0]?.trim() || '-',
              medicalNotes: data.medicalNotes || '',
              medicalFiles: Array.isArray(data.medicalFiles) ? data.medicalFiles : [],
              contact: cleanPhone(data.phone),
              email: data.email || '-',
              address: data.address || '-',
              city: data.city || '-',
              state: data.state || '-',
              relation: data.relation || 'SELF',
              appointments: data.appointments || [],
            });
          } else {
            const fromCtx = patientsData.find(
              (p: any) => String(p.id) === String(id) || String(p.patientId) === String(id),
            );
            setPatient(fromCtx || null);
          }
        })
        .catch(() => {
          const fromCtx = patientsData.find(
            (p: any) => String(p.id) === String(id) || String(p.patientId) === String(id),
          );
          setPatient(fromCtx || null);
        })
        .finally(() => setLoading(false));
    } else {
      const fromCtx = patientsData.find(
        (p: any) => String(p.id) === String(id) || String(p.patientId) === String(id),
      );
      setPatient(fromCtx || null);
      setLoading(false);
    }
  }, [id, patientsData]);

  if (loading) {
    return (
      <div style={{ padding: '24px', background: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ height: 14, width: 80, borderRadius: 6, marginBottom: 24, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid #e2e8f0', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 18, width: '50%', borderRadius: 6, marginBottom: 8, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                <div style={{ height: 12, width: '30%', borderRadius: 4, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {[1,2,3,4,5,6].map(k => (
                <div key={k} style={{ height: 64, borderRadius: 12, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ padding: '24px', background: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
        <motion.button
          onClick={() => router.back()}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 20, fontWeight: 600, fontSize: 13 }}
        >
          ← Back
        </motion.button>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '32px', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Patient Not Found</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>This patient record could not be found.</p>
        </div>
      </div>
    );
  }

  const infoGrid = [
    { label: 'Gender',      value: patient.gender },
    { label: 'Date of Birth', value: patient.dob },
    { label: 'Age',         value: patient.age ? `${patient.age} years` : '-' },
    { label: 'Blood Group', value: patient.bloodGroup },
    { label: 'Phone',       value: patient.contact },
    { label: 'Email',       value: patient.email },
    { label: 'City',        value: patient.city },
    { label: 'State',       value: patient.state },
    { label: 'Address',     value: patient.address },
    { label: 'Condition',   value: patient.condition },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ padding: '24px', background: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Back button */}
        <motion.button
          onClick={() => router.back()}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 20, fontWeight: 600, fontSize: 13 }}
        >
          ← Back
        </motion.button>

        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', padding: '24px 28px', marginBottom: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.1 }}
              style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0 }}
            >
              {patient.firstName?.charAt(0)?.toUpperCase() || patient.name?.charAt(0)?.toUpperCase() || 'P'}
            </motion.div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <motion.h2
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 }}
                style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}
              >
                {patient.name}
              </motion.h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 10px', borderRadius: 99 }}>
                  {patient.patientId || patient.id?.slice(0, 8)}
                </span>
                {patient.bloodGroup && patient.bloodGroup !== '-' && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '2px 10px', borderRadius: 99 }}>
                    {patient.bloodGroup}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info section header */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Personal Information
          </div>

          {/* Info grid with stagger */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}
          >
            {infoGrid.map(({ label, value }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', wordBreak: 'break-word' }}>{value || '-'}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Medical notes + files */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', padding: '18px 24px', marginBottom: 16 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiHeart size={12} style={{ color: '#6366f1' }} /> Medical Information
          </div>

          {patient.medicalNotes ? (
            <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, fontSize: 13, color: '#166534', border: '1px solid #bbf7d0', fontWeight: 500, marginBottom: patient.medicalFiles?.length ? 14 : 0 }}>
              <span style={{ fontWeight: 700 }}>Condition: </span>{patient.medicalNotes}
            </div>
          ) : (
            <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 10, fontSize: 12, color: '#854d0e', border: '1px solid #fde047', marginBottom: patient.medicalFiles?.length ? 14 : 0 }}>
              No medical notes on file.
            </div>
          )}

          {patient.medicalFiles?.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Reports & Files ({patient.medicalFiles.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {patient.medicalFiles.map((f: any, i: number) => (
                  <motion.a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', textDecoration: 'none', color: '#1d4ed8', transition: 'background 0.15s' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseOut={e => (e.currentTarget.style.background = '#f8fafc')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                      {fileIcon(f.type)}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0, marginRight: 6 }}>{f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString() : ''}</span>
                    <FiExternalLink size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
                  </motion.a>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Appointment history */}
        {patient.appointments?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}
          >
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Appointment History</div>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{patient.appointments.length} record{patient.appointments.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {patient.appointments.map((appt: any, i: number) => {
                const sc = STATUS_COLORS[appt.status] || { bg: '#f8fafc', color: '#475569' };
                return (
                  <motion.div
                    key={appt.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.28 + i * 0.04 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      {new Date(appt.appointmentDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                      {appt.status?.replace(/_/g, ' ')}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default PatientDetailsPage;
