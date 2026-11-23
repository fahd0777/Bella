import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { RESOURCES } from '@/config/resources';
import { saveRow, removeRow } from '@/lib/api';
import { arError, type Row } from '@/lib/supabase';
import { buildEvents, findOverlaps, useCalendarData } from '@/lib/events';
import { fmtTime, todayISO } from '@/lib/format';
import { PIPELINE, labelOf } from '@/lib/constants';
import { Button, Sheet, useConfirm, useToast } from './ui';
import { FormFields, validate } from './Form';

type OpenArgs = { resource: string; record?: Row | null; defaults?: Record<string, any>; quick?: boolean; onSaved?: (r: Row) => void };
type Ctx = { open: (a: OpenArgs) => void };
const EditorCtx = createContext<Ctx>({ open: () => {} });
export const useEditor = () => useContext(EditorCtx);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [args, setArgs] = useState<OpenArgs | null>(null);
  const [row, setRow] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quick, setQuick] = useState(false);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: cal } = useCalendarData();

  const open = useCallback((a: OpenArgs) => {
    const res = RESOURCES[a.resource];
    setArgs(a);
    setErrors({});
    setQuick(!!a.quick && !a.record);
    setRow(a.record ? { ...a.record } : { ...(res.defaults?.() ?? {}), ...(a.defaults ?? {}) });
  }, []);
  const close = () => setArgs(null);

  const res = args ? RESOURCES[args.resource] : null;
  const isEdit = !!args?.record;

  async function save() {
    if (!res || !args) return;
    const errs = validate(res.fields, row);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setQuick(false);
      return;
    }
    const payload: Record<string, any> = { ...row };
    // keep hidden conditional fields consistent
    for (const f of res.fields) if (f.showIf && !f.showIf(payload) && !f.name.endsWith('_id')) payload[f.name] = null;
    if (res.table === 'appointments' && payload.repeat === 'none') payload.repeat_until = null;
    if (res.table === 'bills') {
      if (payload.status === 'paid') { payload.paid_amount = payload.amount; payload.paid_date = payload.paid_date || todayISO(); }
      if (payload.status === 'unpaid') payload.paid_amount = 0;
    }
    if ((res.table === 'tasks' || res.table === 'household_tasks') && payload.status === 'done' && !payload.completed_at) payload.completed_at = new Date().toISOString();
    if (res.table === 'clients' && !payload.whatsapp && payload.phone && !isEdit) payload.whatsapp = payload.phone;

    // overlap warning for timed appointments
    if (res.table === 'appointments' && payload.start_time && payload.status !== 'cancelled') {
      const evs = buildEvents(cal, payload.start_date, payload.start_date);
      const clashes = findOverlaps(evs, { date: payload.start_date, start: payload.start_time, end: payload.end_time, id: payload.id });
      if (clashes.length) {
        const ok = await confirm({
          title: 'فيه تعارض في المواعيد',
          body: `الميعاد ده متداخل مع: ${clashes.map((c) => `${c.title} (${fmtTime(c.start)})`).join('، ')}. تحبي تحفظيه برضه؟`,
          confirmText: 'احفظي برضه',
        });
        if (!ok) return;
      }
    }

    setBusy(true);
    try {
      const prevStatus = args.record?.status;
      const saved = await saveRow(res.table, payload);
      if (res.table === 'clients' && isEdit && prevStatus !== saved.status) {
        await saveRow('client_interactions', { client_id: saved.id, kind: 'status_change', summary: `اتنقل لمرحلة: ${labelOf(PIPELINE, saved.status)}` });
        qc.invalidateQueries({ queryKey: ['client_interactions'] });
      }
      qc.invalidateQueries({ queryKey: [res.table] });
      toast.success(isEdit ? 'اتحفظت التعديلات' : `${res.singular} اتضاف ✓`);
      args.onSaved?.(saved);
      close();
    } catch (e) {
      toast.error(arError(e));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!res || !args?.record) return;
    const ok = await confirm({ title: `تمسحي ${res.singular}؟`, body: 'المسح نهائي ومش هينفع يرجع.', confirmText: 'امسحي', danger: true });
    if (!ok) return;
    setBusy(true);
    try {
      await removeRow(res.table, args.record.id);
      qc.invalidateQueries({ queryKey: [res.table] });
      toast.success('اتمسح');
      close();
    } catch (e) {
      toast.error(arError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <EditorCtx.Provider value={{ open }}>
      {children}
      <Sheet open={!!args} onClose={close} title={res ? (isEdit ? `تعديل ${res.singular}` : `${res.singular} جديد`) : ''}
        footer={<>
          <Button className="flex-1" onClick={save} loading={busy}>{isEdit ? 'حفظ التعديلات' : 'حفظ'}</Button>
          {isEdit && <Button variant="ghost" onClick={del} disabled={busy} icon={<Trash2 size={18} />} aria-label="مسح" className="text-danger" />}
          {!isEdit && <Button variant="outline" onClick={close}>إلغاء</Button>}
        </>}>
        {res && (
          <form onSubmit={(e) => { e.preventDefault(); save(); }}>
            {row.is_demo && <p className="mb-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">ده سجل تجريبي (Demo)</p>}
            <FormFields fields={res.fields} row={row} setRow={setRow} errors={errors} quick={quick} />
            {quick && res.fields.some((f) => !f.quick && !f.required) && (
              <button type="button" onClick={() => setQuick(false)} className="mt-4 flex items-center gap-1 text-sm font-medium text-[color:var(--color-rose)]">
                تفاصيل أكتر <ChevronDown size={16} />
              </button>
            )}
            <button type="submit" hidden />
          </form>
        )}
      </Sheet>
    </EditorCtx.Provider>
  );
}
