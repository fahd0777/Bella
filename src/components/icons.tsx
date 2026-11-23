import {
  CalendarDays, CheckCircle2, BellRing, UserRound, MessageCircle, Building2, Link, Baby, School, BookOpen, NotebookPen, GraduationCap,
  PartyPopper, Sparkles, ShoppingBasket, Package, Wrench, ReceiptText, Wallet, Coins, PiggyBank, StickyNote, Flower2, HeartPulse, type LucideIcon,
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  CalendarDays, CheckCircle2, BellRing, UserRound, MessageCircle, Building2, Link, Baby, School, BookOpen, NotebookPen, GraduationCap,
  PartyPopper, Sparkles, ShoppingBasket, Package, Wrench, ReceiptText, Wallet, Coins, PiggyBank, StickyNote, Flower2, HeartPulse,
};
export const Icon = ({ name, size = 20, className }: { name: string; size?: number; className?: string }) => {
  const C = ICONS[name] ?? Sparkles;
  return <C size={size} className={className} />;
};

export const BellaMark = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
    <rect width="64" height="64" rx="18" fill="#2E2A28" />
    <path d="M22 16h12.5c6.4 0 10.5 3.3 10.5 8.6 0 3.4-1.8 5.9-4.7 7.1 3.9 1 6.2 4 6.2 8 0 6-4.6 9.3-11.6 9.3H22V16Zm11.4 13.4c3 0 4.7-1.4 4.7-3.8s-1.7-3.7-4.7-3.7h-4.5v7.5h4.5Zm.9 14.3c3.3 0 5.1-1.5 5.1-4.1s-1.8-4.1-5.1-4.1h-5.4v8.2h5.4Z" fill="#FBF7F2" />
    <circle cx="48" cy="17" r="4" fill="#C98F90" />
  </svg>
);
