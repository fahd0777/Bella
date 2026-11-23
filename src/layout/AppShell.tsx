import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, CalendarDays, CheckCircle2, Users, Building2, Baby, Sparkles, ReceiptText, Wallet, StickyNote, BarChart3, Settings, Lock,
  Plus, Search, Bell, Menu, X, LogOut,
} from 'lucide-react';
import { useRows } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { useReminderEngine } from '@/lib/notify';
import { cx, IconButton } from '@/components/ui';
import { BellaMark } from '@/components/icons';
import { QuickAddSheet } from '@/components/QuickAdd';
import { GlobalSearch } from '@/components/GlobalSearch';
import { LockScreen, useIdleLock } from './Lock';

const NAV = [
  { to: '/', label: 'الرئيسية', icon: Home, end: true },
  { to: '/calendar', label: 'الكالندر', icon: CalendarDays },
  { to: '/tasks', label: 'المهام', icon: CheckCircle2 },
  { group: 'شغلي' },
  { to: '/crm', label: 'العملاء', icon: Users },
  { to: '/properties', label: 'العقارات', icon: Building2 },
  { group: 'البيت والعيلة' },
  { to: '/children', label: 'الأولاد', icon: Baby },
  { to: '/household', label: 'البيت', icon: Sparkles },
  { to: '/bills', label: 'الفواتير', icon: ReceiptText },
  { to: '/finance', label: 'الفلوس', icon: Wallet },
  { group: 'ليا' },
  { to: '/notes', label: 'الملاحظات', icon: StickyNote },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
  { to: '/private', label: 'مساحتي الخاصة', icon: Lock, private: true },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
] as const;

type NavItem = { to: string; label: string; icon: typeof Home; end?: boolean; private?: boolean };

function NavList({ onNavigate, showPrivate }: { onNavigate?: () => void; showPrivate: boolean }) {
  return (
    <nav className="space-y-0.5">
      {NAV.map((n, i) => {
        if ('group' in n) return <p key={i} className="px-3 pt-5 pb-1 text-xs font-semibold text-muted/80">{n.group}</p>;
        const item = n as NavItem;
        if (item.private && !showPrivate) return null;
        const I = item.icon;
        return (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate}
            className={({ isActive }) => cx('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] transition', isActive ? 'bg-white font-semibold text-ink shadow-soft' : 'text-muted hover:bg-white/60 hover:text-ink')}>
            {({ isActive }) => <><I size={19} className={isActive ? 'text-[color:var(--color-rose)]' : ''} />{item.label}</>}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function AppShell() {
  const settings = useSettings();
  useReminderEngine(settings);
  const { signOut } = useAuth();
  const [quick, setQuick] = useState(false);
  const [search, setSearch] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { locked, unlock } = useIdleLock(settings.session_timeout_minutes);
  const nav = useNavigate();
  const loc = useLocation();
  const unread = (useRows('notifications').data ?? []).filter((n) => !n.read && !n.dismissed).length;

  useEffect(() => { setDrawer(false); window.scrollTo({ top: 0 }); }, [loc.pathname]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  if (locked) return <LockScreen onUnlock={unlock} />;

  const bottom = [
    { to: '/', label: 'الرئيسية', icon: Home, end: true },
    { to: '/calendar', label: 'الكالندر', icon: CalendarDays },
    null,
    { to: '/crm', label: 'العملاء', icon: Users },
  ];

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-cream/60 px-3 py-5 md:flex">
        <div className="mb-2 flex items-center gap-2.5 px-2"><BellaMark /><span className="font-display text-2xl font-semibold">Bella</span></div>
        <div className="flex-1 overflow-y-auto scrollbar-none"><NavList showPrivate={settings.show_wellness_in_menu} /></div>
        <button onClick={() => signOut()} className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] text-muted hover:bg-white/60 hover:text-ink"><LogOut size={19} />تسجيل خروج</button>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line/70 bg-ivory/85 px-4 py-2.5 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-2 md:hidden"><BellaMark size={32} /><span className="font-display text-xl font-semibold">Bella</span></div>
          <button aria-label="بحث في كل حاجة" onClick={() => setSearch(true)} className="ms-auto flex h-11 items-center gap-2 rounded-2xl border border-line bg-white px-3 text-sm text-muted transition hover:text-ink md:ms-0 md:w-80">
            <Search size={18} /><span className="hidden sm:inline">بحث في كل حاجة...</span>
            <kbd className="ms-auto hidden rounded-md bg-cream px-1.5 text-xs md:inline">Ctrl K</kbd>
          </button>
          <div className="relative md:ms-auto">
            <IconButton label="التنبيهات" onClick={() => nav('/notifications')}><Bell size={20} /></IconButton>
            {unread > 0 && <span className="num pointer-events-none absolute top-1.5 end-1.5 flex min-w-5 items-center justify-center rounded-full bg-[color:var(--color-rose)] px-1 text-[11px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>}
          </div>
          <button onClick={() => setQuick(true)} className="hidden h-11 items-center gap-2 rounded-2xl bg-ink px-4 text-[15px] font-medium text-ivory shadow-soft transition hover:bg-[#433c38] md:flex"><Plus size={18} />إضافة سريعة</button>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-md pb-safe md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
          {bottom.map((b, i) =>
            b ? (
              <NavLink key={b.to} to={b.to} end={b.end} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2.5 text-[11px]', isActive ? 'font-semibold text-ink' : 'text-muted')}>
                {({ isActive }) => <><b.icon size={22} className={isActive ? 'text-[color:var(--color-rose)]' : ''} />{b.label}</>}
              </NavLink>
            ) : (
              <div key={i} className="flex justify-center">
                <button aria-label="إضافة سريعة" onClick={() => setQuick(true)} className="-mt-6 flex size-14 items-center justify-center rounded-full bg-ink text-ivory shadow-lift ring-4 ring-ivory transition active:scale-95"><Plus size={26} /></button>
              </div>
            ),
          )}
          <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-muted"><Menu size={22} />المزيد</button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/30 anim-fade" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[82%] max-w-xs flex-col bg-ivory px-3 py-4 shadow-lift anim-rise">
            <div className="mb-1 flex items-center justify-between px-2"><div className="flex items-center gap-2"><BellaMark size={32} /><span className="font-display text-xl font-semibold">Bella</span></div><IconButton label="إغلاق" onClick={() => setDrawer(false)}><X size={20} /></IconButton></div>
            <div className="flex-1 overflow-y-auto"><NavList showPrivate={settings.show_wellness_in_menu} onNavigate={() => setDrawer(false)} /></div>
            <button onClick={() => signOut()} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-muted"><LogOut size={19} />تسجيل خروج</button>
          </div>
        </div>
      )}

      <QuickAddSheet open={quick} onClose={() => setQuick(false)} />
      <GlobalSearch open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
