'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

type PushState = 'unsupported' | 'loading' | 'subscribed' | 'unsubscribed';

export function PushSubscribe() {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setState(sub ? 'subscribed' : 'unsubscribed');
      });
    });
  }, []);

  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function subscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const token = await getToken();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setState('subscribed');
    } catch {
      // User denied or subscription failed
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        const token = await getToken();
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint }),
        });
      }
      setState('unsubscribed');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'unsupported' || state === 'loading') return null;

  return (
    <button
      onClick={state === 'subscribed' ? unsubscribe : subscribe}
      disabled={busy}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
      style={{
        background: state === 'subscribed' ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${state === 'subscribed' ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}`,
        color: state === 'subscribed' ? '#34d399' : 'rgba(255,255,255,0.7)',
        opacity: busy ? 0.6 : 1,
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
      {busy ? '...' : state === 'subscribed' ? 'Notifications on' : 'Enable notifications'}
    </button>
  );
}
