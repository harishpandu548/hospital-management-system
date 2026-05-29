'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHeart, FiUsers, FiCheck, FiAlertCircle, FiUpload,
  FiFile, FiImage, FiFileText, FiTrash2, FiEdit2,
  FiPlus, FiArrowRight, FiExternalLink, FiUser,
} from 'react-icons/fi';
import { BLOOD_GROUPS } from '@/data/patient/constants';
import countryCodes from '@/data/patient/countryCodes';
import '@/styles/patient/intake.css';

const RELATIONS = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'];
const RELATION_LABEL: Record<string, string> = {
  SELF: 'Me', SPOUSE: 'Spouse', CHILD: 'Child', PARENT: 'Parent', SIBLING: 'Sibling', OTHER: 'Other',
};

function fileIcon(type = '') {
  if (type.startsWith('image/')) return <FiImage size={17} />;
  if (type.includes('pdf')) return <FiFileText size={17} />;
  return <FiFile size={17} />;
}

function cleanPhone(raw: string | undefined): string {
  if (!raw) return '—';
  // Detect and deduplicate doubled phone: "+919177454512+919177454512"
  const half = Math.floor(raw.length / 2);
  if (raw.length > 6 && raw.slice(0, half) === raw.slice(half)) return raw.slice(0, half);
  return raw;
}

type Step = 'review' | 'update' | 'family';
type MedFile = { url: string; name: string; type: string; uploadedAt: string };

