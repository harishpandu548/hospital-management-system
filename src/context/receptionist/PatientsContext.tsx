'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;

function calculateAge(dateOfBirth: string | null | undefined): number | string {
  if (!dateOfBirth) return '-';
  const ms = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

function transformPatient(p: any) {
  const name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
  const notes = p.medicalNotes || '';
  const condition = notes.split(':')[0]?.trim() || notes.split(',')[0]?.trim() || '-';
  return {
    id: p.id,
    patientId: `P-${p.id.slice(-6).toUpperCase()}`,
    name,
    age: calculateAge(p.dateOfBirth),
    dob: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '-',
    gender: p.gender || '-',
    bloodGroup: p.bloodGroup || '-',
    weight: p.weightKg ? `${p.weightKg}kg` : '-',
    height: p.heightCm ? `${p.heightCm}cm` : '-',
    maritalStatus: '-',
    doctor: '-',
    condition,
    medicalCondition: notes,
    describeCondition: notes,
    contact: p.phone || '-',
    contactWhatsapp: p.phone || '-',
    email: p.email || '-',
    address: p.address || '-',
    city: p.city || '-',
    state: p.state || '-',
    _raw: p,
  };
}

const PatientsContext = createContext<any>({
  patientsData: [],
  setPatientsData: () => {},
  refetch: () => {},
  loading: false,
});

export const usePatients = () => useContext(PatientsContext);

export const PatientsProvider = ({ children }: { children: React.ReactNode }) => {
  const [patientsData, setPatientsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPatients = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/patients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPatientsData(Array.isArray(data) ? data.map(transformPatient) : []);
      }
    } catch {
      // Keep current state on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return (
    <PatientsContext.Provider
      value={{ patientsData, setPatientsData, refetch: fetchPatients, loading }}
    >
      {children}
    </PatientsContext.Provider>
  );
};
