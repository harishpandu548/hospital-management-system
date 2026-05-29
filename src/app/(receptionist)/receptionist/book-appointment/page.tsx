'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePatients } from '@/context/receptionist/PatientsContext';
import { useAppointments } from '@/context/receptionist/AppointmentsContext';
import '@/styles/receptionist/doctor-add-modal.css';

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;

const BookAppointmentPage = () => {
  const router = useRouter();
  const { refetch: refetchPatients } = usePatients();
  const { refetch: refetchAppointments } = useAppointments();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', gender: '', dob: '',
    bloodGroup: '', weight: '', height: '', maritalStatus: '',
    contact: '', contactWhatsapp: '', email: '',
    address: '', city: '', state: '',
    condition: '', medicalCondition: '', describeCondition: '',
    doctorId: '', appointmentDate: '', appointmentTime: '',
    payment_status: 'Pending',
  });

  // Fetch doctors list for dropdown
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/doctors', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

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
    if (!formData.doctorId) { setError('Please select a doctor.'); return; }
    if (!formData.appointmentDate) { setError('Appointment date is required.'); return; }

    setSubmitting(true);
    const token = getToken();

    try {
      // Step 1 — create patient
      const medicalNotes = formData.medicalCondition
        ? `${formData.medicalCondition}: ${formData.describeCondition}`
        : formData.condition || undefined;

      const patientRes = await fetch('/api/patients', {
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

      const patientData = await patientRes.json();
      if (!patientRes.ok) {
        setError(patientData.error || 'Failed to create patient.');
        return;
      }

      const patientId: string = patientData.id;

      // Step 2 — build slot datetimes
      const dateStr = formData.appointmentDate;
      const timeStr = formData.appointmentTime || '09:00';
      const slotStart = new Date(`${dateStr}T${timeStr}:00`);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

      // Step 3 — create appointment
      const apptRes = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          patientId,
          doctorId: formData.doctorId,
          appointmentDate: slotStart.toISOString(),
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
        }),
      });

      const apptData = await apptRes.json();
      if (!apptRes.ok) {
        setError(apptData.error || 'Failed to create appointment.');
        return;
      }

      // Refresh contexts
      await refetchPatients?.();
      await refetchAppointments?.();

      router.push('/receptionist/appointments');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="modal-box" style={{ position: 'static', transform: 'none', width: '100%' }}>
        <div className="modal-header"><h3>Book Appointment</h3></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <h4>Patient Details</h4>
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
              <div>
                <strong>Marital Status</strong>
                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
            <hr />
            <h4>Contact</h4>
            <div className="modal-row">
              <div><strong>Phone <span style={{ color: '#ef4444' }}>*</span></strong><input type="tel" name="contact" value={formData.contact} onChange={handleChange} placeholder="+91 9876543210" required /></div>
              <div><strong>Email</strong><input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" /></div>
            </div>
            <div className="modal-row">
              <div><strong>Address</strong><input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Full address" /></div>
              <div><strong>City</strong><input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" /></div>
              <div><strong>State</strong><input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="State" /></div>
            </div>
            <hr />
            <h4>Medical</h4>
            <div className="modal-row">
              <div><strong>Condition</strong><input type="text" name="condition" value={formData.condition} onChange={handleChange} placeholder="e.g. Flu" /></div>
              <div><strong>Medical Condition</strong><input type="text" name="medicalCondition" value={formData.medicalCondition} onChange={handleChange} placeholder="Detailed diagnosis" /></div>
            </div>
            <div className="modal-row">
              <div><strong>Description</strong><textarea name="describeCondition" value={formData.describeCondition} onChange={handleChange} placeholder="Describe symptoms…" rows={2} style={{ width: '100%' }} /></div>
            </div>
            <hr />
            <h4>Appointment Details</h4>
            <div className="modal-row">
              <div>
                <strong>Doctor <span style={{ color: '#ef4444' }}>*</span></strong>
                <select name="doctorId" value={formData.doctorId} onChange={handleChange} required>
                  <option value="">Select doctor…</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullname} — {d.specialization}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-row">
              <div><strong>Date <span style={{ color: '#ef4444' }}>*</span></strong><input type="date" name="appointmentDate" value={formData.appointmentDate} onChange={handleChange} min={new Date().toISOString().split('T')[0]} required /></div>
              <div><strong>Time</strong><input type="time" name="appointmentTime" value={formData.appointmentTime} onChange={handleChange} /></div>
            </div>
            <div className="modal-row">
              <div>
                <strong>Payment Status</strong>
                <select name="payment_status" value={formData.payment_status} onChange={handleChange}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
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
              {submitting ? 'Booking…' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookAppointmentPage;
