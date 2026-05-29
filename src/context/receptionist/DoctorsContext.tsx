'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;

function transformDoctor(d: any) {
  return {
    id: d.id,
    name: d.fullname,
    speciality: d.specialization,
    experience: `${d.experienceYears} yrs`,
    qualification: d.qualification || 'MBBS',
    status: d.isActive ? 'Available' : 'Unavailable',
    date: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-',
    appointments: '0',
    timings: '09:00 AM - 05:00 PM',
    whatsapp: '',
    _raw: d,
  };
}

const DoctorsContext = createContext<any>({
  doctorsData: [],
  setDoctorsData: () => {},
  refetch: () => {},
  loading: false,
});

export const useDoctors = () => useContext(DoctorsContext);

export const DoctorsProvider = ({ children }: { children: React.ReactNode }) => {
  const [doctorsData, setDoctorsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDoctors = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/doctors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDoctorsData(Array.isArray(data) ? data.map(transformDoctor) : []);
      }
    } catch {
      // Keep current state on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return (
    <DoctorsContext.Provider
      value={{ doctorsData, setDoctorsData, refetch: fetchDoctors, loading }}
    >
      {children}
    </DoctorsContext.Provider>
  );
};
