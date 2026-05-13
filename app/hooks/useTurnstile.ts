'use client';

import { useEffect, useRef, useCallback } from 'react';

interface TurnstileInstance {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
  }
}

export function useTurnstile() {
  const tokenRef = useRef<string | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !containerRef.current) return;

    const poll = setInterval(() => {
      if (!window.turnstile || !containerRef.current) return;
      clearInterval(poll);

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        size: 'flexible',
        appearance: 'interaction-only',
        callback: (token: string) => {
          tokenRef.current = token;
        },
        'expired-callback': () => {
          tokenRef.current = null;
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      });
    }, 100);

    return () => {
      clearInterval(poll);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

  const getToken = useCallback((): string | null => {
    const token = tokenRef.current;
    tokenRef.current = null;
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
    return token;
  }, []);

  return { containerRef, getToken };
}
