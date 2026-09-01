'use client';
import React, { useState, useEffect } from 'react';
import '@/styles/receptionist/appointment-modal.css';

const AppointmentModal = ({ isOpen, onClose, appointment, onUpdate, onDelete, onSendNotification }: any) => {
  const [editable, setEditable] = useState(appointment);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => { setEditable(appointment); setSaveError(''); setSaveSuccess(false); }, [appointment]);

  if (!isOpen || !appointment) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditable((prev: any) => ({ ...prev, [name]: value }));
    setSaveError('');
    setSaveSuccess(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('receptionist_token') : null;
    const apptId = appointment._raw?.id || appointment.id;

    try {
      // Persist payment status if it changed
      const currentPayment = (appointment.payment_status || '').toUpperCase();
      const newPayment = (editable.payment_status || '').toUpperCase();
      if (currentPayment !== newPayment && apptId) {
        const res = await fetch(`/api/appointments/${apptId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ paymentStatus: newPayment }),
        });
        if (!res.ok) {
          const d = await res.json();
          setSaveError(d.error || 'Failed to update payment status.');
          setSaving(false);
          return;
        }
      }

      setSaveSuccess(true);
      onUpdate(editable);
      setTimeout(() => { setSaveSuccess(false); onClose(); }, 700);
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3>Appointment Details</h3>
          <span className="close-icon" onClick={onClose}>×</span>
        </div>
        <div className="modal-body">
          <div className="modal-row">
            <div><strong>Patient Name</strong><input type="text" name="name" value={editable?.name || ''} onChange={handleChange} /></div>
            <div><strong>Age</strong><input type="number" name="age" value={editable?.age || ''} onChange={handleChange} /></div>
          </div>
          <div className="modal-row">
            <div><strong>Doctor Name</strong><input type="text" name="doctor" value={editable?.doctor || ''} onChange={handleChange} /></div>
            <div><strong>Condition</strong><input type="text" name="condition" value={editable?.condition || ''} onChange={handleChange} /></div>
          </div>
          <div className="modal-row">
            <div><strong>Status</strong>
              <select name="status" value={editable?.status || ''} onChange={handleChange}>
                <option value="Scheduled">Scheduled</option>
                <option value="Checked In">Checked In</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div><strong>Payment Status</strong>
              <select name="payment_status" value={editable?.payment_status || ''} onChange={handleChange}>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Waived">Waived</option>
              </select>
            </div>
          </div>
          {saveError && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#16a34a' }}>
              Saved successfully!
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="green-btn" onClick={() => onSendNotification(editable)}>Send Notification</button>
          <button className="blue-btn" onClick={handleUpdate} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button className="gray-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
