'use client';
import React, { useState, useEffect } from 'react';
import { usePatients } from '@/context/receptionist/PatientsContext';
import '@/styles/receptionist/doctor-view-modal.css';

const PatientModal = ({ patient, onClose }: any) => {
  const { setPatientsData } = usePatients();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (patient) { setFormData({ ...patient }); setIsEditing(false); }
  }, [patient]);

  if (!patient) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setPatientsData((prev: any[]) => prev.map((p: any) => (p.id === patient.id ? { ...p, ...formData } : p)));
    setIsEditing(false);
  };

  const Field = ({ label, name, type = 'text' }: { label: string; name: string; type?: string }) => (
    <div>
      <strong>{label}</strong>
      {isEditing ? <input type={type} name={name} value={formData[name] || ''} onChange={handleChange} /> : <p>{patient[name] || 'N/A'}</p>}
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3>Patient Details</h3>
          <span className="close-icon" onClick={onClose}>×</span>
        </div>
        <div className="modal-body">
          <h4>Personal Information</h4>
          <div className="modal-row">
            <Field label="Patient Name" name="name" />
            <div><strong>Patient ID</strong><p>{patient.patientId || patient.id}</p></div>
          </div>
          <div className="modal-row">
            <Field label="Age" name="age" type="number" />
            <Field label="Date of Birth" name="dob" type="date" />
          </div>
          <div className="modal-row">
            <Field label="Blood Group" name="bloodGroup" />
            <Field label="Marital Status" name="maritalStatus" />
          </div>
          <hr />
          <h4>Contact Information</h4>
          <div className="modal-row">
            <Field label="Phone Number" name="contact" />
            <Field label="WhatsApp" name="contactWhatsapp" />
          </div>
          <div className="modal-row">
            <Field label="Email" name="email" type="email" />
          </div>
          <div className="modal-row">
            <Field label="Address" name="address" />
          </div>
          <div className="modal-row">
            <Field label="City" name="city" />
            <Field label="State" name="state" />
          </div>
          <hr />
          <h4>Medical Information</h4>
          <div className="modal-row">
            <Field label="Assigned Doctor" name="doctor" />
            <Field label="Condition" name="condition" />
          </div>
          <div className="modal-row">
            <div>
              <strong>Description</strong>
              {isEditing
                ? <textarea name="describeCondition" value={formData.describeCondition || ''} onChange={handleChange} rows={3} style={{ width: '100%' }} />
                : <p>{patient.describeCondition || 'N/A'}</p>}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="gray-btn" onClick={onClose}>Close</button>
          {isEditing
            ? <><button className="green-btn" onClick={handleSave}>Save</button><button className="gray-btn" onClick={() => setIsEditing(false)}>Cancel</button></>
            : <button className="blue-btn" onClick={() => setIsEditing(true)}>Edit Details</button>}
        </div>
      </div>
    </div>
  );
};

export default PatientModal;
