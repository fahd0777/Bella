import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Edit3, Phone, Plus } from 'lucide-react';
import { useRows } from '@/lib/api';
import { ACTIVITY_KINDS, PAYMENT_STATUS, labelOf, weekdayLabel } from '@/lib/constants';
import { fmtDate, fmtMoney, fmtTime, relDay, telLink, todayISO } from '@/lib/format';
import { Badge, Button, Card, Empty, ListSkeleton, OptBadge, Segmented, cx } from '@/components/ui';
import { useEditor } from '@/components/Editor';
import { TaskItem } from '@/components/Rows';
import { Timetable, age } from './Children';

type Tab = 'week' | 'school' | 'lessons' | 'homework' | 'exams' | 'activities';

export default function ChildDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const kids = useRows('children');
  const k = kids.data?.find((x) => x.id === id);
  const school = (useRows('school_schedules').data ?? []).filter((x) => x.child_id === id).sort((a, b) => ((a.weekday + 1) % 7) - ((b.weekday + 1) % 7));
  const lessons = (useRows('lessons').data ?? []).filter((x) => x.child_id === id).sort((a, b) => ((a.weekday + 1) % 7) - ((b.weekday + 1) % 7) || a.start_time.localeCompare(b.start_time));
  const homework = (useRows('homework').data ?? []).filter((x) => x.child_id === id);
  const exams = (useRows('exams').data ?? []).filter((x) => x.child_id === id).sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  const acts = (useRows('child_activities').data ?? []).filter((x) => x.child_id === id).sort((a, b) => (a.activity_date ?? '').localeCompare(b.activity_date ?? ''));
  const [tab, setTab] = useState<Tab>('week');
  const editor = useEditor();
  const today = todayISO();

  if (kids.isLoading) return <ListSkeleton />;
  if (!k) return <Empty title="مش موجود" action={<Button onClick={() => nav('/children')}>رجوع</Button>} />;

  const add = (resource: string) => editor.open({ resource, quick: true, defaults: { child_id: k.id } });
  const openHw = homework.filter((h) => h.status !== 'done').sort((a, b) => (a.due_date ?? '9').localeCompare(b.due_date ?? '9'));
  const lessonsCost = lessons.filter((l) => l.active !== false).reduce((s, l) => s + Number(l.cost ?? 0), 0);

  return (
    <div className="space-y-5">
      <Link to="/children" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowRight size={16} />الأولاد</Link>
      <Card className="overflow-hidden anim-rise">
        <div className="flex flex-wrap items-center gap-4 p-5" style={{ background: `${k.color || '#6F8E79'}14` }}>
          <div className="flex size-16 items-center justify-center rounded-2xl font-display text-3xl text-white" style={{ background: k.color || '#6F8E79' }}>{k.name.slice(0, 1)}</div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold">{k.name}</h1>
            <p className="text-muted">{[age(k.birthday), k.grade, k.school].filter(Boolean).join(' · ')}{k.birthday ? ` · عيد ميلاده ${fmtDate(k.birthday)}` : ''}</p>
          </div>
          <div className="flex gap-2">
            {k.emergency_contact && <a href={telLink(k.emergency_contact)}><Button variant="outline" icon={<Phone size={18} />}>طوارئ</Button></a>}
            <Button variant="outline" icon={<Edit3 size={18} />} onClick={() => editor.open({ resource: 'child', record: k })}>تعديل</Button>
          </div>
        </div>
        {(k.notes || k.medical_notes) && <div className="space-y-1 p-4 text-sm">{k.notes && <p>{k.notes}</p>}{k.medical_notes && <p className="text-muted">🩺 {k.medical_notes}</p>}</div>}
      </Card>

      <Segmented value={tab} onChange={setTab} options={[
        { value: 'week', label: 'الجدول' }, { value: 'school', label: 'المدرسة' }, { value: 'lessons', label: 'الدروس', count: lessons.length },
        { value: 'homework', label: 'الواجبات', count: openHw.length }, { value: 'exams', label: 'الامتحانات', count: exams.filter((x) => x.exam_date >= today).length }, { value: 'activities', label: 'الأنشطة' },
      ]} />

      {tab === 'week' && <Timetable kids={[k]} only={k.id} />}

      {tab === 'school' && (
        <Card className="p-4">
          <div className="mb-2 flex justify-between"><p className="font-semibold">أيام المدرسة</p><Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => add('school')}>يوم</Button></div>
          {school.length ? school.map((s) => (
            <button key={s.id} onClick={() => editor.open({ resource: 'school', record: s })} className="flex w-full items-center justify-between gap-3 border-b border-line/70 px-2 py-3 text-start last:border-0 hover:bg-cream/50">
              <span className="font-medium">{weekdayLabel(s.weekday)}</span>
              <span className="num text-sm text-muted">{fmtTime(s.start_time)} - {fmtTime(s.end_time)}{s.activities ? ` · ${s.activities}` : ''}</span>
            </button>
          )) : <Empty title="ضيفي أيام المدرسة" hint="كل يوم بيتكرر أسبوعيًا تلقائي" />}
        </Card>
      )}

      {tab === 'lessons' && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between"><p className="font-semibold">الدروس الأسبوعية <span className="num text-sm font-normal text-muted">· إجمالي {fmtMoney(lessonsCost)}</span></p><Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => add('lesson')}>درس</Button></div>
          {lessons.length ? lessons.map((l) => (
            <button key={l.id} onClick={() => editor.open({ resource: 'lesson', record: l })} className={cx('flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/70 px-2 py-3 text-start last:border-0 hover:bg-cream/50', l.active === false && 'opacity-50')}>
              <span className="min-w-20 font-semibold">{l.subject}</span>
              <span className="num text-sm text-muted">{weekdayLabel(l.weekday)} {fmtTime(l.start_time)}{l.end_time ? ` - ${fmtTime(l.end_time)}` : ''}</span>
              <span className="text-sm text-muted">{[l.teacher_name, l.location].filter(Boolean).join(' · ')}</span>
              <span className="ms-auto flex items-center gap-2">{l.cost && <span className="num text-sm">{fmtMoney(l.cost)}</span>}<OptBadge opts={PAYMENT_STATUS} value={l.payment_status} /></span>
            </button>
          )) : <Empty title="مفيش دروس" />}
        </Card>
      )}

      {tab === 'homework' && (
        <Card className="p-3">
          <div className="mb-2 flex justify-between px-1"><p className="font-semibold">الواجبات</p><Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => add('homework')}>واجب</Button></div>
          {homework.length ? [...openHw, ...homework.filter((h) => h.status === 'done')].map((h) => <TaskItem key={h.id} t={h} table="homework" resource="homework" meta={h.subject && <span>{h.subject}</span>} />) : <Empty title="مفيش واجبات" />}
        </Card>
      )}

      {tab === 'exams' && (
        <Card className="p-4">
          <div className="mb-2 flex justify-between"><p className="font-semibold">الامتحانات</p><Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => add('exam')}>امتحان</Button></div>
          {exams.length ? exams.map((x) => (
            <button key={x.id} onClick={() => editor.open({ resource: 'exam', record: x })} className={cx('block w-full border-b border-line/70 px-2 py-3 text-start last:border-0 hover:bg-cream/50', x.exam_date < today && 'opacity-50')}>
              <div className="flex items-center justify-between gap-2"><span className="font-semibold">{x.subject}</span><Badge color={x.exam_date === today ? '#B4534B' : '#7D93AB'}>{relDay(x.exam_date)}{x.exam_time ? ` · ${fmtTime(x.exam_time)}` : ''}</Badge></div>
              {x.prep_notes && <p className="text-sm text-muted">{x.prep_notes}</p>}
              {x.study_tasks && <p className="whitespace-pre-line text-sm">{x.study_tasks}</p>}
            </button>
          )) : <Empty title="مفيش امتحانات" />}
        </Card>
      )}

      {tab === 'activities' && (
        <Card className="p-4">
          <div className="mb-2 flex justify-between"><p className="font-semibold">الأنشطة والمناسبات</p><Button size="sm" variant="soft" icon={<Plus size={16} />} onClick={() => add('activity')}>نشاط</Button></div>
          {acts.length ? acts.map((a) => (
            <button key={a.id} onClick={() => editor.open({ resource: 'activity', record: a })} className="flex w-full items-center justify-between gap-2 border-b border-line/70 px-2 py-3 text-start last:border-0 hover:bg-cream/50">
              <span><span className="font-medium">{a.title}</span> <span className="text-sm text-muted">· {labelOf(ACTIVITY_KINDS, a.kind)}{a.location ? ` · ${a.location}` : ''}</span></span>
              <span className="num shrink-0 text-sm text-muted">{a.activity_date ? relDay(a.activity_date) : ''} {fmtTime(a.start_time)}</span>
            </button>
          )) : <Empty title="مفيش أنشطة" />}
        </Card>
      )}
    </div>
  );
}