export default function PatientIntakePage() {
  const router = useRouter();
  const [step, setStep]           = useState<Step>('review');
  const [profile, setProfile]     = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [dragging, setDragging]   = useState(false);
  const fileRef                   = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Update form state
  const [notes, setNotes]         = useState('');
  const [newFiles, setNewFiles]   = useState<MedFile[]>([]);
  const [removedUrls, setRemovedUrls] = useState<string[]>([]);

  // Family member modal
  const [familyModal, setFamilyModal] = useState<{ open: boolean; member: any | null }>({ open: false, member: null });
  const [familyForm, setFamilyForm]   = useState({ firstName: '', lastName: '', gender: '', dateOfBirth: '', relation: 'SIBLING', bloodGroup: '', countryCode: '+91', phone: '', email: '', medicalNotes: '' });
  const [familySaving, setFamilySaving] = useState(false);
  const [familyError, setFamilyError]   = useState('');
  const [familyFiles, setFamilyFiles]   = useState<MedFile[]>([]);
  const [familyUploading, setFamilyUploading] = useState(false);
  const familyFileRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('hms_token') ?? '' : '';
  const auth  = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    if (!token || localStorage.getItem('hms_role') !== 'PATIENT') { router.replace('/login'); return; }
    const res = await fetch('/api/patients/family', { headers: auth });
    if (!res.ok) { router.replace('/home'); return; }
    const data: any[] = await res.json();
    if (!data.length) { router.replace('/home'); return; } // no profile yet
    const self = data.find(p => p.relation === 'SELF') ?? data[0];
    setProfile(self);
    setNotes(self.medicalNotes || '');
    setFamilyMembers(data.filter(p => p.id !== self.id));
    localStorage.setItem('patientId', self.id);
    localStorage.setItem('userName', self.firstName);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // ── File helpers ───────────────────────────────────────────
  const uploadFile = async (file: File, forFamily = false) => {
    if (file.size > 10 * 1024 * 1024) { setError('Max file size is 10 MB'); return; }
    if (forFamily) setFamilyUploading(true); else setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', headers: auth, body: fd });
      if (!res.ok) { setError('Upload failed'); return; }
      const { url, fileName, fileType } = await res.json();
      const mf: MedFile = { url, name: fileName, type: fileType, uploadedAt: new Date().toISOString() };
      if (forFamily) setFamilyFiles(p => [...p, mf]); else setNewFiles(p => [...p, mf]);
    } catch { setError('Upload failed'); }
    finally { if (forFamily) setFamilyUploading(false); else setUploading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, forFamily = false) => {
    const f = e.target.files?.[0]; if (f) uploadFile(f, forFamily); e.target.value = '';
  };

  const onDrop = (e: React.DragEvent, forFamily = false) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f, forFamily);
  };

  const existingFiles: MedFile[] = Array.isArray(profile?.medicalFiles) ? profile.medicalFiles : [];
  const visibleExisting = existingFiles.filter(f => !removedUrls.includes(f.url));
  const allFiles = [...visibleExisting, ...newFiles];

  // ── Save medical update ────────────────────────────────────
  const saveMedical = async () => {
    setSaving(true); setError('');
    try {
      const medicalFiles = allFiles;
      const res = await fetch(`/api/patients/${profile.id}`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalNotes: notes, medicalFiles }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed'); return; }
      setProfile(data);
      setNotes(data.medicalNotes || '');
      setNewFiles([]);
      setRemovedUrls([]);
      setStep('family');
    } catch { setError('Network error'); } finally { setSaving(false); }
  };

  // ── Family member helpers ──────────────────────────────────
  const openAddFamily = () => {
    setFamilyForm({ firstName: '', lastName: '', gender: '', dateOfBirth: '', relation: 'SIBLING', bloodGroup: '', countryCode: '+91', phone: '', email: '', medicalNotes: '' });
    setFamilyFiles([]);
    setFamilyError('');
    setFamilyModal({ open: true, member: null });
  };

  const openEditFamily = (m: any) => {
    setFamilyForm({
      firstName: m.firstName || '', lastName: m.lastName || '',
      gender: m.gender || '', dateOfBirth: m.dateOfBirth?.slice(0, 10) || '',
      relation: m.relation || 'SIBLING', bloodGroup: m.bloodGroup || '',
      countryCode: '+91', phone: m.phone || '', email: m.email || '',
      medicalNotes: m.medicalNotes || '',
    });
    setFamilyFiles(Array.isArray(m.medicalFiles) ? m.medicalFiles : []);
    setFamilyError('');
    setFamilyModal({ open: true, member: m });
  };

  const saveFamily = async () => {
    if (!familyForm.firstName || !familyForm.lastName || !familyForm.gender || !familyForm.dateOfBirth || !familyForm.phone) {
      setFamilyError('Please fill First Name, Last Name, Gender, Date of Birth and Phone'); return;
    }
    setFamilySaving(true); setFamilyError('');
    const payload = {
      firstName: familyForm.firstName, lastName: familyForm.lastName,
      gender: familyForm.gender, dateOfBirth: familyForm.dateOfBirth,
      relation: familyForm.relation,
      phone: familyForm.phone.startsWith('+') ? familyForm.phone : `${familyForm.countryCode}${familyForm.phone}`,
      email: familyForm.email || undefined,
      bloodGroup: familyForm.bloodGroup || undefined,
      medicalNotes: familyForm.medicalNotes || undefined,
      medicalFiles: familyFiles.length ? familyFiles : undefined,
    };
    try {
      let res: Response;
      if (familyModal.member) {
        res = await fetch(`/api/patients/${familyModal.member.id}`, {
          method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/patients/family', {
          method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) { setFamilyError(data.error || 'Save failed'); return; }
      if (familyModal.member) {
        setFamilyMembers(p => p.map(m => m.id === data.id ? data : m));
      } else {
        setFamilyMembers(p => [...p, data]);
      }
      setFamilyModal({ open: false, member: null });
    } catch { setFamilyError('Network error'); } finally { setFamilySaving(false); }
  };

  // ── Render loading ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="intake-shell">
        <div className="intake-inner">
          <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          <div className="shimmer" style={{ height: 36, width: 320, borderRadius: 8, marginBottom: 32, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          <div className="intake-card" style={{ height: 280, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const steps: { key: Step; label: string }[] = [
    { key: 'review', label: 'Review' },
    { key: 'update', label: 'Update' },
    { key: 'family', label: 'Family' },
  ];

  const phone = cleanPhone(profile.phone);

  return (
    <div className="intake-shell">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="intake-inner">

        {/* ── Progress steps ── */}
        <div className="intake-progress">
          {steps.map((s, i) => {
            const idx = steps.findIndex(x => x.key === step);
            const status = i < idx ? 'done' : i === idx ? 'active' : 'upcoming';
            return (
              <React.Fragment key={s.key}>
                {i > 0 && <div className={`intake-step-connector ${i <= idx ? 'done' : ''}`} />}
                <div className="intake-step">
                  <div className={`intake-step-circle ${status}`}>
                    {status === 'done' ? <FiCheck size={14} /> : i + 1}
                  </div>
                  <span className="intake-step-label" style={{ color: status === 'active' ? '#6366f1' : undefined }}>{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* STEP 1 — REVIEW                                    */}
        {/* ═══════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }}>

              {/* Hero greeting */}
              <div style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1,#818cf8)', borderRadius: 22, padding: '26px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden', boxShadow: '0 10px 32px rgba(79,70,229,0.25)' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                    {profile.firstName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>Welcome back, {profile.firstName}!</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Review your medical profile before continuing</p>
                  </div>
                </div>
              </div>

              {/* Profile overview */}
              <div className="intake-card">
                <div className="intake-card-head">
                  <span className="intake-card-title"><FiUser size={13} /> Personal Details</span>
                </div>
                <div className="intake-grid">
                  {[
                    { l: 'Full Name', v: `${profile.firstName} ${profile.lastName}` },
                    { l: 'Gender', v: profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : '—' },
                    { l: 'Date of Birth', v: profile.dateOfBirth?.slice(0, 10) || '—' },
                    { l: 'Blood Group', v: profile.bloodGroup || '—' },
                    { l: 'Phone', v: phone },
                    { l: 'Height', v: profile.heightCm ? `${profile.heightCm} cm` : '—' },
                    { l: 'Weight', v: profile.weightKg ? `${profile.weightKg} kg` : '—' },
                    { l: 'City / State', v: [profile.city, profile.state].filter(Boolean).join(', ') || '—' },
                  ].map(({ l, v }) => (
                    <div key={l} className="intake-field">
                      <div className="intake-field-label">{l}</div>
                      <div className="intake-field-value">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current medical info */}
              <div className="intake-card">
                <div className="intake-card-head">
                  <span className="intake-card-title"><FiHeart size={13} /> Current Medical Information</span>
                </div>
                <div style={{ padding: '16px 22px' }}>
                  {profile.medicalNotes ? (
                    <div style={{ padding: '14px 18px', background: '#f0fdf4', borderRadius: 14, border: '1px solid #86efac', fontSize: 14, color: '#166534', lineHeight: 1.6, marginBottom: existingFiles.length ? 14 : 0 }}>
                      <span style={{ fontWeight: 700 }}>Current Condition: </span>{profile.medicalNotes}
                    </div>
                  ) : (
                    <div style={{ padding: '14px 18px', background: '#fffbeb', borderRadius: 14, border: '1px solid #fde047', fontSize: 13, color: '#854d0e' }}>
                      No medical notes on file. Please update your condition.
                    </div>
                  )}
                  {existingFiles.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Uploaded Reports / Files</div>
                      <div className="intake-file-list">
                        {existingFiles.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noreferrer" className="intake-file-item existing" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                            <div className="intake-file-icon">{fileIcon(f.type)}</div>
                            <span className="intake-file-name">{f.name}</span>
                            <FiExternalLink size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Do you want to update? */}
              <div className="intake-card" style={{ borderColor: '#c7d2fe' }}>
                <div style={{ padding: '22px 22px 20px' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                    Do you want to update your medical information?
                  </div>
                  <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                    Update your current symptoms, condition, or upload new reports/test results before your consultation or appointment.
                  </p>
                  <div className="intake-prompt-row">
                    <button className="intake-btn secondary" onClick={() => setStep('family')}>
                      No, Continue →
                    </button>
                    <button className="intake-btn primary" onClick={() => setStep('update')}>
                      <FiEdit2 size={15} /> Yes, Update
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* STEP 2 — UPDATE MEDICAL INFO                       */}
          {/* ═══════════════════════════════════════════════════ */}
          {step === 'update' && (
            <motion.div key="update" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }}>
              <div className="intake-card">
                <div className="intake-card-head">
                  <span className="intake-card-title"><FiHeart size={13} /> Update Medical Information</span>
                  <button onClick={() => setStep('review')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>← Back</button>
                </div>
                <div style={{ padding: '20px 22px' }}>

                  <div className="intake-form-field">
                    <label className="intake-label">Current Symptoms / Condition *</label>
                    <textarea
                      className="intake-textarea"
                      rows={5}
                      placeholder="Describe your current symptoms, medical condition, allergies, ongoing medications…"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Be specific — this information will be shared with your doctor before the consultation.</div>
                  </div>

                  {/* Existing files */}
                  {visibleExisting.length > 0 && (
                    <div className="intake-form-field">
                      <label className="intake-label">Previous Reports (tap × to remove)</label>
                      <div className="intake-file-list">
                        {visibleExisting.map((f, i) => (
                          <div key={i} className="intake-file-item existing">
                            <div className="intake-file-icon">{fileIcon(f.type)}</div>
                            <a href={f.url} target="_blank" rel="noreferrer" className="intake-file-name" style={{ textDecoration: 'none' }}>{f.name}</a>
                            <button className="intake-file-remove" onClick={() => setRemovedUrls(p => [...p, f.url])} title="Remove"><FiTrash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New file upload */}
                  <div className="intake-form-field">
                    <label className="intake-label">Upload Reports / Images</label>
                    <div
                      className={`intake-upload-zone ${dragging ? 'dragging' : ''}`}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={e => onDrop(e, false)}
                    >
                      <div className="intake-upload-icon">
                        {uploading ? '⏳' : <FiUpload size={22} />}
                      </div>
                      <span className="intake-upload-text">{uploading ? 'Uploading…' : 'Click or drag & drop'}</span>
                      <span className="intake-upload-hint">Images, PDF, Word — up to 10 MB each</span>
                    </div>
                    <input ref={fileRef} type="file" style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" onChange={e => handleFileChange(e, false)} />

                    {newFiles.length > 0 && (
                      <div className="intake-file-list" style={{ marginTop: 10 }}>
                        {newFiles.map((f, i) => (
                          <div key={i} className="intake-file-item">
                            <div className="intake-file-icon">{fileIcon(f.type)}</div>
                            <span className="intake-file-name">{f.name}</span>
                            <button className="intake-file-remove" onClick={() => setNewFiles(p => p.filter((_, j) => j !== i))}><FiTrash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                      <FiAlertCircle size={14} />{error}
                    </div>
                  )}

                  <div className="intake-actions">
                    <button className="intake-btn secondary" onClick={() => { setStep('family'); }}>
                      Skip for Now
                    </button>
                    <button className="intake-btn primary" onClick={saveMedical} disabled={saving || !notes.trim()}>
                      {saving ? 'Saving…' : <><FiCheck size={15} /> Save & Continue</>}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* STEP 3 — FAMILY MEMBERS                            */}
          {/* ═══════════════════════════════════════════════════ */}
          {step === 'family' && (
            <motion.div key="family" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }}>
              <div className="intake-card">
                <div className="intake-card-head">
                  <span className="intake-card-title"><FiUsers size={13} /> Family Members</span>
                  <button onClick={() => setStep('update')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>← Back</button>
                </div>

                <div style={{ padding: '14px 22px 6px' }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                    Add family members so you can book appointments on their behalf. Each member's medical info and reports will be shared with their assigned doctor.
                  </p>
                </div>

                <div className="family-cards-grid">
                  {/* Self card */}
                  <div className="family-member-card" style={{ borderColor: '#c7d2fe', background: '#f0f0ff' }} onClick={() => router.push('/home')}>
                    <div className="family-avatar-sm" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff' }}>
                      {profile.firstName?.charAt(0)}
                    </div>
                    <div className="family-card-name">{profile.firstName} {profile.lastName}</div>
                    <div className="family-card-rel">Self (You)</div>
                    <div className="family-card-cond">{profile.medicalNotes ? profile.medicalNotes.slice(0, 50) + (profile.medicalNotes.length > 50 ? '…' : '') : 'No condition on file'}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}><FiCheck size={12} /> Primary Profile</span>
                  </div>

                  {/* Family members */}
                  {familyMembers.map(m => (
                    <div key={m.id} className="family-member-card" onClick={() => openEditFamily(m)}>
                      <div className="family-avatar-sm">{m.firstName?.charAt(0)}</div>
                      <div className="family-card-name">{m.firstName} {m.lastName}</div>
                      <div className="family-card-rel">{RELATION_LABEL[m.relation] ?? m.relation}</div>
                      <div className="family-card-cond">
                        {m.medicalNotes ? m.medicalNotes.slice(0, 60) + (m.medicalNotes.length > 60 ? '…' : '') : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No condition on file</span>}
                      </div>
                      {Array.isArray(m.medicalFiles) && m.medicalFiles.length > 0 && (
                        <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FiFile size={11} /> {m.medicalFiles.length} report{m.medicalFiles.length !== 1 ? 's' : ''}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><FiEdit2 size={11} /> Tap to edit</div>
                    </div>
                  ))}

                  {/* Add button */}
                  <div className="add-family-card" onClick={openAddFamily}>
                    <FiPlus size={24} />
                    <span>Add Family Member</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>Mother, Father, Sibling…</span>
                  </div>
                </div>
              </div>

              <div className="intake-actions">
                <button
                  className="intake-btn primary"
                  style={{ flex: 1 }}
                  onClick={() => router.push('/home')}
                >
                  Continue to Dashboard <FiArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── FAMILY MEMBER MODAL ───────────────────────────── */}
      <AnimatePresence>
        {familyModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) setFamilyModal({ open: false, member: null }); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(15,23,42,0.22)', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  {familyModal.member ? `Edit — ${familyModal.member.firstName}` : 'Add Family Member'}
                </h3>
                <button onClick={() => setFamilyModal({ open: false, member: null })} style={{ width: 32, height: 32, borderRadius: 10, background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>×</button>
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

                {/* Personal info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  {[['First Name *', 'firstName'], ['Last Name *', 'lastName']].map(([l, k]) => (
                    <div key={k} style={{ marginBottom: 12 }}>
                      <label className="intake-label">{l}</label>
                      <input value={familyForm[k as keyof typeof familyForm]} onChange={e => setFamilyForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  {[
                    { l: 'Gender *', k: 'gender', opts: [{ v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }, { v: 'other', l: 'Other' }] },
                    { l: 'Relation *', k: 'relation', opts: RELATIONS.map(r => ({ v: r, l: RELATION_LABEL[r] ?? r })) },
                    { l: 'Blood Group', k: 'bloodGroup', opts: BLOOD_GROUPS.map(b => ({ v: b, l: b })) },
                  ].map(({ l, k, opts }) => (
                    <div key={k} style={{ marginBottom: 12 }}>
                      <label className="intake-label">{l}</label>
                      <select value={familyForm[k as keyof typeof familyForm]} onChange={e => setFamilyForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#fff', outline: 'none' }}>
                        <option value="">Select</option>
                        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  ))}
                  <div style={{ marginBottom: 12 }}>
                    <label className="intake-label">Date of Birth *</label>
                    <input type="date" value={familyForm.dateOfBirth} onChange={e => setFamilyForm(f => ({ ...f, dateOfBirth: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="intake-label">Phone *</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select value={familyForm.countryCode} onChange={e => setFamilyForm(f => ({ ...f, countryCode: e.target.value }))} style={{ width: 78, padding: '9px 6px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff', outline: 'none' }}>
                      {countryCodes.map((c: any) => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                    <input type="tel" value={familyForm.phone} onChange={e => setFamilyForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                </div>

                {/* Medical info */}
                <div style={{ marginBottom: 12 }}>
                  <label className="intake-label">Medical Condition / Symptoms</label>
                  <textarea
                    value={familyForm.medicalNotes}
                    onChange={e => setFamilyForm(f => ({ ...f, medicalNotes: e.target.value }))}
                    placeholder={`Describe ${familyForm.firstName || 'their'}'s current symptoms, conditions, medications…`}
                    rows={4}
                    className="intake-textarea"
                  />
                </div>

                {/* File upload for family member */}
                <div style={{ marginBottom: 12 }}>
                  <label className="intake-label">Upload Reports / Images</label>
                  <div
                    className="intake-upload-zone"
                    onClick={() => familyFileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => onDrop(e, true)}
                    style={{ padding: '16px', gap: 6 }}
                  >
                    <div className="intake-upload-icon" style={{ width: 36, height: 36 }}>
                      {familyUploading ? '⏳' : <FiUpload size={16} />}
                    </div>
                    <span className="intake-upload-text" style={{ fontSize: 13 }}>Click or drag file</span>
                    <span className="intake-upload-hint">Images, PDF, Word</span>
                  </div>
                  <input ref={familyFileRef} type="file" style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" onChange={e => handleFileChange(e, true)} />

                  {familyFiles.length > 0 && (
                    <div className="intake-file-list" style={{ marginTop: 8 }}>
                      {familyFiles.map((f, i) => (
                        <div key={i} className="intake-file-item">
                          <div className="intake-file-icon">{fileIcon(f.type)}</div>
                          <a href={f.url} target="_blank" rel="noreferrer" className="intake-file-name" style={{ textDecoration: 'none' }}>{f.name}</a>
                          <button className="intake-file-remove" onClick={() => setFamilyFiles(p => p.filter((_, j) => j !== i))}><FiTrash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {familyError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 12 }}>
                    <FiAlertCircle size={14} />{familyError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 22px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, flexShrink: 0 }}>
                <button onClick={() => setFamilyModal({ open: false, member: null })} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#f1f5f9', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#475569' }}>Cancel</button>
                <button onClick={saveFamily} disabled={familySaving} style={{ flex: 2, padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#fff', opacity: familySaving ? 0.7 : 1 }}>
                  {familySaving ? 'Saving…' : familyModal.member ? 'Save Changes' : 'Add Family Member'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
