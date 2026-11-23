import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useRows } from '@/lib/api';
import type { Row, Table } from '@/lib/supabase';
import { fmtDate } from '@/lib/format';
import { Sheet } from './ui';
import { useEditor } from './Editor';
import { Icon } from './icons';

export const norm = (s: unknown) =>
  String(s ?? '').toLowerCase().replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
export const matches = (q: string, ...vals: unknown[]) => {
  const n = norm(q);
  if (!n) return true;
  const digits = n.replace(/\D/g, '');
  return vals.some((v) => {
    const s = norm(Array.isArray(v) ? v.join(' ') : v);
    return s.includes(n) || (digits.length >= 4 && s.replace(/\D/g, '').includes(digits));
  });
};

type Group = { table: Table; label: string; icon: string; fields: string[]; title: (r: Row) => string; sub?: (r: Row) => string; go: (r: Row) => string | { resource: string } };
const GROUPS: Group[] = [
  { table: 'clients', label: 'العملاء', icon: 'UserRound', fields: ['full_name', 'phone', 'whatsapp', 'preferred_area', 'notes', 'requirements'], title: (r) => r.full_name, sub: (r) => [r.phone, r.preferred_area].filter(Boolean).join(' · '), go: (r) => `/crm/${r.id}` },
  { table: 'properties', label: 'العقارات', icon: 'Building2', fields: ['title', 'ref_code', 'area', 'location', 'owner_name', 'owner_phone', 'notes', 'description'], title: (r) => r.title, sub: (r) => [r.ref_code, r.area].filter(Boolean).join(' · '), go: (r) => `/properties/${r.id}` },
  { table: 'appointments', label: 'المواعيد', icon: 'CalendarDays', fields: ['title', 'location', 'notes'], title: (r) => r.title, sub: (r) => fmtDate(r.start_date), go: () => ({ resource: 'appointment' }) },
  { table: 'tasks', label: 'المهام', icon: 'CheckCircle2', fields: ['title', 'description', 'notes'], title: (r) => r.title, sub: (r) => fmtDate(r.due_date), go: () => ({ resource: 'task' }) },
  { table: 'notes', label: 'الملاحظات', icon: 'StickyNote', fields: ['title', 'content', 'tags'], title: (r) => r.title || String(r.content).slice(0, 60), go: () => ({ resource: 'note' }) },
  { table: 'lessons', label: 'الدروس', icon: 'BookOpen', fields: ['subject', 'teacher_name', 'teacher_phone', 'location', 'notes'], title: (r) => r.subject, sub: (r) => r.teacher_name, go: (r) => `/children/${r.child_id}` },
  { table: 'bills', label: 'الفواتير', icon: 'ReceiptText', fields: ['name', 'notes'], title: (r) => r.name, sub: (r) => fmtDate(r.due_date), go: () => ({ resource: 'bill' }) },
  { table: 'shopping_items', label: 'المشتريات', icon: 'ShoppingBasket', fields: ['name', 'notes'], title: (r) => r.name, sub: (r) => r.quantity, go: () => '/household?tab=shopping' },
];

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const editor = useEditor();
  const data = {
    clients: useRows('clients').data, properties: useRows('properties').data, appointments: useRows('appointments').data, tasks: useRows('tasks').data,
    notes: useRows('notes').data, lessons: useRows('lessons').data, bills: useRows('bills').data, shopping_items: useRows('shopping_items').data,
  } as Record<string, Row[] | undefined>;

  const results = useMemo(() => {
    if (norm(q).length < 2) return [];
    return GROUPS.map((g) => ({ g, rows: (data[g.table] ?? []).filter((r) => matches(q, ...g.fields.map((f) => r[f]))).slice(0, 6) })).filter((x) => x.rows.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, ...Object.values(data)]);

  const pick = (g: Group, r: Row) => {
    const t = g.go(r);
    onClose();
    setQ('');
    if (typeof t === 'string') nav(t);
    else editor.open({ resource: t.resource, record: r });
  };

  return (
    <Sheet open={open} onClose={onClose} title="بحث في كل حاجة" wide>
      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input className="input ps-10" autoFocus placeholder="اسم عميل، رقم موبايل، منطقة، ملاحظة..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {norm(q).length >= 2 && !results.length && <p className="py-8 text-center text-muted">مفيش نتايج لـ "{q}"</p>}
      <div className="space-y-5">
        {results.map(({ g, rows }) => (
          <div key={g.table}>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted"><Icon name={g.icon} size={16} />{g.label}</p>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {rows.map((r) => (
                <button key={r.id} onClick={() => pick(g, r)} className="flex w-full flex-col items-start px-4 py-3 text-start hover:bg-cream">
                  <span className="font-medium">{g.title(r)}</span>
                  {g.sub?.(r) && <span className="text-sm text-muted">{g.sub(r)}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
