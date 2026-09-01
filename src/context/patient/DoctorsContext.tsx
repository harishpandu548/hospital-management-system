'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface Doctor {
  id: string;
  name: string;
  age: number;
  speciality: string;
  category: string;
  experience: string;
  qualification: string;
  description: string;
  rating: number;
  reviews: number;
  timings: string;
  patients: string;
}

interface DoctorsContextType {
  doctorsData: Doctor[];
  setDoctorsData: React.Dispatch<React.SetStateAction<Doctor[]>>;
  loading: boolean;
  fetchError: string;
  refetch: () => void;
}

const DoctorsContext = createContext<DoctorsContextType>({
  doctorsData: [],
  setDoctorsData: () => {},
  loading: false,
  fetchError: '',
  refetch: () => {},
});

export const useDoctors = () => useContext(DoctorsContext);

export const DoctorsProvider = ({ children }: { children: React.ReactNode }) => {
  const [doctorsData, setDoctorsData] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const fetchDoctors = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('patient_token') : null;

    if (!token) {
      setFetchError('Please log in to view available doctors.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError('');

    fetch('/api/doctors', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load doctors');
        return res.json();
      })
      .then((data: any[]) => {
        if (!Array.isArray(data)) {
          setFetchError('Unexpected response from server.');
          return;
        }
        const mapped: Doctor[] = data.map((d) => ({
          id: d.id,
          name: d.fullname,
          age: 35,
          speciality: d.specialization,
          category: d.specialization,
          experience: `${d.experienceYears}+ years`,
          qualification: d.qualification || 'MBBS',
          description: `${d.fullname} is a specialist in ${d.specialization} with ${d.experienceYears}+ years of experience.`,
          rating: 4.5,
          reviews: 0,
          timings: '09:00 AM - 05:00 PM',
          patients: '1000+',
        }));
        setDoctorsData(mapped);
      })
      .catch(() => {
        setFetchError('Could not load doctors. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Only auto-fetch if a token is already present when the provider first mounts.
  // If there's no token yet (e.g. provider mounts on the login page), we don't
  // set an error — we wait for the DoctorsAppointment page to call refetch().
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('patient_token') : null;
    if (token) {
      fetchDoctors();
    }
  }, [fetchDoctors]);

  return (
    <DoctorsContext.Provider value={{ doctorsData, setDoctorsData, loading, fetchError, refetch: fetchDoctors }}>
      {children}
    </DoctorsContext.Provider>
  );
};
