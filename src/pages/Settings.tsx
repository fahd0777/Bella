import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Upload, Trash2, LogOut, KeyRound, LockKeyhole, Wand2, Eraser, User, Bell, Shield, Baby, Tags, Database, Palette, Plus, X } from 'lucide-react';
import { supabase, arError, TABLES, type Table } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useProfile, useSettings, useUpdateSettings, type Settings } from '@/lib/settings';
import { useRows, fetchAll } from '@/lib/api';
import { REMINDERS } from '@/lib/constants';
import { todayISO } from '@/lib/format';
import { Button, Card, Field, PageHeader, SectionTitle, Toggle, useConfirm, useToast, cx } from '@/components/ui';
import { useEditor } from '@/components/Editor';

const Section = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <Card className="p-5"><SectionTitle title={title} icon={icon} />{children}</Card>
);

const RESTORE_ORDER: Table[] = ['categories', 'clients', 'properties', 'children', 'client_interactions', 'client_properties', 'appointments', 'reminders', 'school_schedules', 'lessons', 'homework', 'exams', 'child_activities', 'tasks', 'household_tasks', 'shopping_items', 'inventory_items', 'maintenance_records', 'bills', 'expenses', 'income', 'budgets', 'notes', 'period_records', 'wellness_records'];
const CONFLICT: Partial<Record<Table, string>> = { budgets: 'owner_id,category', categories: 'owner_id,module,name' };

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const toCSV = (rows: Record<string, any>[]) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]).filter((c) => c !== 'owner_id');
  const esc = (v: unknown) => { const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
};

export default function SettingsPage() {
  const s = useSettings();
  const update = useUpdateSettings();
  const set = (p: Partial<Settings>) => update.mutate(p, { onError: (e) => toast.error(arError(e)) });
  const toast = useToast();
  return (
    <div className="space-y-5">
      <PageHeader title="الإعدادات" />
      <Profile />
      <Section icon={<Palette size={18} />} title="التطبيق">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="شكل الوقت"><select className="input" value={s.time_format} onChange={(e) => set({ time_format: e.target.value as Settings['time_format'] })}><option value="12h">12 ساعة (5:30 م)</option><option value="24h">24 ساعة (17:30)</option></select></Field>
          <Field label="الأسبوع يبدأ"><select className="input" value={s.week_start} onChange={(e) => set({ week_start: Number(e.target.value) })}><option value={6}>السبت</option><option value={0}>الأحد</option><option value={1}>الاتنين</option></select></Field>
          <Field label="التذكير الافتراضي"><select className="input" value={String(s.default_reminder_minutes)} onChange={(e) => set({ default_reminder_minutes: Number(e.target.value || 0) })}>{REMINDERS.filter((r) => r.value).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></Field>
          <Field label="العملة"><input className="input" value="جنيه مصري (EGP)" disabled /></Field>
          <Field label="اللغة"><input className="input" value="العربية" disabled /></Field>
          <Field label="لون التطبيق" group>
            <div className="flex gap-2">{([['rose', '#B9787A', 'وردي'], ['sage', '#6F8E79', 'ميرمية'], ['mocha', '#8A6A55', 'موكا']] as const).map(([v, c, l]) => (
              <button key={v} onClick={() => set({ theme: v })} className={cx('flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm', s.theme === v ? 'border-ink bg-white' : 'border-line')}><span className="size-5 rounded-full" style={{ background: c }} />{l}</button>
            ))}</div>
          </Field>
        </div>
      </Section>
      <Section icon={<Bell size={18} />} title="التنبيهات">
        <div className="divide-y divide-line/70">
          <Toggle label="المواعيد" checked={s.notify_appointments} onChange={(v) => set({ notify_appointments: v })} />
          <Toggle label="متابعات العملاء" checked={s.notify_followups} onChange={(v) => set({ notify_followups: v })} />
          <Toggle label="الفواتير" checked={s.notify_bills} onChange={(v) => set({ notify_bills: v })} />
          <Toggle label="المهام" checked={s.notify_tasks} onChange={(v) => set({ notify_tasks: v })} />
          <Toggle label="الأولاد (دروس، امتحانات، واجبات)" checked={s.notify_children} onChange={(v) => set({ notify_children: v })} />
          <Toggle label="البيت (مهام، صيانة، مخزون)" checked={s.notify_household} onChange={(v) => set({ notify_household: v })} />
          <Toggle label="تنبيهات المتصفح" hint="بتطلب إذن المتصفح أول ما تفعّليها بس. النص بيبقى مختصر ومن غير أرقام تليفونات." checked={s.browser_notifications}
            onChange={async (v) => { if (v && 'Notification' in window) { const p = await Notification.requestPermission(); if (p !== 'granted') return toast.error('المتصفح رفض الإذن'); } set({ browser_notifications: v }); }} />
        </div>
      </Section>
      <Security />
      <Family />
      <Categories />
      <DataSection />
      <DangerZone />
    </div>
  );
}

function Profile() {
  const { data: p } = useProfile();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  useEffect(() => { setName(p?.full_name ?? ''); setPhone(p?.phone ?? ''); }, [p]);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: phone.trim() || null }).eq('id', session!.user.id);
    setBusy(false);
    if (error) toast.error(arError(error)); else { qc.invalidateQueries({ queryKey: ['profile'] }); toast.success('اتحفظ'); }
  };
  return (
    <Section icon={<User size={18} />} title="بياناتي">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="الاسم"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="الموبايل"><input className="input num" dir="ltr" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="الإيميل"><input className="input" dir="ltr" value={session?.user.email ?? ''} disabled /></Field>
      </div>
      <Button className="mt-4" onClick={save} loading={busy}>حفظ</Button>
    </Section>
  );
}

