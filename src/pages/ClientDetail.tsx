import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarPlus, Edit3, MessageCircle, Phone, Building2, Trash2, Check, Plus, History, Sparkles, ListChecks } from 'lucide-react';
import { useRows, saveRow, removeRow } from '@/lib/api';
import { useActions } from '@/lib/actions';
import { CLIENT_PROPERTY_RELATION, CLIENT_TYPES, INTERACTION_KINDS, LEAD_SOURCES, PIPELINE, PROPERTY_STATUS, PROPERTY_TYPES, labelOf } from '@/lib/constants';
import { addDays, fmtDate, fmtDateTime, fmtMoney, fmtTime, relDay, telLink, todayISO, waLink } from '@/lib/format';
import { arError, type Row } from '@/lib/supabase';
import { Badge, Button, Card, Chip, cx, Empty, ListSkeleton, OptBadge, PriorityBadge, SectionTitle, useConfirm, useToast } from '@/components/ui';
import { useEditor } from '@/components/Editor';
import { TaskItem } from '@/components/Rows';

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const clients = useRows('clients');
  const c = clients.data?.find((x) => x.id === id);
  const interactions = (useRows('client_interactions').data ?? []).filter((i) => i.client_id === id);
  const links = (useRows('client_properties').data ?? []).filter((l) => l.client_id === id);
  const properties = useRows('properties').data ?? [];
  const appts = (useRows('appointments').data ?? []).filter((a) => a.client_id === id);
  const tasks = (useRows('tasks').data ?? []).filter((t) => t.client_id === id);
  const editor = useEditor();
  const { moveClient } = useActions();
  const confirm = useConfirm();
  const toast = useToast();
  const qc = useQueryClient();

  const suggestions = useMemo(() => {
    if (!c) return [];
    const linked = new Set(links.map((l) => l.property_id));
    return properties.filter((p) => p.status === 'available' && !linked.has(p.id) &&
      (!c.property_type || p.property_type === c.property_type) &&
      (!c.preferred_area || (p.area ?? '').includes(c.preferred_area) || c.preferred_area.includes(p.area ?? '~')) &&
      (!c.budget_max || !p.price || Number(p.price) <= Number(c.budget_max) * 1.1) &&
      ((c.client_type === 'tenant') === (p.deal_type === 'rent') || !['tenant', 'buyer', 'investor'].includes(c.client_type))).slice(0, 4);
  }, [c, links, properties]);

  if (clients.isLoading) return <ListSkeleton rows={6} />;
  if (!c) return <Empty title="العميل ده مش موجود" action={<Button onClick={() => nav('/crm')}>رجوع للعملاء</Button>} />;

  const phone = c.whatsapp || c.phone;
  const del = async () => {
    if (!(await confirm({ title: `تمسحي ${c.full_name}؟`, body: 'هيتمسح العميل وكل سجل التواصل بتاعه. المواعيد والمهام المرتبطة هتفضل بس من غير ربط.', danger: true, confirmText: 'امسحي' }))) return;
    try { await removeRow('clients', c.id); qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('اتمسح'); nav('/crm'); } catch (e) { toast.error(arError(e)); }
  };

  return (
    <div className="space-y-5">
      <Link to="/crm" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowRight size={16} />العملاء</Link>
      <Card className="p-5 anim-rise">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold">{c.full_name}</h1>
              <PriorityBadge value={c.priority} />
              {c.is_demo && <Badge color="#B7842F">Demo</Badge>}
            </div>
            <p className="mt-1 text-muted">{labelOf(CLIENT_TYPES, c.client_type)}{c.lead_source ? ` · جه من ${labelOf(LEAD_SOURCES, c.lead_source)}` : ''} · اتضاف {fmtDate(c.created_at.slice(0, 10))}</p>
            {c.phone && <p className="num mt-1 text-sm" dir="ltr">{c.phone}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {phone && <a href={waLink(phone, `أهلاً أ/ ${c.full_name.split(' ')[0]}، معاكي `)} target="_blank" rel="noreferrer"><Button variant="soft" icon={<MessageCircle size={18} />}>واتساب</Button></a>}
            {c.phone && <a href={telLink(c.phone)}><Button variant="outline" icon={<Phone size={18} />}>اتصال</Button></a>}
            <Button variant="outline" icon={<CalendarPlus size={18} />} onClick={() => editor.open({ resource: 'appointment', defaults: { client_id: c.id, category: 'real_estate', title: `معاينة مع ${c.full_name}` } })}>حددي معاينة</Button>
            <Button variant="outline" icon={<Edit3 size={18} />} onClick={() => editor.open({ resource: 'client', record: c })}>تعديل</Button>
            <Button variant="ghost" className="text-danger" aria-label="مسح" icon={<Trash2 size={18} />} onClick={del} />
          </div>
        </div>
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {PIPELINE.map((s) => (
            <button key={s.value} onClick={() => moveClient(c, s.value, s.label)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-sm transition', c.status === s.value ? 'font-semibold text-white' : 'bg-cream text-muted hover:text-ink')} style={c.status === s.value ? { background: s.color } : undefined}>{s.label}</button>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <FollowUp c={c} />
          <Timeline c={c} items={interactions} properties={properties} />
        </div>
        <div className="space-y-5">
          <Card className="p-5">
            <SectionTitle title="بيطلب إيه" />
            <dl className="space-y-2 text-sm">
              {([['النوع', labelOf(PROPERTY_TYPES, c.property_type)], ['المنطقة', c.preferred_area], ['الميزانية', c.budget_min || c.budget_max ? `${c.budget_min ? fmtMoney(c.budget_min) : '—'} → ${c.budget_max ? fmtMoney(c.budget_max) : '—'}` : ''], ['آخر تواصل', c.last_contact_at ? relDay(c.last_contact_at) : '']] as const).map(([k, v]) => v ? <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="num text-end font-medium">{v}</dd></div> : null)}
            </dl>
            {c.requirements && <p className="mt-3 rounded-2xl bg-cream/70 p-3 text-sm">{c.requirements}</p>}
            {c.notes && <p className="mt-2 text-sm text-muted">{c.notes}</p>}
          </Card>

          <Card className="p-5">
            <SectionTitle title="العقارات" icon={<Building2 size={18} />} action={<Button size="sm" variant="ghost" onClick={() => editor.open({ resource: 'client_property', defaults: { client_id: c.id } })}>+ ربط</Button>} />
            {links.length ? links.map((l) => {
              const p = properties.find((x) => x.id === l.property_id);
              return (
                <div key={l.id} className="flex items-center gap-2 border-b border-line/70 py-2 last:border-0">
                  <Link to={`/properties/${l.property_id}`} className="min-w-0 flex-1"><p className="truncate font-medium">{p?.title ?? '—'}</p><p className="text-xs text-muted">{labelOf(CLIENT_PROPERTY_RELATION, l.relation)} · {fmtDate(l.shown_at)}{l.feedback ? ` · ${l.feedback}` : ''}</p></Link>
                  <button className="text-xs text-muted hover:text-ink" onClick={() => editor.open({ resource: 'client_property', record: l })}>تعديل</button>
                </div>
              );
            }) : <p className="text-sm text-muted">لسه معرضتيش عليه عقارات</p>}
            {suggestions.length > 0 && (
              <div className="mt-4 rounded-2xl bg-sage-soft/60 p-3">
                <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-sage"><Sparkles size={15} />عقارات ممكن تناسبه</p>
                {suggestions.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5">
                    <Link to={`/properties/${p.id}`} className="min-w-0 flex-1 text-sm"><span className="block truncate font-medium">{p.title}</span><span className="num text-xs text-muted">{fmtMoney(p.price, true)} · {p.area}</span></Link>
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { await saveRow('client_properties', { client_id: c.id, property_id: p.id, relation: 'shown' }); await saveRow('client_interactions', { client_id: c.id, kind: 'offer', summary: `اتعرض عليه: ${p.title}`, property_id: p.id }); qc.invalidateQueries({ queryKey: ['client_properties'] }); qc.invalidateQueries({ queryKey: ['client_interactions'] }); toast.success('اتسجل إنه اتعرض عليه'); }
                      catch (e) { toast.error(arError(e)); }
                    }}>اتعرض</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="مواعيد ومهام" icon={<ListChecks size={18} />} action={<Button size="sm" variant="ghost" onClick={() => editor.open({ resource: 'task', quick: true, defaults: { client_id: c.id, category: 'real_estate' } })}>+ مهمة</Button>} />
            {appts.map((a) => (
              <button key={a.id} onClick={() => editor.open({ resource: 'appointment', record: a })} className="flex w-full items-center justify-between gap-2 border-b border-line/70 py-2 text-start text-sm last:border-0">
                <span className="truncate">{a.title}</span><span className="num shrink-0 text-xs text-muted">{relDay(a.start_date)} {fmtTime(a.start_time)}</span>
              </button>
            ))}
            <div className="-mx-3">{tasks.map((t) => <TaskItem key={t.id} t={t} />)}</div>
            {!appts.length && !tasks.length && <p className="text-sm text-muted">مفيش</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function FollowUp({ c }: { c: Row }) {
  const qc = useQueryClient();
  const toast = useToast();
  const today = todayISO();
  const [date, setDate] = useState(c.next_followup_date ?? '');
  const [time, setTime] = useState(c.next_followup_time?.slice(0, 5) ?? '');
  const overdue = c.next_followup_date && c.next_followup_date < today;
  const save = async (d: string | null, t: string | null, done = false) => {
    try {
      await saveRow('clients', { id: c.id, next_followup_date: d, next_followup_time: t, ...(done ? { last_contact_at: today } : {}) });
      if (done) await saveRow('client_interactions', { client_id: c.id, kind: 'followup', summary: d ? `تمت المتابعة — المتابعة الجاية ${fmtDate(d)}` : 'تمت المتابعة' });
      qc.invalidateQueries({ queryKey: ['clients'] }); qc.invalidateQueries({ queryKey: ['client_interactions'] });
      setDate(d ?? ''); setTime(t ?? '');
      toast.success(done ? 'المتابعة اتسجلت ✓' : 'ميعاد المتابعة اتحدد');
    } catch (e) { toast.error(arError(e)); }
  };
  return (
    <Card className={cx('p-5', overdue && 'border-danger/40 bg-danger-soft/40')}>
      <SectionTitle title="المتابعة الجاية" icon={<CalendarPlus size={18} />} />
      {c.next_followup_date ? (
        <p className={cx('mb-3 text-lg font-semibold', overdue && 'text-danger')}>{overdue ? '⚠️ متأخرة — ' : ''}{relDay(c.next_followup_date)}{c.next_followup_time ? ` الساعة ${fmtTime(c.next_followup_time)}` : ''}</p>
      ) : <p className="mb-3 text-muted">مفيش ميعاد متابعة — حددي واحد عشان متنسيهوش</p>}
      <div className="mb-3 flex flex-wrap gap-2">
        {[['بكرة', 1], ['بعد 3 أيام', 3], ['الأسبوع الجاي', 7], ['بعد أسبوعين', 14]].map(([l, n]) => <Chip key={l} onClick={() => save(addDays(today, n as number), time || null, !!c.next_followup_date && c.next_followup_date <= today)}>{l}</Chip>)}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <input type="date" className="input num !w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" className="input num !w-auto" value={time} onChange={(e) => setTime(e.target.value)} />
        <Button variant="outline" onClick={() => save(date || null, time || null)} disabled={!date}>حفظ الميعاد</Button>
        {c.next_followup_date && <Button icon={<Check size={18} />} onClick={() => save(null, null, true)}>تمت المتابعة</Button>}
      </div>
    </Card>
  );
}

function Timeline({ c, items, properties }: { c: Row; items: Row[]; properties: Row[] }) {
  const [kind, setKind] = useState('call');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const editor = useEditor();
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await saveRow('client_interactions', { client_id: c.id, kind, summary: text.trim() });
      await saveRow('clients', { id: c.id, last_contact_at: todayISO() });
      setText(''); qc.invalidateQueries({ queryKey: ['client_interactions'] }); qc.invalidateQueries({ queryKey: ['clients'] });
    } catch (err) { toast.error(arError(err)); } finally { setBusy(false); }
  };
  return (
    <Card className="p-5">
      <SectionTitle title="سجل التواصل" icon={<History size={18} />} count={items.length} />
      <form onSubmit={add} className="mb-4 rounded-2xl bg-cream/60 p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto scrollbar-none">{INTERACTION_KINDS.filter((k) => k.value !== 'status_change').map((k) => <Chip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)}>{k.label}</Chip>)}</div>
        <div className="flex gap-2"><input className="input" placeholder="حصل إيه؟ مثلاً: كلمته وعايز يشوف شقق أكبر" value={text} onChange={(e) => setText(e.target.value)} /><Button loading={busy} disabled={!text.trim()} aria-label="سجلي"><Plus size={18} /></Button></div>
      </form>
      {items.length ? (
        <ol className="relative space-y-4 border-s-2 border-line ps-5">
          {items.map((i) => {
            const p = properties.find((x) => x.id === i.property_id);
            return (
              <li key={i.id} className="relative">
                <span className={cx('absolute -start-[27px] top-1.5 size-3 rounded-full ring-4 ring-white', i.kind === 'status_change' ? 'bg-sand' : 'bg-[color:var(--color-rose)]')} />
                <button onClick={() => editor.open({ resource: 'interaction', record: i })} className="text-start">
                  <p className="text-xs text-muted"><span className="font-semibold text-ink">{labelOf(INTERACTION_KINDS, i.kind)}</span> · {fmtDateTime(i.occurred_at)}</p>
                  <p className="text-[15px]">{i.summary}</p>
                  {p && <p className="text-xs text-muted">🏠 {p.title} <OptBadge opts={PROPERTY_STATUS} value={p.status} /></p>}
                </button>
              </li>
            );
          })}
        </ol>
      ) : <p className="text-sm text-muted">لسه مفيش تواصل متسجل</p>}
    </Card>
  );
}
