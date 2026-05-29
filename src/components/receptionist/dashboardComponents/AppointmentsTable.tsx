'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppointments } from '@/context/receptionist/AppointmentsContext';
import '@/styles/receptionist/appointments-table.css';

const SkeletonRow = () => (
  <tr>
    {[60, 100, 90, 80, 70].map((w, i) => (
      <td key={i}>
        <div style={{ height: 13, width: w, borderRadius: 4, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      </td>
    ))}
  </tr>
);

const statusColor: Record<string, { bg: string; color: string }> = {
  scheduled:   { bg: '#eef2ff', color: '#6366f1' },
  'checked in':{ bg: '#fef3c7', color: '#d97706' },
  'in progress':{ bg: '#eff6ff', color: '#2563eb' },
  completed:   { bg: '#f0fdf4', color: '#16a34a' },
  cancelled:   { bg: '#fef2f2', color: '#dc2626' },
  'no show':   { bg: '#f8fafc', color: '#94a3b8' },
};

const AppointmentsTable = () => {
  const router = useRouter();
  const { appointments, loading } = useAppointments();
  const [selected, setSelected] = useState<any>(null);

  const today = new Date().toLocaleDateString();
  const todayList = appointments
    .filter((a: any) => a.date === today)
    .slice(0, 8);

  const sk = statusColor;

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="appointment-table-container">
        <table>
          <thead>
            <tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Condition</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading && [1, 2, 3, 4].map((k) => <SkeletonRow key={k} />)}
            {!loading && todayList.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: 13 }}>
                  No appointments scheduled for today.
                </td>
              </tr>
            )}
            {!loading && todayList.map((a: any) => {
              const sKey = a.status?.toLowerCase().replace(/\s+/g, ' ');
              const sc = sk[sKey] || { bg: '#f1f5f9', color: '#475569' };
              return (
                <tr
                  key={a.id}
                  onClick={() => setSelected(a)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ fontWeight: 600, color: '#374151' }}>{a.time}</td>
                  <td style={{ fontWeight: 500 }}>{a.name}</td>
                  <td style={{ color: '#64748b' }}>Dr. {a.doctor}</td>
                  <td style={{ color: '#64748b' }}>{a.condition}</td>
                  <td>
                    <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 9px', fontSize: 11, fontWeight: 600 }}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 20, padding: '32px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(15,23,42,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Appointment Detail</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Patient', selected.name],
                ['Age', selected.age],
                ['Doctor', `Dr. ${selected.doctor}`],
                ['Condition', selected.condition],
                ['Date', selected.date],
                ['Time', selected.time],
                ['Phone', selected.phone],
                ['Status', selected.status],
                ['Payment', selected.payment_status],
                selected.remarks && ['Remarks', selected.remarks],
              ].filter(Boolean).map(([label, value]: any) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500, minWidth: 80 }}>{label}</span>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>{value || '—'}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setSelected(null); router.push('/receptionist/appointments'); }}
              style={{ marginTop: 24, width: '100%', padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}
            >
              Go to Full Appointments
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentsTable;
