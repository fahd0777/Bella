import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, BookOpen, CalendarDays, CheckCircle2, Home, Phone, ReceiptText, Sparkles, StickyNote, Users, Wand2, CalendarRange } from 'lucide-react';
import { useRows, saveRow } from '@/lib/api';
import { buildEvents, useCalendarData } from '@/lib/events';
import { addDays, diffDays, fmtDate, fmtDateLong, fmtMoney, fmtTime, fmtWeekday, greeting, relDay, timeToMin, todayISO, waLink, weekStart } from '@/lib/format';
import { useProfile, useSettings } from '@/lib/settings';
import { useActions } from '@/lib/actions';
import { supabase, arError, TABLES } from '@/lib/supabase';
import { Button, Card, cx, Empty, ListSkeleton, SectionTitle, useToast } from '@/components/ui';
import { EventItem, TaskItem } from '@/components/Rows';
import { useEditor } from '@/components/Editor';

export default function Dashboard() {
  const today = todayISO();
  const { data: cal, loading } = useCalendarData();
  const tasks = useRows('tasks').data ?? [];
  const household = useRows('household_tasks').data ?? [];
  const inventory = useRows('inventory_items').data ?? [];
  const notes = useRows('notes').data ?? [];
  const profile = useProfile().data;
  const settings = useSettings();
  const editor = useEditor();
  const nav = useNavigate();
  const { payBill, addToShopping } = useActions();

  const todayEvents = useMemo(() => buildEvents(cal, today, today), [cal, today]);
  const ws = weekStart(today, settings.week_start);
  const weekEvents = useMemo(() => buildEvents(cal, ws, addDays(ws, 6)), [cal, ws]);
  const upcoming = useMemo(() => buildEvents(cal, addDays(today, 1), addDays(today, 7)).filter((e) => e.kind !== 'school' && e.kind !== 'lesson'), [cal, today]);

  const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'deferred');
  const todayTasks = openTasks.filter((t) => t.due_date === today).sort((a, b) => (timeToMin(a.due_time) ?? 9999) - (timeToMin(b.due_time) ?? 9999));
  const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < today);
  const activeClients = cal.clients.filter((c) => !['closed_won', 'lost'].includes(c.status));
  const followToday = activeClients.filter((c) => c.next_followup_date === today);
  const followOverdue = activeClients.filter((c) => c.next_followup_date && c.next_followup_date < today);
  const bills = cal.bills.filter((b) => b.status !== 'paid' && diffDays(b.due_date, today) <= 7).sort((a, b) => (a.due_date < b.due_date ? -1 : 1));
  const overdueBills = bills.filter((b) => b.due_date < today);
  const kidsLessons = useMemo(() => buildEvents(cal, today, addDays(today, 2)).filter((e) => e.kind === 'lesson' || e.kind === 'exam'), [cal, today]);
  const houseDue = household.filter((h) => h.status !== 'done' && h.due_date && h.due_date <= today);
  const lowStock = inventory.filter((i) => Number(i.quantity) <= Number(i.min_quantity));
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const isEmpty = !loading && !cal.clients.length && !tasks.length && !cal.appointments.length && !cal.children.length && !notes.length;

  const timed = todayEvents.filter((e) => e.kind !== 'bill' && e.kind !== 'homework');
  const summary = [
    timed.length ? `${timed.length} ${timed.length === 1 ? 'حاجة' : 'حاجات'} في الجدول` : 'جدولك فاضي',
    todayTasks.length ? `${todayTasks.length} مهام` : null,
    followToday.length ? `${followToday.length} متابعة عملاء` : null,
  ].filter(Boolean).join(' · ');

  const urgentCount = overdueTasks.length + followOverdue.length + overdueBills.length;

  return (
    <div className="space-y-6">
      <div className="anim-rise">
        <p className="text-sm text-muted">{fmtDateLong(today)}</p>
        <h1 className="mt-1 text-[30px] leading-tight font-semibold md:text-4xl">{greeting()}{profile?.full_name ? ` يا ${profile.full_name.split(' ')[0]}` : ''} ❤️</h1>
        <p className="mt-1 text-muted">{loading ? '...' : summary}</p>
      </div>

      {isEmpty && <Welcome />}

      {urgentCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-danger/20 bg-danger-soft px-4 py-3 anim-rise">
          <AlertCircle size={20} className="text-danger" />
          <span className="font-semibold text-danger">محتاجين انتباهك:</span>
          {overdueTasks.length > 0 && <Link to="/tasks?view=overdue" className="rounded-full bg-white px-3 py-1 text-sm">{overdueTasks.length} مهام متأخرة</Link>}
          {followOverdue.length > 0 && <Link to="/crm?tab=followups" className="rounded-full bg-white px-3 py-1 text-sm">{followOverdue.length} متابعات متأخرة</Link>}
          {overdueBills.length > 0 && <Link to="/bills" className="rounded-full bg-white px-3 py-1 text-sm">{overdueBills.length} فواتير متأخرة</Link>}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Daily timeline */}
        <Card className="p-5 lg:col-span-3">
          <SectionTitle title="يومك النهارده" icon={<CalendarDays size={20} />} action={<Button variant="ghost" size="sm" onClick={() => editor.open({ resource: 'appointment', quick: true })}>+ موعد</Button>} />
          {loading ? <ListSkeleton /> : timed.length ? (
            <div className="relative space-y-1">
              {timed.map((e, i) => {
                const s = timeToMin(e.start);
                const prev = i > 0 ? timeToMin(timed[i - 1].start) : -1;
                const showNow = s != null && s > nowMin && (prev == null || prev <= nowMin);
                return (
                  <div key={e.key}>
                    {showNow && <div className="my-1 flex items-center gap-2 text-xs font-semibold text-[color:var(--color-rose)]"><span className="size-2 rounded-full bg-[color:var(--color-rose)]" />دلوقتي<span className="h-px flex-1 bg-[color:var(--color-rose)]/40" /></div>}
                    <EventItem e={e} onClick={e.link ? () => nav(e.link!) : undefined} />
                  </div>
                );
              })}
            </div>
          ) : <Empty icon={<CalendarDays />} title="مفيش مواعيد النهارده" hint="يوم هادي ✨ استغليه في المتابعات" />}
        </Card>

        {/* Today's tasks */}
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="مهام النهارده" icon={<CheckCircle2 size={20} />} count={todayTasks.length} action={<Link to="/tasks" className="text-sm text-muted hover:text-ink">الكل</Link>} />
          {todayTasks.length || overdueTasks.length ? (
            <div className="-mx-2">
              {overdueTasks.slice(0, 3).map((t) => <TaskItem key={t.id} t={t} />)}
              {todayTasks.map((t) => <TaskItem key={t.id} t={t} />)}
            </div>
          ) : <Empty icon={<CheckCircle2 />} title="مفيش مهام النهارده" action={<Button size="sm" variant="soft" onClick={() => editor.open({ resource: 'task', quick: true, defaults: { due_date: today } })}>أضيفي مهمة</Button>} />}
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* Follow-ups */}
        <Card className="p-5">
          <SectionTitle title="متابعات العملاء" icon={<Users size={20} />} count={followToday.length + followOverdue.length} action={<Link to="/crm?tab=followups" className="text-sm text-muted hover:text-ink">الكل</Link>} />
          {followOverdue.length + followToday.length ? (
            <div className="space-y-2">
              {[...followOverdue, ...followToday].slice(0, 5).map((c) => (
                <div key={c.id} className={cx('flex items-center gap-3 rounded-2xl p-2.5', c.next_followup_date < today ? 'bg-danger-soft/60' : 'bg-cream/60')}>
                  <button onClick={() => nav(`/crm/${c.id}`)} className="min-w-0 flex-1 text-start">
                    <p className="truncate font-medium">{c.full_name}</p>
                    <p className={cx('text-xs', c.next_followup_date < today ? 'font-semibold text-danger' : 'text-muted')}>{c.next_followup_date < today ? `متأخرة ${relDay(c.next_followup_date)}` : `النهارده${c.next_followup_time ? ` ${fmtTime(c.next_followup_time)}` : ''}`}{c.preferred_area ? ` · ${c.preferred_area}` : ''}</p>
                  </button>
                  {(c.whatsapp || c.phone) && <a href={waLink(c.whatsapp || c.phone)} target="_blank" rel="noreferrer" aria-label="واتساب" className="flex size-10 items-center justify-center rounded-xl bg-white text-sage"><Phone size={18} /></a>}
                </div>
              ))}
            </div>
          ) : <Empty title="كل المتابعات تمام 👌" />}
        </Card>

        {/* Kids */}
        <Card className="p-5">
          <SectionTitle title="دروس وامتحانات الأولاد" icon={<BookOpen size={20} />} action={<Link to="/children" className="text-sm text-muted hover:text-ink">الأولاد</Link>} />
          {kidsLessons.length ? <div className="-mx-2">{kidsLessons.slice(0, 5).map((e) => <EventItem key={e.key} e={e} showDate onClick={() => nav(e.link!)} />)}</div>
            : <Empty title={cal.children.length ? 'مفيش دروس اليومين دول' : 'ضيفي بيانات الأولاد الأول'} action={!cal.children.length && <Button size="sm" variant="soft" onClick={() => nav('/children')}>الأولاد</Button>} />}
        </Card>

        {/* Bills */}
        <Card className="p-5">
          <SectionTitle title="فواتير قربت" icon={<ReceiptText size={20} />} count={bills.length} action={<Link to="/bills" className="text-sm text-muted hover:text-ink">الكل</Link>} />
          {bills.length ? (
            <div className="space-y-2">
              {bills.slice(0, 4).map((b) => (
                <div key={b.id} className={cx('flex items-center gap-3 rounded-2xl p-2.5', b.due_date < today ? 'bg-danger-soft/60' : 'bg-cream/60')}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{b.name}</p>
                    <p className={cx('num text-xs', b.due_date < today ? 'font-semibold text-danger' : 'text-muted')}>{fmtMoney(Number(b.amount) - Number(b.paid_amount || 0))} · {b.due_date < today ? `متأخرة ${relDay(b.due_date)}` : relDay(b.due_date)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => payBill(b)}>اتدفعت</Button>
                </div>
              ))}
            </div>
          ) : <Empty title="مفيش فواتير الأسبوع ده" />}
        </Card>

        {/* Household */}
        <Card className="p-5">
          <SectionTitle title="البيت" icon={<Home size={20} />} count={houseDue.length} action={<Link to="/household" className="text-sm text-muted hover:text-ink">البيت</Link>} />
          {houseDue.length || lowStock.length ? (
            <div className="-mx-2">
              {houseDue.slice(0, 4).map((h) => <TaskItem key={h.id} t={h} table="household_tasks" resource="household_task" meta={h.assigned_to && <span>{h.assigned_to}</span>} />)}
              {lowStock.slice(0, 3).map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5">
                  <span className="text-sm"><Sparkles size={14} className="me-1 inline text-warn" />{i.name} قرب يخلص</span>
                  <Button size="sm" variant="soft" onClick={() => addToShopping(i)}>للمشتريات</Button>
                </div>
              ))}
            </div>
          ) : <Empty title="البيت تمام ✨" />}
        </Card>

        {/* Upcoming */}
        <Card className="p-5">
          <SectionTitle title="جاي الأسبوع ده" icon={<CalendarRange size={20} />} action={<Link to="/calendar?view=agenda" className="text-sm text-muted hover:text-ink">الأجندة</Link>} />
          {upcoming.length ? <div className="-mx-2">{upcoming.slice(0, 6).map((e) => <EventItem key={e.key} e={e} showDate onClick={e.link ? () => nav(e.link!) : undefined} />)}</div> : <Empty title="مفيش حاجة جاية" />}
        </Card>

        {/* Weekly overview */}
        <Card className="p-5">
          <SectionTitle title="نظرة على الأسبوع" icon={<CalendarDays size={20} />} />
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map((d) => {
              const evs = weekEvents.filter((e) => e.date === d && e.kind !== 'school');
              const tk = tasks.filter((t) => t.due_date === d && t.status !== 'done').length;
              return (
                <button key={d} onClick={() => nav(`/calendar?view=day&date=${d}`)} className={cx('flex flex-col items-center gap-1 rounded-2xl py-2.5 transition hover:bg-cream', d === today && 'bg-rose-soft')}>
                  <span className="text-[11px] text-muted">{fmtWeekday(d, 'short')}</span>
                  <span className="num text-lg font-semibold">{fmtDate(d, { day: 'numeric' })}</span>
                  <div className="flex h-8 flex-col-reverse gap-0.5">
                    {evs.slice(0, 4).map((e) => <span key={e.key} className="h-1.5 w-5 rounded-full" style={{ background: e.color }} />)}
                  </div>
                  <span className="num text-[11px] text-muted">{evs.length + tk || '—'}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <QuickNotes notes={notes} />
    </div>
  );
}

function QuickNotes({ notes }: { notes: any[] }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const editor = useEditor();
  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await saveRow('notes', { content: text.trim(), category: 'personal' }); setText(''); qc.invalidateQueries({ queryKey: ['notes'] }); toast.success('الملاحظة اتحفظت'); }
    catch (e) { toast.error(arError(e)); } finally { setBusy(false); }
  };
  const recent = notes.filter((n) => !n.archived).slice(0, 3);
  return (
    <Card className="p-5">
      <SectionTitle title="ملاحظة سريعة" icon={<StickyNote size={20} />} action={<Link to="/notes" className="flex items-center gap-1 text-sm text-muted hover:text-ink">كل الملاحظات <ArrowLeft size={14} /></Link>} />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <textarea className="input" placeholder="اكتبي أي حاجة عايزة متنسيهاش..." value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }} />
          <Button className="mt-2" size="sm" onClick={save} loading={busy} disabled={!text.trim()}>احفظي</Button>
        </div>
        <div className="space-y-2">
          {recent.map((n) => (
            <button key={n.id} onClick={() => editor.open({ resource: 'note', record: n })} className="block w-full rounded-2xl bg-cream/70 p-3 text-start text-sm hover:bg-cream">
              {n.title && <p className="font-semibold">{n.title}</p>}
              <p className="line-clamp-2 text-muted">{n.content}</p>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Welcome() {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const seed = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('seed_demo_data');
    setBusy(false);
    if (error) return toast.error(arError(error));
    TABLES.forEach((t) => qc.invalidateQueries({ queryKey: [t] }));
    toast.success('البيانات التجريبية اتضافت — تقدري تمسحيها من الإعدادات');
  };
  return (
    <Card className="overflow-hidden anim-rise">
      <div className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="text-2xl font-semibold">أهلاً بيكي في Bella ✨</h2>
          <p className="mt-1 max-w-xl text-muted">ابدأي بإضافة أول حاجة من زرار <b>+</b>، أو جربي التطبيق ببيانات تجريبية (عملاء، عقارات، جدول الأولاد...) متعلّمة إنها Demo وتتمسح بضغطة.</p>
        </div>
        <Button onClick={seed} loading={busy} icon={<Wand2 size={18} />}>جربي ببيانات تجريبية</Button>
      </div>
    </Card>
  );
}

