import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChevronLeft, ChevronRight, Plus, Wallet, AlertTriangle, Coins } from 'lucide-react';
import { useRows } from '@/lib/api';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, labelOf, colorOf } from '@/lib/constants';
import { addDays, addMonths, diffDays, fmtDate, fmtMoney, fmtMonth, monthEnd, monthStart, todayISO } from '@/lib/format';
import { Button, Card, Chip, Empty, IconButton, PageHeader, Progress, Segmented, SectionTitle, Stat } from '@/components/ui';
import { useEditor } from '@/components/Editor';
import { matches } from '@/components/GlobalSearch';

type Tab = 'overview' | 'expenses' | 'income' | 'budget';
const tip = { contentStyle: { borderRadius: 12, border: '1px solid #E8DED3', fontFamily: 'IBM Plex Sans Arabic', direction: 'rtl' as const }, formatter: (v: unknown) => fmtMoney(Number(v)) };

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(monthStart(todayISO()));
  const expenses = useRows('expenses').data ?? [];
  const income = useRows('income').data ?? [];
  const budgets = useRows('budgets').data ?? [];
  const editor = useEditor();
  const m1 = monthEnd(month);
  const ex = expenses.filter((e) => e.spent_on >= month && e.spent_on <= m1);
  const inc = income.filter((e) => e.received_on >= month && e.received_on <= m1);
  const totalEx = ex.reduce((s, e) => s + Number(e.amount), 0);
  const totalIn = inc.reduce((s, e) => s + Number(e.amount), 0);
  const totalBudget = Number(budgets.find((b) => b.category === 'total')?.monthly_limit ?? 0);
  const isCurrent = month === monthStart(todayISO());
  const daysElapsed = isCurrent ? diffDays(todayISO(), month) + 1 : diffDays(m1, month) + 1;
  const todaySpend = ex.filter((e) => e.spent_on === todayISO()).reduce((s, e) => s + Number(e.amount), 0);

  const byCat = useMemo(() => EXPENSE_CATEGORIES.map((c) => ({ name: c.label, key: c.value, value: ex.filter((e) => e.category === c.value).reduce((s, e) => s + Number(e.amount), 0), color: c.color! })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value), [ex]);
  const daily = useMemo(() => {
    const out: { d: string; v: number }[] = [];
    for (let d = month; d <= m1; d = addDays(d, 1)) out.push({ d: fmtDate(d, { day: 'numeric' }), v: ex.filter((e) => e.spent_on === d).reduce((s, e) => s + Number(e.amount), 0) });
    return out;
  }, [ex, month, m1]);
  const warnings = budgets.filter((b) => b.category !== 'total').map((b) => ({ b, spent: ex.filter((e) => e.category === b.category).reduce((s, e) => s + Number(e.amount), 0) })).filter((x) => x.spent >= Number(x.b.monthly_limit) * 0.8);

  return (
    <div>
      <PageHeader title="الفلوس" subtitle="فلوسك بتروح فين — ببساطة" actions={<>
        <Button variant="outline" icon={<Coins size={18} />} onClick={() => editor.open({ resource: 'income', quick: true })}>دخل</Button>
        <Button icon={<Plus size={18} />} onClick={() => editor.open({ resource: 'expense', quick: true })}>مصروف</Button>
      </>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <IconButton label="الشهر اللي فات" onClick={() => setMonth(addMonths(month, -1))}><ChevronRight size={20} /></IconButton>
          <span className="min-w-32 text-center font-semibold">{fmtMonth(month)}</span>
          <IconButton label="الشهر الجاي" onClick={() => setMonth(addMonths(month, 1))}><ChevronLeft size={20} /></IconButton>
        </div>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'overview', label: 'نظرة عامة' }, { value: 'expenses', label: 'المصاريف', count: ex.length }, { value: 'income', label: 'الدخل', count: inc.length }, { value: 'budget', label: 'الميزانية' }]} />
      </div>

      {warnings.length > 0 && (
        <div className="mb-4 space-y-1 rounded-3xl bg-warn-soft px-4 py-3 text-sm">
          {warnings.map(({ b, spent }) => <p key={b.id} className="flex items-center gap-2 text-warn"><AlertTriangle size={16} />{labelOf(EXPENSE_CATEGORIES, b.category)}: صرفتي {fmtMoney(spent)} من {fmtMoney(b.monthly_limit)} {spent > Number(b.monthly_limit) ? '— عديتي الحد' : '— قربتي من الحد'}</p>)}
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="الدخل" tone="sage" value={fmtMoney(totalIn)} />
            <Stat label="المصاريف" tone="rose" value={fmtMoney(totalEx)} hint={`متوسط ${fmtMoney(totalEx / Math.max(1, daysElapsed))} في اليوم`} />
            <Stat label="الفرق" tone={totalIn - totalEx < 0 ? 'danger' : 'default'} value={fmtMoney(totalIn - totalEx)} />
            <Stat label={totalBudget ? 'فاضل من الميزانية' : 'صرف النهارده'} tone={totalBudget && totalBudget - totalEx < 0 ? 'danger' : 'default'} value={fmtMoney(totalBudget ? totalBudget - totalEx : todaySpend)} hint={totalBudget ? `من ${fmtMoney(totalBudget)}` : undefined} />
          </div>
          {totalBudget > 0 && <Card className="p-4"><div className="mb-2 flex justify-between text-sm"><span>الميزانية الكلية</span><span className="num">{Math.round((totalEx / totalBudget) * 100)}%</span></div><Progress value={totalEx} max={totalBudget} /></Card>}
          <div className="grid gap-5 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-3">
              <SectionTitle title="الصرف اليومي" />
              {totalEx ? (
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daily} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#F1E9E0" />
                      <XAxis dataKey="d" tick={{ fontSize: 11, fill: '#776D66' }} tickLine={false} axisLine={false} interval={2} reversed />
                      <YAxis tick={{ fontSize: 11, fill: '#776D66' }} tickLine={false} axisLine={false} width={48} orientation="right" tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                      <Tooltip {...tip} cursor={{ fill: '#F5EEE6' }} labelFormatter={(l) => `يوم ${l}`} />
                      <Bar dataKey="v" name="الصرف" fill="#B9787A" radius={[6, 6, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <Empty title="مفيش مصاريف الشهر ده" />}
            </Card>
            <Card className="p-5 lg:col-span-2">
              <SectionTitle title="المصاريف حسب البند" />
              {byCat.length ? (
                <>
                  <div className="h-44" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={byCat} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">{byCat.map((c) => <Cell key={c.key} fill={c.color} />)}</Pie><Tooltip {...tip} /></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-1.5">{byCat.map((c) => <div key={c.key} className="flex items-center gap-2 text-sm"><span className="size-2.5 rounded-full" style={{ background: c.color }} /><span className="flex-1">{c.name}</span><span className="num font-medium">{fmtMoney(c.value)}</span><span className="num w-10 text-end text-xs text-muted">{Math.round((c.value / totalEx) * 100)}%</span></div>)}</div>
                </>
              ) : <Empty title="—" />}
            </Card>
          </div>
        </div>
      )}
      {tab === 'expenses' && <MoneyList kind="expense" rows={ex} />}
      {tab === 'income' && <MoneyList kind="income" rows={inc} />}
      {tab === 'budget' && <Budgets spentBy={(c) => (c === 'total' ? totalEx : ex.filter((e) => e.category === c).reduce((s, e) => s + Number(e.amount), 0))} />}
    </div>
  );
}

