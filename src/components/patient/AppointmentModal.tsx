'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiCalendar, FiClock, FiAlertCircle } from 'react-icons/fi';
import ReviewBadge from './ReviewBadge';
import ExpQual from './ExpQual';
import AlertModal from './AlertModal';
import '@/styles/patient/appointment-modal.css';

interface Doctor {
  id: string | number;
  name: string;
  speciality: string;
  experience: string;
  qualification: string;
  rating: number;
  reviews: number;
}

interface Slot {
  startISO: string;
  start: string;
  end: string;
  status: 'available' | 'past' | 'full';
}

interface PatientProfile {
  id: string;
  firstName: string;
  lastName: string;
  relation: string;
}

const RELATION_LABEL: Record<string, string> = {
  SELF: 'Me', SPOUSE: 'Spouse', CHILD: 'Child', PARENT: 'Parent', SIBLING: 'Sibling', OTHER: 'Other',
};

const Sk = ({ w = '100%', h = 36 }: { w?: string; h?: number }) => (
  <div style={{ width: w, height: h, borderRadius: 10, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
);

export default function AppointmentModal({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
  const [selectedDate, setSelectedDate]     = useState('');
  const [selectedSlotISO, setSelectedSlotISO] = useState('');
  const [slots, setSlots]                   = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading]     = useState(false);
  const [noAvailability, setNoAvailability] = useState(false);
  const [showAlert, setShowAlert]           = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [profiles, setProfiles]             = useState<PatientProfile[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);
  const router   = useRouter();

  // ── Load family profiles and pre-select from localStorage ──
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;
    const storedPatientId = typeof window !== 'undefined' ? localStorage.getItem('patientId') : null;
    if (!token) return;
    fetch('/api/patients/family', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((data: PatientProfile[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setProfiles(data);
        // Pre-select the patientId stored in localStorage (set by "Book for [member]" button)
        if (storedPatientId && data.find((p) => p.id === storedPatientId)) {
          setSelectedPatientId(storedPatientId);
        } else {
          const self = data.find((p) => p.relation === 'SELF') ?? data[0];
          setSelectedPatientId(self.id);
        }
      })
      .catch(() => {});
  }, []);

  // ── Close on outside click ──
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // ── Fetch slots when date changes ──
  useEffect(() => {
    if (!selectedDate) { setSlots([]); setNoAvailability(false); return; }
    const token = typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;
    setSlotsLoading(true);
    setNoAvailability(false);
    setSelectedSlotISO('');
    setError('');
    fetch(`/api/doctors/${doctor.id}/slots?date=${selectedDate}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data: Slot[]) => {
        const arr = Array.isArray(data) ? data : [];
        setSlots(arr);
        setNoAvailability(arr.length === 0);
      })
      .catch(() => { setSlots([]); setNoAvailability(true); })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, doctor.id]);

  const handleConfirm = async () => {
    setError('');
    if (!selectedDate || !selectedSlotISO) {
      setError('Please select both a date and a time slot.');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;
    if (!token) { router.push('/login'); return; }

    const selectedSlot = slots.find((s) => s.startISO === selectedSlotISO);
    if (!selectedSlot || selectedSlot.status !== 'available') {
      setError('Please select an available time slot.');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        doctorId: String(doctor.id),
        appointmentDate: selectedSlot.start,
        slotStart: selectedSlot.start,
        slotEnd: selectedSlot.end,
        patientId: selectedPatientId || undefined,
      };

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404 && data.error?.includes('profile')) { router.push('/home'); return; }
        setError(data.error || 'Booking failed. Please try again.');
        setLoading(false);
        return;
      }

      // After successful booking, reset patientId to SELF
      const selfProfile = profiles.find((p) => p.relation === 'SELF');
      if (selfProfile) localStorage.setItem('patientId', selfProfile.id);

      const selectedProfile = profiles.find((p) => p.id === selectedPatientId);
      const bookedFor = selectedProfile
        ? `${selectedProfile.firstName} ${selectedProfile.lastName}`
        : (typeof window !== 'undefined' ? localStorage.getItem('userName') || 'Patient' : 'Patient');

      const appointmentData = {
        id: data.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        speciality: doctor.speciality,
        date: selectedDate,
        time: new Date(selectedSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: data.status || 'SCHEDULED',
        bookingDate: new Date().toISOString().split('T')[0],
        patientName: bookedFor,
      };

      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
        onClose();
        if (typeof window !== 'undefined') sessionStorage.setItem('pendingAppointment', JSON.stringify(appointmentData));
        router.push('/booking-info');
      }, 1800);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const availableSlots = slots.filter((s) => s.status === 'available').length;

  const selectedProfile = profiles.find((p) => p.id === selectedPatientId);

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="modal-overlay">
        <motion.div
          className="modal"
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* ── HEADER ─────────────────────────────────────────── */}
          <div className="modal-header">
            <button className="close-icon" onClick={onClose} aria-label="Close">×</button>
            <h2>Book Appointment</h2>
          </div>

          {/* ── SCROLLABLE BODY ────────────────────────────────── */}
          <div className="modal-body">
            {/* Doctor info */}
            <div className="doctor-info">
              <div className="modal-doctor-avatar" style={{ fontSize: 28, color: '#4f46e5' }}>
                {doctor.name?.charAt(4)?.toUpperCase() || '👤'}
              </div>
              <div className="nameSpecialty">
                <h3>{doctor?.name || 'Doctor'}</h3>
                <span className="specialty">{doctor?.speciality || 'Specialist'}</span>
              </div>
              <ExpQual expQualification={{ exp: doctor.experience, qualification: doctor.qualification }} />
              <h5 className="desc">Expert care with compassionate service for all your health needs.</h5>
              <div style={{ padding: '4px 0' }}>
                <ReviewBadge rating={doctor?.rating} reviews={doctor?.reviews} />
              </div>
            </div>

            {/* ── Booking for (family member selector) ── */}
            {profiles.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <label className="date-label" style={{ marginTop: 4 }}>
                  <FiCalendar size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                  Booking for
                </label>
                <div className="booking-for-bar">
                  {profiles.map((p) => {
                    const picked = selectedPatientId === p.id;
                    return (
                      <button
                        key={p.id}
                        className="booking-for-chip"
                        onClick={() => setSelectedPatientId(p.id)}
                        style={{
                          borderColor: picked ? '#6366f1' : '#e2e8f0',
                          background: picked ? '#eef2ff' : '#f8fafc',
                          color: picked ? '#4f46e5' : '#64748b',
                        }}
                      >
                        {picked && <FiCheck size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
                        {p.firstName}
                        <span style={{ fontSize: 11, opacity: 0.75, marginLeft: 4 }}>({RELATION_LABEL[p.relation] ?? p.relation})</span>
                      </button>
                    );
                  })}
                </div>
                {selectedProfile && (
                  <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, marginTop: 4 }}>
                    Appointment will be booked for <strong>{selectedProfile.firstName} {selectedProfile.lastName}</strong>
                  </div>
                )}
              </div>
            )}

            {/* ── Date picker ── */}
            <label className="date-label">
              <FiCalendar size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
              Select Date
            </label>
            <div className="date-picker">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* ── Time slots ── */}
            <AnimatePresence mode="wait">
              {selectedDate && (
                <motion.div
                  key={selectedDate}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  style={{ marginTop: 14 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="date-label" style={{ margin: 0 }}>
                      <FiClock size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                      Time Slots
                    </label>
                    {!slotsLoading && slots.length > 0 && (
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        {availableSlots} of {slots.length} available
                      </span>
                    )}
                  </div>

                  {slotsLoading ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5, 6].map((k) => <Sk key={k} w="90px" h={44} />)}
                    </div>
                  ) : noAvailability ? (
                    <div style={{ padding: '14px 16px', background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FiAlertCircle size={18} color="#dc2626" />
                      <div>
                        <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 13 }}>Not available on this day</div>
                        <div style={{ color: '#ef4444', fontSize: 12, marginTop: 2 }}>Please pick a different date.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="time-slots">
                      {slots.map((slot) => {
                        const isPast = slot.status === 'past';
                        const isFull = slot.status === 'full';
                        const isSelected = selectedSlotISO === slot.startISO;
                        const disabled = isPast || isFull;
                        return (
                          <motion.button
                            key={slot.startISO}
                            whileHover={!disabled ? { scale: 1.04 } : {}}
                            whileTap={!disabled ? { scale: 0.97 } : {}}
                            className={`time-slot ${isSelected ? 'selected' : ''}`}
                            onClick={() => !disabled && setSelectedSlotISO(slot.startISO)}
                            disabled={disabled}
                            title={isPast ? 'This slot has passed' : isFull ? 'Fully booked' : ''}
                            style={{ opacity: disabled ? 0.38 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(slot.startISO)}</span>
                            {isFull && <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 800, letterSpacing: '0.05em' }}>FULL</span>}
                            {isPast && <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>PAST</span>}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ color: '#dc2626', fontSize: 13, marginTop: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <FiAlertCircle size={14} /> {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── STICKY FOOTER (always visible) ────────────────── */}
          <div className="modal-footer">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <motion.button
              className="confirm-btn"
              onClick={handleConfirm}
              disabled={loading || !selectedSlotISO || !selectedDate}
              whileTap={!loading ? { scale: 0.97 } : {}}
            >
              {loading ? 'Booking…' : 'Confirm Appointment'}
            </motion.button>
          </div>
        </motion.div>
      </div>
      {showAlert && <AlertModal message="Appointment Booked Successfully!" />}
    </>
  );
}