function Security() {
  const s = useSettings();
  const update = useUpdateSettings();
  const { session, signOut } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pinCur, setPinCur] = useState(''); const [pinNew, setPinNew] = useState('');
  useEffect(() => { supabase.rpc('has_pin').then(({ data }) => setHasPin(Boolean(data))); }, []);

  const changePw = async () => {
    if (pw.length < 8) return toast.error('الباسورد الجديد 8 حروف على الأقل');
    if (pw !== pw2) return toast.error('الباسورد مش متطابق');
    setBusy(true);
    const { error: e1 } = await supabase.auth.signInWithPassword({ email: session!.user.email!, password: cur });
    if (e1) { setBusy(false); return toast.error('الباسورد الحالي مش صح'); }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) toast.error(arError(error)); else { toast.success('الباسورد اتغير ✓'); setCur(''); setPw(''); setPw2(''); }
  };
  const savePin = async (remove = false) => {
    if (!remove && !/^\d{4,6}$/.test(pinNew)) return toast.error('الرقم السري من 4 لـ 6 أرقام');
    const { data, error } = await supabase.rpc('set_pin', { new_pin: remove ? null : pinNew, current_pin: hasPin ? pinCur : null });
    if (error) return toast.error(arError(error));
    if (!data) return toast.error('الرقم السري الحالي غلط');
    setHasPin(!remove); setPinCur(''); setPinNew(''); sessionStorage.removeItem('bella_pin_ok');
    toast.success(remove ? 'الرقم السري اتشال' : 'الرقم السري اتحفظ');
  };
  const logoutAll = async () => {
    if (!(await confirm({ title: 'تسجيل خروج من كل الأجهزة؟', body: 'هتحتاجي تسجلي دخول تاني على كل جهاز، ومنه الجهاز ده.', confirmText: 'اخرجي من الكل' }))) return;
    await signOut(true);
  };

  return (
    <Section icon={<Shield size={18} />} title="الخصوصية والأمان">
      <div className="space-y-6">
        <div>
          <p className="mb-2 flex items-center gap-2 font-medium"><KeyRound size={16} />تغيير الباسورد</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="input" type="password" placeholder="الباسورد الحالي" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
            <input className="input" type="password" placeholder="الجديد (8+ حروف)" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <input className="input" type="password" placeholder="أكدي الجديد" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <Button className="mt-3" variant="outline" onClick={changePw} loading={busy} disabled={!cur || !pw}>غيّري الباسورد</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="القفل التلقائي بعد عدم الاستخدام">
            <select className="input" value={s.session_timeout_minutes} onChange={(e) => update.mutate({ session_timeout_minutes: Number(e.target.value) })}>
              {[5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m} دقيقة</option>)}<option value={0}>من غير قفل</option>
            </select>
          </Field>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-2 font-medium"><LockKeyhole size={16} />رقم سري لـ "مساحتي الخاصة"</p>
          <p className="mb-2 text-sm text-muted">{hasPin ? 'متفعّل. القسم بيطلب الرقم كل مرة تفتحي فيها التطبيق.' : 'قفل إضافي فوق الباسورد لقسم الدورة واليوميات.'}</p>
          <div className="flex flex-wrap gap-2">
            {hasPin && <input className="input num !w-40" inputMode="numeric" type="password" maxLength={6} placeholder="الرقم الحالي" value={pinCur} onChange={(e) => setPinCur(e.target.value.replace(/\D/g, ''))} />}
            <input className="input num !w-40" inputMode="numeric" type="password" maxLength={6} placeholder={hasPin ? 'رقم جديد' : '4-6 أرقام'} value={pinNew} onChange={(e) => setPinNew(e.target.value.replace(/\D/g, ''))} />
            <Button variant="outline" onClick={() => savePin(false)} disabled={!pinNew}>{hasPin ? 'غيّري' : 'فعّلي'}</Button>
            {hasPin && <Button variant="ghost" onClick={() => savePin(true)} disabled={!pinCur}>شيلي الرقم</Button>}
          </div>
        </div>
        <Toggle label="إظهار مساحتي الخاصة في القايمة" hint="لو قفلتيها، تقدري تدخلي عليها من هنا بس" checked={s.show_wellness_in_menu} onChange={(v) => update.mutate({ show_wellness_in_menu: v })} />
        {!s.show_wellness_in_menu && <Link to="/private" className="text-sm text-[color:var(--color-rose)] underline">افتحي مساحتي الخاصة</Link>}
        <Button variant="outline" icon={<LogOut size={18} />} onClick={logoutAll}>تسجيل خروج من كل الأجهزة</Button>
      </div>
    </Section>
  );
}

