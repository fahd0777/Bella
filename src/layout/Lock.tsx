import { useCallback, useEffect, useRef, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { supabase, arError } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Field } from '@/components/ui';
import { BellaMark } from '@/components/icons';

const KEY = 'bella_locked';

/** Locks the UI after N idle minutes (and when the app comes back after being hidden that long). */
export function useIdleLock(minutes: number) {
  const [locked, setLocked] = useState(() => sessionStorage.getItem(KEY) === '1');
  const last = useRef(Date.now());
  const lock = useCallback(() => { sessionStorage.setItem(KEY, '1'); sessionStorage.removeItem('bella_pin_ok'); setLocked(true); }, []);
  useEffect(() => {
    if (!minutes) return;
    const ms = minutes * 60_000;
    const bump = () => { last.current = Date.now(); };
    const check = () => { if (Date.now() - last.current > ms) lock(); };
    const onVis = () => { if (document.visibilityState === 'visible') check(); else bump(); };
    const evs = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(check, 15_000);
    return () => { evs.forEach((e) => window.removeEventListener(e, bump)); document.removeEventListener('visibilitychange', onVis); clearInterval(t); };
  }, [minutes, lock]);
  const unlock = () => { sessionStorage.removeItem(KEY); setLocked(false); };
  return { locked, unlock };
}

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { session, signOut } = useAuth();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: session!.user.email!, password: pw });
    setBusy(false);
    if (error) setErr(arError(error)); else onUnlock();
  };
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-5">
      <form onSubmit={submit} className="card w-full max-w-sm p-7 text-center anim-rise">
        <div className="mx-auto mb-4 w-fit"><BellaMark size={52} /></div>
        <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-2xl bg-rose-soft text-[color:var(--color-rose)]"><LockKeyhole size={20} /></div>
        <h1 className="text-2xl font-semibold">Bella مقفولة</h1>
        <p className="mb-5 mt-1 text-sm text-muted">اتقفلت تلقائي عشان محدش يشوف بياناتك. اكتبي الباسورد عشان تكملي.</p>
        <Field label="الباسورد" error={err}><input className="input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
        <Button className="mt-4 w-full" loading={busy} disabled={!pw}>افتحي</Button>
        <button type="button" onClick={() => { sessionStorage.clear(); signOut(); }} className="mt-3 text-sm text-muted underline-offset-4 hover:underline">تسجيل خروج</button>
      </form>
    </div>
  );
}
