'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('receptionist_token') : null;

function calculateAge(dateOfBirth: string | null | undefined): number | string {
  if (!dateOfBirth) return '-';
  const ms = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

function transformAppointment(appt: any) {
  const firstName = appt.patient?.firstName || '';
  const lastName = appt.patient?.lastName || '';
  const name = `${firstName} ${lastName}`.trim() || 'Unknown';
  const age = calculateAge(appt.patient?.dateOfBirth);

  const slotStart = appt.slotStart ? new Date(appt.slotStart) : null;
  const time = slotStart
    ? slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '-';

  const notes = appt.patient?.medicalNotes || '';
  const condition = notes.split(':')[0]?.trim() || notes.split(',')[0]?.trim() || '-';

  const rawStatus: string = appt.status || '';
  const status =
    rawStatus.charAt(0).toUpperCase() +
    rawStatus.slice(1).toLowerCase().replace(/_/g, ' ');

  const rawPayment: string = appt.paymentStatus || '';
  const payment_status =
    rawPayment.charAt(0).toUpperCase() + rawPayment.slice(1).toLowerCase();

  // Determine booking source: patient self-booked vs staff-booked
  const source =
    appt.patient?.userId && appt.createdBy === appt.patient.userId
      ? 'patient'
      : 'staff';

  return {
    id: appt.id,
    name,
    age,
    doctor: appt.doctor?.fullname || '-',
    condition,
    time,
    date: appt.appointmentDate
      ? new Date(appt.appointmentDate).toLocaleDateString()
      : '-',
    status,
    payment_status: payment_status || 'Pending',
    remarks: appt.remarks || '',
    patientId: appt.patientId,
    doctorId: appt.doctorId,
    phone: appt.patient?.phone || '-',
    source,
    _raw: appt,
  };
}

const AppointmentsContext = createContext<any>({
  appointments: [],
  setAppointments: () => {},
  refetch: () => {},
  loading: false,
});

export const useAppointments = () => useContext(AppointmentsContext);

export const AppointmentsProvider = ({ children }: { children: React.ReactNode }) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(Array.isArray(data) ? data.map(transformAppointment) : []);
      }
    } catch {
      // Keep current state on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();

    // Connect to WebSocket to receive real-time updates
    let socket: any;
    import('socket.io-client').then(({ io }) => {
      socket = io('http://localhost:3001');
      socket.emit('join-receptionist');
      socket.on('appointment-update', () => {
        // Silently refresh appointments in the background
        fetchAppointments();
      });
      socket.on('payment-updated', () => {
        fetchAppointments();
      });
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchAppointments]);

  return (
    <AppointmentsContext.Provider
      value={{ appointments, setAppointments, refetch: fetchAppointments, loading }}
    >
      {children}
    </AppointmentsContext.Provider>
  );
};
