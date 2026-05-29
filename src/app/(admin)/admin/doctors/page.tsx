'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, staggerContainer, fadeUp } from '@/lib/animations';

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DoctorsPage = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [availOpen, setAvailOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const fetchDoctors = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/doctors', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDoctors(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const activeDoctors = doctors.filter(d => d.isActive !== false);
  const inactiveDoctors = doctors.filter(d => d.isActive === false);
  const pool = showInactive ? inactiveDoctors : activeDoctors;

  const filtered = search
    ? pool.filter(d => d.fullname?.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toLowerCase().includes(search.toLowerCase()))
    : pool;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ padding: '20px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}
    >
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <motion.h2
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}
          >
            Doctors
          </motion.h2>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Manage doctor profiles, logins and availability</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <motion.input
            type="text" placeholder="Search by name or specialization…" value={search}
            onChange={e => setSearch(e.target.value)}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.15 }}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, width: 240, outline: 'none' }}
          />
          <motion.button
            onClick={() => setShowInactive(p => !p)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            style={{ padding: '9px 16px', borderRadius: 10, background: showInactive ? '#fef3c7' : '#f1f5f9', color: showInactive ? '#92400e' : '#475569', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            {showInactive ? `Active (${activeDoctors.length})` : `Inactive (${inactiveDoctors.length})`}
          </motion.button>
          <motion.button
            onClick={() => setCreateOpen(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            style={{ padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            + Add Doctor
          </motion.button>
        </div>
      </motion.div>

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}
      >
        {loading && [1,2,3,4,5,6].map(k => (
          <div key={k} style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, width: '70%', borderRadius: 4, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', marginBottom: 6 }} />
                <div style={{ height: 12, width: '50%', borderRadius: 4, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && <div style={{ color: '#94a3b8', padding: '2rem' }}>No doctors found.</div>}
        {!loading && filtered.map((d, i) => (
          <motion.div
            key={d.id}
            variants={fadeUp}
            whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
            whileTap={{ scale: 0.97 }}
            style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>
                {d.fullname?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>Dr. {d.fullname}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{d.specialization} · {d.experienceYears} yrs</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
              <div><strong style={{ color: '#374151' }}>Qualification:</strong> {d.qualification || '—'}</div>
              <div style={{ marginTop: 4 }}>
                <strong style={{ color: '#374151' }}>Portal Login:</strong>{' '}
                {d.userId
                  ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Enabled</span>
                  : <span style={{ color: '#dc2626', fontWeight: 600 }}>Not enabled</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <motion.button
                onClick={() => { setSelected(d); setAvailOpen(true); }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Availability
              </motion.button>
              {!d.userId && (
                <motion.button
                  onClick={() => { setSelected(d); setLoginOpen(true); }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Enable Login
                </motion.button>
              )}
              <motion.button
                onClick={() => { setSelected(d); setStatusOpen(true); }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                style={{ flex: 1, padding: '8px', borderRadius: 8, background: d.isActive !== false ? '#fef2f2' : '#f0fdf4', color: d.isActive !== false ? '#dc2626' : '#16a34a', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {d.isActive !== false ? 'Deactivate' : 'Reactivate'}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {createOpen && <CreateDoctorModal onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); fetchDoctors(); }} />}
        {availOpen && selected && <AvailabilityModal doctor={selected} onClose={() => { setAvailOpen(false); setSelected(null); }} />}
        {loginOpen && selected && <EnableLoginModal doctor={selected} onClose={() => { setLoginOpen(false); setSelected(null); }} onDone={() => { setLoginOpen(false); setSelected(null); fetchDoctors(); }} />}
        {statusOpen && selected && <DoctorStatusModal doctor={selected} onClose={() => { setStatusOpen(false); setSelected(null); }} onDone={() => { setStatusOpen(false); setSelected(null); fetchDoctors(); }} />}
      </AnimatePresence>
    </motion.div>
  );
};

const Overlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.93, y: 16 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      style={{ background: '#fff', borderRadius: 20, padding: '32px', width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(15,23,42,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </motion.div>
);

const CreateDoctorModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [form, setForm] = useState({ fullname: '', specialization: '', qualification: '', experienceYears: '', createLogin: false, phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.fullname || !form.specialization || !form.experienceYears) { setError('Name, specialization and experience are required.'); return; }
    if (form.createLogin && (!form.phone || !form.password)) { setError('Phone and password required to create login.'); return; }
    setSubmitting(true);
    try {
      const token = getToken();
      const body: any = { fullname: form.fullname, specialization: form.specialization, qualification: form.qualification, experienceYears: parseInt(form.experienceYears) };
      if (form.createLogin) { body.createLogin = true; body.phone = form.phone; body.password = form.password; }
      const res = await fetch('/api/doctors', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create doctor.'); return; }
      onCreated();
    } catch { setError('Network error.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <h3 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Add New Doctor</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          { name: 'fullname', label: 'Full Name', placeholder: 'e.g. Rajesh Kumar', type: 'text' },
          { name: 'specialization', label: 'Specialization', placeholder: 'e.g. Cardiology', type: 'text' },
          { name: 'qualification', label: 'Qualification', placeholder: 'e.g. MBBS, MD', type: 'text' },
          { name: 'experienceYears', label: 'Years of Experience', placeholder: 'e.g. 10', type: 'number' },
        ].map(f => (
          <div key={f.name}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
            <motion.input
              type={f.type} placeholder={f.placeholder}
              value={form[f.name as keyof typeof form] as string}
              onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.createLogin} onChange={e => setForm(p => ({ ...p, createLogin: e.target.checked }))} />
          Create portal login for doctor
        </label>
        {form.createLogin && (
          <>
            {[
              { name: 'phone', label: 'Phone (Login ID)', placeholder: '9876543210', type: 'tel' },
              { name: 'password', label: 'Password', placeholder: 'Min 6 characters', type: 'password' },
            ].map(f => (
              <div key={f.name}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                <motion.input
                  type={f.type} placeholder={f.placeholder}
                  value={form[f.name as keyof typeof form] as string}
                  onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                  whileFocus={{ scale: 1.01 }}
                  transition={{ duration: 0.15 }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            ))}
          </>
        )}
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <motion.button type="submit" disabled={submitting}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            {submitting ? 'Creating…' : 'Create Doctor'}
          </motion.button>
          <motion.button type="button" onClick={onClose}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            style={{ padding: '11px 20px', borderRadius: 10, background: '#f1f5f9', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#475569' }}>
            Cancel
          </motion.button>
        </div>
      </form>
    </Overlay>
  );
};

const EnableLoginModal = ({ doctor, onClose, onDone }: { doctor: any; onClose: () => void; onDone: () => void }) => {
  const [form, setForm] = useState({ phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/doctors/${doctor.id}/enable-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to enable login.'); return; }
      setSuccess('Login enabled! Doctor can now log in at /doctor/login');
      setTimeout(onDone, 1800);
    } catch { setError('Network error.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Enable Portal Login</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Create login credentials for Dr. {doctor.fullname}</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          { name: 'phone', label: 'Phone (Login ID)', type: 'tel', placeholder: '9876543210' },
          { name: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters' },
        ].map(f => (
          <div key={f.name}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
            <motion.input
              type={f.type} placeholder={f.placeholder}
              value={form[f.name as keyof typeof form]}
              onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.15 }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>
        ))}
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', color: '#16a34a', fontSize: 13 }}>✓ {success}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <motion.button type="submit" disabled={submitting || !!success}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            {submitting ? 'Enabling…' : 'Enable Login'}
          </motion.button>
          <motion.button type="button" onClick={onClose}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            style={{ padding: '11px 20px', borderRadius: 10, background: '#f1f5f9', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#475569' }}>
            Cancel
          </motion.button>
        </div>
      </form>
    </Overlay>
  );
};

const AvailabilityModal = ({ doctor, onClose }: { doctor: any; onClose: () => void }) => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, maxPatientsPerSlot: 1, validFrom: new Date().toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchRules = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/doctors/${doctor.id}/availability`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRules(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const token = getToken();
      const today = form.validFrom;
      const startISO = new Date(`${today}T${form.startTime}:00`).toISOString();
      const endISO = new Date(`${today}T${form.endTime}:00`).toISOString();
      const res = await fetch(`/api/doctors/${doctor.id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ dayOfWeek: form.dayOfWeek, startTime: startISO, endTime: endISO, slotDurationMinutes: form.slotDurationMinutes, maxPatientsPerSlot: form.maxPatientsPerSlot, validFrom: new Date(form.validFrom).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to add rule.'); return; }
      setAddOpen(false);
      fetchRules();
    } catch { setError('Network error.'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (ruleId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`/api/doctors/${doctor.id}/availability/${ruleId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchRules();
    } catch {}
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Availability — Dr. {doctor.fullname}</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Weekly schedule rules</p>
        </div>
        <motion.button onClick={() => setAddOpen(p => !p)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          style={{ padding: '8px 14px', borderRadius: 8, background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
          {addOpen ? 'Cancel' : '+ Add Rule'}
        </motion.button>
      </div>

      {addOpen && (
        <form onSubmit={handleAddRule} style={{ background: '#fafafa', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Day</label>
              <select value={form.dayOfWeek} onChange={e => setForm(p => ({ ...p, dayOfWeek: parseInt(e.target.value) }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none' }}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Valid From</label>
              <input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Start Time</label>
              <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>End Time</label>
              <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Slot Duration (min)</label>
              <input type="number" value={form.slotDurationMinutes} min={5} onChange={e => setForm(p => ({ ...p, slotDurationMinutes: parseInt(e.target.value) }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Max Patients/Slot</label>
              <input type="number" value={form.maxPatientsPerSlot} min={1} onChange={e => setForm(p => ({ ...p, maxPatientsPerSlot: parseInt(e.target.value) }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', color: '#dc2626', fontSize: 12 }}>{error}</div>}
          <motion.button type="submit" disabled={submitting}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            style={{ padding: '9px', borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            {submitting ? 'Saving…' : 'Save Rule'}
          </motion.button>
        </form>
      )}

      {loading && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ height: 52, borderRadius: 10, marginBottom: 8, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      ))}
      {!loading && rules.length === 0 && <div style={{ color: '#94a3b8', padding: '1rem', textAlign: 'center' }}>No availability rules set yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rules.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: 10 }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{DAYS[r.dayOfWeek]}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                {new Date(r.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                {r.slotDurationMinutes} min slots · {r.maxPatientsPerSlot} patient/slot
              </div>
            </div>
            <motion.button onClick={() => handleDelete(r.id)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              style={{ padding: '5px 10px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Remove
            </motion.button>
          </motion.div>
        ))}
      </div>
      <motion.button onClick={onClose}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
        style={{ marginTop: 20, width: '100%', padding: '11px', borderRadius: 10, background: '#f1f5f9', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#475569' }}>
        Close
      </motion.button>
    </Overlay>
  );
};

const DoctorStatusModal = ({ doctor, onClose, onDone }: { doctor: any; onClose: () => void; onDone: () => void }) => {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const willDeactivate = doctor.isActive !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) { setError('Enter your admin password to confirm.'); return; }
    setSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/doctors/${doctor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ isActive: !willDeactivate, adminPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Action failed.'); return; }
      setSuccess(`Dr. ${doctor.fullname} has been ${willDeactivate ? 'deactivated' : 'reactivated'}.`);
      setTimeout(onDone, 1500);
    } catch { setError('Network error.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
        {willDeactivate ? 'Deactivate' : 'Reactivate'} Doctor
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
        {willDeactivate
          ? `Dr. ${doctor.fullname} will be marked inactive and won't appear in booking lists.`
          : `Dr. ${doctor.fullname} will be marked active and will appear in booking lists again.`}
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Admin Password (to confirm)</label>
          <motion.input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Enter your admin password"
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.15 }}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
            required
          />
        </div>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', color: '#16a34a', fontSize: 13 }}>✓ {success}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <motion.button type="submit" disabled={submitting || !!success}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            style={{ flex: 1, padding: '11px', borderRadius: 10, background: willDeactivate ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            {submitting ? 'Processing…' : willDeactivate ? 'Yes, Deactivate' : 'Yes, Reactivate'}
          </motion.button>
          <motion.button type="button" onClick={onClose}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            style={{ padding: '11px 20px', borderRadius: 10, background: '#f1f5f9', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#475569' }}>
            Cancel
          </motion.button>
        </div>
      </form>
    </Overlay>
  );
};

export default DoctorsPage;
