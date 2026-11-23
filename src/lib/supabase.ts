import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && key);

// Only the publishable (anon) key ever ships to the browser. All access is enforced by RLS.
export const supabase = createClient(url || 'https://invalid.local', key || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

export type Row = Record<string, any> & { id: string };

export const TABLES = [
  'clients', 'client_interactions', 'properties', 'property_photos', 'client_properties',
  'appointments', 'reminders', 'children', 'school_schedules', 'lessons', 'homework', 'exams', 'child_activities',
  'tasks', 'household_tasks', 'shopping_items', 'inventory_items', 'maintenance_records',
  'bills', 'expenses', 'income', 'budgets', 'notes', 'period_records', 'wellness_records',
  'categories', 'notifications',
] as const;
export type Table = (typeof TABLES)[number];

export const arError = (e: unknown): string => {
  const m = (e as { message?: string })?.message || String(e);
  if (/Invalid login credentials/i.test(m)) return 'الإيميل أو الباسورد مش صح';
  if (/Email not confirmed/i.test(m)) return 'لازم تأكدي الإيميل الأول من الرسالة اللي وصلتك';
  if (/owner account already exists|Database error saving new user/i.test(m)) return 'التطبيق ده خاص وفيه حساب بالفعل';
  if (/Password should be/i.test(m)) return 'الباسورد لازم يكون 8 حروف على الأقل';
  if (/rate limit|too many/i.test(m)) return 'محاولات كتير، استني دقيقة وجربي تاني';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'مفيش اتصال بالإنترنت';
  if (/JWT|session/i.test(m)) return 'الجلسة انتهت، سجلي دخول تاني';
  return 'حصل خطأ، جربي تاني';
};
