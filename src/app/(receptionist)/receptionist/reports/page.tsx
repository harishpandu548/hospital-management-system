'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('receptionist_token') : null;

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  SCHEDULED:   { bg: '#eff6ff', color: '#2563eb', label: 'Scheduled' },
  CHECKED_IN:  { bg: '#ecfdf5', color: '#059669', label: 'Checked In' },
  IN_PROGRESS: { bg: '#fffbeb', color: '#d97706', label: 'In Progress' },
  COMPLETED:   { bg: '#f0fdf4', color: '#16a34a', label: 'Completed' },
  CANCELLED:   { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
  NO_SHOW:     { bg: '#fef3c7', color: '#92400e', label: 'No Show' },
};

// ── SVG Chart Primitives ────────────────────────────────────────────────────

const CHART_W = 540;
const CHART_H = 180;
const PAD = { top: 16, right: 16, bottom: 40, left: 44 };

function BarChart({ data, color = '#6366f1' }: { data: { label: string; value: number }[]; color?: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data.length) return <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No data</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const barW = Math.max(8, Math.min(40, innerW / data.length - 6));
  const step = innerW / data.length;

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Y-axis gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD.top + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">
              {Math.round(max * t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = PAD.left + i * step + step / 2 - barW / 2;
        const barH = (d.value / max) * innerH;
        const y = PAD.top + innerH - barH;
        const isHov = hovered === i;
        return (
          <g key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect x={x} y={PAD.top} width={barW} height={innerH} fill="transparent" />
            <rect
              x={x} y={isHov ? y - 2 : y}
              width={barW} height={isHov ? barH + 2 : barH}
              rx={4}
              fill={color}
              opacity={isHov ? 1 : 0.78}
              style={{ transition: 'all 0.15s' }}
            />
            {isHov && (
              <g>
                <rect x={x + barW / 2 - 18} y={y - 22} width={36} height={18} rx={5} fill="#0f172a" />
                <text x={x + barW / 2} y={y - 10} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={700}>{d.value}</text>
              </g>
            )}
            <text x={x + barW / 2} y={CHART_H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#64748b">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data.length) return <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No data</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const pts = data.map((d, i) => ({
    x: PAD.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: PAD.top + innerH - (d.value / max) * innerH,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x},${PAD.top + innerH} L${pts[0].x},${PAD.top + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD.top + innerH * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{Math.round(max * t)}</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#lineGrad)" />
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <circle cx={p.x} cy={p.y} r={10} fill="transparent" />
          <circle cx={p.x} cy={p.y} r={hovered === i ? 5 : 3.5} fill="#fff" stroke="#6366f1" strokeWidth={2.5} style={{ transition: 'r 0.12s' }} />
          {hovered === i && (
            <g>
              <rect x={p.x - 18} y={p.y - 24} width={36} height={18} rx={5} fill="#0f172a" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={700}>{data[i].value}</text>
            </g>
          )}
          <text x={p.x} y={CHART_H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#64748b">{data[i].label}</text>
        </g>
      ))}
    </svg>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (!total) return <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No data</div>;
  const cx = 90, cy = 90, r = 70, inner = 44;
  let angle = -Math.PI / 2;

  const arcs = segments.map((seg, i) => {
    const frac = seg.value / total;
    const sweep = frac * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const ix1 = cx + inner * Math.cos(angle - sweep);
    const iy1 = cy + inner * Math.sin(angle - sweep);
    const ix2 = cx + inner * Math.cos(angle);
    const iy2 = cy + inner * Math.sin(angle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
    const midAngle = angle - sweep / 2;
    return { ...seg, d, frac, midAngle, i };
  });

  const hov = hovered !== null ? arcs[hovered] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg viewBox="0 0 180 180" style={{ width: 180, height: 180, flexShrink: 0 }}>
        {arcs.map((arc) => (
          <path
            key={arc.i}
            d={arc.d}
            fill={arc.color}
            opacity={hovered === arc.i ? 1 : 0.82}
            stroke="#fff"
            strokeWidth={2}
            style={{ transform: hovered === arc.i ? `translate(${Math.cos(arc.midAngle) * 4}px, ${Math.sin(arc.midAngle) * 4}px)` : 'none', transition: 'all 0.15s', cursor: 'pointer' }}
            onMouseEnter={() => setHovered(arc.i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        <circle cx={cx} cy={cy} r={inner - 2} fill="#fff" />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={22} fontWeight={800} fill="#0f172a">{hov ? hov.value : total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="#64748b">{hov ? hov.label : 'Total'}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {arcs.map((arc) => (
          <div key={arc.i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onMouseEnter={() => setHovered(arc.i)} onMouseLeave={() => setHovered(null)}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: arc.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#374151', fontWeight: hovered === arc.i ? 700 : 400 }}>{arc.label}</span>
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>{arc.value} ({Math.round(arc.frac * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function calcAge(dob: string) {
  if (!dob) return '-';
  return String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

const ReportsPage = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'doctors'>('overview');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      fetch('/api/appointments', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      fetch('/api/doctors', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([appts, docs]) => {
      setAppointments(Array.isArray(appts) ? appts : []);
      setDoctors(Array.isArray(docs) ? docs : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const today = new Date().toDateString();
  const todayAppts = appointments.filter(a => new Date(a.appointmentDate).toDateString() === today);
  const thisMonth = appointments.filter(a => {
    const d = new Date(a.appointmentDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const statusCounts = Object.keys(STATUS_COLORS).reduce((acc, s) => {
    acc[s] = appointments.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  // Last 7 days trend data
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const value = appointments.filter(a => new Date(a.appointmentDate).toDateString() === d.toDateString()).length;
    return { label, value };
  });

  // Last 4 weeks
  const last4Weeks = Array.from({ length: 4 }, (_, i) => {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const label = `Wk ${4 - i}`;
    const value = appointments.filter(a => {
      const d = new Date(a.appointmentDate);
      return d >= start && d <= end;
    }).length;
    return { label, value };
  }).reverse();

  const doctorWorkload = doctors.map(d => ({
    ...d,
    count: appointments.filter(a => a.doctorId === d.id).length,
    completed: appointments.filter(a => a.doctorId === d.id && a.status === 'COMPLETED').length,
  })).sort((a, b) => b.count - a.count);

  const barDoctorData = doctorWorkload.slice(0, 8).map(d => ({
    label: d.fullname?.split(' ').pop() || 'Dr',
    value: d.count,
  }));

  const donutData = Object.entries(STATUS_COLORS)
    .map(([s, c]) => ({ label: c.label, value: statusCounts[s] || 0, color: c.color }))
    .filter(d => d.value > 0);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'doctors', label: 'Doctor Workload' },
  ] as const;

  const card = (children: React.ReactNode, delay = 0) => (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', padding: 24, marginBottom: 20 }}
    >
      {children}
    </motion.div>
  );

  if (loading) return (
    <div style={{ padding: '20px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ height: 22, width: 140, borderRadius: 6, marginBottom: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      <div style={{ height: 14, width: 280, borderRadius: 4, marginBottom: 24, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[1,2,3,4,5,6].map(k => (
          <div key={k} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 22, width: '55%', borderRadius: 4, marginBottom: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              <div style={{ height: 12, width: '80%', borderRadius: 4, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 200, borderRadius: 16, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '20px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Reports</h2>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Analytics and statistics for hospital operations</p>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f1f5f9', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === t.key ? '#fff' : 'transparent',
              color: activeTab === t.key ? '#0f172a' : '#64748b',
              boxShadow: activeTab === t.key ? '0 1px 4px rgba(15,23,42,0.1)' : 'none',
              transition: 'all 0.18s',
            }}
          >{t.label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Total Appointments', value: appointments.length, color: '#6366f1', icon: '📅' },
                { label: "Today's", value: todayAppts.length, color: '#10b981', icon: '🗓️' },
                { label: 'This Month', value: thisMonth.length, color: '#f59e0b', icon: '📆' },
                { label: 'Completed', value: statusCounts['COMPLETED'] || 0, color: '#06b6d4', icon: '✅' },
                { label: 'Cancelled', value: statusCounts['CANCELLED'] || 0, color: '#ef4444', icon: '❌' },
                { label: 'Active Doctors', value: doctors.length, color: '#8b5cf6', icon: '👨‍⚕️' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }}
                  style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', gap: 14, alignItems: 'center', transition: 'box-shadow 0.2s' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── 7-day trend line chart ── */}
            {card(
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>Appointments – Last 7 Days</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Daily appointment volume trend</p>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{last7.reduce((a,b)=>a+b.value,0)}</div>
                </div>
                <LineChart data={last7} />
              </>, 0.1
            )}

            {/* ── Status donut + weekly bar row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {card(
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>Status Distribution</h3>
                  <DonutChart segments={donutData} />
                </>, 0.18
              )}
              {card(
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>Weekly Volume</h3>
                  <BarChart data={last4Weeks} color="#10b981" />
                </>, 0.24
              )}
            </div>
          </motion.div>
        )}

        {/* ── APPOINTMENTS TAB ─────────────────────────────────────────── */}
        {activeTab === 'appointments' && (
          <motion.div key="appointments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {/* Status breakdown bar chart */}
            {card(
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>Status Breakdown</h3>
                <BarChart
                  data={Object.entries(STATUS_COLORS).map(([s, c]) => ({ label: c.label.split(' ')[0], value: statusCounts[s] || 0 }))}
                  color="#6366f1"
                />
              </>, 0.05
            )}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>All Appointments</h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{appointments.length} total</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['#', 'Date', 'Patient', 'Doctor', 'Time', 'Status'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No appointments found.</td></tr>
                    )}
                    {appointments.slice(0, 50).map((a, i) => {
                      const sc = STATUS_COLORS[a.status] || { bg: '#f8fafc', color: '#475569' };
                      return (
                        <motion.tr
                          key={a.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.01 }}
                          style={{ borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>#{String(i+1).padStart(3,'0')}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(a.appointmentDate).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : '—'}</td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{a.doctor ? `Dr. ${a.doctor.fullname}` : '—'}</td>
                          <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{a.slotStart ? new Date(a.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700 }}>{a.status}</span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {appointments.length > 50 && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8' }}>Showing first 50 of {appointments.length}</div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── DOCTOR WORKLOAD TAB ──────────────────────────────────────── */}
        {activeTab === 'doctors' && (
          <motion.div key="doctors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {/* Doctor workload bar chart */}
            {barDoctorData.length > 0 && card(
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>Appointments per Doctor</h3>
                <BarChart data={barDoctorData} color="#8b5cf6" />
              </>, 0.05
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {doctorWorkload.length === 0 && <div style={{ color: '#94a3b8', padding: '2rem' }}>No doctors found.</div>}
              {doctorWorkload.map((d, i) => {
                const pct = d.count > 0 ? Math.round((d.completed / d.count) * 100) : 0;
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }}
                    style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', transition: 'box-shadow 0.2s' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>
                        {d.fullname?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>Dr. {d.fullname}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{d.specialization}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 13, marginBottom: 14 }}>
                      {[
                        { label: 'Total', value: d.count, color: '#6366f1', bg: '#f8f7ff' },
                        { label: 'Done', value: d.completed, color: '#16a34a', bg: '#f0fdf4' },
                        { label: 'Rate', value: `${pct}%`, color: '#f59e0b', bg: '#fffbeb' },
                      ].map(s => (
                        <div key={s.label} style={{ padding: '10px 8px', background: s.bg, borderRadius: 10, textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                          <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {d.count > 0 && (
                      <div>
                        <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3 + i * 0.06, duration: 0.6 }}
                            style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: 3 }}
                          />
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Completion rate</div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportsPage;
