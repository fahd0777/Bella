import { useQueryClient } from '@tanstack/react-query';
import { saveRow } from './api';
import { addDays, addMonths, todayISO } from './format';
import { supabase, type Row, type Table, arError } from './supabase';
import { useToast } from '@/components/ui';

const nextDate = (d: string, repeat: string, everyDays?: number | null) =>
  repeat === 'daily' ? addDays(d, 1) : repeat === 'weekly' ? addDays(d, 7) : repeat === 'monthly' ? addMonths(d, 1) : repeat === 'yearly' ? addMonths(d, 12) : repeat === 'custom' ? addDays(d, everyDays || 1) : null;

const copyOf = (r: Row, patch: Record<string, any>) => {
  const { id: _id, owner_id: _o, created_at: _c, updated_at: _u, ...rest } = r;
  return { ...rest, ...patch };
};

/** One-tap actions that keep recurring things rolling forward. */
export function useActions() {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = (...t: Table[]) => t.forEach((x) => qc.invalidateQueries({ queryKey: [x] }));
  const optimistic = (t: Table, id: string, patch: Record<string, any>) =>
    qc.setQueryData<Row[]>([t], (old) => old?.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function patch(t: Table, id: string, p: Record<string, any>) {
    optimistic(t, id, p);
    const { error } = await supabase.from(t).update(p).eq('id', id);
    if (error) { toast.error(arError(error)); refresh(t); throw error; }
  }

  async function toggleDone(t: 'tasks' | 'household_tasks' | 'homework', r: Row) {
    const done = r.status === 'done';
    try {
      if (done) {
        await patch(t, r.id, t === 'homework' ? { status: 'not_started' } : { status: 'not_started', completed_at: null });
      } else {
        await patch(t, r.id, t === 'homework' ? { status: 'done' } : { status: 'done', completed_at: new Date().toISOString() });
        let next: string | null = null;
        let created: Row | null = null;
        if (t !== 'homework' && r.repeat && r.repeat !== 'none') {
          next = nextDate(r.due_date || todayISO(), r.repeat, r.repeat_every_days);
          if (next) created = await saveRow(t, copyOf(r, { status: 'not_started', completed_at: null, due_date: next, is_demo: r.is_demo }));
        }
        toast.success(next ? 'برافو ✓ واتحددت المرة الجاية' : 'برافو ✓', {
          label: 'تراجع',
          run: async () => {
            await patch(t, r.id, t === 'homework' ? { status: r.status } : { status: r.status, completed_at: null });
            if (created) await supabase.from(t).delete().eq('id', created.id);
            refresh(t);
          },
        });
      }
    } finally { refresh(t); }
  }

  async function payBill(r: Row) {
    try {
      await patch('bills', r.id, { status: 'paid', paid_amount: r.amount, paid_date: todayISO() });
      let next: string | null = null;
      if (r.repeat && r.repeat !== 'none') {
        next = nextDate(r.due_date, r.repeat);
        if (next) await saveRow('bills', copyOf(r, { status: 'unpaid', paid_amount: 0, paid_date: null, due_date: next }));
      }
      toast.success(next ? 'اتدفعت ✓ وفاتورة الشهر الجاي اتضافت' : 'اتدفعت ✓', {
        label: 'سجليها في المصاريف',
        run: async () => {
          try { await saveRow('expenses', { amount: r.amount, category: 'bills', spent_on: todayISO(), description: r.name, payment_method: 'cash' }); refresh('expenses'); toast.success('اتسجلت في المصاريف'); }
          catch (e) { toast.error(arError(e)); }
        },
      });
    } finally { refresh('bills'); }
  }

  async function togglePurchased(r: Row) {
    await patch('shopping_items', r.id, { purchased: !r.purchased, purchased_at: r.purchased ? null : new Date().toISOString() });
    refresh('shopping_items');
  }

  async function addToShopping(item: Row) {
    try {
      await saveRow('shopping_items', { name: item.name, quantity: item.unit ? `1 ${item.unit}` : '1', category: item.category, notes: 'من المخزون' });
      refresh('shopping_items');
      toast.success(`${item.name} اتضاف لقايمة المشتريات`);
    } catch (e) { toast.error(arError(e)); }
  }

  async function moveClient(r: Row, status: string, statusLabel: string) {
    if (r.status === status) return;
    await patch('clients', r.id, { status, last_contact_at: todayISO() });
    await saveRow('client_interactions', { client_id: r.id, kind: 'status_change', summary: `اتنقل لمرحلة: ${statusLabel}` });
    refresh('clients', 'client_interactions');
  }

  return { toggleDone, payBill, togglePurchased, addToShopping, moveClient, patch, refresh };
}
