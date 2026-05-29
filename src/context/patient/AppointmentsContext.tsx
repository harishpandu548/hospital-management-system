'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

interface Appointment {
  id: string;
  doctorId?: number;
  doctorName: string;
  speciality: string;
  date: string;
  time: string;
  patientName: string;
  status: string;
  bookingDate: string;
  [key: string]: any;
}

interface AppointmentsContextType {
  appointments: Appointment[];
  addAppointment: (appt: Omit<Appointment, 'id'> & { id?: string }) => Appointment;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  cancelAppointment: (id: string) => void;
}

const AppointmentsContext = createContext<AppointmentsContextType>({
  appointments: [],
  addAppointment: () => ({ id: '', doctorName: '', speciality: '', date: '', time: '', patientName: '', status: '', bookingDate: '' }),
  updateAppointment: () => {},
  deleteAppointment: () => {},
  cancelAppointment: () => {},
});

export const useAppointments = () => useContext(AppointmentsContext);

export const AppointmentsProvider = ({ children }: { children: React.ReactNode }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const addAppointment = useCallback((newAppointment: Omit<Appointment, 'id'> & { id?: string }) => {
    const appointmentWithId = {
      ...newAppointment,
      id: newAppointment.id || Date.now().toString(),
    } as Appointment;
    setAppointments((prev) => [...prev, appointmentWithId]);
    return appointmentWithId;
  }, []);

  const updateAppointment = useCallback((id: string, updatedData: Partial<Appointment>) => {
    setAppointments((prev) =>
      prev.map((appt) => (appt.id === id ? { ...appt, ...updatedData } : appt))
    );
  }, []);

  const deleteAppointment = useCallback((id: string) => {
    setAppointments((prev) => prev.filter((appt) => appt.id !== id));
  }, []);

  const cancelAppointment = useCallback((id: string) => {
    setAppointments((prev) =>
      prev.map((appt) => (appt.id === id ? { ...appt, status: 'Cancelled' } : appt))
    );
  }, []);

  return (
    <AppointmentsContext.Provider
      value={{ appointments, addAppointment, updateAppointment, deleteAppointment, cancelAppointment }}
    >
      {children}
    </AppointmentsContext.Provider>
  );
};
