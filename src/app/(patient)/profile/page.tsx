'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiEdit2, FiPlus, FiUser, FiUsers, FiSave, FiX } from 'react-icons/fi';
import { BLOOD_GROUPS } from '@/data/patient/constants';
import countryCodes from '@/data/patient/countryCodes';
import '@/styles/patient/patient-info.css';

const RELATIONS = ['SPOUSE','CHILD','PARENT','SIBLING','OTHER'];
const RELATION_LABEL: Record<string,string> = { SELF:'Self', SPOUSE:'Spouse', CHILD:'Child', PARENT:'Parent', SIBLING:'Sibling', OTHER:'Other' };

export default function ProfilePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [familyForm, setFamilyForm] = useState({ firstName:'', lastName:'', gender:'', dateOfBirth:'', relation:'SIBLING', bloodGroup:'', countryCode:'+91', phone:'', email:'' });
  const [familySaving, setFamilySaving] = useState(false);
  const [familyError, setFamilyError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('hms_token') : '';
  const auth = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    const res = await fetch('/api/patients/family', { headers: auth });
    const data = res.ok ? await res.json() : [];
    setProfiles(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token || localStorage.getItem('hms_role') !== 'PATIENT') { router.replace('/login'); return; }
    load();
  }, [load]);

  const handleSave = async () => {
    if (!editProfile) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/patients/${editProfile.id}`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editProfile.firstName, lastName: editProfile.lastName,
          gender: editProfile.gender, dateOfBirth: editProfile.dateOfBirth,
          phone: editProfile.phone, email: editProfile.email,
          bloodGroup: editProfile.bloodGroup, address: editProfile.address,
          city: editProfile.city, state: editProfile.state,
          medicalNotes: editProfile.medicalNotes,
          weightKg: editProfile.weightKg ? parseInt(editProfile.weightKg) : undefined,
          heightCm: editProfile.heightCm ? parseInt(editProfile.heightCm) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed'); return; }
      setProfiles((prev) => prev.map((p) => p.id === data.id ? data : p));
      setEditProfile(null);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Network error'); } finally { setSaving(false); }
  };

  const handleAddFamily = async () => {
    setFamilyError('');
    if (!familyForm.firstName || !familyForm.lastName || !familyForm.gender || !familyForm.dateOfBirth || !familyForm.phone) {
      setFamilyError('Please fill all required fields'); return;
    }
    setFamilySaving(true);
    try {
      const res = await fetch('/api/patients/family', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: familyForm.firstName, lastName: familyForm.lastName,
          gender: familyForm.gender, dateOfBirth: familyForm.dateOfBirth,
          relation: familyForm.relation,
          phone: `${familyForm.countryCode}${familyForm.phone}`,
          email: familyForm.email || undefined,
          bloodGroup: familyForm.bloodGroup || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFamilyError(data.error || 'Failed'); return; }
      setProfiles((prev) => [...prev, data]);
      setShowAddFamily(false);
      setFamilyForm({ firstName:'', lastName:'', gender:'', dateOfBirth:'', relation:'SIBLING', bloodGroup:'', countryCode:'+91', phone:'', email:'' });
    } catch { setFamilyError('Network error'); } finally { setFamilySaving(false); }
  };

  if (loading) return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
      {[1,2].map((k) => <div key={k} style={{ height: 120, borderRadius: 16, marginBottom: 16, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  const self = profiles.find((p) => p.relation === 'SELF') ?? profiles[0];
  const family = profiles.filter((p) => p.id !== self?.id);

  const field = (label: string, key: string, type = 'text') => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={editProfile?.[key] ?? ''}
        onChange={(e) => setEditProfile((p: any) => ({ ...p, [key]: e.target.value }))}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
      />
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.push('/home')} style={{ padding: '8px 14px', borderRadius: 10, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>My Profiles</h2>
      </div>

      {success && <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, color: '#16a34a', fontSize: 13, fontWeight: 600 }}>{success}</div>}

      {/* Self Profile */}
      {self && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg,#fafbff,#fff)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>
                {self.firstName?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{self.firstName} {self.lastName}</div>
                <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>Primary Profile</div>
              </div>
            </div>
            {editProfile?.id !== self.id
              ? <button onClick={() => setEditProfile({ ...self })} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}><FiEdit2 size={13} /> Edit</button>
              : <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditProfile(null); setError(''); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}><FiX size={13} /> Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}><FiSave size={13} /> {saving ? 'Saving…' : 'Save'}</button>
                </div>
            }
          </div>

          {editProfile?.id === self.id ? (
            <div style={{ padding: '20px 22px' }}>
              {error && <div style={{ marginBottom: 14, padding: '10px 13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div>{field('First Name', 'firstName')}</div>
                <div>{field('Last Name', 'lastName')}</div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Gender</label>
                  <select value={editProfile.gender ?? ''} onChange={(e) => setEditProfile((p: any) => ({ ...p, gender: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#fff', marginBottom: 12 }}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>{field('Date of Birth', 'dateOfBirth', 'date')}</div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Blood Group</label>
                  <select value={editProfile.bloodGroup ?? ''} onChange={(e) => setEditProfile((p: any) => ({ ...p, bloodGroup: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#fff', marginBottom: 12 }}>
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>{field('Weight (kg)', 'weightKg', 'number')}</div>
                <div>{field('Height (cm)', 'heightCm', 'number')}</div>
                <div>{field('City', 'city')}</div>
                <div>{field('State', 'state')}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Medical Notes</label>
                <textarea value={editProfile.medicalNotes ?? ''} onChange={(e) => setEditProfile((p: any) => ({ ...p, medicalNotes: e.target.value }))} rows={3} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10, padding: '16px 22px' }}>
              {[
                { l: 'Blood Group', v: self.bloodGroup || '—' },
                { l: 'Gender', v: self.gender ? self.gender.charAt(0).toUpperCase() + self.gender.slice(1) : '—' },
                { l: 'Date of Birth', v: self.dateOfBirth?.slice(0,10) || '—' },
                { l: 'Height', v: self.heightCm ? `${self.heightCm} cm` : '—' },
                { l: 'Weight', v: self.weightKg ? `${self.weightKg} kg` : '—' },
                { l: 'City', v: self.city || '—' },
                { l: 'State', v: self.state || '—' },
                { l: 'Phone', v: self.phone || '—' },
              ].map(({ l, v }) => (
                <div key={l} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Family Members */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(15,23,42,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
            <FiUsers size={16} /> Family Members
          </div>
          <button onClick={() => { setShowAddFamily((v) => !v); setFamilyError(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: showAddFamily ? '#f1f5f9' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: showAddFamily ? '#475569' : '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {showAddFamily ? <><FiX size={13} /> Cancel</> : <><FiPlus size={13} /> Add Member</>}
          </button>
        </div>

        {showAddFamily && (
          <div style={{ padding: '18px 22px', background: '#fafbff', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              {[['First Name *', 'firstName'], ['Last Name *', 'lastName']].map(([l,k]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>{l}</label>
                  <input value={familyForm[k as keyof typeof familyForm]} onChange={(e) => setFamilyForm((f) => ({ ...f, [k]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              ))}
              {[
                { l: 'Gender *', k: 'gender', opts: [{ v: 'male', l: 'Male' },{ v: 'female', l: 'Female' },{ v: 'other', l: 'Other' }] },
                { l: 'Relation *', k: 'relation', opts: RELATIONS.map((r) => ({ v: r, l: RELATION_LABEL[r] ?? r })) },
                { l: 'Blood Group', k: 'bloodGroup', opts: BLOOD_GROUPS.map((b) => ({ v: b, l: b })) },
              ].map(({ l, k, opts }) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>{l}</label>
                  <select value={familyForm[k as keyof typeof familyForm]} onChange={(e) => setFamilyForm((f) => ({ ...f, [k]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#fff' }}>
                    <option value="">Select</option>
                    {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Date of Birth *</label>
                <input type="date" value={familyForm.dateOfBirth} onChange={(e) => setFamilyForm((f) => ({ ...f, dateOfBirth: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Phone *</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={familyForm.countryCode} onChange={(e) => setFamilyForm((f) => ({ ...f, countryCode: e.target.value }))} style={{ width: 78, padding: '9px 6px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff' }}>
                  {countryCodes.map((c: any) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
                <input type="tel" value={familyForm.phone} onChange={(e) => setFamilyForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone number" style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit' }} />
              </div>
            </div>
            {familyError && <div style={{ marginBottom: 12, padding: '10px 13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>{familyError}</div>}
            <button onClick={handleAddFamily} disabled={familySaving} style={{ padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: familySaving ? 0.7 : 1 }}>
              {familySaving ? 'Adding…' : 'Add Family Member'}
            </button>
          </div>
        )}

        {family.length === 0 && !showAddFamily ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            <FiUsers size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 13 }}>No family members added yet.</p>
          </div>
        ) : (
          family.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#4f46e5' }}>
                {m.firstName?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{m.firstName} {m.lastName}</div>
                <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>{RELATION_LABEL[m.relation] ?? m.relation} · {m.gender}</div>
              </div>
              <button onClick={() => { localStorage.setItem('patientId', m.id); router.push('/DoctorsAppointment'); }} style={{ padding: '7px 14px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Book
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
