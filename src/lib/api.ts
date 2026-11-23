import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, type Row, type Table } from './supabase';

const ORDER: Partial<Record<Table, [string, boolean]>> = {
  clients: ['created_at', false],
  client_interactions: ['occurred_at', false],
  appointments: ['start_date', true],
  tasks: ['created_at', false],
  expenses: ['spent_on', false],
  income: ['received_on', false],
  bills: ['due_date', true],
  notes: ['updated_at', false],
  period_records: ['start_date', false],
  wellness_records: ['record_date', false],
  notifications: ['due_at', false],
  property_photos: ['sort_order', true],
};

export async function fetchAll(table: Table): Promise<Row[]> {
  const [col, asc] = ORDER[table] ?? ['created_at', false];
  const { data, error } = await supabase.from(table).select('*').order(col, { ascending: asc }).limit(5000);
  if (error) throw error;
  return (data ?? []) as Row[];
}

export function useRows<T extends Row = Row>(table: Table, enabled = true) {
  return useQuery({ queryKey: [table], queryFn: () => fetchAll(table) as Promise<T[]>, enabled, staleTime: 30_000 });
}

/** Strip UI-only/system fields and normalise empty strings to null before writing. */
export function clean(row: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (['owner_id', 'created_at', 'updated_at'].includes(k) || k.startsWith('_')) continue;
    out[k] = v === '' ? null : v;
  }
  return out;
}

export async function saveRow(table: Table, row: Record<string, any>): Promise<Row> {
  const payload = clean(row);
  if (payload.id) {
    const id = payload.id;
    delete payload.id;
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data as Row;
  }
  delete payload.id;
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data as Row;
}

export async function removeRow(table: Table, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export function useSave(table: Table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Record<string, any>) => saveRow(table, row),
    onSuccess: (saved) => {
      qc.setQueryData<Row[]>([table], (old) => {
        if (!old) return old;
        const i = old.findIndex((r) => r.id === saved.id);
        if (i === -1) return [saved, ...old];
        const next = old.slice();
        next[i] = saved;
        return next;
      });
      qc.invalidateQueries({ queryKey: [table] });
    },
  });
}

export function useRemove(table: Table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeRow(table, id),
    onSuccess: (_d, id) => {
      qc.setQueryData<Row[]>([table], (old) => old?.filter((r) => r.id !== id));
      qc.invalidateQueries({ queryKey: [table] });
    },
  });
}

/** Quick patch helper with optimistic cache update (one-tap complete, drag in pipeline, etc). */
export function usePatch(table: Table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { data, error } = await supabase.from(table).update(clean(patch)).eq('id', id).select().single();
      if (error) throw error;
      return data as Row;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: [table] });
      const prev = qc.getQueryData<Row[]>([table]);
      qc.setQueryData<Row[]>([table], (old) => old?.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData([table], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export const byId = <T extends Row>(rows: T[] | undefined) => new Map((rows ?? []).map((r) => [r.id, r]));
