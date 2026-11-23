import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, BedDouble, Bath, Maximize2, ImageIcon } from 'lucide-react';
import { useRows } from '@/lib/api';
import { DEAL_TYPES, PROPERTY_STATUS, PROPERTY_TYPES, labelOf } from '@/lib/constants';
import { fmtMoney, fmtNum } from '@/lib/format';
import { supabase, type Row } from '@/lib/supabase';
import { Button, Chip, Empty, ListSkeleton, OptBadge, PageHeader, Badge } from '@/components/ui';
import { useEditor } from '@/components/Editor';
import { matches } from '@/components/GlobalSearch';

export function useSignedUrls(paths: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.join('|');
  useEffect(() => {
    if (!paths.length) return;
    supabase.storage.from('media').createSignedUrls(paths, 3600).then(({ data }) => {
      const m: Record<string, string> = {};
      data?.forEach((d) => { if (d.signedUrl && d.path) m[d.path] = d.signedUrl; });
      setUrls(m);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

export default function PropertiesPage() {
  const { data = [], isLoading } = useRows('properties');
  const photos = useRows('property_photos').data ?? [];
  const editor = useEditor();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [deal, setDeal] = useState('');
  const [ptype, setPtype] = useState('');
  const [sort, setSort] = useState<'recent' | 'price_asc' | 'price_desc' | 'size'>('recent');

  const cover = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of photos) if (!m.has(p.property_id)) m.set(p.property_id, p.storage_path);
    return m;
  }, [photos]);
  const urls = useSignedUrls([...cover.values()]);

  const rows = data.filter((p) => matches(q, p.title, p.ref_code, p.area, p.location, p.owner_name, p.owner_phone, p.description) && (!status || p.status === status) && (!deal || p.deal_type === deal) && (!ptype || p.property_type === ptype))
    .sort((a, b) => sort === 'price_asc' ? Number(a.price ?? 0) - Number(b.price ?? 0) : sort === 'price_desc' ? Number(b.price ?? 0) - Number(a.price ?? 0) : sort === 'size' ? Number(b.size_sqm ?? 0) - Number(a.size_sqm ?? 0) : b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <PageHeader title="العقارات" subtitle={`${data.filter((p) => p.status === 'available').length} متاح من ${data.length}`} actions={<Button icon={<Plus size={18} />} onClick={() => editor.open({ resource: 'property' })}>عقار جديد</Button>} />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input ps-9" placeholder="عنوان، منطقة، رقم مرجعي، المالك..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input !w-auto" value={ptype} onChange={(e) => setPtype(e.target.value)} aria-label="النوع"><option value="">كل الأنواع</option>{PROPERTY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="ترتيب"><option value="recent">الأحدث</option><option value="price_asc">السعر: الأقل</option><option value="price_desc">السعر: الأعلى</option><option value="size">المساحة</option></select>
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Chip active={!status} onClick={() => setStatus('')}>كل الحالات</Chip>
        {PROPERTY_STATUS.map((s) => <Chip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)}>{s.label}</Chip>)}
        <span className="mx-1 w-px bg-line" />
        <Chip active={!deal} onClick={() => setDeal('')}>بيع وإيجار</Chip>
        {DEAL_TYPES.map((s) => <Chip key={s.value} active={deal === s.value} onClick={() => setDeal(s.value)}>{s.label}</Chip>)}
      </div>
      {isLoading ? <ListSkeleton rows={4} /> : !rows.length ? (
        <Empty icon={<Building2 />} title={data.length ? 'مفيش نتايج' : 'لسه مفيش عقارات'} action={!data.length && <Button onClick={() => editor.open({ resource: 'property' })}>ضيفي عقار</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p: Row) => {
            const img = cover.get(p.id) && urls[cover.get(p.id)!];
            return (
              <button key={p.id} onClick={() => nav(`/properties/${p.id}`)} className="card overflow-hidden text-start transition hover:shadow-lift">
                <div className="relative aspect-[16/10] bg-gradient-to-br from-beige to-cream">
                  {img ? <img src={img} alt="" className="size-full object-cover" loading="lazy" /> : <div className="flex size-full items-center justify-center text-sand"><ImageIcon size={36} /></div>}
                  <div className="absolute top-3 start-3 flex gap-1.5"><OptBadge opts={PROPERTY_STATUS} value={p.status} /><Badge className="bg-white/90 text-ink">{labelOf(DEAL_TYPES, p.deal_type)}</Badge></div>
                  {p.is_demo && <span className="absolute top-3 end-3 rounded-full bg-white/90 px-2 text-[10px] text-warn">Demo</span>}
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted">{labelOf(PROPERTY_TYPES, p.property_type)}{p.area ? ` · ${p.area}` : ''}{p.ref_code ? ` · ${p.ref_code}` : ''}</p>
                  <p className="mt-0.5 line-clamp-1 font-semibold">{p.title}</p>
                  <p className="num mt-1 text-lg font-semibold text-[color:var(--color-brown)]">{p.price ? fmtMoney(p.price) : '—'}{p.deal_type === 'rent' && p.price ? <span className="text-sm font-normal text-muted"> / شهر</span> : ''}</p>
                  <div className="num mt-2 flex gap-4 text-sm text-muted">
                    {p.size_sqm && <span className="flex items-center gap-1"><Maximize2 size={14} />{fmtNum(p.size_sqm)} م²</span>}
                    {p.bedrooms != null && <span className="flex items-center gap-1"><BedDouble size={14} />{p.bedrooms}</span>}
                    {p.bathrooms != null && <span className="flex items-center gap-1"><Bath size={14} />{p.bathrooms}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
