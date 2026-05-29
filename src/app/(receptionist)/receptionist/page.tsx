'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { pageVariants, staggerContainer, fadeUp } from '@/lib/animations';
import DashboardStats from '@/components/receptionist/dashboardComponents/DashboardStats';
import DashboardAppointments from '@/components/receptionist/dashboardComponents/DashboardAppointments';
import DashboardAvailability from '@/components/receptionist/dashboardComponents/DashboardAvailability';

const quickActions = [
  { label: 'Book Appointment', icon: '📅', href: '/receptionist/book-appointment', color: '#6366f1', bg: '#eef2ff' },
  { label: 'Add Patient', icon: '👤', href: '/receptionist/add-patient', color: '#10b981', bg: '#d1fae5' },
  { label: 'All Appointments', icon: '📋', href: '/receptionist/appointments', color: '#f59e0b', bg: '#fef3c7' },
  { label: 'Patient Records', icon: '🗂️', href: '/receptionist/patients', color: '#06b6d4', bg: '#cffafe' },
  { label: 'Doctor Directory', icon: '👨‍⚕️', href: '/receptionist/doctors', color: '#8b5cf6', bg: '#ede9fe' },
  { label: 'Reports', icon: '📊', href: '/receptionist/reports', color: '#ec4899', bg: '#fce7f3' },
];

const DashboardPage = () => {
  const router = useRouter();

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{ padding: '24px', background: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}
    >
      {/* Stats */}
      <DashboardStats />

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ marginBottom: 24 }}
      >
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.18 }}
          style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}
        >
          Quick Actions
        </motion.div>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 12 }}
        >
          {quickActions.map((a) => (
            <motion.button
              key={a.href}
              variants={fadeUp}
              onClick={() => router.push(a.href)}
              whileHover={{ y: -4, boxShadow: `0 8px 24px ${a.color}22`, borderColor: a.color + '66' }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '16px 12px',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 11, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {a.icon}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', lineHeight: 1.3 }}>{a.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* Main 2-column section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
      >
        <DashboardAppointments />
        <DashboardAvailability />
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
