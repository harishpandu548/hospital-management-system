'use client';
import { useEffect, useState } from 'react';
import WelcomeToast from './WelcomeToast';

const WelcomeGuard = () => {
  const [data, setData] = useState<{ name?: string; role?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hms_welcome');
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.removeItem('hms_welcome');
        setData(parsed);
      }
    } catch {
      localStorage.removeItem('hms_welcome');
    }
  }, []);

  if (!data) return null;
  return <WelcomeToast name={data.name} role={data.role} />;
};

export default WelcomeGuard;
