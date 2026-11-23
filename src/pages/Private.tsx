import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Flower2, HeartPulse, LockKeyhole, Plus, ShieldCheck, Info } from 'lucide-react';
import { useRows, saveRow } from '@/lib/api';
import { supabase, arError, type Row } from '@/lib/supabase';
import { FLOW, labelOf } from '@/lib/constants';
import { addDays, addMonths, diffDays, fmtDate, fmtMonth, fmtWeekday, monthEnd, monthStart, todayISO, weekStart } from '@/lib/format';
import { useSettings } from '@/lib/settings';
import { Badge, Button, Card, cx, Empty, IconButton, ListSkeleton, PageHeader, Segmented, SectionTitle, Stat, useToast } from '@/components/ui';
import { useEditor } from '@/components/Editor';

const PIN_OK = 'bella_pin_ok';

export default function PrivatePage() {
  const [state, setState] = useState<'checking' | 'locked' | 'open'>('checking');
  useEffect(() => {
    if (sessionStorage.getItem(PIN_OK) === '1') return setState('open');
    supabase.rpc('has_pin').then(({ data }) => setState(data ? 'locked' : 'open'));
  }, []);
  if (state === 'checking') return <ListSkeleton />;
  if (state === 'locked') return <PinGate onOk={() => { sessionStorage.setItem(PIN_OK, '1'); setState('open'); }} />;
  return <PrivateContent />;
}

function PinGate({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const check = async (p: string) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('verify_pin', { pin: p });
    setBusy(false);
    if (error) return setErr(arError(error));
    if (data) onOk(); else { setErr('الرقم السري غلط'); setPin(''); }
  };
  const press = (d: string) => { if (busy) return; const n = (pin + d).slice(0, 6); setPin(n); setErr(''); if (n.length >= 4 && n.length === 6) check(n); };
  return (
    <div className="mx-auto max-w-xs pt-8 text-center anim-rise">
      <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-rose-soft text-[color:var(--color-rose)]"><LockKeyhole /></div>
      <h1 className="text-2xl font-semibold">مساحتك الخاصة</h1>
      <p className="mb-5 text-sm text-muted">اكتبي الرقم السري</p>
      <div className="mb-2 flex justify-center gap-2" dir="ltr">{Array.from({ length: 6 }, (_, i) => <span key={i} className={cx('size-3 rounded-full', i < pin.length ? 'bg-ink' : 'bg-sand')} />)}</div>
      <p className="h-5 text-sm text-danger">{err}</p>
      <div className="mt-3 grid grid-cols-3 gap-3" dir="ltr">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} onClick={() => press(d)} className="num h-16 rounded-2xl bg-white text-2xl shadow-soft active:scale-95">{d}</button>)}
        <button onClick={() => setPin(pin.slice(0, -1))} className="h-16 rounded-2xl text-sm text-muted">مسح</button>
        <button onClick={() => press('0')} className="num h-16 rounded-2xl bg-white text-2xl shadow-soft active:scale-95">0</button>
        <button onClick={() => pin.length >= 4 && check(pin)} disabled={pin.length < 4 || busy} className="h-16 rounded-2xl bg-ink text-sm text-ivory disabled:opacity-40">دخول</button>
      </div>
    </div>
  );
}

function stats(rows: Row[]) {
  const starts = rows.map((r) => r.start_date as string).sort();
  const intervals: number[] = [];
  for (let i = 1; i < starts.length; i++) { const d = diffDays(starts[i], starts[i - 1]); if (d >= 15 && d <= 60) intervals.push(d); }
  const durations = rows.filter((r) => r.end_date).map((r) => diffDays(r.end_date, r.start_date) + 1);
  const avgCycle = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null;
  const avgDur = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  const last = starts[starts.length - 1];
  // Only estimate after at least 2 measured cycles (3 recorded starts).
  const next = avgCycle && intervals.length >= 2 && last ? (() => { let n = addDays(last, avgCycle); while (n < todayISO()) n = addDays(n, avgCycle); return n; })() : null;
  return { avgCycle, avgDur, next, intervals: intervals.length, last };
}

