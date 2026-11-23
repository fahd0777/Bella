import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, AlertTriangle } from 'lucide-react';
import { buildEvents, findOverlaps, useCalendarData, type CalEvent, KIND_LABEL, type EventKind } from '@/lib/events';
import { addDays, addMonths, fmtDate, fmtDateLong, fmtMonth, fmtTime, fmtWeekday, monthEnd, monthStart, timeToMin, todayISO, weekStart } from '@/lib/format';
import { useSettings } from '@/lib/settings';
import { Button, Card, Chip, cx, Empty, IconButton, ListSkeleton, PageHeader, Segmented } from '@/components/ui';
import { EventItem } from '@/components/Rows';
import { useEditor } from '@/components/Editor';

type View = 'day' | 'week' | 'month' | 'agenda' | 'upcoming';
const START_H = 7, END_H = 23, HOUR_PX = 56;

export default function CalendarPage() {
  const [sp, setSp] = useSearchParams();
  const view = (sp.get('view') as View) || 'week';
  const date = sp.get('date') || todayISO();
  const set = (p: Record<string, string>) => setSp({ view, date, ...p }, { replace: true });
  const { data, loading } = useCalendarData();
  const settings = useSettings();
  const editor = useEditor();
  const [who, setWho] = useState<string>('all');
  const [hidden, setHidden] = useState<Set<EventKind>>(new Set());

  const range = useMemo(() => {
    if (view === 'day') return [date, date];
    if (view === 'week') { const s = weekStart(date, settings.week_start); return [s, addDays(s, 6)]; }
    if (view === 'month') { const s = weekStart(monthStart(date), settings.week_start); return [s, addDays(s, 41)]; }
    if (view === 'agenda') return [date, addDays(date, 30)];
    return [todayISO(), addDays(todayISO(), 14)];
  }, [view, date, settings.week_start]);

  const events = useMemo(() => {
    let ev = buildEvents(data, range[0], range[1], { includeCancelled: true });
    if (who === 'me') ev = ev.filter((e) => !e.childId);
    else if (who !== 'all') ev = ev.filter((e) => e.childId === who);
    if (hidden.size) ev = ev.filter((e) => !hidden.has(e.kind));
    if (view === 'upcoming') ev = ev.filter((e) => e.kind !== 'school');
    return ev;
  }, [data, range, who, hidden, view]);

  const step = (dir: number) => {
    if (view === 'day') set({ date: addDays(date, dir) });
    else if (view === 'week') set({ date: addDays(date, 7 * dir) });
    else if (view === 'month') set({ date: addMonths(date, dir) });
    else set({ date: addDays(date, 30 * dir) });
  };
  const title = view === 'day' ? fmtDateLong(date) : view === 'month' ? fmtMonth(date) : view === 'week' ? `${fmtDate(range[0])} — ${fmtDate(range[1])}` : view === 'agenda' ? `من ${fmtDate(range[0])}` : 'الأسبوعين الجايين';
  const newAt = (d: string, time?: string) => editor.open({ resource: 'appointment', quick: true, defaults: { start_date: d, ...(time ? { start_time: time } : {}) } });

  const kinds: EventKind[] = ['appointment', 'followup', 'lesson', 'school', 'exam', 'homework', 'activity', 'bill', 'maintenance'];

  return (
    <div>
      <PageHeader title="الكالندر" subtitle="مواعيدك ومواعيد الأولاد في مكان واحد" actions={<Button icon={<Plus size={18} />} onClick={() => newAt(view === 'day' ? date : todayISO())}>موعد جديد</Button>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented value={view} onChange={(v) => set({ view: v })} options={[{ value: 'day', label: 'يوم' }, { value: 'week', label: 'أسبوع' }, { value: 'month', label: 'شهر' }, { value: 'agenda', label: 'أجندة' }, { value: 'upcoming', label: 'الجاي' }]} />
        {view !== 'upcoming' && (
          <div className="flex items-center gap-1">
            <IconButton label="السابق" onClick={() => step(-1)}><ChevronRight size={20} /></IconButton>
            <Button variant="outline" size="sm" onClick={() => set({ date: todayISO() })}>النهارده</Button>
            <IconButton label="التالي" onClick={() => step(1)}><ChevronLeft size={20} /></IconButton>
          </div>
        )}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Chip active={who === 'all'} onClick={() => setWho('all')}>الكل</Chip>
        <Chip active={who === 'me'} onClick={() => setWho('me')}>أنا</Chip>
        {data.children.map((c) => <Chip key={c.id} active={who === c.id} onClick={() => setWho(c.id)}><span className="me-1 inline-block size-2 rounded-full" style={{ background: c.color || '#6F8E79' }} />{c.name}</Chip>)}
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {kinds.map((k) => (
          <button key={k} onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
            className={cx('shrink-0 rounded-full px-2.5 py-1 text-xs transition', hidden.has(k) ? 'bg-white text-muted/60 line-through' : 'bg-cream text-ink')}>{KIND_LABEL[k]}</button>
        ))}
      </div>

      {loading ? <ListSkeleton rows={6} /> : (
        <>
          {view === 'month' && <MonthView events={events} anchor={date} start={range[0]} onPick={(d) => set({ view: 'day', date: d })} />}
          {view === 'week' && <WeekView events={events} start={range[0]} onNew={newAt} onPickDay={(d) => set({ view: 'day', date: d })} />}
          {view === 'day' && <DayView events={events} date={date} onNew={newAt} />}
          {(view === 'agenda' || view === 'upcoming') && <AgendaView events={events} />}
        </>
      )}
    </div>
  );
}

function useOpen() {
  const editor = useEditor();
  const nav = useNavigate();
  return (e: CalEvent) => (e.kind === 'appointment' || e.kind === 'bill' || e.kind === 'maintenance' ? editor.open({ resource: e.resource, record: e.row }) : e.link ? nav(e.link) : editor.open({ resource: e.resource, record: e.row }));
}

function MonthView({ events, anchor, start, onPick }: { events: CalEvent[]; anchor: string; start: string; onPick: (d: string) => void }) {
  const today = todayISO();
  const m0 = monthStart(anchor), m1 = monthEnd(anchor);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line bg-cream/50 text-center text-xs font-medium text-muted">
        {days.slice(0, 7).map((d) => <div key={d} className="py-2">{fmtWeekday(d, 'short')}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const evs = events.filter((e) => e.date === d && e.kind !== 'school');
          const out = d < m0 || d > m1;
          return (
            <button key={d} onClick={() => onPick(d)} className={cx('min-h-[76px] border-b border-e border-line/70 p-1.5 text-start align-top transition hover:bg-cream/60 md:min-h-[108px]', out && 'bg-ivory/60 text-muted/50')}>
              <span className={cx('num inline-flex size-7 items-center justify-center rounded-full text-sm', d === today && 'bg-ink font-semibold text-ivory')}>{fmtDate(d, { day: 'numeric' })}</span>
              <div className="mt-0.5 hidden space-y-0.5 md:block">
                {evs.slice(0, 3).map((e) => <div key={e.key} className="truncate rounded-md px-1 text-[11px]" style={{ background: e.color + '22', color: e.color }}>{e.start ? fmtTime(e.start) + ' ' : ''}{e.title}</div>)}
                {evs.length > 3 && <div className="text-[11px] text-muted">+{evs.length - 3}</div>}
              </div>
              <div className="mt-1 flex flex-wrap gap-0.5 md:hidden">{evs.slice(0, 4).map((e) => <span key={e.key} className="size-1.5 rounded-full" style={{ background: e.color }} />)}</div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** Greedy column layout for overlapping timed events in one day. */
function layout(evs: CalEvent[]) {
  const timed = evs.filter((e) => e.start).map((e) => ({ e, s: timeToMin(e.start)!, en: timeToMin(e.end) ?? timeToMin(e.start)! + 60 })).sort((a, b) => a.s - b.s);
  const out: { e: CalEvent; s: number; en: number; col: number; cols: number }[] = [];
  let cluster: typeof out = [];
  let clusterEnd = -1;
  const flush = () => { const n = Math.max(...cluster.map((c) => c.col)) + 1; cluster.forEach((c) => (c.cols = n)); out.push(...cluster); cluster = []; };
  for (const t of timed) {
    if (cluster.length && t.s >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.en > t.s).map((c) => c.col));
    let col = 0; while (used.has(col)) col++;
    cluster.push({ ...t, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, t.en);
  }
  if (cluster.length) flush();
  return out;
}

function TimeColumn({ events, date, onNew, compact }: { events: CalEvent[]; date: string; onNew: (d: string, t?: string) => void; compact?: boolean }) {
  const open = useOpen();
  const items = layout(events.filter((e) => e.date === date && e.kind !== 'school'));
  const today = todayISO();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return (
    <div className="relative border-s border-line/70" style={{ height: (END_H - START_H) * HOUR_PX }}>
      {Array.from({ length: END_H - START_H }, (_, i) => (
        <button key={i} aria-label="موعد جديد" onClick={() => onNew(date, `${String(START_H + i).padStart(2, '0')}:00`)} className="absolute inset-x-0 border-t border-line/60 hover:bg-rose-soft/40" style={{ top: i * HOUR_PX, height: HOUR_PX }} />
      ))}
      {date === today && nowMin >= START_H * 60 && nowMin <= END_H * 60 && <div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-[color:var(--color-rose)]" style={{ top: ((nowMin - START_H * 60) / 60) * HOUR_PX }} />}
      {items.map(({ e, s, en, col, cols }) => {
        const top = Math.max(0, ((s - START_H * 60) / 60) * HOUR_PX);
        const h = Math.max(24, ((en - s) / 60) * HOUR_PX - 2);
        return (
          <button key={e.key} onClick={() => open(e)} className={cx('absolute z-[5] overflow-hidden rounded-lg border-s-[3px] px-1.5 py-0.5 text-start text-[12px] leading-tight shadow-sm transition hover:z-20 hover:shadow-lift', e.status === 'cancelled' && 'line-through opacity-50')}
            style={{ top, height: h, insetInlineStart: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)`, background: e.color + '24', borderColor: e.color, color: '#2E2A28' }}>
            <span className="block truncate font-semibold">{e.title}</span>
            {!compact && <span className="num block truncate opacity-70">{fmtTime(e.start)}{e.end ? ` - ${fmtTime(e.end)}` : ''}</span>}
          </button>
        );
      })}
    </div>
  );
}

const Hours = () => (
  <div className="relative w-12 shrink-0" style={{ height: (END_H - START_H) * HOUR_PX }}>
    {Array.from({ length: END_H - START_H }, (_, i) => <span key={i} className="num absolute end-1 -translate-y-2 text-[11px] text-muted" style={{ top: i * HOUR_PX }}>{fmtTime(`${START_H + i}:00`).replace(':00', '')}</span>)}
  </div>
);

function AllDay({ events, date }: { events: CalEvent[]; date: string }) {
  const open = useOpen();
  const evs = events.filter((e) => e.date === date && (!e.start || e.kind === 'school'));
  if (!evs.length) return null;
  return <div className="space-y-1 p-1">{evs.map((e) => <button key={e.key} onClick={() => open(e)} className="block w-full truncate rounded-md px-1.5 py-0.5 text-start text-[11px]" style={{ background: e.color + '22', color: e.color }}>{e.title}{e.kind === 'school' && e.start ? ` ${fmtTime(e.start)}–${fmtTime(e.end)}` : ''}</button>)}</div>;
}

function WeekView({ events, start, onNew, onPickDay }: { events: CalEvent[]; start: string; onNew: (d: string, t?: string) => void; onPickDay: (d: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayISO();
  const open = useOpen();
  return (
    <>
      {/* Mobile: stacked list */}
      <div className="space-y-3 md:hidden">
        {days.map((d) => {
          const evs = events.filter((e) => e.date === d);
          return (
            <Card key={d} className={cx('p-3', d === today && 'ring-2 ring-[color:var(--color-rose)]/30')}>
              <button onClick={() => onPickDay(d)} className="mb-1 flex w-full items-center justify-between px-1">
                <span className="font-semibold">{fmtWeekday(d)} <span className="num font-normal text-muted">{fmtDate(d)}</span></span>
                <span className="num text-xs text-muted">{evs.length || ''}</span>
              </button>
              {evs.length ? evs.map((e) => <EventItem key={e.key} e={e} onClick={() => open(e)} />) : <p className="px-1 text-sm text-muted/70">فاضي</p>}
            </Card>
          );
        })}
      </div>
      {/* Desktop: time grid */}
      <Card className="hidden overflow-hidden md:block">
        <div className="flex border-b border-line bg-cream/40">
          <div className="w-12 shrink-0" />
          {days.map((d) => (
            <button key={d} onClick={() => onPickDay(d)} className="flex-1 border-s border-line/70 py-2 text-center hover:bg-cream">
              <div className="text-xs text-muted">{fmtWeekday(d, 'short')}</div>
              <div className={cx('num mx-auto flex size-8 items-center justify-center rounded-full font-semibold', d === today && 'bg-ink text-ivory')}>{fmtDate(d, { day: 'numeric' })}</div>
            </button>
          ))}
        </div>
        <div className="flex border-b border-line/70"><div className="w-12 shrink-0 py-1 text-center text-[10px] text-muted">اليوم</div>{days.map((d) => <div key={d} className="min-h-6 flex-1 border-s border-line/70"><AllDay events={events} date={d} /></div>)}</div>
        <div className="max-h-[70vh] overflow-y-auto pt-2">
          <div className="flex"><Hours />{days.map((d) => <div key={d} className="flex-1"><TimeColumn events={events} date={d} onNew={onNew} compact /></div>)}</div>
        </div>
      </Card>
    </>
  );
}

function DayView({ events, date, onNew }: { events: CalEvent[]; date: string; onNew: (d: string, t?: string) => void }) {
  const dayEvents = events.filter((e) => e.date === date);
  const conflicts = dayEvents.filter((e) => e.status !== 'cancelled' && findOverlaps(dayEvents.filter((x) => x.status !== 'cancelled'), { date, start: e.start, end: e.end, id: e.id }).length > 0);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden">
        <div className="border-b border-line/70"><AllDay events={events} date={date} /></div>
        <div className="max-h-[72vh] overflow-y-auto pt-2"><div className="flex"><Hours /><div className="flex-1"><TimeColumn events={events} date={date} onNew={onNew} /></div></div></div>
      </Card>
      <div className="space-y-3">
        {conflicts.length > 0 && (
          <div className="rounded-2xl bg-warn-soft p-3 text-sm"><p className="mb-1 flex items-center gap-1 font-semibold text-warn"><AlertTriangle size={16} />فيه مواعيد متداخلة</p>{conflicts.map((c) => <p key={c.key}>{fmtTime(c.start)} — {c.title}</p>)}</div>
        )}
        <Card className="p-3">
          <p className="mb-1 px-1 font-semibold">ملخص اليوم</p>
          {dayEvents.length ? dayEvents.map((e) => <EventItem key={e.key} e={e} />) : <Empty title="اليوم فاضي" action={<Button size="sm" variant="soft" onClick={() => onNew(date)}>أضيفي موعد</Button>} />}
        </Card>
      </div>
    </div>
  );
}

function AgendaView({ events }: { events: CalEvent[] }) {
  const open = useOpen();
  const groups = new Map<string, CalEvent[]>();
  for (const e of events) groups.set(e.date, [...(groups.get(e.date) ?? []), e]);
  if (!groups.size) return <Empty title="مفيش حاجة في الفترة دي" />;
  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([d, evs]) => (
        <Card key={d} className="p-3">
          <p className="mb-1 px-1 font-semibold">{fmtWeekday(d)} <span className="num font-normal text-muted">{fmtDate(d)}</span>{d === todayISO() && <span className="ms-2 text-xs text-[color:var(--color-rose)]">النهارده</span>}</p>
          {evs.map((e) => <EventItem key={e.key} e={e} onClick={() => open(e)} />)}
        </Card>
      ))}
    </div>
  );
}
