'use client';
import { useEffect, useState } from 'react';
import WelcomeToast from './WelcomeToast';

const WelcomeGuard = ({ storageKey = 'hms_welcome' }: { storageKey?: string }) => {
  const [data, setData] = useState<{ name?: string; role?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.removeItem(storageKey);
        setData(parsed);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  if (!data) return null;
  return <WelcomeToast name={data.name} role={data.role} />;
};

export default WelcomeGuard;
