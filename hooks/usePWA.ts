'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAStatus {
  isInstalled: boolean;
  isOnline: boolean;
  isIOS: boolean;
  canInstall: boolean;           // Android/Desktop: native prompt available
  promptInstall: () => Promise<void>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePWA(): PWAStatus {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const ios =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const installed =
    typeof window !== 'undefined' &&
    (('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) ||
      window.matchMedia('(display-mode: standalone)').matches);

  useEffect(() => {
    setIsInstalled(installed);
    setIsOnline(navigator.onLine);

    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    const onInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled',        onAppInstalled);

    return () => {
      window.removeEventListener('online',               onOnline);
      window.removeEventListener('offline',              onOffline);
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled',        onAppInstalled);
    };
  }, [installed]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return {
    isInstalled,
    isOnline,
    isIOS: ios,
    canInstall: !!deferredPrompt,
    promptInstall,
  };
}
