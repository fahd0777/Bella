import { useState } from 'react';
import { Archive, ArchiveRestore, Plus, Search, Star, StickyNote } from 'lucide-react';
import { useRows } from '@/lib/api';
import { useActions } from '@/lib/actions';
import { NOTE_CATEGORIES, labelOf } from '@/lib/constants';
import { fmtDate } from '@/lib/format';
import { Button, Chip, cx, Empty, ListSkeleton, PageHeader } from '@/components/ui';
import { useEditor } from '@/components/Editor';
import { matches } from '@/components/GlobalSearch';

export default function NotesPage() {
  const { data = [], isLoading } = useRows('notes');
  const clients = useRows('clients').data ?? [];
  const editor = useEditor();
  const { patch, refresh } = useActions();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [tag, setTag] = useState('');
  const [mode, setMode] = useState<'active' | 'fav' | 'archived'>('active');
  const tags = [...new Set(data.flatMap((n) => n.tags ?? []))];
  const rows = data.filter((n) => (mode === 'archived' ? n.archived : !n.archived) && (mode !== 'fav' || n.favorite) && (!cat || n.category === cat) && (!tag || n.tags?.includes(tag)) && matches(q, n.title, n.content, n.tags))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updated_at.localeCompare(a.updated_at));
  const toggle = async (id: string, p: Record<string, boolean>) => { await patch('notes', id, p); refresh('notes'); };

  return (
    <div>
      <PageHeader title="الملاحظات" subtitle="أفكار، يوميات، وأي حاجة مش عايزة تنسيها" actions={<Button icon={<Plus size={18} />} onClick={() => editor.open({ resource: 'note', quick: true })}>ملاحظة</Button>} />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input ps-9" placeholder="دوري في الملاحظات" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="flex gap-1.5"><Chip active={mode === 'active'} onClick={() => setMode('active')}>الكل</Chip><Chip active={mode === 'fav'} onClick={() => setMode('fav')}>⭐ المفضلة</Chip><Chip active={mode === 'archived'} onClick={() => setMode('archived')}>الأرشيف</Chip></div>
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Chip active={!cat} onClick={() => setCat('')}>كل التصنيفات</Chip>
        {NOTE_CATEGORIES.map((c) => <Chip key={c.value} active={cat === c.value} onClick={() => setCat(c.value)}>{c.label}</Chip>)}
        {tags.map((t) => <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? '' : t)}>#{t}</Chip>)}
      </div>
      {isLoading ? <ListSkeleton /> : !rows.length ? <Empty icon={<StickyNote />} title={data.length ? 'مفيش نتايج' : 'لسه مفيش ملاحظات'} /> : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {rows.map((n) => {
            const client = clients.find((c) => c.id === n.client_id);
            return (
              <div key={n.id} className={cx('card mb-4 break-inside-avoid p-4', n.category === 'journal' && 'bg-rose-soft/40', n.category === 'important' && 'bg-warn-soft/50')}>
                <button className="block w-full text-start" onClick={() => editor.open({ resource: 'note', record: n })}>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted"><span>{labelOf(NOTE_CATEGORIES, n.category)} · {fmtDate(n.note_date)}</span>{n.is_demo && <span className="text-warn">Demo</span>}</div>
                  {n.title && <p className="mb-1 font-semibold">{n.title}</p>}
                  <p className="line-clamp-[8] whitespace-pre-line text-[15px]">{n.content}</p>
                  {client && <p className="mt-2 text-xs text-muted">👤 {client.full_name}</p>}
                  {!!n.tags?.length && <div className="mt-2 flex flex-wrap gap-1">{n.tags.map((t: string) => <span key={t} className="rounded-full bg-cream px-2 text-xs text-muted">#{t}</span>)}</div>}
                </button>
                <div className="mt-2 flex justify-end gap-1">
                  <button aria-label="مفضلة" onClick={() => toggle(n.id, { favorite: !n.favorite })} className={cx('rounded-lg p-1.5 hover:bg-cream', n.favorite ? 'text-warn' : 'text-muted')}><Star size={16} fill={n.favorite ? 'currentColor' : 'none'} /></button>
                  <button aria-label={n.archived ? 'رجعيها' : 'أرشيف'} onClick={() => toggle(n.id, { archived: !n.archived })} className="rounded-lg p-1.5 text-muted hover:bg-cream">{n.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
