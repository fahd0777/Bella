import { useMemo } from 'react';
import { useRows } from './api';
import { addDays, diffDays, parseISO, timeToMin, todayISO } from './format';
import { APPT_CATEGORIES, colorOf, labelOf, BILL_CATEGORIES } from './constants';
import type { Row } from './supabase';

export type EventKind = 'appointment' | 'lesson' | 'school' | 'exam' | 'bill' | 'followup' | 'activity' | 'maintenance' | 'homework';
export type CalEvent = {
  key: string;
  kind: EventKind;
  title: string;
  date: string;
  start?: string | null;
  end?: string | null;
  color: string;
  label: string;              // category label shown as a chip
  childId?: string | null;
  priority?: string;
  status?: string;
  resource: string;           // resource key for the editor
  id: string;
  row: Row;
  link?: string;
};

export const KIND_LABEL: Record<EventKind, string> = {
  appointment: 'موعد', lesson: 'درس', school: 'مدرسة', exam: 'امتحان', bill: 'فاتورة', followup: 'متابعة عميل', activity: 'نشاط', maintenance: 'صيانة', homework: 'واجب',
};

function* days(from: string, to: string) {
  for (let d = from; d <= to; d = addDays(d, 1)) yield d;
}

/** Dates an appointment occurs on within [from, to], honouring its repeat rule. */
export function occurrences(a: Row, from: string, to: string): string[] {
  const start = a.start_date as string;
  const until = (a.repeat_until as string) || to;
  if (!a.repeat || a.repeat === 'none') return start >= from && start <= to ? [start] : [];
  const out: string[] = [];
  const lo = start > from ? start : from;
  const hi = until < to ? until : to;
  if (lo > hi) return out;
  const startDay = parseISO(start).getDate();
  for (const d of days(lo, hi)) {
    if (a.repeat === 'daily') out.push(d);
    else if (a.repeat === 'weekly' && diffDays(d, start) % 7 === 0) out.push(d);
    else if (a.repeat === 'monthly' && parseISO(d).getDate() === startDay) out.push(d);
  }
  return out;
}

export type CalData = { appointments: Row[]; lessons: Row[]; school: Row[]; exams: Row[]; bills: Row[]; clients: Row[]; activities: Row[]; maintenance: Row[]; homework: Row[]; children: Row[] };

