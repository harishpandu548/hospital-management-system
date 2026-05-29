'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatients } from '@/context/receptionist/PatientsContext';
import '@/styles/receptionist/doctor-add-modal.css';

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;

const AddPatientPage = () => {
  const router = useRouter();
  const { refetch } = usePatients();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', gender: '', age: '', dob: '',
    bloodGroup: '', weight: '', height: '', maritalStatus: '',
    contact: '', contactWhatsapp: '', email: '',
    address: '', city: '', state: '',
    doctor: '', condition: '', medicalCondition: '', describeCondition: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName) { setError('First name is required.'); return; }
    if (!formData.gender) { setError('Gender is required.'); return; }
    if (!formData.dob) { setError('Date of birth is required.'); return; }
    if (!formData.contact) { setError('Contact number is required.'); return; }

    setSubmitting(true);
    try {
      const token = getToken();
      const medicalNotes = formData.medicalCondition
        ? `${formData.medicalCondition}: ${formData.describeCondition}`
        : formData.condition || undefined;

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName || '-',
          gender: formData.gender,
          dateOfBirth: formData.dob,
          phone: formData.contact,
          email: formData.email || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          medicalNotes: medicalNotes || undefined,
          bloodGroup: formData.bloodGroup || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add patient.');
        return;
      }

      await refetch?.();
      router.push('/receptionist/patients');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="modal-box" style={{ position: 'static', transform: 'none', width: '100%' }}>
        <div className="modal-header"><h3>Add New Patient</h3></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <h4>Personal Information</h4>
            <div className="modal-row">
              <div><strong>First Name <span style={{ color: '#ef4444' }}>*</span></strong><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First name" required /></div>
              <div><strong>Last Name</strong><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last name" /></div>
            </div>
            <div className="modal-row">
              <div>
                <strong>Gender <span style={{ color: '#ef4444' }}>*</span></strong>
                <select name="gender" value={formData.gender} onChange={handleChange} required>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div><strong>Date of Birth <span style={{ color: '#ef4444' }}>*</span></strong><input type="date" name="dob" value={formData.dob} onChange={handleChange} required /></div>
            </div>
            <div className="modal-row">
              <div><strong>Blood Group</strong><input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} placeholder="e.g. O+" /></div>
              <div><strong>Weight</strong><input type="text" name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 70kg" /></div>
              <div><strong>Height</strong><input type="text" name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 175cm" /></div>
            </div>
            <div className="modal-row">
              <div>
                <strong>Marital Status</strong>
                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
            <hr />
            <h4>Contact Information</h4>
            <div className="modal-row">
              <div><strong>Phone <span style={{ color: '#ef4444' }}>*</span></strong><input type="tel" name="contact" value={formData.contact} onChange={handleChange} placeholder="+91 9876543210" required /></div>
              <div><strong>WhatsApp</strong><input type="tel" name="contactWhatsapp" value={formData.contactWhatsapp} onChange={handleChange} placeholder="+91 9876543210" /></div>
            </div>
            <div className="modal-row">
              <div><strong>Email</strong><input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" /></div>
            </div>
            <div className="modal-row">
              <div><strong>Address</strong><input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Full address" /></div>
            </div>
            <div className="modal-row">
              <div><strong>City</strong><input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" /></div>
              <div><strong>State</strong><input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="State" /></div>
            </div>
            <hr />
            <h4>Medical Information</h4>
            <div className="modal-row">
              <div><strong>Condition (Short)</strong><input type="text" name="condition" value={formData.condition} onChange={handleChange} placeholder="e.g. Flu" /></div>
              <div><strong>Medical Condition</strong><input type="text" name="medicalCondition" value={formData.medicalCondition} onChange={handleChange} placeholder="Detailed diagnosis" /></div>
            </div>
            <div className="modal-row">
              <div><strong>Description</strong><textarea name="describeCondition" value={formData.describeCondition} onChange={handleChange} placeholder="Describe symptoms…" rows={3} style={{ width: '100%' }} /></div>
            </div>

            {error && (
              <div style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginTop: '12px', fontSize: '14px' }}>
                {error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="gray-btn" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="green-btn" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatientPage;