function PrivateContent() {
  const [tab, setTab] = useState<'cycle' | 'wellness'>('cycle');
  return (
    <div>
      <PageHeader title="مساحتي الخاصة" subtitle={<span className="flex items-center gap-1"><ShieldCheck size={15} />مبتظهرش في الرئيسية ولا الكالندر ولا التنبيهات</span>} />
      <Segmented className="mb-4" value={tab} onChange={setTab} options={[{ value: 'cycle', label: 'الدورة' }, { value: 'wellness', label: 'يومياتي' }]} />
      {tab === 'cycle' ? <Cycle /> : <Wellness />}
    </div>
  );
}

function Cycle() {
  const { data = [], isLoading } = useRows('period_records');
  const editor = useEditor();
  const qc = useQueryClient();
  const toast = useToast();
  const settings = useSettings();
  const [month, setMonth] = useState(monthStart(todayISO()));
  const today = todayISO();
  const s = useMemo(() => stats(data), [data]);
  const current = data.find((r) => r.start_date <= today && (!r.end_date ? diffDays(today, r.start_date) < 12 : r.end_date >= today));
  const dayOf = current ? diffDays(today, current.start_date) + 1 : null;

  const periodDays = useMemo(() => {
    const set = new Set<string>();
    for (const r of data) { const end = r.end_date || addDays(r.start_date, (s.avgDur ?? 5) - 1); for (let d = r.start_date; d <= end; d = addDays(d, 1)) set.add(d); }
    return set;
  }, [data, s.avgDur]);
  const predicted = useMemo(() => {
    const set = new Set<string>();
    if (s.next && s.avgCycle) for (let k = 0; k < 3; k++) { const st = addDays(s.next, k * s.avgCycle); for (let i = 0; i < (s.avgDur ?? 5); i++) set.add(addDays(st, i)); }
    return set;
  }, [s]);

  const quick = async (kind: 'start' | 'end') => {
    try {
      if (kind === 'start') await saveRow('period_records', { start_date: today });
      else if (current) await saveRow('period_records', { id: current.id, end_date: today });
      qc.invalidateQueries({ queryKey: ['period_records'] });
      toast.success('اتسجل');
    } catch (e) { toast.error(arError(e)); }
  };

  const start = weekStart(month, settings.week_start);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  if (isLoading) return <ListSkeleton />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="دلوقتي" tone="rose" value={current ? `اليوم ${dayOf}` : '—'} hint={current ? 'الدورة شغالة' : 'مفيش دورة حالية'} />
        <Stat label="متوسط طول الدورة" value={s.avgCycle ? `${s.avgCycle} يوم` : '—'} hint={s.intervals ? `من ${s.intervals} دورة` : 'محتاجة بيانات أكتر'} />
        <Stat label="متوسط مدة الدورة" value={s.avgDur ? `${s.avgDur} أيام` : '—'} />
        <Stat label="الجاية (تقدير)" tone="sage" value={s.next ? fmtDate(s.next) : '—'} hint={s.next ? `بعد ${diffDays(s.next, today)} يوم تقريبًا` : 'بنحسبها بعد تسجيل دورتين على الأقل'} />
      </div>
      <p className="flex items-start gap-2 rounded-2xl bg-cream/80 p-3 text-sm text-muted"><Info size={16} className="mt-0.5 shrink-0" />التوقعات دي تقدير حسابي من البيانات اللي سجلتيها بس — مش تشخيص ولا معلومة طبية. لو فيه حاجة مقلقاكي استشيري دكتورة.</p>
      <div className="flex flex-wrap gap-2">
        {current && !current.end_date ? <Button onClick={() => quick('end')}>خلصت النهارده</Button> : <Button onClick={() => quick('start')}>بدأت النهارده</Button>}
        <Button variant="outline" icon={<Plus size={18} />} onClick={() => editor.open({ resource: 'period' })}>تسجيل بالتفاصيل</Button>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <IconButton label="الشهر اللي فات" onClick={() => setMonth(addMonths(month, -1))}><ChevronRight size={20} /></IconButton>
          <span className="font-semibold">{fmtMonth(month)}</span>
          <IconButton label="الشهر الجاي" onClick={() => setMonth(addMonths(month, 1))}><ChevronLeft size={20} /></IconButton>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {cells.slice(0, 7).map((d) => <span key={d} className="text-xs text-muted">{fmtWeekday(d, 'short')}</span>)}
          {cells.map((d) => {
            const inMonth = d >= month && d <= monthEnd(month);
            const p = periodDays.has(d), pr = !p && predicted.has(d);
            return (
              <span key={d} className={cx('num flex aspect-square items-center justify-center rounded-full text-sm', !inMonth && 'opacity-30', p && 'bg-[color:var(--color-rose)] font-semibold text-white', pr && 'border-2 border-dashed border-[color:var(--color-rose)]/60 text-[color:var(--color-rose)]', d === today && !p && 'ring-2 ring-ink')}>
                {fmtDate(d, { day: 'numeric' })}
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted"><span className="flex items-center gap-1"><span className="size-3 rounded-full bg-[color:var(--color-rose)]" />متسجلة</span><span className="flex items-center gap-1"><span className="size-3 rounded-full border-2 border-dashed border-[color:var(--color-rose)]/60" />تقدير</span></div>
      </Card>

      <Card className="p-4">
        <SectionTitle title="السجل" icon={<Flower2 size={18} />} />
        {data.length ? data.map((r) => (
          <button key={r.id} onClick={() => editor.open({ resource: 'period', record: r })} className="block w-full border-b border-line/70 px-1 py-3 text-start last:border-0">
            <div className="flex items-center justify-between gap-2">
              <span className="num font-medium">{fmtDate(r.start_date)} {r.end_date ? `← ${fmtDate(r.end_date)}` : '(لسه)'}</span>
              <span className="flex gap-1">{r.flow && <Badge color="#B9787A">{labelOf(FLOW, r.flow)}</Badge>}{r.pain_level != null && <Badge color="#776D66">ألم {r.pain_level}/10</Badge>}</span>
            </div>
            {!!r.symptoms?.length && <p className="text-sm text-muted">{r.symptoms.join('، ')}</p>}
            {r.mood && <p className="text-sm text-muted">{r.mood}</p>}
          </button>
        )) : <Empty title="لسه مفيش تسجيلات" hint="سجلي أول يوم في الدورة وهنبدأ نحسب المتوسطات" />}
      </Card>
    </div>
  );
}

function Wellness() {
  const { data = [], isLoading } = useRows('wellness_records');
  const editor = useEditor();
  if (isLoading) return <ListSkeleton />;
  const last7 = data.filter((r) => r.record_date >= addDays(todayISO(), -6));
  const avgSleep = last7.filter((r) => r.sleep_hours).reduce((s, r, _i, a) => s + Number(r.sleep_hours) / a.length, 0);
  const avgEnergy = last7.filter((r) => r.energy).reduce((s, r, _i, a) => s + Number(r.energy) / a.length, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="متوسط النوم (آخر 7 أيام)" value={avgSleep ? `${avgSleep.toFixed(1)} ساعة` : '—'} />
        <Stat label="متوسط الطاقة" value={avgEnergy ? `${avgEnergy.toFixed(1)} / 5` : '—'} />
        <div className="flex items-center"><Button icon={<Plus size={18} />} onClick={() => editor.open({ resource: 'wellness', quick: true })}>سجلي النهارده</Button></div>
      </div>
      <Card className="p-4">
        <SectionTitle title="يومياتي" icon={<HeartPulse size={18} />} />
        {data.length ? data.map((r) => (
          <button key={r.id} onClick={() => editor.open({ resource: 'wellness', record: r })} className="block w-full border-b border-line/70 px-1 py-3 text-start last:border-0">
            <div className="flex items-center justify-between"><span className="font-medium">{fmtDate(r.record_date, { weekday: 'long', day: 'numeric', month: 'long' })}</span><span className="text-sm">{r.mood}</span></div>
            <p className="num text-sm text-muted">{[r.sleep_hours && `نوم ${r.sleep_hours} س`, r.energy && `طاقة ${r.energy}/5`].filter(Boolean).join(' · ')}</p>
            {r.notes && <p className="mt-1 text-sm">{r.notes}</p>}
          </button>
        )) : <Empty title="ابدأي تسجلي المود والنوم والطاقة" />}
      </Card>
    </div>
  );
}
