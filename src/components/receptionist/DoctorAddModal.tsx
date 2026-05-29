'use client';
import React, { useState } from 'react';
import '@/styles/receptionist/doctor-add-modal.css';

const specialities = [
  'Orthopedic Surgeon', 'Dermatologist', 'Cardiologist', 'Neurologist',
  'General Physician', 'Pediatrician', 'Gynecologist', 'ENT Specialist',
  'Psychiatrist', 'Oncologist', 'Ophthalmologist', 'Urologist',
];

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;

const DoctorAddModal = ({ isOpen, onClose, onAdd }: any) => {
  const [formData, setFormData] = useState({
    name: '', speciality: '', qualification: '', experience: '',
    createLogin: false, phone: '', password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData((prev) => ({ ...prev, [target.name]: value }));
  };

  const handleAdd = async () => {
    setError('');
    if (!formData.name) { setError('Doctor name is required.'); return; }
    if (!formData.speciality) { setError('Please select a speciality.'); return; }
    if (!formData.experience) { setError('Experience (years) is required.'); return; }
    if (formData.createLogin && (!formData.phone || !formData.password)) {
      setError('Phone and password are required to enable login.'); return;
    }

    setSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullname: formData.name,
          specialization: formData.speciality,
          qualification: formData.qualification || 'MBBS',
          experienceYears: Number(formData.experience),
          createLogin: formData.createLogin,
          ...(formData.createLogin ? { phone: formData.phone, password: formData.password } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add doctor.');
        return;
      }

      onAdd?.(data);
      onClose();
      // Reset form
      setFormData({ name: '', speciality: '', qualification: '', experience: '', createLogin: false, phone: '', password: '' });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3>Add New Doctor</h3>
          <span className="close-icon" onClick={onClose}>×</span>
        </div>
        <div className="modal-body">
          <div className="modal-row">
            <div><strong>Doctor Name *</strong><input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full name" /></div>
          </div>
          <div className="modal-row">
            <div>
              <strong>Speciality *</strong>
              <select name="speciality" value={formData.speciality} onChange={handleChange}>
                <option value="">Select speciality</option>
                {specialities.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><strong>Qualification</strong><input type="text" name="qualification" value={formData.qualification} onChange={handleChange} placeholder="e.g. MBBS, MD" /></div>
          </div>
          <div className="modal-row">
            <div><strong>Experience (years) *</strong><input type="number" name="experience" value={formData.experience} onChange={handleChange} placeholder="e.g. 10" min="0" /></div>
          </div>

          <hr style={{ margin: '12px 0' }} />
          <div className="modal-row" style={{ alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="createLogin"
                name="createLogin"
                checked={formData.createLogin}
                onChange={handleChange}
                style={{ width: 'auto', marginTop: 0 }}
              />
              <label htmlFor="createLogin" style={{ margin: 0, fontWeight: 600 }}>Enable doctor login access</label>
            </div>
          </div>

          {formData.createLogin && (
            <div className="modal-row">
              <div><strong>Phone (login) *</strong><input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone number" /></div>
              <div><strong>Password *</strong><input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Set password" /></div>
            </div>
          )}

          {error && (
            <div style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginTop: '8px', fontSize: '13px' }}>
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="gray-btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="green-btn" onClick={handleAdd} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Doctor'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorAddModal;
