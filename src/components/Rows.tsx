import { Check, Clock, Repeat } from 'lucide-react';
import type { Row } from '@/lib/supabase';
import { fmtTime, relDay, todayISO } from '@/lib/format';
import type { CalEvent } from '@/lib/events';
import { cx, PriorityBadge, Badge } from './ui';
import { useEditor } from './Editor';
import { useActions } from '@/lib/actions';
import { TASK_CATEGORIES, labelOf, colorOf } from '@/lib/constants';

export function CheckCircle({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button aria-label={label} onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cx('flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90', done ? 'border-sage bg-sage text-white' : 'border-sand bg-white hover:border-sage')}>
      {done && <Check size={16} strokeWidth={3} />}
    </button>
  );
}

export function TaskItem({ t, table = 'tasks', resource = 'task', meta }: { t: Row; table?: 'tasks' | 'household_tasks' | 'homework'; resource?: string; meta?: React.ReactNode }) {
  const editor = useEditor();
  const { toggleDone } = useActions();
  const done = t.status === 'done';
  const overdue = !done && t.due_date && t.due_date < todayISO();
  return (
    <div onClick={() => editor.open({ resource, record: t })} role="button" tabIndex={0}
      className={cx('flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-cream/70', overdue && 'bg-danger-soft/50')}>
      <CheckCircle done={done} onClick={() => toggleDone(table, t)} label={done ? 'رجعيها' : 'خلصت'} />
      <div className="min-w-0 flex-1">
        <p className={cx('truncate font-medium', done && 'text-muted line-through')}>{t.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {t.due_date && <span className={cx('num', overdue && 'font-semibold text-danger')}>{overdue ? `متأخرة · ${relDay(t.due_date)}` : relDay(t.due_date)}{t.due_time ? ` · ${fmtTime(t.due_time)}` : ''}</span>}
          {table === 'tasks' && t.category && <span style={{ color: colorOf(TASK_CATEGORIES, t.category) }}>{labelOf(TASK_CATEGORIES, t.category)}</span>}
          {t.repeat && t.repeat !== 'none' && <Repeat size={12} />}
          {meta}
        </div>
      </div>
      <PriorityBadge value={t.priority} />
    </div>
  );
}

export function EventItem({ e, onClick, showDate }: { e: CalEvent; onClick?: () => void; showDate?: boolean }) {
  const editor = useEditor();
  const dim = e.status === 'done' || e.status === 'cancelled';
  return (
    <button onClick={onClick ?? (() => editor.open({ resource: e.resource, record: e.row }))}
      className={cx('flex w-full items-stretch gap-3 rounded-2xl px-2 py-2 text-start transition hover:bg-cream/70', dim && 'opacity-60')}>
      <div className="num w-[68px] shrink-0 pt-0.5 text-sm text-muted">
        {showDate && <div className="text-xs font-semibold text-ink">{relDay(e.date)}</div>}
        {e.start ? fmtTime(e.start) : <span className="text-xs">طول اليوم</span>}
      </div>
      <span className="w-1 shrink-0 rounded-full" style={{ background: e.color }} />
      <div className="min-w-0 flex-1 py-0.5">
        <p className={cx('truncate font-medium', e.status === 'cancelled' && 'line-through')}>{e.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Badge color={e.color}>{e.label}</Badge>
          {e.end && <span className="num flex items-center gap-1"><Clock size={11} />لحد {fmtTime(e.end)}</span>}
          {e.status === 'done' && <span>✓ تم</span>}
        </div>
      </div>
      <PriorityBadge value={e.priority} />
    </button>
  );
}
