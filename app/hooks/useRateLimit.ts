'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';

const DAILY_LIMIT = 50;

export function useRateLimit() {
  const { user } = useAuth();
  const [used, setUsed] = useState(0);

  useEffect(() => {
    if (!user) {
      setUsed(0);
      return;
    }

    async function fetchUsage() {
      try {
        const res = await fetch('/api/rate-limit');
        if (res.ok) {
          const data = await res.json();
          setUsed(data.used);
        }
      } catch (error) {
        console.error('Failed to fetch rate limit:', error);
      }
    }

    fetchUsage();
  }, [user]);

  const increment = () => {
    setUsed(prev => prev + 1);
  };

  return {
    used,
    remaining: Math.max(0, DAILY_LIMIT - used),
    limit: DAILY_LIMIT,
    isLimitReached: used >= DAILY_LIMIT,
    increment,
  };
}
