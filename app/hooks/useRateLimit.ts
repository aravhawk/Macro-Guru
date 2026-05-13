'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'macro_guru_daily_usage';
const DAILY_LIMIT = 50;

interface UsageData {
  count: number;
  date: string;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadUsage(): UsageData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as UsageData;
      if (data.date === getTodayKey()) return data;
    }
  } catch {}
  return { count: 0, date: getTodayKey() };
}

export function useRateLimit() {
  const [usage, setUsage] = useState<UsageData>({ count: 0, date: getTodayKey() });

  useEffect(() => {
    setUsage(loadUsage());
  }, []);

  const increment = useCallback(() => {
    setUsage(prev => {
      const today = getTodayKey();
      const next: UsageData = {
        count: (prev.date === today ? prev.count : 0) + 1,
        date: today,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const today = getTodayKey();
  const used = usage.date === today ? usage.count : 0;

  return {
    used,
    remaining: Math.max(0, DAILY_LIMIT - used),
    limit: DAILY_LIMIT,
    isLimitReached: used >= DAILY_LIMIT,
    increment,
  };
}
