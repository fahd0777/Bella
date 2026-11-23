import { RESOURCES, QUICK_ADD } from '@/config/resources';
import { Sheet } from './ui';
import { Icon } from './icons';
import { useEditor } from './Editor';

export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const editor = useEditor();
  return (
    <Sheet open={open} onClose={onClose} title="أضيفي بسرعة">
      <div className="grid grid-cols-3 gap-2.5 pb-2 sm:grid-cols-4">
        {QUICK_ADD.map((k) => {
          const r = RESOURCES[k];
          return (
            <button key={k} onClick={() => { onClose(); editor.open({ resource: k, quick: true }); }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-white px-2 py-4 text-sm font-medium transition hover:border-[color:var(--color-rose)] hover:bg-rose-soft active:scale-95">
              <span className="flex size-10 items-center justify-center rounded-xl bg-cream text-[color:var(--color-rose)]"><Icon name={r.icon} /></span>
              {r.singular}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
