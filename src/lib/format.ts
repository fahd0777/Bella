// Date/number helpers. All "date" strings are local YYYY-MM-DD (Africa/Cairo is the device tz).
export const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const todayISO = () => toISO(new Date());
export const addDays = (s: string, n: number) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const addMonths = (s: string, n: number) => {
  const d = parseISO(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
};
export const diffDays = (a: string, b: string) => Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000);
export const weekStart = (s: string, startDay = 6) => {
  const d = parseISO(s);
  const delta = (d.getDay() - startDay + 7) % 7;
  return addDays(s, -delta);
};
export const monthStart = (s: string) => s.slice(0, 8) + '01';
export const monthEnd = (s: string) => {
  const d = parseISO(s);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

const LOCALE = 'ar-EG-u-nu-latn';
export const fmtDate = (s?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) =>
  s ? new Intl.DateTimeFormat(LOCALE, opts).format(parseISO(s)) : '';
export const fmtDateLong = (s: string) => fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const fmtWeekday = (s: string, style: 'long' | 'short' = 'long') => fmtDate(s, { weekday: style });
export const fmtMonth = (s: string) => fmtDate(s, { month: 'long', year: 'numeric' });
export const fmtDateTime = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '';

let hour12 = true;
export const setTimeFormat = (f: '12h' | '24h') => { hour12 = f === '12h'; };
export const fmtTime = (t?: string | null) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (!hour12) return `${pad(h)}:${pad(m)}`;
  const suffix = h < 12 ? 'ص' : 'م';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m)} ${suffix}`;
};
export const timeToMin = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const fmtMoney = (n?: number | string | null, compact = false) => {
  const v = Number(n ?? 0);
  if (compact && Math.abs(v) >= 1_000_000) return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(v / 1_000_000)} مليون ج.م`;
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(v)} ج.م`;
};
export const fmtNum = (n?: number | string | null) => new Intl.NumberFormat(LOCALE).format(Number(n ?? 0));

export const relDay = (s?: string | null) => {
  if (!s) return '';
  const d = diffDays(s, todayISO());
  if (d === 0) return 'النهارده';
  if (d === 1) return 'بكرة';
  if (d === -1) return 'امبارح';
  if (d > 1 && d < 7) return `بعد ${d} أيام`;
  if (d < -1 && d > -30) return `من ${-d} يوم`;
  return fmtDate(s);
};

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'نهارك سعيد';
  return 'مساء الخير';
};

export const waLink = (phone?: string | null, text = '') => {
  if (!phone) return '';
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '2' + p; // Egyptian local -> +20
  return `https://wa.me/${p}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
export const telLink = (phone?: string | null) => (phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '');
