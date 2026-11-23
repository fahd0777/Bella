import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { setTimeFormat } from './format';
import { useEffect } from 'react';

export type Settings = {
  owner_id: string; time_format: '12h' | '24h'; week_start: number; currency: string; theme: string;
  default_reminder_minutes: number; session_timeout_minutes: number; browser_notifications: boolean;
  notify_appointments: boolean; notify_followups: boolean; notify_bills: boolean; notify_tasks: boolean; notify_children: boolean; notify_household: boolean;
  show_wellness_in_menu: boolean; monthly_budget: number | null;
};
const COLS = 'owner_id,time_format,week_start,currency,theme,default_reminder_minutes,session_timeout_minutes,browser_notifications,notify_appointments,notify_followups,notify_bills,notify_tasks,notify_children,notify_household,show_wellness_in_menu,monthly_budget';

export const DEFAULT_SETTINGS: Omit<Settings, 'owner_id'> = {
  time_format: '12h', week_start: 6, currency: 'EGP', theme: 'rose', default_reminder_minutes: 30, session_timeout_minutes: 15,
  browser_notifications: false, notify_appointments: true, notify_followups: true, notify_bills: true, notify_tasks: true, notify_children: true, notify_household: true,
  show_wellness_in_menu: true, monthly_budget: null,
};

export function useSettings() {
  const q = useQuery({
    queryKey: ['user_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_settings').select(COLS).maybeSingle();
      if (error) throw error;
      return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as Settings;
    },
    staleTime: 60_000,
  });
  const s = q.data ?? ({ ...DEFAULT_SETTINGS } as Settings);
  useEffect(() => {
    setTimeFormat(s.time_format);
    document.documentElement.dataset.accent = s.theme;
  }, [s.time_format, s.theme]);
  return s;
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      const { error } = await supabase.from('user_settings').update(patch).eq('owner_id', (await supabase.auth.getUser()).data.user!.id);
      if (error) throw error;
    },
    onMutate: (patch) => qc.setQueryData<Settings>(['user_settings'], (old) => (old ? { ...old, ...patch } : old)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['user_settings'] }),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
      if (error) throw error;
      return data as { id: string; full_name: string | null; phone: string | null; avatar_path: string | null } | null;
    },
    staleTime: 60_000,
  });
}
