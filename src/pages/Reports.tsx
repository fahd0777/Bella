import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useRows } from '@/lib/api';
import { EXPENSE_CATEGORIES, PIPELINE, labelOf } from '@/lib/constants';
import { addDays, addMonths, fmtMoney, fmtMonth, monthEnd, monthStart, todayISO, fmtNum } from '@/lib/format';
import { buildEvents, useCalendarData } from '@/lib/events';
import { Card, Empty, PageHeader, Progress, Segmented, SectionTitle, Stat } from '@/components/ui';

const tip = { contentStyle: { borderRadius: 12, border: '1px solid #E8DED3', fontFamily: 'IBM Plex Sans Arabic', direction: 'rtl' as const } };
type Range = 'month' | 'quarter' | 'year';

export default function ReportsPage() {
  const [range, setRange] = useState<Range>('month');
  const today = todayISO();
  const from = range === 'month' ? monthStart(today) : range === 'quarter' ? monthStart(addMonths(today, -2)) : monthStart(addMonths(today, -11));
  const inR = (d?: string | null) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) <= today;

  const clients = useRows('clients').data ?? [];
  const interactions = useRows('client_interactions').data ?? [];
  const properties = useRows('properties').data ?? [];
  const tasks = useRows('tasks').data ?? [];
  const appts = useRows('appointments').data ?? [];
  const expenses = useRows('expenses').data ?? [];
  const income = useRows('income').data ?? [];
  const budgets = useRows('budgets').data ?? [];
  const household = useRows('household_tasks').data ?? [];
  const shopping = useRows('shopping_items').data ?? [];
  const { data: cal } = useCalendarData();

  const pipeline = PIPELINE.map((s) => ({ name: s.label, v: clients.filter((c) => c.status === s.value).length, color: s.color! }));
  const months = useMemo(() => {
    const n = range === 'month' ? 6 : range === 'quarter' ? 6 : 12;
    return Array.from({ length: n }, (_, i) => monthStart(addMonths(today, -(n - 1 - i))));
  }, [range, today]);
  const money = months.map((m) => ({
    name: fmtMonth(m).split(' ')[0],
    دخل: income.filter((x) => x.received_on >= m && x.received_on <= monthEnd(m)).reduce((s, x) => s + Number(x.amount), 0),
    مصاريف: expenses.filter((x) => x.spent_on >= m && x.spent_on <= monthEnd(m)).reduce((s, x) => s + Number(x.amount), 0),
  }));
  const leads = months.map((m) => ({ name: fmtMonth(m).split(' ')[0], v: clients.filter((c) => c.created_at.slice(0, 10) >= m && c.created_at.slice(0, 10) <= monthEnd(m)).length }));
  const exR = expenses.filter((e) => inR(e.spent_on));
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ name: c.label, key: c.value, v: exR.filter((e) => e.category === c.value).reduce((s, e) => s + Number(e.amount), 0), color: c.color! })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const followDone = interactions.filter((i) => i.kind === 'followup' && inR(i.occurred_at)).length;
  const overdueFollow = clients.filter((c) => c.next_followup_date && c.next_followup_date < today && !['closed_won', 'lost'].includes(c.status)).length;
  const pastAppts = appts.filter((a) => inR(a.start_date) && a.start_date < today);
  const upcomingAppts = buildEvents(cal, today, addDays(today, 14)).filter((e) => e.kind === 'appointment' && e.status === 'scheduled').length;
  const upcomingMaint = cal.maintenance.filter((m) => m.next_date && m.next_date >= today && m.next_date <= addDays(today, 30)).length;
  const shopSpend = exR.filter((e) => e.category === 'shopping' || e.category === 'household').reduce((s, e) => s + Number(e.amount), 0);
  const monthEx = expenses.filter((e) => e.spent_on >= monthStart(today)).reduce((s, e) => s + Number(e.amount), 0);
  const totalBudget = Number(budgets.find((b) => b.category === 'total')?.monthly_limit ?? 0);
  const rangeLabel = range === 'month' ? 'الشهر ده' : range === 'quarter' ? 'آخر 3 شهور' : 'آخر سنة';

  return (
    <div className="space-y-6">
      <PageHeader title="التقارير" subtitle="أرقامك الحقيقية من غير تعقيد" actions={<Segmented value={range} onChange={setRange} options={[{ value: 'month', label: 'الشهر ده' }, { value: 'quarter', label: '3 شهور' }, { value: 'year', label: 'سنة' }]} />} />

      <section>
        <h2 className="mb-3 text-xl font-semibold">العقارات</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="إجمالي العملاء" value={fmtNum(clients.length)} hint={`${clients.filter((c) => inR(c.created_at)).length} جديد ${rangeLabel}`} />
          <Stat label="صفقات اتقفلت" tone="sage" value={fmtNum(clients.filter((c) => c.status === 'closed_won').length)} />
          <Stat label={`متابعات اتعملت (${rangeLabel})`} value={fmtNum(followDone)} />
          <Stat label="متابعات متأخرة" tone={overdueFollow ? 'danger' : 'default'} value={fmtNum(overdueFollow)} />
          <Stat label="عقارات متاحة" value={fmtNum(properties.filter((p) => p.status === 'available').length)} />
          <Stat label="اتباع" value={fmtNum(properties.filter((p) => p.status === 'sold').length)} />
          <Stat label="اتأجر" value={fmtNum(properties.filter((p) => p.status === 'rented').length)} />
          <Stat label="محجوز" value={fmtNum(properties.filter((p) => p.status === 'reserved').length)} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle title="العملاء حسب المرحلة" />
            {clients.length ? (
              <div className="space-y-2">{pipeline.filter((p) => p.v).map((p) => (
                <div key={p.name} className="flex items-center gap-3 text-sm"><span className="w-28 shrink-0">{p.name}</span><div className="h-6 flex-1 overflow-hidden rounded-lg bg-cream"><div className="h-full rounded-lg" style={{ width: `${(p.v / Math.max(...pipeline.map((x) => x.v))) * 100}%`, background: p.color }} /></div><span className="num w-6 text-end font-semibold">{p.v}</span></div>
              ))}</div>
            ) : <Empty title="مفيش عملاء" />}
          </Card>
          <Card className="p-5">
            <SectionTitle title="عملاء جداد كل شهر" />
            <div className="h-56" dir="ltr">
              <ResponsiveContainer><LineChart data={leads}><CartesianGrid vertical={false} stroke="#F1E9E0" /><XAxis dataKey="name" reversed tick={{ fontSize: 11, fill: '#776D66' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} orientation="right" width={30} tick={{ fontSize: 11, fill: '#776D66' }} axisLine={false} tickLine={false} /><Tooltip {...tip} /><Line type="monotone" dataKey="v" name="عملاء" stroke="#8A6A55" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">شغلي الشخصي</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={`مهام خلصت (${rangeLabel})`} tone="sage" value={fmtNum(tasks.filter((t) => t.status === 'done' && inR(t.completed_at)).length)} />
          <Stat label="مهام متأخرة" tone="danger" value={fmtNum(tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today).length)} />
          <Stat label="مواعيد اتعملت" value={fmtNum(pastAppts.filter((a) => a.status === 'done').length)} hint={`من ${pastAppts.length} موعد`} />
          <Stat label="مواعيد جاية (أسبوعين)" value={fmtNum(upcomingAppts)} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">الفلوس</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle title="الدخل والمصاريف" />
            <div className="h-64" dir="ltr">
              <ResponsiveContainer><BarChart data={money}><CartesianGrid vertical={false} stroke="#F1E9E0" /><XAxis dataKey="name" reversed tick={{ fontSize: 11, fill: '#776D66' }} axisLine={false} tickLine={false} /><YAxis orientation="right" width={44} tick={{ fontSize: 11, fill: '#776D66' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} /><Tooltip {...tip} formatter={(v) => fmtMoney(Number(v))} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="دخل" fill="#6F8E79" radius={[6, 6, 0, 0]} maxBarSize={22} /><Bar dataKey="مصاريف" fill="#B9787A" radius={[6, 6, 0, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle title={`المصاريف حسب البند (${rangeLabel})`} />
            {byCat.length ? (
              <div className="space-y-2.5">{byCat.map((c) => (
                <div key={c.key} className="flex items-center gap-3 text-sm"><span className="w-24 shrink-0">{c.name}</span><div className="h-6 flex-1 overflow-hidden rounded-lg bg-cream"><div className="h-full rounded-lg" style={{ width: `${(c.v / byCat[0].v) * 100}%`, background: c.color }} /></div><span className="num w-24 shrink-0 text-end font-semibold">{fmtMoney(c.v)}</span></div>
              ))}</div>
            ) : <Empty title="مفيش مصاريف" />}
          </Card>
        </div>
        <Card className="mt-4 p-5">
          <SectionTitle title="أداء الميزانية (الشهر ده)" />
          {budgets.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {budgets.map((b) => {
                const spent = b.category === 'total' ? monthEx : expenses.filter((e) => e.category === b.category && e.spent_on >= monthStart(today)).reduce((s, e) => s + Number(e.amount), 0);
                return <div key={b.id}><div className="mb-1 flex justify-between text-sm"><span>{b.category === 'total' ? 'الكلية' : labelOf(EXPENSE_CATEGORIES, b.category)}</span><span className="num">{fmtMoney(spent)} / {fmtMoney(b.monthly_limit)}</span></div><Progress value={spent} max={Number(b.monthly_limit)} /></div>;
              })}
            </div>
          ) : <p className="text-sm text-muted">مفيش ميزانية متحددة{totalBudget ? '' : ' — حدديها من صفحة الفلوس'}</p>}
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">البيت</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={`مهام بيت خلصت (${rangeLabel})`} tone="sage" value={fmtNum(household.filter((h) => h.status === 'done' && inR(h.completed_at)).length)} />
          <Stat label="صيانة خلال 30 يوم" value={fmtNum(upcomingMaint)} />
          <Stat label={`صرف البيت والتسوق (${rangeLabel})`} value={fmtMoney(shopSpend)} />
          <Stat label="مشتريات اتشرت" value={fmtNum(shopping.filter((s) => s.purchased && inR(s.purchased_at)).length)} />
        </div>
      </section>
    </div>
  );
}
