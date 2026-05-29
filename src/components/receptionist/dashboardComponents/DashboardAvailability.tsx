'use client';
import React from 'react';
import AvailabilityTable from './AvailabilityTable';
import { useRouter } from 'next/navigation';

const DashboardAvailability = () => {
  const router = useRouter();
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Doctor Availability</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Today's schedule overview</div>
        </div>
        <button
          onClick={() => router.push('/receptionist/doctors')}
          style={{ padding: '7px 14px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
        >
          Manage Doctors
        </button>
      </div>
      <AvailabilityTable />
    </div>
  );
};

export default DashboardAvailability;
