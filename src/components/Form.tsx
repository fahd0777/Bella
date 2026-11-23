import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { FieldDef } from '@/config/resources';
import { useRows } from '@/lib/api';
import { Field, cx } from './ui';
import { pad } from '@/lib/format';
import type { Opt } from '@/lib/constants';

const PHONE_RE = /^\+?[\d\s-]{7,16}$/;

export function validate(fields: FieldDef[], row: Record<string, any>) {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    if (f.showIf && !f.showIf(row)) continue;
    const v = row[f.name];
    if (f.required && (v == null || v === '' || (Array.isArray(v) && !v.length))) errs[f.name] = 'الخانة دي مطلوبة';
    if (f.type === 'phone' && v && !PHONE_RE.test(String(v))) errs[f.name] = 'رقم مش مظبوط';
    if ((f.type === 'money' || f.type === 'number') && v !== '' && v != null && Number.isNaN(Number(v))) errs[f.name] = 'لازم رقم';
    if ((f.type === 'money') && v != null && v !== '' && Number(v) < 0) errs[f.name] = 'المبلغ مينفعش يكون بالسالب';
  }
  if (row.end_time && row.start_time && row.end_time <= row.start_time) errs.end_time = 'وقت النهاية لازم بعد البداية';
  if (row.end_date && row.start_date && row.end_date < row.start_date) errs.end_date = 'لازم بعد تاريخ البداية';
  return errs;
}

const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function RelationInput({ f, value, onChange }: { f: FieldDef; value: any; onChange: (v: any) => void }) {
  const { data = [] } = useRows(f.relation!.table);
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">— {f.required ? 'اختاري' : 'مفيش'} —</option>
      {data.map((r) => (
        <option key={r.id} value={r.id}>{r[f.relation!.label] || '—'}{f.relation!.sub && r[f.relation!.sub] ? ` · ${r[f.relation!.sub]}` : ''}</option>
      ))}
    </select>
  );
}

export function useCatOptions(base: Opt[], module?: string) {
  const { data = [] } = useRows('categories');
  if (!module) return base;
  return [...base, ...data.filter((c) => c.module === module && !base.some((b) => b.value === c.name)).map((c) => ({ value: c.name, label: c.name, color: c.color || '#A39A92' }))];
}

function SelectInput({ f, value, onChange }: { f: FieldDef; value: any; onChange: (v: any) => void }) {
  const opts = useCatOptions(f.options ?? [], f.customModule);
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {!opts.some((o) => o.value === '') && !f.required && value == null && <option value="">—</option>}
      {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      {value && !opts.some((o) => o.value === value) && <option value={value}>{value}</option>}
    </select>
  );
}

function MultiInput({ f, value, onChange }: { f: FieldDef; value: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const vals = value ?? [];
  const all = [...(f.options ?? []).map((o) => o.value), ...vals.filter((v) => !(f.options ?? []).some((o) => o.value === v))];
  const toggle = (v: string) => onChange(vals.includes(v) ? vals.filter((x) => x !== v) : [...vals, v]);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {all.map((v) => (
          <button type="button" key={v} onClick={() => toggle(v)} className={cx('rounded-full border px-3 py-1.5 text-sm transition', vals.includes(v) ? 'border-[color:var(--color-rose)] bg-rose-soft text-[color:var(--color-rose)]' : 'border-line bg-white text-muted')}>{v}</button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input className="input" placeholder="عرض تاني..." value={custom} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) { e.preventDefault(); onChange([...vals, custom.trim()]); setCustom(''); } }} />
        <button type="button" aria-label="إضافة" className="shrink-0 rounded-2xl bg-cream px-3" onClick={() => { if (custom.trim()) { onChange([...vals, custom.trim()]); setCustom(''); } }}><Plus size={18} /></button>
      </div>
    </div>
  );
}

export function FieldInput({ f, value, onChange }: { f: FieldDef; value: any; onChange: (v: any) => void }) {
  switch (f.type) {
    case 'textarea':
      return <textarea className="input" value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
    case 'money':
      return (
        <div className="relative">
          <input className="input num" inputMode="decimal" type="number" step="any" value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)} />
          {f.type === 'money' && <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted">ج.م</span>}
        </div>
      );
    case 'date':
      return <input className="input num" type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} />;
    case 'time':
      return <input className="input num" type="time" value={value ? String(value).slice(0, 5) : ''} onChange={(e) => onChange(e.target.value || null)} />;
    case 'datetime':
      return <input className="input num" type="datetime-local" value={toLocalInput(value)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />;
    case 'select':
      return <SelectInput f={f} value={value} onChange={onChange} />;
    case 'boolean':
      return (
        <button type="button" role="switch" aria-checked={!!value} onClick={() => onChange(!value)} className={cx('relative h-7 w-12 rounded-full transition', value ? 'bg-sage' : 'bg-sand')}>
          <span className={cx('absolute top-1 size-5 rounded-full bg-white shadow transition-all', value ? 'start-6' : 'start-1')} />
        </button>
      );
    case 'phone':
      return <input className="input num" type="tel" dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'relation':
      return <RelationInput f={f} value={value} onChange={onChange} />;
    case 'tags':
      return <input className="input" value={(value ?? []).join('، ')} placeholder="محتوى، عقارات" onChange={(e) => onChange(e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean))} />;
    case 'multi':
      return <MultiInput f={f} value={value} onChange={onChange} />;
    case 'color':
      return (
        <div className="flex flex-wrap gap-2">
          {['#6F8E79', '#B9787A', '#7D93AB', '#9883B0', '#C09A5B', '#8A6A55', '#B0849E'].map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => onChange(c)} className={cx('size-9 rounded-full border-2 transition', value === c ? 'border-ink scale-110' : 'border-white')} style={{ background: c }} />
          ))}
        </div>
      );
    case 'scale': {
      const lo = f.min ?? 1, hi = f.max ?? 5;
      return (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((n) => (
            <button key={n} type="button" onClick={() => onChange(value === n ? null : n)} className={cx('num size-9 rounded-xl border text-sm transition', value === n ? 'border-[color:var(--color-rose)] bg-rose-soft text-[color:var(--color-rose)] font-semibold' : 'border-line bg-white text-muted')}>{n}</button>
          ))}
        </div>
      );
    }
    default:
      return <input className="input" value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function FormFields({ fields, row, setRow, errors, quick }: { fields: FieldDef[]; row: Record<string, any>; setRow: (r: Record<string, any>) => void; errors: Record<string, string>; quick?: boolean }) {
  const visible = fields.filter((f) => (!quick || f.quick || f.required) && (!f.showIf || f.showIf(row)));
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
      {visible.map((f) => (
        <div key={f.name} className={f.half ? 'col-span-1' : 'col-span-2'}>
          <Field label={f.label} hint={f.hint} error={errors[f.name]} required={f.required} group={['boolean', 'multi', 'color', 'scale'].includes(f.type)}>
            <FieldInput f={f} value={row[f.name]} onChange={(v) => setRow({ ...row, [f.name]: v })} />
          </Field>
        </div>
      ))}
    </div>
  );
}
