import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, ShoppingBasket, Package, Wrench, Sparkles, Check, Phone, Trash2, ChevronDown } from 'lucide-react';
import { useRows, saveRow } from '@/lib/api';
import { useActions } from '@/lib/actions';
import { HOUSEHOLD_CATEGORIES, SHOP_CATEGORIES, labelOf } from '@/lib/constants';
import { addDays, diffDays, fmtDate, fmtMoney, fmtNum, relDay, telLink, todayISO } from '@/lib/format';
import { supabase, arError, type Row } from '@/lib/supabase';
import { Badge, Button, Card, Chip, cx, Empty, ListSkeleton, PageHeader, Segmented, useConfirm, useToast } from '@/components/ui';
import { useEditor } from '@/components/Editor';
import { CheckCircle, TaskItem } from '@/components/Rows';

type Tab = 'tasks' | 'shopping' | 'inventory' | 'maintenance';

export default function HouseholdPage() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as Tab) || 'tasks';
  const tasks = useRows('household_tasks').data ?? [];
  const shop = useRows('shopping_items').data ?? [];
  const inv = useRows('inventory_items').data ?? [];
  const editor = useEditor();
  const today = todayISO();
  const add = { tasks: 'household_task', shopping: 'shopping', inventory: 'inventory', maintenance: 'maintenance' }[tab];
  return (
    <div>
      <PageHeader title="البيت" subtitle="مهام البيت، المشتريات، المخزون والصيانة" actions={<Button icon={<Plus size={18} />} onClick={() => editor.open({ resource: add, quick: true })}>إضافة</Button>} />
      <Segmented className="mb-4" value={tab} onChange={(v) => setSp({ tab: v }, { replace: true })} options={[
        { value: 'tasks', label: 'المهام', count: tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date <= today).length },
        { value: 'shopping', label: 'المشتريات', count: shop.filter((s) => !s.purchased).length },
        { value: 'inventory', label: 'المخزون', count: inv.filter((i) => Number(i.quantity) <= Number(i.min_quantity)).length },
        { value: 'maintenance', label: 'الصيانة' },
      ]} />
      {tab === 'tasks' && <HouseTasks />}
      {tab === 'shopping' && <Shopping />}
      {tab === 'inventory' && <Inventory />}
      {tab === 'maintenance' && <Maintenance />}
    </div>
  );
}

