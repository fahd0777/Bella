import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X, Check, AlertTriangle, Info } from 'lucide-react';
import { colorOf, labelOf, PRIORITIES, type Opt } from '@/lib/constants';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'outline'; size?: 'sm' | 'md' | 'lg'; loading?: boolean; icon?: ReactNode };
export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...p }: BtnProps) {
  const v = {
    primary: 'bg-ink text-ivory hover:bg-[#433c38] shadow-soft',
    soft: 'bg-rose-soft text-[color:var(--color-rose)] hover:bg-blush',
    ghost: 'text-muted hover:bg-cream hover:text-ink',
    outline: 'border border-line bg-white text-ink hover:bg-cream',
    danger: 'bg-danger text-white hover:opacity-90',
  }[variant];
  const s = { sm: 'h-9 px-3 text-sm rounded-xl gap-1.5', md: 'h-11 px-4 text-[15px] rounded-2xl gap-2', lg: 'h-13 px-6 text-base rounded-2xl gap-2' }[size];
  return (
    <button {...p} disabled={disabled || loading} className={cx('inline-flex items-center justify-center font-medium transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none select-none', v, s, className)}>
      {loading ? <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} {...p} className={cx('inline-flex size-11 items-center justify-center rounded-2xl text-muted hover:bg-cream hover:text-ink transition active:scale-95', className)}>
      {children}
    </button>
  );
}

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cx('card', className)}>{children}</div>;
}

export function SectionTitle({ title, action, icon, count }: { title: string; action?: ReactNode; icon?: ReactNode; count?: number }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        {icon && <span className="text-[color:var(--color-rose)]">{icon}</span>}
        {title}
        {count != null && count > 0 && <span className="num rounded-full bg-cream px-2 text-sm font-sans text-muted">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 anim-rise">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold md:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', className)}
      style={color ? { background: color + '1f', color } : undefined}>
      {children}
    </span>
  );
}
export const OptBadge = ({ opts, value }: { opts: Opt[]; value: unknown }) => <Badge color={colorOf(opts, value)}>{labelOf(opts, value)}</Badge>;
export const PriorityBadge = ({ value }: { value?: string }) =>
  value && value !== 'normal' ? <Badge color={colorOf(PRIORITIES, value)}>{labelOf(PRIORITIES, value)}</Badge> : null;

export function Empty({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-sand bg-white/50 px-6 py-10 text-center">
      {icon && <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-rose-soft text-[color:var(--color-rose)]">{icon}</div>}
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cx('skeleton', className)} />;
export const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
);

export function Field({ label, hint, error, children, required, group }: { label: string; hint?: string; error?: string; children: ReactNode; required?: boolean; group?: boolean }) {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}{required && <span className="text-[color:var(--color-rose)]"> *</span>}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </Tag>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 py-2 text-start">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-sage' : 'bg-sand')}>
        <span className={cx('absolute top-1 size-5 rounded-full bg-white shadow transition-all', checked ? 'start-6' : 'start-1')} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div className={cx('flex gap-1 overflow-x-auto rounded-2xl bg-cream p-1 scrollbar-none', className)} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx('flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition whitespace-nowrap', value === o.value ? 'bg-white text-ink shadow-soft' : 'text-muted hover:text-ink')}>
          {o.label}
          {o.count != null && o.count > 0 && <span className={cx('num rounded-full px-1.5 text-xs', value === o.value ? 'bg-rose-soft text-[color:var(--color-rose)]' : 'bg-white/70')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cx('shrink-0 rounded-full border px-3 py-1.5 text-sm transition whitespace-nowrap', active ? 'border-ink bg-ink text-ivory' : 'border-line bg-white text-muted hover:text-ink')}>
      {children}
    </button>
  );
}

export function Stat({ label, value, hint, tone = 'default', icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'rose' | 'sage' | 'danger' | 'warn'; icon?: ReactNode }) {
  const t = { default: 'bg-white', rose: 'bg-rose-soft', sage: 'bg-sage-soft', danger: 'bg-danger-soft', warn: 'bg-warn-soft' }[tone];
  return (
    <div className={cx('rounded-3xl border border-line p-4', t)}>
      <div className="flex items-center justify-between text-sm text-muted">{label}{icon}</div>
      <div className="num mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Progress({ value, max, danger }: { value: number; max: number; danger?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = danger || pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warn' : 'bg-sage';
  return <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream"><div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} /></div>;
}

/* ---------------- Sheet (bottom sheet on mobile, dialog on desktop) ---------------- */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,textarea,select')?.focus(), 60);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] anim-fade" onClick={onClose} />
      <div ref={ref} className={cx('relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-ivory shadow-lift anim-sheet md:rounded-[28px] md:anim-rise', wide ? 'md:max-w-3xl' : 'md:max-w-lg')}>
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-sand md:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 md:pt-5">
          <h3 className="text-xl font-semibold">{title}</h3>
          <IconButton label="إغلاق" onClick={onClose}><X size={20} /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-line px-5 py-3 pb-safe">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Toasts ---------------- */
type Toast = { id: number; text: string; tone: 'success' | 'error' | 'info'; action?: { label: string; run: () => void } };
const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { ...t, id }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), t.action ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-ivory shadow-lift anim-rise">
            {t.tone === 'success' ? <Check size={18} className="text-[#B9D3C1]" /> : t.tone === 'error' ? <AlertTriangle size={18} className="text-[#F1B5AE]" /> : <Info size={18} />}
            <span>{t.text}</span>
            {t.action && <button className="ms-2 font-semibold text-blush underline-offset-4 hover:underline" onClick={() => { t.action!.run(); setItems((x) => x.filter((i) => i.id !== t.id)); }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => {
  const push = useContext(ToastCtx);
  return {
    success: (text: string, action?: Toast['action']) => push({ text, tone: 'success', action }),
    error: (text: string) => push({ text, tone: 'error' }),
    info: (text: string, action?: Toast['action']) => push({ text, tone: 'info', action }),
  };
};

/* ---------------- Confirm dialog ---------------- */
type ConfirmOpts = { title: string; body?: string; confirmText?: string; danger?: boolean; typeToConfirm?: string };
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [typed, setTyped] = useState('');
  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => { setTyped(''); setState({ ...o, resolve }); }), []);
  const close = (v: boolean) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Sheet open={!!state} onClose={() => close(false)} title={state?.title ?? ''}
        footer={<>
          <Button variant={state?.danger ? 'danger' : 'primary'} className="flex-1" disabled={!!state?.typeToConfirm && typed.trim() !== state.typeToConfirm} onClick={() => close(true)}>{state?.confirmText ?? 'تأكيد'}</Button>
          <Button variant="outline" className="flex-1" onClick={() => close(false)}>إلغاء</Button>
        </>}>
        {state?.body && <p className="text-muted">{state.body}</p>}
        {state?.typeToConfirm && (
          <div className="mt-4"><Field label={`اكتبي "${state.typeToConfirm}" للتأكيد`}><input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} /></Field></div>
        )}
      </Sheet>
    </ConfirmCtx.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmCtx);