function Family() {
  const kids = useRows('children').data ?? [];
  const editor = useEditor();
  const nav = useNavigate();
  return (
    <Section icon={<Baby size={18} />} title="العيلة">
      <div className="flex flex-wrap gap-2">
        {kids.map((k) => <Button key={k.id} variant="outline" onClick={() => editor.open({ resource: 'child', record: k })}><span className="size-3 rounded-full" style={{ background: k.color || '#6F8E79' }} />تعديل {k.name}</Button>)}
        <Button variant="soft" icon={<Plus size={16} />} onClick={() => editor.open({ resource: 'child' })}>إضافة</Button>
        {kids.length > 0 && <Button variant="ghost" onClick={() => nav('/children')}>جداول الأولاد</Button>}
      </div>
    </Section>
  );
}

function Categories() {
  const { data = [] } = useRows('categories');
  const [module, setModule] = useState('tasks');
  const [name, setName] = useState('');
  const qc = useQueryClient();
  const toast = useToast();
  const mods = [['tasks', 'المهام'], ['appointments', 'المواعيد'], ['expenses', 'المصاريف'], ['clients', 'مصادر العملاء'], ['household', 'البيت']];
  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from('categories').insert({ module, name: name.trim(), color: '#A39A92' });
    if (error) return toast.error(/duplicate/i.test(error.message) ? 'موجود بالفعل' : arError(error));
    setName(''); qc.invalidateQueries({ queryKey: ['categories'] });
  };
  const del = async (id: string) => { await supabase.from('categories').delete().eq('id', id); qc.invalidateQueries({ queryKey: ['categories'] }); };
  return (
    <Section icon={<Tags size={18} />} title="تصنيفات خاصة بيكي">
      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto" value={module} onChange={(e) => setModule(e.target.value)} aria-label="القسم">{mods.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <input className="input min-w-40 flex-1" placeholder="اسم التصنيف" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add} disabled={!name.trim()} icon={<Plus size={16} />}>إضافة</Button>
      </div>
      <div className="mt-3 space-y-2">
        {mods.map(([v, l]) => {
          const items = data.filter((c) => c.module === v);
          if (!items.length) return null;
          return <div key={v} className="flex flex-wrap items-center gap-1.5 text-sm"><span className="text-muted">{l}:</span>{items.map((c) => <span key={c.id} className="flex items-center gap-1 rounded-full bg-cream px-2.5 py-1">{c.name}<button aria-label="مسح" onClick={() => del(c.id)}><X size={13} /></button></span>)}</div>;
        })}
      </div>
    </Section>
  );
}