function MoneyList({ kind, rows }: { kind: 'expense' | 'income'; rows: any[] }) {
  const editor = useEditor();
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const opts = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const list = rows.filter((r) => (!cat || r.category === cat) && matches(q, r.description, r.source, r.notes));
  const total = list.reduce((s, r) => s + Number(r.amount), 0);
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2"><input className="input min-w-48 flex-1" placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"><Chip active={!cat} onClick={() => setCat('')}>الكل</Chip>{opts.map((c) => <Chip key={c.value} active={cat === c.value} onClick={() => setCat(c.value)}>{c.label}</Chip>)}</div>
      {!list.length ? <Empty icon={<Wallet />} title="مفيش حاجة متسجلة" action={<Button size="sm" variant="soft" onClick={() => editor.open({ resource: kind, quick: true })}>سجلي</Button>} /> : (
        <Card className="divide-y divide-line/70">
          <div className="num flex justify-between px-4 py-3 text-sm font-semibold"><span>الإجمالي</span><span>{fmtMoney(total)}</span></div>
          {list.map((r) => (
            <button key={r.id} onClick={() => editor.open({ resource: kind, record: r })} className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-cream/50">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(opts, r.category) }} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{kind === 'expense' ? r.description || labelOf(opts, r.category) : r.source}{r.is_demo && <span className="ms-1 text-[10px] text-warn">Demo</span>}</p>
                <p className="num text-xs text-muted">{labelOf(opts, r.category)} · {fmtDate(kind === 'expense' ? r.spent_on : r.received_on)}{r.payment_method ? ` · ${labelOf(PAYMENT_METHODS, r.payment_method)}` : ''}</p>
              </div>
              <span className={`num font-semibold ${kind === 'income' ? 'text-sage' : ''}`}>{kind === 'income' ? '+' : ''}{fmtMoney(r.amount)}</span>
            </button>
          ))}
        </Card>
      )}
    </>
  );
}

function Budgets({ spentBy }: { spentBy: (c: string) => number }) {
  const budgets = useRows('budgets').data ?? [];
  const editor = useEditor();
  const all = [{ value: 'total', label: 'الميزانية الكلية' }, ...EXPENSE_CATEGORIES];
  const missing = all.filter((c) => !budgets.some((b) => b.category === c.value));
  return (
    <div className="space-y-4">
      <Card className="divide-y divide-line/70">
        {budgets.length ? budgets.slice().sort((a, b) => (a.category === 'total' ? -1 : b.category === 'total' ? 1 : 0)).map((b) => {
          const spent = spentBy(b.category), lim = Number(b.monthly_limit);
          return (
            <button key={b.id} onClick={() => editor.open({ resource: 'budget', record: b })} className="block w-full px-4 py-4 text-start hover:bg-cream/50">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold">{all.find((c) => c.value === b.category)?.label}</span>
                <span className="num text-sm"><b>{fmtMoney(spent)}</b> <span className="text-muted">/ {fmtMoney(lim)}</span></span>
              </div>
              <Progress value={spent} max={lim} />
              <p className="num mt-1 text-xs text-muted">{spent > lim ? `زيادة ${fmtMoney(spent - lim)}` : `فاضل ${fmtMoney(lim - spent)}`}</p>
            </button>
          );
        }) : <div className="p-4"><Empty title="حطي ميزانية شهرية" hint="وهنبهك لما بند يقرب من الحد" /></div>}
      </Card>
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-2">{missing.map((c) => <Button key={c.value} size="sm" variant="outline" onClick={() => editor.open({ resource: 'budget', defaults: { category: c.value } })}>+ {c.label}</Button>)}</div>
      )}
    </div>
  );
}
