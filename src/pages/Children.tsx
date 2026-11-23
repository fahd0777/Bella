import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Baby, School, BookOpen, NotebookPen, GraduationCap } from 'lucide-react';
import { useRows } from '@/lib/api';
import { buildEvents, useCalendarData } from '@/lib/events';
import { addDays, diffDays, fmtTime, parseISO, todayISO, weekStart } from '@/lib/format';
import { WEEKDAYS } from '@/lib/constants';
import { useSettings } from '@/lib/settings';
import { Button, Card, Empty, ListSkeleton, PageHeader, SectionTitle } from '@/components/ui';
import { useEditor } from '@/components/Editor';
import { EventItem } from '@/components/Rows';

export const age = (b?: string | null) => {
  if (!b) return '';
  const d = parseISO(b), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return `${a} سنة`;
};

export default function ChildrenPage() {
  const { data: kids = [], isLoading } = useRows('children');
  const { data: cal } = useCalendarData();
  const homework = useRows('homework').data ?? [];
  const editor = useEditor();
  const nav = useNavigate();
  const today = todayISO();
  const todayEv = useMemo(() => buildEvents(cal, today, today).filter((e) => e.childId), [cal, today]);

  return (
    <div>
      <PageHeader title="الأولاد" subtitle="المدرسة والدروس والواجبات والامتحانات" actions={<Button icon={<Plus size={18} />} onClick={() => editor.open({ resource: 'child' })}>إضافة</Button>} />
      {isLoading ? <ListSkeleton /> : !kids.length ? (
        <Empty icon={<Baby />} title="ضيفي بيانات الأولاد" hint="هتقدري بعدها تضيفي جدول المدرسة والدروس ويظهروا في الكالندر المشترك"
          action={<div className="flex gap-2"><Button onClick={() => editor.open({ resource: 'child', defaults: { gender: 'son', color: '#6F8E79' } })}>ضيفي ابنك</Button><Button variant="soft" onClick={() => editor.open({ resource: 'child', defaults: { gender: 'daughter', color: '#B9787A' } })}>ضيفي بنتك</Button></div>} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {kids.map((k) => {
              const ev = todayEv.filter((e) => e.childId === k.id);
              const hw = homework.filter((h) => h.child_id === k.id && h.status !== 'done');
              const exams = cal.exams.filter((x) => x.child_id === k.id && x.exam_date >= today && diffDays(x.exam_date, today) <= 14);
              return (
                <Card key={k.id} className="cursor-pointer overflow-hidden transition hover:shadow-lift" onClick={() => nav(`/children/${k.id}`)}>
                  <div className="flex items-center gap-4 p-5" style={{ background: `${k.color || '#6F8E79'}14` }}>
                    <div className="flex size-14 items-center justify-center rounded-2xl font-display text-2xl text-white" style={{ background: k.color || '#6F8E79' }}>{k.name.slice(0, 1)}</div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-2xl font-semibold">{k.name}{k.is_demo && <span className="ms-2 text-xs font-normal text-warn">Demo</span>}</h2>
                      <p className="text-sm text-muted">{[k.gender === 'son' ? 'ابني' : 'بنتي', age(k.birthday), k.grade, k.school].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-line border-y border-line text-center text-sm rtl:divide-x-reverse">
                    <div className="p-3"><p className="num text-xl font-semibold">{ev.length}</p><p className="text-muted">النهارده</p></div>
                    <div className="p-3"><p className="num text-xl font-semibold">{hw.length}</p><p className="text-muted">واجبات</p></div>
                    <div className="p-3"><p className="num text-xl font-semibold">{exams.length}</p><p className="text-muted">امتحانات قريبة</p></div>
                  </div>
                  <div className="p-3">{ev.length ? ev.map((e) => <EventItem key={e.key} e={e} onClick={() => nav(`/children/${k.id}`)} />) : <p className="p-2 text-sm text-muted">مفيش حاجة النهارده</p>}</div>
                </Card>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {([['school', 'يوم مدرسة', School], ['lesson', 'درس', BookOpen], ['homework', 'واجب', NotebookPen], ['exam', 'امتحان', GraduationCap]] as const).map(([r, l, I]) => (
              <Button key={r} variant="outline" icon={<I size={18} />} onClick={() => editor.open({ resource: r, quick: true, defaults: kids.length === 1 ? { child_id: kids[0].id } : {} })}>+ {l}</Button>
            ))}
          </div>
          <Timetable kids={kids} />
        </>
      )}
    </div>
  );
}

/** Weekly timetable (school + lessons) — all kids or one. */
export function Timetable({ kids, only }: { kids: any[]; only?: string }) {
  const { data } = useCalendarData();
  const settings = useSettings();
  const ws = weekStart(todayISO(), settings.week_start);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(ws, i)), [ws]);
  const ev = useMemo(() => buildEvents(data, days[0], days[6]).filter((e) => (e.kind === 'lesson' || e.kind === 'school' || e.kind === 'activity' || e.kind === 'exam') && (!only || e.childId === only)), [data, days, only]);
  const editor = useEditor();
  const order = WEEKDAYS.map((w) => Number(w.value));
  const sorted = days.slice().sort((a, b) => order.indexOf(parseISO(a).getDay()) - order.indexOf(parseISO(b).getDay()));
  return (
    <Card className="mt-6 p-5">
      <SectionTitle title={only ? 'الجدول الأسبوعي' : 'الجدول الأسبوعي للأولاد'} />
      {!only && <div className="mb-3 flex flex-wrap gap-3 text-sm">{kids.map((k) => <span key={k.id} className="flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ background: k.color || '#6F8E79' }} />{k.name}</span>)}</div>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {sorted.map((d) => {
          const items = ev.filter((e) => e.date === d);
          const wd = parseISO(d).getDay();
          return (
            <div key={d} className="rounded-2xl bg-cream/60 p-2">
              <p className="mb-1.5 px-1 text-sm font-semibold">{WEEKDAYS.find((w) => Number(w.value) === wd)?.label}</p>
              <div className="space-y-1.5">
                {items.map((e) => (
                  <button key={e.key} onClick={() => editor.open({ resource: e.resource, record: e.row })} className="block w-full rounded-xl border-s-[3px] bg-white px-2 py-1.5 text-start text-xs shadow-sm" style={{ borderColor: e.color }}>
                    <span className="block truncate font-semibold">{e.kind === 'school' ? 'مدرسة' : e.title.split(' — ')[0]}</span>
                    <span className="num text-muted">{fmtTime(e.start)}{e.end ? ` - ${fmtTime(e.end)}` : ''}</span>
                    {!only && <span className="block text-muted">{kids.find((k) => k.id === e.childId)?.name}</span>}
                  </button>
                ))}
                {!items.length && <p className="px-1 text-xs text-muted/60">—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