function DataSection() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState('');
  const [csvTable, setCsvTable] = useState<Table>('clients');
  const file = useRef<HTMLInputElement>(null);
  const refreshAll = () => TABLES.forEach((t) => qc.invalidateQueries({ queryKey: [t] }));

  const exportJSON = async () => {
    setBusy('json');
    try {
      const out: Record<string, unknown> = { app: 'Bella', version: 1, exported_at: new Date().toISOString() };
      const [{ data: profile }, settings] = await Promise.all([supabase.from('profiles').select('full_name,phone').maybeSingle(), qc.getQueryData(['user_settings'])]);
      out.profile = profile; out.settings = settings;
      for (const t of TABLES) out[t] = await fetchAll(t);
      download(`bella-backup-${todayISO()}.json`, JSON.stringify(out, null, 2), 'application/json');
      toast.success('النسخة الاحتياطية اتنزلت');
    } catch (e) { toast.error(arError(e)); } finally { setBusy(''); }
  };
  const exportCSV = async () => {
    setBusy('csv');
    try { const rows = await fetchAll(csvTable); if (!rows.length) toast.info('الجدول ده فاضي'); else download(`bella-${csvTable}-${todayISO()}.csv`, toCSV(rows), 'text/csv;charset=utf-8'); }
    catch (e) { toast.error(arError(e)); } finally { setBusy(''); }
  };
  const restore = async (f: File | undefined) => {
    if (!f) return;
    let json: Record<string, any>;
    try { json = JSON.parse(await f.text()); } catch { return toast.error('الملف مش نسخة Bella سليمة'); }
    if (json.app !== 'Bella') return toast.error('الملف مش نسخة Bella');
    const count = RESTORE_ORDER.reduce((s, t) => s + (Array.isArray(json[t]) ? json[t].length : 0), 0);
    if (!(await confirm({ title: 'استرجاع النسخة الاحتياطية؟', body: `هيتم استرجاع ${count} سجل. السجلات الموجودة بنفس المعرّف هتتحدث، والباقي هيفضل زي ما هو. الصور مش جوه النسخة.` }))) return;
    setBusy('restore');
    try {
      for (const t of RESTORE_ORDER) {
        const rows = (json[t] as Record<string, any>[] | undefined)?.map(({ owner_id: _o, ...r }) => r);
        if (!rows?.length) continue;
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabase.from(t).upsert(rows.slice(i, i + 500), { onConflict: CONFLICT[t] ?? 'id' });
          if (error) throw new Error(`${t}: ${error.message}`);
        }
      }
      refreshAll(); toast.success('البيانات اترجعت ✓');
    } catch (e) { toast.error(arError(e)); console.error(e); } finally { setBusy(''); if (file.current) file.current.value = ''; }
  };
  const seed = async () => {
    setBusy('seed');
    const { error } = await supabase.rpc('seed_demo_data');
    setBusy('');
    if (error) toast.error(arError(error)); else { refreshAll(); toast.success('البيانات التجريبية اتضافت'); }
  };
  const clearDemo = async () => {
    if (!(await confirm({ title: 'مسح البيانات التجريبية؟', body: 'هيتمسح بس اللي متعلّم Demo. بياناتك الحقيقية مش هتتلمس.', confirmText: 'امسحي الـ Demo', danger: true }))) return;
    setBusy('clear');
    const { error } = await supabase.rpc('clear_demo_data');
    setBusy('');
    if (error) toast.error(arError(error)); else { refreshAll(); toast.success('البيانات التجريبية اتمسحت'); }
  };

  return (
    <Section icon={<Database size={18} />} title="بياناتي والنسخ الاحتياطي">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<Download size={18} />} onClick={exportJSON} loading={busy === 'json'}>نسخة احتياطية كاملة (JSON)</Button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
          <Button variant="outline" icon={<Upload size={18} />} onClick={() => file.current?.click()} loading={busy === 'restore'}>استرجاع من نسخة</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto" value={csvTable} onChange={(e) => setCsvTable(e.target.value as Table)} aria-label="الجدول">
            {([['clients', 'العملاء'], ['properties', 'العقارات'], ['client_interactions', 'سجل التواصل'], ['appointments', 'المواعيد'], ['tasks', 'المهام'], ['lessons', 'الدروس'], ['bills', 'الفواتير'], ['expenses', 'المصاريف'], ['income', 'الدخل'], ['notes', 'الملاحظات'], ['shopping_items', 'المشتريات'], ['inventory_items', 'المخزون']] as [Table, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Button variant="outline" icon={<Download size={18} />} onClick={exportCSV} loading={busy === 'csv'}>تصدير CSV (Excel)</Button>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line/70 pt-4">
          <Button variant="soft" icon={<Wand2 size={18} />} onClick={seed} loading={busy === 'seed'}>ضيفي بيانات تجريبية</Button>
          <Button variant="ghost" icon={<Eraser size={18} />} onClick={clearDemo} loading={busy === 'clear'}>امسحي البيانات التجريبية</Button>
        </div>
      </div>
    </Section>
  );
}

function DangerZone() {
  const confirm = useConfirm();
  const toast = useToast();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const del = async () => {
    const ok = await confirm({ title: 'حذف الحساب نهائيًا', body: 'كل بياناتك (العملاء، العقارات، الأولاد، الفلوس، الملاحظات، الصور...) هتتمسح نهائي ومش هتترجع. نزّلي نسخة احتياطية الأول.', danger: true, confirmText: 'احذفي كل حاجة', typeToConfirm: 'احذفي حسابي' });
    if (!ok) return;
    setBusy(true);
    try {
      const { data: photos } = await supabase.from('property_photos').select('storage_path');
      if (photos?.length) await supabase.storage.from('media').remove(photos.map((p) => p.storage_path));
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      await signOut();
    } catch (e) { toast.error(arError(e)); setBusy(false); }
  };
  return (
    <Card className="border-danger/30 p-5">
      <SectionTitle title="منطقة خطر" icon={<Trash2 size={18} />} />
      <p className="mb-3 text-sm text-muted">حذف الحساب بيمسح كل البيانات من الداتابيز نهائيًا، وبعدها تقدري تعملي حساب جديد من الأول.</p>
      <Button variant="danger" onClick={del} loading={busy}>حذف الحساب</Button>
    </Card>
  );
}