function HouseTasks() {
  const { data = [], isLoading } = useRows('household_tasks');
  const [cat, setCat] = useState('');
  const [showDone, setShowDone] = useState(false);
  const today = todayISO();
  const rows = data.filter((t) => !cat || t.category === cat);
  const open = rows.filter((t) => t.status !== 'done').sort((a, b) => (a.due_date ?? '9').localeCompare(b.due_date ?? '9'));
  const groups = [
    { t: 'متأخرة', items: open.filter((x) => x.due_date && x.due_date < today) },
    { t: 'النهارده', items: open.filter((x) => x.due_date === today) },
    { t: 'الأسبوع ده', items: open.filter((x) => x.due_date && x.due_date > today && x.due_date <= addDays(today, 7)) },
    { t: 'بعد كده', items: open.filter((x) => !x.due_date || x.due_date > addDays(today, 7)) },
  ];
  const done = rows.filter((t) => t.status === 'done');
  return (
    <>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"><Chip active={!cat} onClick={() => setCat('')}>الكل</Chip>{HOUSEHOLD_CATEGORIES.map((c) => <Chip key={c.value} active={cat === c.value} onClick={() => setCat(c.value)}>{c.label}</Chip>)}</div>
      {isLoading ? <ListSkeleton /> : !data.length ? <Empty icon={<Sparkles />} title="ضيفي مهام البيت" hint="زي تنضيف المطبخ يوميًا أو تغيير الملايات أسبوعيًا — المتكررة بتتجدد لوحدها" /> : (
        <div className="space-y-4">
          {groups.filter((g) => g.items.length).map((g) => (
            <Card key={g.t} className="p-3">
              <p className={cx('px-2 pb-1 text-sm font-semibold', g.t === 'متأخرة' ? 'text-danger' : 'text-muted')}>{g.t}</p>
              {g.items.map((t) => <TaskItem key={t.id} t={t} table="household_tasks" resource="household_task" meta={<>{labelOf(HOUSEHOLD_CATEGORIES, t.category)}{t.assigned_to && <span>· {t.assigned_to}</span>}</>} />)}
            </Card>
          ))}
          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone(!showDone)} className="flex items-center gap-1 text-sm text-muted">اللي خلص ({done.length}) <ChevronDown size={14} className={cx('transition', showDone && 'rotate-180')} /></button>
              {showDone && <Card className="mt-2 p-3">{done.slice(0, 30).map((t) => <TaskItem key={t.id} t={t} table="household_tasks" resource="household_task" />)}</Card>}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Shopping() {
  const { data = [], isLoading } = useRows('shopping_items');
  const { togglePurchased } = useActions();
  const [name, setName] = useState('');
  const [cat, setCat] = useState('groceries');
  const [history, setHistory] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const editor = useEditor();
  const pending = data.filter((s) => !s.purchased);
  const bought = data.filter((s) => s.purchased).sort((a, b) => (b.purchased_at ?? '').localeCompare(a.purchased_at ?? ''));
  const total = pending.reduce((s, i) => s + Number(i.est_price ?? 0), 0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const parts = name.split(/[\n,،]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    try { for (const p of parts) await saveRow('shopping_items', { name: p, category: cat }); setName(''); qc.invalidateQueries({ queryKey: ['shopping_items'] }); }
    catch (err) { toast.error(arError(err)); }
  };
  const clearBought = async () => {
    if (!(await confirm({ title: 'تمسحي اللي اشتريتيه؟', body: `هيتمسح ${bought.length} صنف من السجل.`, danger: true, confirmText: 'امسحي' }))) return;
    const { error } = await supabase.from('shopping_items').delete().eq('purchased', true);
    if (error) toast.error(arError(error)); else { qc.invalidateQueries({ queryKey: ['shopping_items'] }); toast.success('اتمسحوا'); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="p-4">
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <input className="input min-w-40 flex-1" placeholder="لبن، عيش، فراخ... (افصلي بفاصلة)" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="القسم">{SHOP_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
            <Button disabled={!name.trim()} icon={<Plus size={18} />}>ضيفي</Button>
          </form>
        </Card>
        {isLoading ? <ListSkeleton /> : !pending.length ? <Empty icon={<ShoppingBasket />} title="القايمة فاضية" hint="اللي هتضيفيه هيظهر هنا مقسّم حسب القسم" /> : SHOP_CATEGORIES.map((c) => {
          const items = pending.filter((i) => i.category === c.value);
          if (!items.length) return null;
          return (
            <Card key={c.value} className="p-3">
              <p className="px-2 pb-1 text-sm font-semibold text-muted">{c.label} <span className="num">({items.length})</span></p>
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-cream/60">
                  <CheckCircle done={false} onClick={() => togglePurchased(i)} label="اشتريته" />
                  <button className="min-w-0 flex-1 text-start" onClick={() => editor.open({ resource: 'shopping', record: i })}>
                    <span className="font-medium">{i.name}</span>{i.quantity && <span className="text-sm text-muted"> · {i.quantity}</span>}
                    {i.notes && <span className="block text-xs text-muted">{i.notes}</span>}
                  </button>
                  {i.est_price && <span className="num text-sm text-muted">{fmtMoney(i.est_price)}</span>}
                </div>
              ))}
            </Card>
          );
        })}
      </div>
      <div className="space-y-4">
        <Card className="p-5">
          <p className="text-sm text-muted">التكلفة التقريبية</p>
          <p className="num text-3xl font-semibold">{fmtMoney(total)}</p>
          <p className="num text-sm text-muted">{pending.length} صنف فاضل · {pending.filter((p) => !p.est_price).length} من غير سعر</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><button onClick={() => setHistory(!history)} className="flex items-center gap-1 font-semibold">اشتريته ({bought.length}) <ChevronDown size={16} className={cx('transition', history && 'rotate-180')} /></button>{bought.length > 0 && <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={clearBought}>مسح</Button>}</div>
          {history && <div className="mt-2">{bought.slice(0, 40).map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-1 py-2"><CheckCircle done onClick={() => togglePurchased(i)} label="رجعيه" /><span className="flex-1 text-muted line-through">{i.name}</span><span className="num text-xs text-muted">{i.purchased_at ? relDay(i.purchased_at.slice(0, 10)) : ''}</span></div>
          ))}</div>}
        </Card>
      </div>
    </div>
  );
}

function Inventory() {
  const { data = [], isLoading } = useRows('inventory_items');
  const shop = useRows('shopping_items').data ?? [];
  const { patch, addToShopping, refresh } = useActions();
  const editor = useEditor();
  const low = data.filter((i) => Number(i.quantity) <= Number(i.min_quantity));
  const inList = (n: string) => shop.some((s) => !s.purchased && s.name.trim() === n.trim());
  const step = async (i: Row, d: number) => { await patch('inventory_items', i.id, { quantity: Math.max(0, Number(i.quantity) + d) }); refresh('inventory_items'); };
  if (isLoading) return <ListSkeleton />;
  if (!data.length) return <Empty icon={<Package />} title="تابعي الحاجات الأساسية في البيت" hint="رز، زيت، بن، منظفات... ولما حاجة توصل لأقل كمية هقترح أضيفها للمشتريات" />;
  return (
    <div className="space-y-4">
      {low.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl bg-warn-soft px-4 py-3">
          <span className="font-medium text-warn">{low.length} حاجات قربت تخلص</span>
          <Button size="sm" variant="outline" onClick={async () => { for (const i of low) if (!inList(i.name)) await addToShopping(i); }}>ضيفيهم كلهم للمشتريات</Button>
        </div>
      )}
      <Card className="divide-y divide-line/70">
        {data.slice().sort((a, b) => Number(Number(b.quantity) <= Number(b.min_quantity)) - Number(Number(a.quantity) <= Number(a.min_quantity)) || a.name.localeCompare(b.name, 'ar')).map((i) => {
          const isLow = Number(i.quantity) <= Number(i.min_quantity);
          return (
            <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <button onClick={() => editor.open({ resource: 'inventory', record: i })} className="min-w-0 flex-1 text-start">
                <p className="font-medium">{i.name} {isLow && <Badge color="#B7842F">قرب يخلص</Badge>}</p>
                <p className="num text-xs text-muted">{labelOf(SHOP_CATEGORIES, i.category)} · أقل كمية {fmtNum(i.min_quantity)} {i.unit ?? ''}</p>
              </button>
              <div className="flex items-center gap-1">
                <button aria-label="أقل" onClick={() => step(i, -1)} className="flex size-9 items-center justify-center rounded-xl bg-cream"><Minus size={16} /></button>
                <span className={cx('num w-14 text-center font-semibold', isLow && 'text-warn')}>{fmtNum(i.quantity)} <span className="text-xs font-normal text-muted">{i.unit ?? ''}</span></span>
                <button aria-label="أكتر" onClick={() => step(i, 1)} className="flex size-9 items-center justify-center rounded-xl bg-cream"><Plus size={16} /></button>
              </div>
              {isLow && (inList(i.name) ? <span className="flex items-center gap-1 text-xs text-sage"><Check size={14} />في القايمة</span> : <Button size="sm" variant="soft" onClick={() => addToShopping(i)}>للمشتريات</Button>)}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function Maintenance() {
  const { data = [], isLoading } = useRows('maintenance_records');
  const editor = useEditor();
  const toast = useToast();
  const qc = useQueryClient();
  const today = todayISO();
  const done = async (m: Row) => {
    const interval = m.last_date && m.next_date ? Math.max(7, diffDays(m.next_date, m.last_date)) : 180;
    try {
      await saveRow('maintenance_records', { id: m.id, last_date: today, next_date: addDays(today, interval) });
      qc.invalidateQueries({ queryKey: ['maintenance_records'] });
      toast.success(`اتسجلت ✓ الصيانة الجاية ${fmtDate(addDays(today, interval))}`, m.cost ? {
        label: 'سجليها في المصاريف',
        run: async () => { await saveRow('expenses', { amount: m.cost, category: 'household', description: `صيانة ${m.item}`, spent_on: today }); qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('اتسجلت'); },
      } : undefined);
    } catch (e) { toast.error(arError(e)); }
  };
  if (isLoading) return <ListSkeleton />;
  if (!data.length) return <Empty icon={<Wrench />} title="سجل الصيانة فاضي" hint="التكييف، التلاجة، الغسالة، فلتر المياه... وهفكرك قبل الميعاد" />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.slice().sort((a, b) => (a.next_date ?? '9').localeCompare(b.next_date ?? '9')).map((m) => {
        const soon = m.next_date && diffDays(m.next_date, today) <= 7;
        const late = m.next_date && m.next_date < today;
        return (
          <Card key={m.id} className={cx('p-4', late ? 'border-danger/40 bg-danger-soft/40' : soon && 'border-warn/40 bg-warn-soft/40')}>
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => editor.open({ resource: 'maintenance', record: m })} className="text-start">
                <p className="text-lg font-semibold">{m.item}</p>
                {m.maintenance_type && <p className="text-sm text-muted">{m.maintenance_type}</p>}
              </button>
              {m.next_date && <Badge color={late ? '#B4534B' : soon ? '#B7842F' : '#6F8E79'}>{late ? 'فات معادها' : relDay(m.next_date)}</Badge>}
            </div>
            <div className="num mt-2 grid grid-cols-2 gap-1 text-sm text-muted">
              <span>آخر صيانة: {m.last_date ? fmtDate(m.last_date) : '—'}</span><span>الجاية: {m.next_date ? fmtDate(m.next_date) : '—'}</span>
              {m.technician && <span>الفني: {m.technician}</span>}{m.cost && <span>التكلفة: {fmtMoney(m.cost)}</span>}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="soft" icon={<Check size={16} />} onClick={() => done(m)}>اتعملت النهارده</Button>
              {m.technician_phone && <a href={telLink(m.technician_phone)}><Button size="sm" variant="outline" icon={<Phone size={16} />}>الفني</Button></a>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
