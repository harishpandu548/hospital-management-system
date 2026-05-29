'use client';
import React, { useState, useEffect, useCallback } from 'react';
import '@/styles/receptionist/doctor-view-modal.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;

const DoctorViewModal = ({ isOpen, onClose, doctor }: any) => {
  const [tab, setTab] = useState<'info' | 'availability' | 'login'>('info');
  const [rules, setRules] = useState<any[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [addingRule, setAddingRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: '30',
    maxPatientsPerSlot: '1',
    validFrom: new Date().toISOString().split('T')[0],
  });
  const [ruleError, setRuleError] = useState('');
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const doctorId = doctor?._raw?.id || doctor?.id;

  const fetchRules = useCallback(async () => {
    if (!doctorId) return;
    setRulesLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/doctors/${doctorId}/availability`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) setRules(await res.json());
    } catch {
      // keep
    } finally {
      setRulesLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (isOpen && tab === 'availability') fetchRules();
  }, [isOpen, tab, fetchRules]);

  if (!isOpen || !doctor) return null;

  const handleAddRule = async () => {
    setRuleError('');
    // Build ISO datetimes using validFrom date + time
    const makeISO = (date: string, time: string) => `${date}T${time}:00.000Z`;
    const startISO = makeISO(ruleForm.validFrom, ruleForm.startTime);
    const endISO = makeISO(ruleForm.validFrom, ruleForm.endTime);
    if (ruleForm.startTime >= ruleForm.endTime) { setRuleError('Start time must be before end time.'); return; }
    setAddingRule(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/doctors/${doctorId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          dayOfWeek: Number(ruleForm.dayOfWeek),
          startTime: startISO,
          endTime: endISO,
          slotDurationMinutes: Number(ruleForm.slotDurationMinutes),
          maxPatientsPerSlot: Number(ruleForm.maxPatientsPerSlot),
          validFrom: new Date(ruleForm.validFrom).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setRuleError(data.error || 'Failed to add rule.'); return; }
      await fetchRules();
    } catch {
      setRuleError('Network error.');
    } finally {
      setAddingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Delete this availability rule?')) return;
    try {
      const token = getToken();
      await fetch(`/api/doctors/${doctorId}/availability/${ruleId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      await fetchRules();
    } catch {
      // silently fail
    }
  };

  const handleEnableLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess('');
    if (!loginForm.phone || !loginForm.password) { setLoginError('Phone and password required.'); return; }
    setLoginSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/doctors/${doctorId}/enable-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ phone: loginForm.phone, password: loginForm.password }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Failed to enable login.'); return; }
      setLoginSuccess(`Login enabled! Doctor can now sign in at /doctor/login with phone ${loginForm.phone}`);
      setLoginForm({ phone: '', password: '' });
    } catch {
      setLoginError('Network error.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const tabStyle = (t: string) => ({
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    background: tab === t ? '#6366f1' : 'transparent',
    color: tab === t ? '#fff' : '#64748b',
    transition: 'all 0.18s',
  } as React.CSSProperties);

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 600, width: '95%' }}>
        <div className="modal-header">
          <h3>Dr. {doctor.name}</h3>
          <span className="close-icon" onClick={onClose}>×</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 20px 0', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <button style={tabStyle('info')} onClick={() => setTab('info')}>Info</button>
          <button style={tabStyle('availability')} onClick={() => setTab('availability')}>Availability</button>
          <button style={tabStyle('login')} onClick={() => setTab('login')}>Enable Login</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>

          {/* INFO TAB */}
          {tab === 'info' && (
            <>
              <div className="modal-row">
                <div><strong>Speciality</strong><p>{doctor.speciality}</p></div>
                <div><strong>Experience</strong><p>{doctor.experience}</p></div>
              </div>
              <div className="modal-row">
                <div><strong>Qualification</strong><p>{doctor.qualification || 'N/A'}</p></div>
                <div><strong>Status</strong><p style={{ color: doctor.status === 'Available' ? '#10b981' : '#ef4444', fontWeight: 600 }}>{doctor.status}</p></div>
              </div>
              <div className="modal-row">
                <div><strong>Joined</strong><p>{doctor.date || 'N/A'}</p></div>
                <div><strong>Login Access</strong><p>{doctor._raw?.userId ? <span style={{ color: '#10b981', fontWeight: 600 }}>Enabled ✓</span> : <span style={{ color: '#94a3b8' }}>Not enabled</span>}</p></div>
              </div>
            </>
          )}

          {/* AVAILABILITY TAB */}
          {tab === 'availability' && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: '#0f172a' }}>Availability Rules</h4>
              {rulesLoading ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</p>
              ) : rules.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No availability rules set yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {rules.map((r) => (
                    <div key={r.id} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontSize: 13 }}>
                        <strong style={{ color: '#6366f1' }}>{DAYS[r.dayOfWeek]}</strong>
                        <span style={{ color: '#475569', marginLeft: 8 }}>
                          {new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(r.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>
                          · {r.slotDurationMinutes}min slots · max {r.maxPatientsPerSlot}/slot
                        </span>
                      </div>
                      <button onClick={() => handleDeleteRule(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <hr style={{ margin: '16px 0', borderColor: '#e2e8f0' }} />
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px', color: '#0f172a' }}>Add Availability Rule</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Day of Week</label>
                  <select value={ruleForm.dayOfWeek} onChange={e => setRuleForm(p => ({ ...p, dayOfWeek: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13 }}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Valid From</label>
                  <input type="date" value={ruleForm.validFrom} onChange={e => setRuleForm(p => ({ ...p, validFrom: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Start Time</label>
                  <input type="time" value={ruleForm.startTime} onChange={e => setRuleForm(p => ({ ...p, startTime: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>End Time</label>
                  <input type="time" value={ruleForm.endTime} onChange={e => setRuleForm(p => ({ ...p, endTime: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Slot Duration (min)</label>
                  <input type="number" min="5" value={ruleForm.slotDurationMinutes} onChange={e => setRuleForm(p => ({ ...p, slotDurationMinutes: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Max Patients / Slot</label>
                  <input type="number" min="1" value={ruleForm.maxPatientsPerSlot} onChange={e => setRuleForm(p => ({ ...p, maxPatientsPerSlot: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                </div>
              </div>
              {ruleError && <div style={{ marginTop: 10, color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{ruleError}</div>}
              <button onClick={handleAddRule} disabled={addingRule}
                style={{ marginTop: 14, padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: addingRule ? 0.7 : 1 }}>
                {addingRule ? 'Adding…' : '+ Add Rule'}
              </button>
            </div>
          )}

          {/* LOGIN TAB */}
          {tab === 'login' && (
            <div>
              {doctor._raw?.userId ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', color: '#16a34a', fontSize: 14 }}>
                  ✓ Login is already enabled for this doctor. They can sign in at <strong>/doctor/login</strong>.
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
                    Enable login access for Dr. <strong>{doctor.name}</strong>. They will be able to sign in at <code>/doctor/login</code>.
                  </p>
                  <form onSubmit={handleEnableLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Phone (login ID) *</label>
                      <input type="tel" value={loginForm.phone} onChange={e => setLoginForm(p => ({ ...p, phone: e.target.value }))} placeholder="Doctor's phone number"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password *</label>
                      <input type="password" value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} placeholder="Set a password"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} required />
                    </div>
                    {loginError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{loginError}</div>}
                    {loginSuccess && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', color: '#16a34a', fontSize: 13 }}>✓ {loginSuccess}</div>}
                    <button type="submit" disabled={loginSubmitting}
                      style={{ padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: loginSubmitting ? 0.7 : 1 }}>
                      {loginSubmitting ? 'Enabling…' : 'Enable Doctor Login'}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="gray-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default DoctorViewModal;
