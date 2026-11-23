import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, Check, CheckCheck, Plus, X } from 'lucide-react';
import { useRows } from '@/lib/api';
import { useActions } from '@/lib/actions';
import { supabase } from '@/lib/supabase';
import { fmtDateTime } from '@/lib/format';
import { Button, Card, cx, Empty, ListSkeleton, PageHeader, SectionTitle } from '@/components/ui';
import { useEditor } from '@/components/Editor';
import { useSettings, useUpdateSettings } from '@/lib/settings';

export default function NotificationsPage() {
  const { data = [], isLoading } = useRows('notifications');
  const reminders = useRows('reminders').data ?? [];
  const { patch, refresh } = useActions();
  const qc = useQueryClient();
  const nav = useNavigate();
  const editor = useEditor();
  const settings = useSettings();
  const update = useUpdateSettings();
  const list = data.filter((n) => !n.dismissed);
  const unread = list.filter((n) => !n.read);
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const perm = supported ? Notification.permission : 'denied';

  const markAll = async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };
  const enableBrowser = async () => {
    if (!supported) return;
    const p = await Notification.requestPermission();
    if (p === 'granted') update.mutate({ browser_notifications: true });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="التنبيهات" subtitle={`${unread.length} جديد`} actions={<>
        {unread.length > 0 && <Button variant="outline" icon={<CheckCheck size={18} />} onClick={markAll}>قريت الكل</Button>}
        <Button icon={<Plus size={18} />} onClick={() => editor.open({ resource: 'reminder', quick: true })}>فكريني</Button>
      </>} />

      {supported && !(settings.browser_notifications && perm === 'granted') && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p className="font-medium">تنبيهات المتصفح</p><p className="text-sm text-muted">{perm === 'denied' ? 'التنبيهات مقفولة من إعدادات المتصفح.' : 'توصلك تنبيهات على الجهاز طول ما Bella مفتوحة (أو متثبتة كتطبيق وشغالة).'}</p></div>
          {perm !== 'denied' && <Button variant="soft" icon={<BellRing size={18} />} onClick={enableBrowser}>فعّليها</Button>}
        </Card>
      )}

      <Card className="p-2">
        {isLoading ? <ListSkeleton /> : !list.length ? <Empty icon={<Bell />} title="مفيش تنبيهات" hint="التنبيهات بتتعمل تلقائي من مواعيدك ومهامك وفواتيرك ومتابعات العملاء" /> : list.map((n) => (
          <div key={n.id} className={cx('flex items-start gap-3 rounded-2xl px-3 py-3', !n.read && 'bg-rose-soft/50')}>
            <span className={cx('mt-2 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-[color:var(--color-rose)]')} />
            <button className="min-w-0 flex-1 text-start" onClick={async () => { if (!n.read) await patch('notifications', n.id, { read: true }); if (n.link) nav(n.link); }}>
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="text-sm text-muted">{n.body}</p>}
              <p className="num text-xs text-muted/80">{fmtDateTime(n.due_at)}</p>
            </button>
            {!n.read && <button aria-label="اتقرت" onClick={() => patch('notifications', n.id, { read: true })} className="rounded-lg p-2 text-muted hover:bg-white"><Check size={16} /></button>}
            <button aria-label="شيليها" onClick={async () => { await patch('notifications', n.id, { dismissed: true }); refresh('notifications'); }} className="rounded-lg p-2 text-muted hover:bg-white"><X size={16} /></button>
          </div>
        ))}
      </Card>

      <Card className="p-4">
        <SectionTitle title="تذكيراتي" icon={<BellRing size={18} />} count={reminders.filter((r) => !r.done).length} />
        {reminders.length ? reminders.slice().sort((a, b) => Number(a.done) - Number(b.done) || a.remind_at.localeCompare(b.remind_at)).map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-line/70 px-1 py-2.5 last:border-0">
            <button onClick={() => editor.open({ resource: 'reminder', record: r })} className={cx('min-w-0 flex-1 text-start', r.done && 'text-muted line-through')}>
              <p className="font-medium">{r.title}</p><p className="num text-xs text-muted">{fmtDateTime(r.remind_at)}</p>
            </button>
            <Button size="sm" variant={r.done ? 'ghost' : 'outline'} onClick={async () => { await patch('reminders', r.id, { done: !r.done }); refresh('reminders'); }}>{r.done ? 'رجعيه' : 'تم'}</Button>
          </div>
        )) : <p className="text-sm text-muted">اضغطي "فكريني" عشان تضيفي تذكير بوقت معين</p>}
      </Card>
      <p className="text-center text-xs text-muted">التنبيهات بتشتغل طول ما Bella مفتوحة على الجهاز. التنبيهات وهي مقفولة تمامًا محتاجة خدمة Push إضافية (مش مفعّلة حاليًا).</p>
    </div>
  );
}
