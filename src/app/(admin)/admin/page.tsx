'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { pageVariants, staggerContainer, fadeUp, scaleUp } from '@/lib/animations';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

const Sk = ({ w = '80%', h = 14, r = 6 }: { w?: string | number; h?: number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
);

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SCHEDULED:   { bg: '#eff6ff', color: '#2563eb' },
  CHECKED_IN:  { bg: '#ecfdf5', color: '#059669' },
  IN_PROGRESS: { bg: '#fffbeb', color: '#d97706' },
  COMPLETED:   { bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED:   { bg: '#fef2f2', color: '#dc2626' },
  NO_SHOW:     { bg: '#fef3c7', color: '#92400e' },
};

// ── Mini SVG Charts ─────────────────────────────────────────────────────────

function MiniLineChart({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const w = 200, h = 48, pad = 4;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2),
    y: pad + (1 - v / max) * (h - pad * 2),
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 48 }}>
      <defs>
        <linearGradient id={`mg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#mg${color.replace('#','')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3 : 0} fill={color} />)}
    </svg>
  );
}

function MiniBarChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (!total) return <div style={{ color: '#94a3b8', fontSize: 12 }}>No data</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const pct = Math.round((seg.value / total) * 100);
        return (
          <div key={i}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'default' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
              <span style={{ fontWeight: 600, color: seg.color }}>{seg.label.replace(/_/g, ' ')}</span>
              <span style={{ color: '#64748b', fontWeight: 600 }}>{seg.value} · {pct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: 0.4 + i * 0.06, duration: 0.55 }}
                style={{ height: '100%', background: seg.color, borderRadius: 3, opacity: hovered === i ? 1 : 0.75, transition: 'opacity 0.15s' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutMini({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const [hov, setHov] = useState<number | null>(null);
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const cx = 54, cy = 54, r = 44, inner = 28;
  let angle = -Math.PI / 2;

  const arcs = segments.filter(s => s.value > 0).map((seg, i) => {
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
    const la = sweep > Math.PI ? 1 : 0;
    const mid = angle - sweep / 2;
    return { ...seg, d: `M${x1} ${y1} A${r} ${r} 0 ${la} 1 ${x2} ${y2} L${ix2} ${iy2} A${inner} ${inner} 0 ${la} 0 ${ix1} ${iy1} Z`, mid, i };
  });

  const hovSeg = hov !== null ? arcs[hov] : null;
  return (
    <svg viewBox="0 0 108 108" style={{ width: 108, height: 108 }}>
      {arcs.map(arc => (
        <path key={arc.i} d={arc.d} fill={arc.color} opacity={hov === arc.i ? 1 : 0.8} stroke="#fff" strokeWidth={1.5}
          style={{ transform: hov === arc.i ? `translate(${(Math.cos(arc.mid)*3).toFixed(1)}px,${(Math.sin(arc.mid)*3).toFixed(1)}px)` : 'none', transition: 'all 0.15s', cursor: 'pointer' }}
          onMouseEnter={() => setHov(arc.i)} onMouseLeave={() => setHov(null)}
        />
      ))}
      <circle cx={cx} cy={cy} r={inner - 1} fill="#fff" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={16} fontWeight={800} fill="#0f172a">{hovSeg ? hovSeg.value : total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="#64748b">{hovSeg ? hovSeg.label.slice(0,8) : 'Total'}</text>
    </svg>
  );
}

/* Animated counter */
const AnimatedCounter = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    if (value === 0) { setDisplay(0); return; }
    const step = Math.ceil(value / 24);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 35);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
};

// ────────────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const router = useRouter();
  const [stats, setStats] = useState({ doctors: 0, patients: 0, appointments: 0, receptionists: 0 });
  const [recentAppts, setRecentAppts] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [todayCount, setTodayCount] = useState(0);
  const [trendData, setTrendData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = () => {
    const token = getToken();
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/doctors', { headers: h }).then(r => r.ok ? r.json() : []),
      fetch('/api/patients', { headers: h }).then(r => r.ok ? r.json() : []),
      fetch('/api/appointments', { headers: h }).then(r => r.ok ? r.json() : []),
      fetch('/api/admin/users?role=RECEPTIONIST', { headers: h }).then(r => r.ok ? r.json() : []),
    ]).then(([doctors, patients, appointments, receptionists]) => {
      const appts = Array.isArray(appointments) ? appointments : [];
      const today = new Date().toDateString();
      const todayAppts = appts.filter((a: any) => new Date(a.appointmentDate).toDateString() === today);
      const breakdown: Record<string, number> = {};
      appts.forEach((a: any) => { breakdown[a.status] = (breakdown[a.status] || 0) + 1; });

      const trend = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return appts.filter((a: any) => new Date(a.appointmentDate).toDateString() === d.toDateString()).length;
      });

      setStats({ doctors: Array.isArray(doctors) ? doctors.length : 0, patients: Array.isArray(patients) ? patients.length : 0, appointments: appts.length, receptionists: Array.isArray(receptionists) ? receptionists.length : 0 });
      setTodayCount(todayAppts.length);
      setRecentAppts(appts.slice(0, 6));
      setStatusBreakdown(breakdown);
      setTrendData(trend);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();

    // Connect to WebSocket to receive real-time dashboard updates
    let socket: any;
    import('socket.io-client').then(({ io }) => {
      socket = io('http://localhost:3001');
      socket.emit('join-admin');
      socket.on('appointment-update', () => {
        // Silently refresh stats in the background
        fetchDashboardData();
      });
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const statCards = [
    { label: 'Total Doctors', value: stats.doctors, color: '#f59e0b', bg: '#fffbeb', icon: '👨‍⚕️', href: '/admin/doctors' },
    { label: 'Total Patients', value: stats.patients, color: '#6366f1', bg: '#eef2ff', icon: '🧑‍🤝‍🧑', href: null },
    { label: 'All Appointments', value: stats.appointments, color: '#10b981', bg: '#ecfdf5', icon: '📅', href: null },
    { label: "Today's Appointments", value: todayCount, color: '#06b6d4', bg: '#ecfeff', icon: '🗓️', href: null },
    { label: 'Receptionists', value: stats.receptionists, color: '#8b5cf6', bg: '#ede9fe', icon: '🧑‍💼', href: '/admin/receptionists' },
  ];

  const quickActions = [
    { label: 'Add Doctor', icon: '👨‍⚕️', href: '/admin/doctors', color: '#f59e0b' },
    { label: 'Add Receptionist', icon: '🧑‍💼', href: '/admin/receptionists', color: '#6366f1' },
    { label: 'Role Management', icon: '🔑', href: '/admin/roles', color: '#8b5cf6' },
    { label: 'Audit Logs', icon: '📋', href: '/admin/audit-logs', color: '#10b981' },
    { label: 'Settings', icon: '⚙️', href: '/admin/settings', color: '#64748b' },
  ];

  const donutSegments = Object.entries(STATUS_COLORS).map(([s, c]) => ({
    label: s.replace(/_/g, ' '),
    value: statusBreakdown[s] || 0,
    color: c.color,
  }));

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ padding: '24px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}
    >
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <motion.h2
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}
        >
          Admin Dashboard
        </motion.h2>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      {/* Stat Cards with animated counters */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}
      >
        {loading
          ? [1,2,3,4,5].map(k => (
            <div key={k} style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
              <div style={{ flex: 1 }}><Sk h={26} w="60%" /><div style={{ marginTop: 6 }}><Sk h={12} w="80%" /></div></div>
            </div>
          ))
          : statCards.map((s, i) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => s.href && router.push(s.href)}
              style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 14, cursor: s.href ? 'pointer' : 'default', transition: 'border-color 0.18s' }}
              onMouseEnter={e => s.href && ((e.currentTarget as HTMLElement).style.borderColor = s.color + '66')}
              onMouseLeave={e => s.href && ((e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0')}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.1 + i * 0.06 }}
                  style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}
                >
                  <AnimatedCounter value={s.value} />
                </motion.div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            </motion.div>
          ))
        }
      </motion.div>

      {/* Trend Sparkline Strip */}
      {!loading && trendData.some(v => v > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>7-Day Appointment Trend</div>
            <MiniLineChart data={trendData} color="#6366f1" />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.25 }}
            style={{ flexShrink: 0, textAlign: 'right' }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>{trendData.reduce((a, b) => a + b, 0)}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>last 7 days</div>
          </motion.div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ marginBottom: 24 }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {quickActions.map((a, i) => (
            <motion.button
              key={a.href}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 + i * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(a.href)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: '#fff', border: '1.5px solid #e2e8f0', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = a.color; (e.currentTarget as HTMLElement).style.color = a.color; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.color = '#1e293b'; }}
            >
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              {a.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Recent Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', overflow: 'hidden' }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Recent Appointments</div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{stats.appointments} total</span>
          </div>
          {loading ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(k => <div key={k} style={{ display: 'flex', gap: 10 }}><Sk w={36} h={36} r={10} /><div style={{ flex: 1 }}><Sk h={12} w="70%" /><div style={{ marginTop: 6 }}><Sk h={10} w="50%" /></div></div></div>)}
            </div>
          ) : recentAppts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No appointments yet.</div>
          ) : (
            <div>
              {recentAppts.map((a, i) => {
                const sc = STATUS_COLORS[a.status] || { bg: '#f8fafc', color: '#475569' };
                return (
                  <motion.div
                    key={a.id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + i * 0.04 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < recentAppts.length - 1 ? '1px solid #f8fafc' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {(a.patient?.firstName || '?').charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                        {a.doctor ? `Dr. ${a.doctor.fullname}` : '—'} · {a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString() : '—'}
                      </div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {a.status?.replace(/_/g, ' ')}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status chart with donut */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
            style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', padding: '20px' }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 14 }}>Appointment Status</div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3].map(k => <Sk key={k} h={20} />)}</div>
            ) : Object.keys(statusBreakdown).length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>No data yet.</div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', gap: 16 }}
              >
                <DonutMini segments={donutSegments} />
                <div style={{ flex: 1 }}>
                  <MiniBarChart
                    segments={Object.entries(STATUS_COLORS).map(([s, c]) => ({
                      label: s.replace(/_/g, ' '),
                      value: statusBreakdown[s] || 0,
                      color: c.color,
                    }))}
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
