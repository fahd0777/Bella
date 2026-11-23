import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Phone, MessageCircle, Users, CalendarClock } from 'lucide-react';
import { useRows } from '@/lib/api';
import { useActions } from '@/lib/actions';
import { CLIENT_TYPES, LEAD_SOURCES, PIPELINE, PRIORITIES, PROPERTY_TYPES, labelOf, colorOf } from '@/lib/constants';
import { fmtMoney, fmtTime, relDay, telLink, todayISO, waLink, addDays } from '@/lib/format';
import type { Row } from '@/lib/supabase';
import { Badge, Button, Card, Chip, cx, Empty, ListSkeleton, PageHeader, PriorityBadge, Segmented } from '@/components/ui';
import { useEditor } from '@/components/Editor';
import { matches } from '@/components/GlobalSearch';

type Tab = 'pipeline' | 'list' | 'followups';
const budget = (c: Row) => (c.budget_min || c.budget_max ? `${c.budget_min ? fmtMoney(c.budget_min, true) : ''}${c.budget_min && c.budget_max ? ' – ' : ''}${c.budget_max ? fmtMoney(c.budget_max, true) : ''}` : '');

export default function ClientsPage() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as Tab) || 'pipeline';
  const { data = [], isLoading } = useRows('clients');
  const editor = useEditor();
  const [q, setQ] = useState('');
  const [showF, setShowF] = useState(false);
  const [f, setF] = useState({ type: '', status: '', area: '', ptype: '', source: '', priority: '', follow: '', bmin: '', bmax: '' });
  const today = todayISO();

  const rows = useMemo(() => data.filter((c) =>
    matches(q, c.full_name, c.phone, c.whatsapp, c.preferred_area, c.notes, c.requirements) &&
    (!f.type || c.client_type === f.type) && (!f.status || c.status === f.status) && (!f.ptype || c.property_type === f.ptype) &&
    (!f.source || c.lead_source === f.source) && (!f.priority || c.priority === f.priority) && (!f.area || matches(f.area, c.preferred_area)) &&
    (!f.bmin || Number(c.budget_max ?? c.budget_min ?? 0) >= Number(f.bmin)) && (!f.bmax || Number(c.budget_min ?? c.budget_max ?? Infinity) <= Number(f.bmax)) &&
    (!f.follow || (f.follow === 'overdue' ? c.next_followup_date && c.next_followup_date < today : f.follow === 'today' ? c.next_followup_date === today : f.follow === 'week' ? c.next_followup_date && c.next_followup_date >= today && c.next_followup_date <= addDays(today, 7) : !c.next_followup_date)),
  ), [data, q, f, today]);
  const activeFilters = Object.values(f).filter(Boolean).length;

  return (
    <div>
      <PageHeader title="العملاء" subtitle={`${data.length} عميل · ${data.filter((c) => !['closed_won', 'lost'].includes(c.status)).length} شغالين`} actions={<Button icon={<Plus size={18} />} onClick={() => editor.open({ resource: 'client' })}>عميل جديد</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented value={tab} onChange={(v) => setSp({ tab: v }, { replace: true })} options={[{ value: 'pipeline', label: 'المراحل' }, { value: 'list', label: 'القايمة' }, { value: 'followups', label: 'المتابعات', count: data.filter((c) => c.next_followup_date && c.next_followup_date <= today && !['closed_won', 'lost'].includes(c.status)).length }]} />
        <div className="relative min-w-52 flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input ps-9" placeholder="اسم، موبايل، منطقة، ملاحظات..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Button variant={activeFilters ? 'soft' : 'outline'} icon={<SlidersHorizontal size={18} />} onClick={() => setShowF(!showF)}>فلاتر{activeFilters ? ` (${activeFilters})` : ''}</Button>
      </div>
      {showF && (
        <Card className="mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-4 anim-rise">
          {([['type', 'النوع', CLIENT_TYPES], ['status', 'المرحلة', PIPELINE], ['ptype', 'نوع العقار', PROPERTY_TYPES], ['source', 'المصدر', LEAD_SOURCES], ['priority', 'الأولوية', PRIORITIES], ['follow', 'المتابعة', [{ value: 'overdue', label: 'متأخرة' }, { value: 'today', label: 'النهارده' }, { value: 'week', label: 'الأسبوع ده' }, { value: 'none', label: 'من غير ميعاد' }]]] as const).map(([k, l, opts]) => (
            <label key={k} className="text-sm"><span className="mb-1 block text-muted">{l}</span>
              <select className="input" value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}><option value="">الكل</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            </label>
          ))}
          <label className="text-sm"><span className="mb-1 block text-muted">المنطقة</span><input className="input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block text-muted">ميزانية من</span><input className="input num" type="number" value={f.bmin} onChange={(e) => setF({ ...f, bmin: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block text-muted">ميزانية لحد</span><input className="input num" type="number" value={f.bmax} onChange={(e) => setF({ ...f, bmax: e.target.value })} /></label>
          <div className="flex items-end"><Button variant="ghost" onClick={() => setF({ type: '', status: '', area: '', ptype: '', source: '', priority: '', follow: '', bmin: '', bmax: '' })}>مسح الفلاتر</Button></div>
        </Card>
      )}
      {isLoading ? <ListSkeleton rows={6} /> : !data.length ? (
        <Empty icon={<Users />} title="لسه مفيش عملاء" hint="ضيفي أول عميل وتابعيه من أول مكالمة لحد قفل الصفقة" action={<Button onClick={() => editor.open({ resource: 'client' })}>ضيفي عميل</Button>} />
      ) : tab === 'pipeline' ? <Pipeline rows={rows} /> : tab === 'list' ? <ClientList rows={rows} /> : <Followups rows={rows} />}
    </div>
  );
}

function ClientCard({ c, compact, status }: { c: Row; compact?: boolean; status?: boolean }) {
  const nav = useNavigate();
  const today = todayISO();
  const overdue = c.next_followup_date && c.next_followup_date < today && !['closed_won', 'lost'].includes(c.status);
  return (
    <div onClick={() => nav(`/crm/${c.id}`)} role="button" tabIndex={0} className={cx('cursor-pointer rounded-2xl border border-line bg-white p-3 shadow-soft transition hover:shadow-lift', overdue && 'border-danger/40')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{c.full_name}{c.is_demo && <span className="ms-1 text-[10px] font-normal text-warn">Demo</span>}</p>
          <p className="truncate text-xs text-muted">{labelOf(CLIENT_TYPES, c.client_type)}{c.preferred_area ? ` · ${c.preferred_area}` : ''}</p>
        </div>
        <PriorityBadge value={c.priority} />
      </div>
      {status && <div className="mt-1.5"><Badge color={colorOf(PIPELINE, c.status)}>{labelOf(PIPELINE, c.status)}</Badge></div>}
      {!compact && budget(c) && <p className="num mt-1.5 text-sm">{budget(c)}</p>}
      <div className="mt-2 flex items-center justify-between gap-2">
        {c.next_followup_date ? <span className={cx('flex items-center gap-1 text-xs', overdue ? 'font-semibold text-danger' : 'text-muted')}><CalendarClock size={13} />{relDay(c.next_followup_date)}{c.next_followup_time ? ` ${fmtTime(c.next_followup_time)}` : ''}</span> : <span className="text-xs text-muted/70">من غير متابعة</span>}
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {(c.whatsapp || c.phone) && <a aria-label="واتساب" href={waLink(c.whatsapp || c.phone)} target="_blank" rel="noreferrer" className="flex size-8 items-center justify-center rounded-lg bg-sage-soft text-sage"><MessageCircle size={15} /></a>}
          {c.phone && <a aria-label="اتصال" href={telLink(c.phone)} className="flex size-8 items-center justify-center rounded-lg bg-cream text-ink"><Phone size={15} /></a>}
        </div>
      </div>
    </div>
  );
}

function Pipeline({ rows }: { rows: Row[] }) {
  const { moveClient } = useActions();
  const [over, setOver] = useState<string | null>(null);
  const [picked, setMobileStage] = useState<string | null>(null);
  const mobileStage = picked ?? (PIPELINE.find((s) => rows.some((c) => c.status === s.value)) ?? PIPELINE[0]).value;
  return (
    <>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none md:hidden">
        {PIPELINE.map((s) => <Chip key={s.value} active={mobileStage === s.value} onClick={() => setMobileStage(s.value)}>{s.label} <span className="num opacity-70">{rows.filter((c) => c.status === s.value).length}</span></Chip>)}
      </div>
      <div className="space-y-2 md:hidden">
        {rows.filter((c) => c.status === mobileStage).map((c) => (
          <div key={c.id}>
            <ClientCard c={c} />
            <select aria-label="نقل لمرحلة" className="input mt-1 !min-h-9 text-sm" value={c.status} onChange={(e) => moveClient(c, e.target.value, labelOf(PIPELINE, e.target.value))}>
              {PIPELINE.map((s) => <option key={s.value} value={s.value}>نقل لـ: {s.label}</option>)}
            </select>
          </div>
        ))}
        {!rows.some((c) => c.status === mobileStage) && <Empty title="مفيش عملاء في المرحلة دي" />}
      </div>
      <div className="hidden gap-3 overflow-x-auto pb-4 md:flex">
        {PIPELINE.map((s) => {
          const items = rows.filter((c) => c.status === s.value);
          return (
            <div key={s.value} onDragOver={(e) => { e.preventDefault(); setOver(s.value); }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain'); const c = rows.find((r) => r.id === id); if (c) moveClient(c, s.value, s.label); }}
              className={cx('flex w-64 shrink-0 flex-col rounded-3xl bg-cream/70 p-2 transition', over === s.value && 'bg-rose-soft ring-2 ring-[color:var(--color-rose)]/40')}>
              <div className="flex items-center gap-2 px-2 py-2 text-sm font-semibold"><span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.label}<span className="num ms-auto text-muted">{items.length}</span></div>
              <div className="min-h-24 space-y-2">
                {items.map((c) => <div key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}><ClientCard c={c} compact /></div>)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ClientList({ rows }: { rows: Row[] }) {
  const [sort, setSort] = useState<'recent' | 'followup' | 'name' | 'budget'>('recent');
  const sorted = rows.slice().sort((a, b) =>
    sort === 'name' ? a.full_name.localeCompare(b.full_name, 'ar') : sort === 'budget' ? Number(b.budget_max ?? 0) - Number(a.budget_max ?? 0) : sort === 'followup' ? (a.next_followup_date ?? '9999').localeCompare(b.next_followup_date ?? '9999') : b.created_at.localeCompare(a.created_at));
  if (!rows.length) return <Empty title="مفيش نتايج" />;
  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-sm text-muted">ترتيب:
        {([['recent', 'الأحدث'], ['followup', 'المتابعة'], ['name', 'الاسم'], ['budget', 'الميزانية']] as const).map(([k, l]) => <Chip key={k} active={sort === k} onClick={() => setSort(k)}>{l}</Chip>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((c) => (
          <ClientCard key={c.id} c={c} status />
        ))}
      </div>
    </>
  );
}

function Followups({ rows }: { rows: Row[] }) {
  const today = todayISO();
  const act = rows.filter((c) => !['closed_won', 'lost'].includes(c.status));
  const groups = [
    { title: 'متأخرة', tone: 'text-danger', items: act.filter((c) => c.next_followup_date && c.next_followup_date < today) },
    { title: 'النهارده', tone: 'text-[color:var(--color-rose)]', items: act.filter((c) => c.next_followup_date === today) },
    { title: 'جاية', tone: 'text-ink', items: act.filter((c) => c.next_followup_date && c.next_followup_date > today).sort((a, b) => a.next_followup_date.localeCompare(b.next_followup_date)) },
    { title: 'من غير ميعاد متابعة', tone: 'text-muted', items: act.filter((c) => !c.next_followup_date) },
  ];
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className={cx('mb-2 flex items-center gap-2 font-semibold', g.tone)}>{g.title}<span className="num rounded-full bg-cream px-2 text-sm text-muted">{g.items.length}</span></h3>
          {g.items.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{g.items.map((c) => <ClientCard key={c.id} c={c} status />)}</div> : <p className="text-sm text-muted/70">—</p>}
        </section>
      ))}
    </div>
  );
}
