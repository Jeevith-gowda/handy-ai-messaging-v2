'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Register as soon as the app hydrates (Chrome installability checks for an active SW).
    const reg = navigator.serviceWorker.register('/sw.js', { scope: '/' });
    reg.catch((err) => console.warn('[PWA] Service worker registration failed:', err));
  }, []);

  return null;
}
