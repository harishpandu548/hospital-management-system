'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctors } from '@/context/receptionist/DoctorsContext';
import { useAppointments } from '@/context/receptionist/AppointmentsContext';
import '@/styles/receptionist/availability-table.css';

const SkeletonRow = () => (
  <tr>
    {[110, 90, 60, 70].map((w, i) => (
      <td key={i}>
        <div style={{ height: 13, width: w, borderRadius: 4, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      </td>
    ))}
  </tr>
);

const DoctorDetailModal = ({ doctor, apptCount, onClose }: { doctor: any; apptCount: number; onClose: () => void }) => (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
    onClick={onClose}
  >
    <div
      style={{ background: '#fff', borderRadius: 20, padding: '32px', width: '100%', maxWidth: 380, boxShadow: '0 24px 64px rgba(15,23,42,0.2)' }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Doctor Info</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>
          {doctor.name?.charAt(0)}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Dr. {doctor.name}</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{doctor.speciality}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          ['Qualification', doctor.qualification],
          ['Experience', doctor.experience],
          ['Timings', doctor.timings],
          ["Today's Appointments", apptCount],
          ['Status', doctor.status],
        ].map(([label, value]: any) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>{value || '—'}</span>
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{ marginTop: 24, width: '100%', padding: '11px', borderRadius: 10, background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
        Close
      </button>
    </div>
  </div>
);

const AvailabilityTable = () => {
  const router = useRouter();
  const { doctorsData, loading } = useDoctors();
  const { appointments } = useAppointments();
  const [selected, setSelected] = useState<any>(null);

  const today = new Date().toLocaleDateString();

  const countForDoctor = (doctorName: string) =>
    appointments.filter((a: any) => a.date === today && a.doctor === doctorName).length;

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="availability-table-container">
        <table className="availability-table">
          <thead>
            <tr><th>Doctor</th><th>Speciality</th><th>Today</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading && [1, 2, 3, 4].map(k => <SkeletonRow key={k} />)}
            {!loading && doctorsData.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: 13 }}>No doctors available.</td>
              </tr>
            )}
            {!loading && doctorsData.slice(0, 6).map((doctor: any) => {
              const apptCount = countForDoctor(doctor.name);
              return (
                <tr
                  key={doctor.id}
                  onClick={() => setSelected({ doctor, apptCount })}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ fontWeight: 600 }}>Dr. {doctor.name}</td>
                  <td style={{ color: '#64748b' }}>{doctor.speciality}</td>
                  <td style={{ fontWeight: 700, color: '#6366f1' }}>{apptCount}</td>
                  <td>
                    <span className={`status-badge ${doctor.status?.toLowerCase()}`}>
                      {doctor.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <DoctorDetailModal
          doctor={selected.doctor}
          apptCount={selected.apptCount}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};

export default AvailabilityTable;
