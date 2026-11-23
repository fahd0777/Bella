import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CheckCircle2, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRows, saveRow } from '@/lib/api';
import { addDays, todayISO, timeToMin } from '@/lib/format';
import { TASK_CATEGORIES } from '@/lib/constants';
import { arError } from '@/lib/supabase';
import { Button, Card, Chip, Empty, ListSkeleton, PageHeader, Segmented, useToast } from '@/components/ui';
import { TaskItem } from '@/components/Rows';
import { useEditor } from '@/components/Editor';
import { matches } from '@/components/GlobalSearch';
import { useCatOptions } from '@/components/Form';

type V = 'today' | 'tomorrow' | 'upcoming' | 'overdue' | 'done' | 'all';
const PR: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export default function TasksPage() {
  const [sp, setSp] = useSearchParams();
  const view = (sp.get('view') as V) || 'today';
  const { data = [], isLoading } = useRows('tasks');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [title, setTitle] = useState('');
  const editor = useEditor();
  const qc = useQueryClient();
  const toast = useToast();
  const today = todayISO(), tomorrow = addDays(today, 1);
  const cats = useCatOptions(TASK_CATEGORIES, 'tasks');

  const open = data.filter((t) => t.status !== 'done');
  const sets: Record<V, typeof data> = {
    today: open.filter((t) => t.due_date === today),
    tomorrow: open.filter((t) => t.due_date === tomorrow),
    upcoming: open.filter((t) => t.due_date && t.due_date > tomorrow),
    overdue: open.filter((t) => t.due_date && t.due_date < today && t.status !== 'deferred'),
    done: data.filter((t) => t.status === 'done').sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')),
    all: data,
  };
  let rows = sets[view].filter((t) => (!cat || t.category === cat) && matches(q, t.title, t.description, t.notes));
  if (view !== 'done') rows = rows.slice().sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || (PR[a.priority] - PR[b.priority]) || ((timeToMin(a.due_time) ?? 9999) - (timeToMin(b.due_time) ?? 9999)));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const due = view === 'today' ? today : view === 'tomorrow' ? tomorrow : null;
    try { await saveRow('tasks', { title: title.trim(), due_date: due, category: cat || 'personal' }); setTitle(''); qc.invalidateQueries({ queryKey: ['tasks'] }); }
    catch (err) { toast.error(arError(err)); }
  };

  const noDate = view === 'all' ? rows.filter((t) => !t.due_date && t.status !== 'done') : [];
  const dated = view === 'all' ? rows.filter((t) => t.due_date || t.status === 'done') : rows;

  return (
    <div>
      <PageHeader title="المهام" subtitle="دوسي على الدايرة عشان تخلصي المهمة" actions={<Button icon={<Plus size={18} />} onClick={() => editor.open({ resource: 'task', defaults: { due_date: view === 'tomorrow' ? tomorrow : view === 'today' ? today : null } })}>مهمة جديدة</Button>} />
      <Segmented className="mb-4" value={view} onChange={(v) => setSp({ view: v }, { replace: true })} options={[
        { value: 'today', label: 'النهارده', count: sets.today.length },
        { value: 'tomorrow', label: 'بكرة', count: sets.tomorrow.length },
        { value: 'upcoming', label: 'الجاي', count: sets.upcoming.length },
        { value: 'overdue', label: 'متأخرة', count: sets.overdue.length },
        { value: 'done', label: 'خلصت' },
        { value: 'all', label: 'الكل' },
      ]} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input ps-9" placeholder="دوري في المهام" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none"><Chip active={!cat} onClick={() => setCat('')}>كل التصنيفات</Chip>{cats.map((c) => <Chip key={c.value} active={cat === c.value} onClick={() => setCat(c.value)}>{c.label}</Chip>)}</div>
      </div>
      <Card className="p-3">
        {view !== 'done' && view !== 'overdue' && (
          <form onSubmit={add} className="mb-2 flex gap-2 p-1">
            <input className="input" placeholder={view === 'today' ? 'ضيفي مهمة للنهارده واضغطي Enter' : view === 'tomorrow' ? 'مهمة لبكرة...' : 'مهمة جديدة...'} value={title} onChange={(e) => setTitle(e.target.value)} />
            <Button disabled={!title.trim()} aria-label="إضافة"><Plus size={18} /></Button>
          </form>
        )}
        {isLoading ? <ListSkeleton /> : !rows.length ? (
          <Empty icon={<CheckCircle2 />} title={view === 'overdue' ? 'مفيش حاجة متأخرة 🎉' : 'مفيش مهام هنا'} />
        ) : (
          <>
            {dated.map((t) => <TaskItem key={t.id} t={t} />)}
            {noDate.length > 0 && <><p className="px-3 pt-4 pb-1 text-sm font-semibold text-muted">من غير ميعاد</p>{noDate.map((t) => <TaskItem key={t.id} t={t} />)}</>}
          </>
        )}
      </Card>
    </div>
  );
}
