import { useEffect, useState, type ReactNode } from 'react';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { supabase, arError, supabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Field, useToast } from '@/components/ui';
import { BellaMark } from '@/components/icons';

function Frame({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink md:block">
        <div className="absolute -top-24 -start-24 size-96 rounded-full bg-[color:var(--color-rose)]/30 blur-3xl" />
        <div className="absolute bottom-0 end-0 size-80 rounded-full bg-sage/25 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-ivory">
          <div className="flex items-center gap-3"><BellaMark size={44} /><span className="font-display text-3xl">Bella</span></div>
          <div>
            <p className="font-display text-4xl leading-snug">يومك كله في مكان واحد<br />شغلك، بيتك، ولادك… وإنتي.</p>
            <p className="mt-4 max-w-sm text-ivory/70">مساعدتك الشخصية الخاصة — محدش غيرك يقدر يدخلها.</p>
          </div>
          <p className="flex items-center gap-2 text-sm text-ivory/60"><ShieldCheck size={16} />بياناتك محمية بتسجيل دخول وصلاحيات على مستوى الداتابيز</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm anim-rise">
          <div className="mb-6 flex items-center gap-3 md:hidden"><BellaMark size={44} /><span className="font-display text-3xl">Bella</span></div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 mb-6 text-muted">{subtitle}</p>}
          {!supabaseConfigured && <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">إعدادات Supabase ناقصة (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthGate() {
  const [ownerExists, setOwnerExists] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  useEffect(() => {
    supabase.rpc('owner_exists').then(({ data, error }) => setOwnerExists(error ? true : Boolean(data)));
  }, []);
  if (ownerExists === null) return <div className="flex min-h-dvh items-center justify-center"><BellaMark size={56} /></div>;
  if (!ownerExists) return <Setup onDone={() => setOwnerExists(true)} />;
  return mode === 'login' ? <Login onForgot={() => setMode('forgot')} /> : <Forgot onBack={() => setMode('login')} />;
}

function Login({ onForgot }: { onForgot: () => void }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setErr(arError(error));
  };
  return (
    <Frame title="أهلاً بيكي تاني ❤️" subtitle="سجلي دخول عشان تكملي يومك">
      <form onSubmit={submit} className="space-y-4">
        <Field label="الإيميل"><input className="input" type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="الباسورد" error={err}><input className="input" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
        <Button className="w-full" size="lg" loading={busy}>دخول</Button>
        <button type="button" onClick={onForgot} className="w-full text-center text-sm text-muted hover:text-ink">نسيتي الباسورد؟</button>
      </form>
    </Frame>
  );
}

function Forgot({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + import.meta.env.BASE_URL });
    setBusy(false);
    if (error) setErr(arError(error)); else setSent(true);
  };
  return (
    <Frame title="استرجاع الباسورد" subtitle="هنبعتلك لينك على الإيميل تعملي بيه باسورد جديد">
      {sent ? (
        <div className="rounded-2xl bg-sage-soft p-4 text-sm"><MailCheck className="mb-2 text-sage" />لو الإيميل ده هو حساب Bella، هيوصلك لينك خلال دقايق. افتحيه من نفس الجهاز.</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="الإيميل" error={err}><input className="input" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Button className="w-full" size="lg" loading={busy}>ابعتي اللينك</Button>
        </form>
      )}
      <button onClick={onBack} className="mt-4 w-full text-center text-sm text-muted hover:text-ink">رجوع لتسجيل الدخول</button>
    </Frame>
  );
}

function Setup({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: '', email: '', pw: '', pw2: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = 'اكتبي اسمك';
    if (f.pw.length < 8) errs.pw = 'الباسورد 8 حروف على الأقل';
    if (f.pw !== f.pw2) errs.pw2 = 'الباسورد مش متطابق';
    setErr(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: f.email.trim(), password: f.pw, options: { data: { full_name: f.name.trim() }, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL } });
    setBusy(false);
    if (error) { setErr({ email: arError(error) }); return; }
    if (!data.session) setCheckEmail(true); else onDone();
  };
  if (checkEmail)
    return (
      <Frame title="فاضل خطوة واحدة" subtitle="بعتنالك إيميل تأكيد">
        <div className="rounded-2xl bg-sage-soft p-4 text-sm"><MailCheck className="mb-2 text-sage" />افتحي الإيميل ودوسي على لينك التأكيد، وبعدها سجلي دخول. الحساب ده هيبقى الحساب الوحيد في Bella.</div>
        <Button className="mt-4 w-full" variant="outline" onClick={onDone}>روحي لتسجيل الدخول</Button>
      </Frame>
    );
  return (
    <Frame title="إعداد Bella لأول مرة" subtitle="الحساب ده هيبقى الحساب الوحيد — بعده التسجيل بيتقفل نهائي.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="اسمك" error={err.name}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="الإيميل" error={err.email}><input className="input" type="email" dir="ltr" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></Field>
        <Field label="الباسورد" error={err.pw} hint="8 حروف على الأقل"><input className="input" type="password" autoComplete="new-password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} /></Field>
        <Field label="أكدي الباسورد" error={err.pw2}><input className="input" type="password" autoComplete="new-password" value={f.pw2} onChange={(e) => setF({ ...f, pw2: e.target.value })} /></Field>
        <Button className="w-full" size="lg" loading={busy}>ابدأي</Button>
      </form>
    </Frame>
  );
}

export function NewPassword() {
  const { clearRecovery } = useAuth();
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr('الباسورد 8 حروف على الأقل');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setErr(arError(error)); else { toast.success('الباسورد اتغير ✓'); clearRecovery(); }
  };
  return (
    <Frame title="باسورد جديد" subtitle="اختاري باسورد قوي محدش يعرفه">
      <form onSubmit={submit} className="space-y-4">
        <Field label="الباسورد الجديد" error={err}><input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
        <Button className="w-full" size="lg" loading={busy}>حفظ</Button>
      </form>
    </Frame>
  );
}
