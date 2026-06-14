'use client';

import { useEffect, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

type InstallState = 'hidden' | 'android' | 'ios' | 'installed';

// ── Helpers ──────────────────────────────────────────────────────────────────

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as Mac, so check touch points
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function InstallPrompt() {
  const [state, setState] = useState<InstallState>('hidden');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Already installed or dismissed this session → hide
    if (isInStandaloneMode()) {
      setState('installed');
      return;
    }
    if (sessionStorage.getItem('pwa-prompt-dismissed')) {
      return;
    }

    // iOS: no beforeinstallprompt event → show manual instructions
    if (isIOS()) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setState('ios'), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome Desktop: wait for browser event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState('android');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If already installed (e.g. relaunched as PWA), track it
    window.addEventListener('appinstalled', () => {
      setState('installed');
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleInstallAndroid() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setState('installed');
    } else {
      dismiss();
    }
    setDeferredPrompt(null);
  }

  function dismiss() {
    setIsDismissed(true);
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
    setTimeout(() => setState('hidden'), 400);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (state === 'hidden' || state === 'installed') return null;

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '1.5rem',
    left: '50%',
    transform: `translateX(-50%) translateY(${isDismissed ? '200%' : '0'})`,
    zIndex: 9999,
    width: 'calc(100% - 2rem)',
    maxWidth: '420px',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '16px',
    padding: '1.25rem 1.25rem 1rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56,189,248,0.1)',
    color: '#f0f9ff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const iconStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: '#0a0f1e',
    border: '1px solid rgba(56,189,248,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.6rem',
    flexShrink: 0,
  };

  // Android / Desktop Chrome prompt
  if (state === 'android') {
    return (
      <div style={baseStyle} role="dialog" aria-modal="true" aria-label="App installieren">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={iconStyle}>❄️</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#bae6fd' }}>
              App installieren
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
              IBN-Check als App speichern – schneller Zugriff, Offline-Betrieb, kein Browser-Rahmen.
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Schließen"
            style={{
              background: 'none', border: 'none', color: '#64748b',
              cursor: 'pointer', fontSize: '1.25rem', padding: '0 0 0 0.25rem',
              lineHeight: 1, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1rem' }}>
          <button
            onClick={dismiss}
            style={{
              flex: 1, padding: '0.6rem', borderRadius: '10px',
              background: 'transparent', border: '1px solid rgba(148,163,184,0.3)',
              color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
            }}
          >
            Später
          </button>
          <button
            onClick={handleInstallAndroid}
            style={{
              flex: 2, padding: '0.6rem', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              border: '1px solid rgba(96,165,250,0.4)',
              color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
            }}
          >
            📲 Jetzt installieren
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari prompt – manual steps
  if (state === 'ios') {
    return (
      <div style={baseStyle} role="dialog" aria-modal="true" aria-label="App zu Startbildschirm hinzufügen">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#bae6fd' }}>
            ❄️ &nbsp;App installieren (iOS)
          </p>
          <button
            onClick={dismiss}
            aria-label="Schließen"
            style={{
              background: 'none', border: 'none', color: '#64748b',
              cursor: 'pointer', fontSize: '1.2rem', padding: 0, lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '0.5rem 0 0.875rem', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
          So installierst du IBN-Check auf deinem iPhone:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[
            { icon: '⬆️', text: 'Auf das Teilen-Symbol in der Browserleiste tippen' },
            { icon: '➕', text: '„Zum Home-Bildschirm" wählen' },
            { icon: '✅', text: '„Hinzufügen" bestätigen' },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: '0.75rem', alignItems: 'center',
                background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                padding: '0.625rem 0.875rem',
              }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{step.icon}</span>
              <span style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.35 }}>{step.text}</span>
            </div>
          ))}
        </div>

        <p style={{ margin: '0.875rem 0 0', fontSize: '0.78rem', color: '#475569', textAlign: 'center' }}>
          Die App startet dann ohne Browser-Rahmen im Vollbild.
        </p>
      </div>
    );
  }

  return null;
}