export function buildEvents(data: CalData, from: string, to: string, opts: { includeCancelled?: boolean } = {}): CalEvent[] {
  const kids = new Map(data.children.map((c) => [c.id, c]));
  const kidColor = (id?: string | null) => (id && kids.get(id)?.color) || '#6F8E79';
  const kidName = (id?: string | null) => (id && kids.get(id)?.name) || '';
  const ev: CalEvent[] = [];

  for (const a of data.appointments) {
    if (!opts.includeCancelled && a.status === 'cancelled') continue;
    for (const d of occurrences(a, from, to)) {
      ev.push({ key: `a:${a.id}:${d}`, kind: 'appointment', title: a.title, date: d, start: a.start_time, end: a.end_time, color: colorOf(APPT_CATEGORIES, a.category), label: labelOf(APPT_CATEGORIES, a.category), childId: a.child_id, priority: a.priority, status: a.status, resource: 'appointment', id: a.id, row: a });
    }
  }
  const weekly = (rows: Row[], kind: 'lesson' | 'school') => {
    for (const r of rows) {
      if (kind === 'lesson' && r.active === false) continue;
      for (const d of days(from, to)) {
        if (parseISO(d).getDay() !== Number(r.weekday)) continue;
        const name = kidName(r.child_id);
        ev.push({
          key: `${kind}:${r.id}:${d}`, kind, date: d, start: r.start_time, end: r.end_time, color: kidColor(r.child_id),
          title: kind === 'lesson' ? `${r.subject}${name ? ` — ${name}` : ''}` : `مدرسة ${name}`,
          label: kind === 'lesson' ? 'درس' : 'مدرسة', childId: r.child_id, resource: kind, id: r.id, row: r, link: `/children/${r.child_id}`,
        });
      }
    }
  };
  weekly(data.lessons, 'lesson');
  weekly(data.school, 'school');

  for (const x of data.exams) if (x.exam_date >= from && x.exam_date <= to)
    ev.push({ key: `e:${x.id}`, kind: 'exam', title: `امتحان ${x.subject} — ${kidName(x.child_id)}`, date: x.exam_date, start: x.exam_time, color: kidColor(x.child_id), label: 'امتحان', childId: x.child_id, priority: 'high', resource: 'exam', id: x.id, row: x, link: `/children/${x.child_id}` });
  for (const x of data.activities) if (x.activity_date && x.activity_date >= from && x.activity_date <= to)
    ev.push({ key: `ac:${x.id}`, kind: 'activity', title: `${x.title} — ${kidName(x.child_id)}`, date: x.activity_date, start: x.start_time, color: kidColor(x.child_id), label: 'نشاط', childId: x.child_id, resource: 'activity', id: x.id, row: x, link: `/children/${x.child_id}` });
  for (const x of data.homework) if (x.due_date && x.status !== 'done' && x.due_date >= from && x.due_date <= to)
    ev.push({ key: `hw:${x.id}`, kind: 'homework', title: `واجب: ${x.title} — ${kidName(x.child_id)}`, date: x.due_date, color: kidColor(x.child_id), label: 'واجب', childId: x.child_id, priority: x.priority, resource: 'homework', id: x.id, row: x, link: `/children/${x.child_id}` });
  for (const b of data.bills) if (b.status !== 'paid' && b.due_date >= from && b.due_date <= to)
    ev.push({ key: `b:${b.id}`, kind: 'bill', title: `${b.name}`, date: b.due_date, color: '#B0849E', label: labelOf(BILL_CATEGORIES, b.category) || 'فاتورة', resource: 'bill', id: b.id, row: b, link: '/bills' });
  for (const c of data.clients) if (c.next_followup_date && c.next_followup_date >= from && c.next_followup_date <= to && !['closed_won', 'lost'].includes(c.status))
    ev.push({ key: `f:${c.id}`, kind: 'followup', title: `متابعة ${c.full_name}`, date: c.next_followup_date, start: c.next_followup_time, color: '#8A6A55', label: 'متابعة', priority: c.priority, resource: 'client', id: c.id, row: c, link: `/crm/${c.id}` });
  for (const m of data.maintenance) if (m.next_date && m.next_date >= from && m.next_date <= to)
    ev.push({ key: `m:${m.id}`, kind: 'maintenance', title: `صيانة ${m.item}`, date: m.next_date, color: '#C09A5B', label: 'صيانة', resource: 'maintenance', id: m.id, row: m, link: '/household?tab=maintenance' });

  return ev.sort((a, b) => (a.date === b.date ? (timeToMin(a.start) ?? -1) - (timeToMin(b.start) ?? -1) : a.date < b.date ? -1 : 1));
}

/** Timed events on the same date whose ranges intersect the candidate. */
export function findOverlaps(events: CalEvent[], cand: { date: string; start?: string | null; end?: string | null; key?: string; id?: string }) {
  const s = timeToMin(cand.start);
  if (s == null) return [];
  const e = timeToMin(cand.end) ?? s + 60;
  return events.filter((x) => {
    if (x.date !== cand.date || x.id === cand.id) return false;
    const xs = timeToMin(x.start);
    if (xs == null) return false;
    const xe = timeToMin(x.end) ?? xs + 60;
    return xs < e && s < xe;
  });
}

export function useCalendarData() {
  const q = {
    appointments: useRows('appointments'), lessons: useRows('lessons'), school: useRows('school_schedules'), exams: useRows('exams'),
    bills: useRows('bills'), clients: useRows('clients'), activities: useRows('child_activities'), maintenance: useRows('maintenance_records'),
    homework: useRows('homework'), children: useRows('children'),
  };
  const loading = Object.values(q).some((x) => x.isLoading);
  const deps = Object.values(q).map((x) => x.data);
  const data = useMemo<CalData>(() => ({
    appointments: q.appointments.data ?? [], lessons: q.lessons.data ?? [], school: q.school.data ?? [], exams: q.exams.data ?? [],
    bills: q.bills.data ?? [], clients: q.clients.data ?? [], activities: q.activities.data ?? [], maintenance: q.maintenance.data ?? [],
    homework: q.homework.data ?? [], children: q.children.data ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), deps);
  return { data, loading };
}

export const isOverdue = (date?: string | null) => !!date && date < todayISO();
