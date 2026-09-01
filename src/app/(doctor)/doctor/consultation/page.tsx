'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  PENDING:  { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  ACTIVE:   { bg: '#f0fdf4', color: '#166534', border: '#86efac' },
  ENDED:    { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  DECLINED: { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
};

export default function DoctorConsultationsPage() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : '';
  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) { router.replace('/doctor/login'); return; }
    fetch('/api/consultations', { headers: authHeader })
      .then(r => r.ok ? r.json() : [])
      .then(data => setConsultations(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id: string) => {
    setAccepting(id);
    const res = await fetch(`/api/consultations/${id}`, {
      method: 'PATCH', headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    if (res.ok) { router.push(`/doctor/consultation/${id}`); }
    else { setAccepting(null); }
  };

  const handleDecline = async (id: string) => {
    await fetch(`/api/consultations/${id}`, {
      method: 'PATCH', headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DECLINED' }),
    });
    setConsultations(prev => prev.map(c => c.id === id ? { ...c, status: 'DECLINED' } : c));
  };

  if (loading) {
    return (
      <div>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{ height: 24, width: 200, borderRadius: 6, marginBottom: 20, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ borderRadius: 14, padding: 20, marginBottom: 12, border: '1px solid #e2e8f0', height: 80, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Video Consultations</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>Manage patient video consultation requests</p>
      </div>

      {consultations.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📹</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No consultation requests yet.</p>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>Patients can request a video consultation from the patient portal.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {consultations.map((c) => {
            const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.ENDED;
            const patientName = `${c.patient?.firstName} ${c.patient?.lastName}`;
            return (
              <div key={c.id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${st.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📹</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                      {patientName}
                      {c.patient?.relation && c.patient.relation !== 'SELF' && (
                        <span style={{ fontSize: 11, color: '#6366f1', marginLeft: 6, fontWeight: 700 }}>({c.patient.relation})</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ marginTop: 4, display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                      {c.status}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {c.status === 'PENDING' && (
                    <>
                      <button onClick={() => handleAccept(c.id)} disabled={accepting === c.id} style={{ padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: accepting === c.id ? 0.7 : 1 }}>
                        {accepting === c.id ? 'Joining…' : 'Accept & Join'}
                      </button>
                      <button onClick={() => handleDecline(c.id)} style={{ padding: '9px 18px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        Decline
                      </button>
                    </>
                  )}
                  {c.status === 'ACTIVE' && (
                    <button onClick={() => router.push(`/doctor/consultation/${c.id}`)} style={{ padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      Rejoin Call
                    </button>
                  )}
                  {(c.status === 'ENDED' || c.status === 'DECLINED') && (
                    <button onClick={() => router.push(`/doctor/consultation/${c.id}`)} style={{ padding: '9px 18px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      View Chat
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
