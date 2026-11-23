import { useState } from 'react';
import { Plus, ReceiptText, Repeat } from 'lucide-react';
import { useRows } from '@/lib/api';
import { useActions } from '@/lib/actions';
import { BILL_CATEGORIES, labelOf } from '@/lib/constants';
import { diffDays, fmtDate, fmtMoney, monthEnd, monthStart, relDay, todayISO } from '@/lib/format';
import type { Row } from '@/lib/supabase';
import { Badge, Button, Card, cx, Empty, ListSkeleton, PageHeader, Segmented, Stat } from '@/components/ui';
import { useEditor } from '@/components/Editor';

type Tab = 'upcoming' | 'overdue' | 'paid' | 'all';
export const billState = (b: Row) => (b.status === 'paid' ? 'paid' : b.due_date < todayISO() ? 'overdue' : b.status);
const STATE: Record<string, [string, string]> = { paid: ['اتدفعت', '#6F8E79'], overdue: ['متأخرة', '#B4534B'], unpaid: ['مستنية', '#7D93AB'], partial: ['جزء منها', '#B7842F'] };

export default function BillsPage() {
  const { data = [], isLoading } = useRows('bills');
  const { payBill } = useActions();
  const editor = useEditor();
  const [tab, setTab] = useState<Tab>('upcoming');
  const today = todayISO(), m0 = monthStart(today), m1 = monthEnd(today);
  const remaining = (b: Row) => Number(b.amount) - Number(b.paid_amount || 0);
  const sets: Record<Tab, Row[]> = {
    upcoming: data.filter((b) => b.status !== 'paid' && b.due_date >= today),
    overdue: data.filter((b) => b.status !== 'paid' && b.due_date < today),
    paid: data.filter((b) => b.status === 'paid').sort((a, b) => (b.paid_date ?? '').localeCompare(a.paid_date ?? '')),
    all: data,
  };
  const thisMonth = data.filter((b) => b.due_date >= m0 && b.due_date <= m1);
  return (
    <div>
      <PageHeader title="الفواتير" subtitle="مفيش فاتورة هتعدي من غير ما تاخدي بالك" actions={<Button icon={<Plus size={18} />} onClick={() => editor.open({ resource: 'bill', quick: true })}>فاتورة جديدة</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="فواتير الشهر ده" value={fmtMoney(thisMonth.reduce((s, b) => s + Number(b.amount), 0))} />
        <Stat label="اتدفع منها" tone="sage" value={fmtMoney(thisMonth.reduce((s, b) => s + Number(b.paid_amount || 0), 0))} />
        <Stat label="فاضل" tone="rose" value={fmtMoney(sets.upcoming.reduce((s, b) => s + remaining(b), 0))} hint={`${sets.upcoming.length} فاتورة`} />
        <Stat label="متأخر" tone={sets.overdue.length ? 'danger' : 'default'} value={fmtMoney(sets.overdue.reduce((s, b) => s + remaining(b), 0))} hint={`${sets.overdue.length} فاتورة`} />
      </div>
      <Segmented className="mb-4" value={tab} onChange={setTab} options={[
        { value: 'upcoming', label: 'جاية', count: sets.upcoming.length }, { value: 'overdue', label: 'متأخرة', count: sets.overdue.length }, { value: 'paid', label: 'اتدفعت' }, { value: 'all', label: 'الكل' },
      ]} />
      {isLoading ? <ListSkeleton /> : !sets[tab].length ? <Empty icon={<ReceiptText />} title={tab === 'overdue' ? 'مفيش متأخرات 👏' : 'مفيش فواتير هنا'} /> : (
        <Card className="divide-y divide-line/70">
          {sets[tab].map((b) => {
            const st = billState(b);
            const days = diffDays(b.due_date, today);
            return (
              <div key={b.id} className={cx('flex flex-wrap items-center gap-3 px-4 py-3.5', st === 'overdue' && 'bg-danger-soft/40')}>
                <button onClick={() => editor.open({ resource: 'bill', record: b })} className="min-w-0 flex-1 text-start">
                  <p className="font-semibold">{b.name} {b.repeat !== 'none' && <Repeat size={13} className="inline text-muted" />}{b.is_demo && <span className="ms-1 text-[10px] text-warn">Demo</span>}</p>
                  <p className="num text-sm text-muted">{labelOf(BILL_CATEGORIES, b.category)} · {st === 'paid' ? `اتدفعت ${fmtDate(b.paid_date)}` : `${fmtDate(b.due_date)} (${days === 0 ? 'النهارده' : relDay(b.due_date)})`}</p>
                </button>
                <div className="text-end">
                  <p className="num font-semibold">{fmtMoney(st === 'paid' ? b.amount : remaining(b))}</p>
                  {b.status === 'partial' && <p className="num text-xs text-muted">من {fmtMoney(b.amount)}</p>}
                </div>
                <Badge color={STATE[st][1]}>{STATE[st][0]}</Badge>
                {st !== 'paid' && <Button size="sm" variant="outline" onClick={() => payBill(b)}>اتدفعت</Button>}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
