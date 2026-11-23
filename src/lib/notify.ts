import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, type Row } from './supabase';
import { useRows } from './api';
import { buildEvents, useCalendarData } from './events';
import { addDays, diffDays, fmtTime, parseISO, todayISO } from './format';
import type { Settings } from './settings';

type Candidate = { source_key: string; title: string; body?: string; link?: string; kind: string; due_at: string };

const at = (date: string, time?: string | null) => {
  const d = parseISO(date);
  if (time) { const [h, m] = time.split(':').map(Number); d.setHours(h, m || 0, 0, 0); } else d.setHours(9, 0, 0, 0);
  return d;
};
const key = (r: Row, k: string) => (r.is_demo ? 'demo:' : '') + k;

/**
 * In-app reminder engine. Runs while Bella is open (tab or installed PWA in foreground) and
 * materialises due reminders into the private `notifications` table (deduped by source_key).
 * It does NOT deliver background push when the app is closed — that needs a push server.
 */
export function useReminderEngine(settings: Settings) {
  const qc = useQueryClient();
  const { data: cal, loading } = useCalendarData();
  const tasks = useRows('tasks').data;
  const household = useRows('household_tasks').data;
  const reminders = useRows('reminders').data;
  const inventory = useRows('inventory_items').data;
  const latest = useRef({ cal, tasks, household, reminders, inventory, settings });
  latest.current = { cal, tasks, household, reminders, inventory, settings };

  useEffect(() => {
    if (loading) return;
    let stopped = false;
    const run = async () => {
      const { cal, tasks = [], household = [], reminders = [], inventory = [], settings: s } = latest.current;
      const now = new Date();
      const today = todayISO();
      const out: Candidate[] = [];
      const events = buildEvents(cal, addDays(today, -1), addDays(today, 2));

      for (const e of events) {
        const r = e.row;
        const start = at(e.date, e.start);
        if (e.kind === 'appointment' && s.notify_appointments && r.reminder_minutes != null && r.status === 'scheduled') {
          const due = new Date(start.getTime() - Number(r.reminder_minutes) * 60000);
          if (now >= due && now <= new Date(start.getTime() + 3600_000))
            out.push({ source_key: key(r, `appt:${r.id}:${e.date}`), title: r.title, body: e.start ? `الساعة ${fmtTime(e.start)}` : 'النهارده', link: '/calendar', kind: 'appointment', due_at: due.toISOString() });
        }
        if ((e.kind === 'lesson' || e.kind === 'exam') && s.notify_children && r.reminder_minutes != null) {
          const due = new Date(start.getTime() - Number(r.reminder_minutes) * 60000);
          if (now >= due && now <= start)
            out.push({ source_key: key(r, `${e.kind}:${r.id}:${e.date}`), title: e.title, body: e.start ? `الساعة ${fmtTime(e.start)}` : '', link: e.link, kind: e.kind, due_at: due.toISOString() });
        }
      }
      if (s.notify_children) for (const h of cal.homework) if (h.status !== 'done' && h.due_date && diffDays(h.due_date, today) <= 1)
        out.push({ source_key: key(h, `hw:${h.id}:${h.due_date}`), title: `واجب: ${h.title}`, body: h.due_date < today ? 'متأخر' : h.due_date === today ? 'تسليمه النهارده' : 'تسليمه بكرة', link: `/children/${h.child_id}`, kind: 'homework', due_at: now.toISOString() });
      if (s.notify_bills) for (const b of cal.bills) if (b.status !== 'paid' && diffDays(b.due_date, today) <= Number(b.reminder_days ?? 2))
        out.push({ source_key: key(b, `bill:${b.id}:${b.due_date}`), title: b.due_date < today ? `فاتورة متأخرة: ${b.name}` : `فاتورة قربت: ${b.name}`, link: '/bills', kind: 'bill', due_at: now.toISOString() });
      if (s.notify_followups) for (const c of cal.clients) if (c.next_followup_date && c.next_followup_date <= today && !['closed_won', 'lost'].includes(c.status)) {
        const due = at(c.next_followup_date, c.next_followup_time);
        if (now >= new Date(due.getTime() - 15 * 60000))
          out.push({ source_key: key(c, `fu:${c.id}:${c.next_followup_date}`), title: `تابعي مع ${c.full_name}`, body: c.next_followup_date < today ? 'المتابعة متأخرة' : 'متابعة النهارده', link: `/crm/${c.id}`, kind: 'followup', due_at: now.toISOString() });
      }
      if (s.notify_tasks) for (const t of tasks) if (t.status !== 'done' && t.status !== 'deferred' && t.due_date) {
        const due = at(t.due_date, t.due_time);
        const remind = new Date(due.getTime() - Number(t.reminder_minutes ?? 0) * 60000);
        if ((t.reminder_minutes != null && now >= remind) || t.due_date < today)
          out.push({ source_key: key(t, `task:${t.id}:${t.due_date}`), title: t.title, body: t.due_date < today ? 'مهمة متأخرة' : t.due_time ? `الساعة ${fmtTime(t.due_time)}` : 'النهارده', link: '/tasks', kind: 'task', due_at: remind.toISOString() });
      }
      if (s.notify_household) {
        for (const h of household) if (h.status !== 'done' && h.due_date && h.due_date <= today)
          out.push({ source_key: key(h, `hh:${h.id}:${h.due_date}`), title: `البيت: ${h.title}`, link: '/household', kind: 'household', due_at: now.toISOString() });
        for (const m of cal.maintenance) if (m.next_date && diffDays(m.next_date, today) <= 3)
          out.push({ source_key: key(m, `mt:${m.id}:${m.next_date}`), title: `صيانة ${m.item}`, body: m.next_date < today ? 'معادها فات' : 'معادها قرب', link: '/household?tab=maintenance', kind: 'maintenance', due_at: now.toISOString() });
        for (const i of inventory) if (Number(i.quantity) <= Number(i.min_quantity))
          out.push({ source_key: key(i, `inv:${i.id}:${i.quantity}`), title: `${i.name} قرب يخلص`, body: 'تضيفيه لقايمة المشتريات؟', link: '/household?tab=inventory', kind: 'inventory', due_at: now.toISOString() });
      }
      for (const r of reminders) if (!r.done && new Date(r.remind_at) <= now)
        out.push({ source_key: key(r, `rem:${r.id}`), title: r.title, body: r.notes ?? undefined, link: '/notifications', kind: 'reminder', due_at: r.remind_at });

      if (!out.length || stopped) return;
      const { data, error } = await supabase.from('notifications').upsert(out, { onConflict: 'owner_id,source_key', ignoreDuplicates: true }).select();
      if (error || !data?.length) return;
      qc.invalidateQueries({ queryKey: ['notifications'] });
      if (s.browser_notifications && 'Notification' in window && Notification.permission === 'granted') {
        const reg = await navigator.serviceWorker?.getRegistration();
        for (const n of data.slice(0, 3)) {
          // Short, generic text only — never phone numbers or private wellness details.
          const opts = { body: n.title, icon: `${import.meta.env.BASE_URL}icon-192.png`, badge: `${import.meta.env.BASE_URL}icon-192.png`, tag: n.source_key, data: { link: n.link } };
          if (reg) reg.showNotification('Bella', opts); else new Notification('Bella', opts);
        }
      }
    };
    run();
    const t = setInterval(run, 60_000);
    return () => { stopped = true; clearInterval(t); };
  }, [loading, qc]);
}
