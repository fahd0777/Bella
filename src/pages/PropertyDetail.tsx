import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarPlus, Edit3, ImagePlus, Phone, Trash2, Users, X, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { useRows, removeRow } from '@/lib/api';
import { CLIENT_PROPERTY_RELATION, DEAL_TYPES, PROPERTY_STATUS, PROPERTY_TYPES, labelOf } from '@/lib/constants';
import { fmtDate, fmtMoney, fmtNum, telLink } from '@/lib/format';
import { supabase, arError, type Row } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Badge, Button, Card, Empty, IconButton, ListSkeleton, OptBadge, SectionTitle, useConfirm, useToast } from '@/components/ui';
import { useEditor } from '@/components/Editor';
import { useSignedUrls } from './Properties';

const MAX = 5 * 1024 * 1024;

export default function PropertyDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { session } = useAuth();
  const props = useRows('properties');
  const p = props.data?.find((x) => x.id === id);
  const photos = (useRows('property_photos').data ?? []).filter((x) => x.property_id === id);
  const links = (useRows('client_properties').data ?? []).filter((l) => l.property_id === id);
  const clients = useRows('clients').data ?? [];
  const urls = useSignedUrls(photos.map((x) => x.storage_path));
  const editor = useEditor();
  const confirm = useConfirm();
  const toast = useToast();
  const qc = useQueryClient();
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);

  if (props.isLoading) return <ListSkeleton rows={5} />;
  if (!p) return <Empty title="العقار ده مش موجود" action={<Button onClick={() => nav('/properties')}>رجوع</Button>} />;

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) { toast.error('صور بس'); continue; }
        if (f.size > MAX) { toast.error(`${f.name} أكبر من 5 ميجا`); continue; }
        const path = `${session!.user.id}/properties/${p.id}/${crypto.randomUUID()}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`;
        const { error } = await supabase.storage.from('media').upload(path, f, { contentType: f.type, upsert: false });
        if (error) throw error;
        const { error: e2 } = await supabase.from('property_photos').insert({ property_id: p.id, storage_path: path, sort_order: photos.length });
        if (e2) throw e2;
      }
      qc.invalidateQueries({ queryKey: ['property_photos'] });
      toast.success('الصور اترفعت');
    } catch (e) { toast.error(arError(e)); } finally { setUploading(false); if (file.current) file.current.value = ''; }
  };
  const removePhoto = async (ph: Row) => {
    if (!(await confirm({ title: 'تمسحي الصورة؟', danger: true, confirmText: 'امسحي' }))) return;
    await supabase.storage.from('media').remove([ph.storage_path]);
    await removeRow('property_photos', ph.id);
    qc.invalidateQueries({ queryKey: ['property_photos'] });
    setViewer(null);
  };
  const del = async () => {
    if (!(await confirm({ title: `تمسحي "${p.title}"؟`, body: 'هيتمسح العقار وصوره وربطه بالعملاء.', danger: true, confirmText: 'امسحي' }))) return;
    try {
      if (photos.length) await supabase.storage.from('media').remove(photos.map((x) => x.storage_path));
      await removeRow('properties', p.id); qc.invalidateQueries({ queryKey: ['properties'] }); toast.success('اتمسح'); nav('/properties');
    } catch (e) { toast.error(arError(e)); }
  };
  const shareText = `${p.title}\n${labelOf(PROPERTY_TYPES, p.property_type)} ${labelOf(DEAL_TYPES, p.deal_type)}${p.area ? ` — ${p.area}` : ''}\n${p.size_sqm ? `المساحة: ${p.size_sqm} م²\n` : ''}${p.bedrooms ? `${p.bedrooms} غرف · ${p.bathrooms ?? '-'} حمام\n` : ''}${p.finishing ? `التشطيب: ${p.finishing}\n` : ''}${p.price ? `السعر: ${fmtMoney(p.price)}` : ''}`;
  const facts: [string, string | number | null][] = [
    ['النوع', labelOf(PROPERTY_TYPES, p.property_type)], ['المساحة', p.size_sqm ? `${fmtNum(p.size_sqm)} م²` : null], ['الغرف', p.bedrooms], ['الحمامات', p.bathrooms],
    ['الدور', p.floor], ['التشطيب', p.finishing], ['المنطقة', p.area], ['العنوان', p.location], ['اتضاف', fmtDate(p.created_at.slice(0, 10))],
  ];

  return (
    <div className="space-y-5">
      <Link to="/properties" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowRight size={16} />العقارات</Link>
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <Card className="overflow-hidden">
            {photos.length ? (
              <div className="grid grid-cols-4 gap-1">
                {photos.slice(0, 5).map((ph, i) => (
                  <button key={ph.id} onClick={() => setViewer(i)} className={i === 0 ? 'col-span-4 aspect-[16/9]' : 'aspect-square'}>
                    {urls[ph.storage_path] ? <img src={urls[ph.storage_path]} alt="" className="size-full object-cover" /> : <div className="skeleton size-full !rounded-none" />}
                  </button>
                ))}
              </div>
            ) : <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-beige to-cream text-muted">لسه مفيش صور</div>}
            <div className="flex items-center justify-between gap-2 p-3">
              <span className="text-sm text-muted">{photos.length} صورة</span>
              <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
              <Button size="sm" variant="soft" icon={<ImagePlus size={16} />} loading={uploading} onClick={() => file.current?.click()}>ضيفي صور</Button>
            </div>
          </Card>
          {p.description && <Card className="p-5"><SectionTitle title="الوصف" /><p className="whitespace-pre-line">{p.description}</p></Card>}
        </div>
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <div className="mb-2 flex flex-wrap gap-1.5"><OptBadge opts={PROPERTY_STATUS} value={p.status} /><Badge color="#8A6A55">{labelOf(DEAL_TYPES, p.deal_type)}</Badge>{p.ref_code && <Badge color="#776D66">{p.ref_code}</Badge>}{p.is_demo && <Badge color="#B7842F">Demo</Badge>}</div>
            <h1 className="text-2xl font-semibold">{p.title}</h1>
            <p className="num mt-2 text-3xl font-semibold text-[color:var(--color-brown)]">{p.price ? fmtMoney(p.price) : '—'}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {facts.filter(([, v]) => v != null && v !== '').map(([k, v]) => <div key={k}><dt className="text-muted">{k}</dt><dd className="num font-medium">{v}</dd></div>)}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button icon={<CalendarPlus size={18} />} onClick={() => editor.open({ resource: 'appointment', defaults: { property_id: p.id, category: 'real_estate', title: `معاينة ${p.title}`, location: p.location || p.area } })}>حددي معاينة</Button>
              <Button variant="outline" icon={<Share2 size={18} />} onClick={async () => { try { if (navigator.share) await navigator.share({ text: shareText }); else { await navigator.clipboard.writeText(shareText); toast.success('التفاصيل اتنسخت'); } } catch { /* cancelled */ } }}>ابعتي التفاصيل</Button>
              <Button variant="outline" icon={<Edit3 size={18} />} onClick={() => editor.open({ resource: 'property', record: p })}>تعديل</Button>
              <Button variant="ghost" className="text-danger" aria-label="مسح" icon={<Trash2 size={18} />} onClick={del} />
            </div>
          </Card>
          {(p.owner_name || p.owner_phone) && (
            <Card className="flex items-center justify-between gap-3 p-5">
              <div><p className="text-sm text-muted">المالك</p><p className="font-semibold">{p.owner_name}</p>{p.owner_phone && <p className="num text-sm" dir="ltr">{p.owner_phone}</p>}</div>
              {p.owner_phone && <a href={telLink(p.owner_phone)}><IconButton label="اتصال"><Phone size={20} /></IconButton></a>}
            </Card>
          )}
          <Card className="p-5">
            <SectionTitle title="العملاء المرتبطين" icon={<Users size={18} />} count={links.length} action={<Button size="sm" variant="ghost" onClick={() => editor.open({ resource: 'client_property', defaults: { property_id: p.id } })}>+ ربط عميل</Button>} />
            {links.length ? links.map((l) => {
              const c = clients.find((x) => x.id === l.client_id);
              return (
                <div key={l.id} className="flex items-center gap-2 border-b border-line/70 py-2 last:border-0">
                  <Link to={`/crm/${l.client_id}`} className="min-w-0 flex-1"><p className="truncate font-medium">{c?.full_name ?? '—'}</p><p className="text-xs text-muted">{labelOf(CLIENT_PROPERTY_RELATION, l.relation)} · {fmtDate(l.shown_at)}{l.feedback ? ` · ${l.feedback}` : ''}</p></Link>
                  <button className="text-xs text-muted hover:text-ink" onClick={() => editor.open({ resource: 'client_property', record: l })}>تعديل</button>
                </div>
              );
            }) : <p className="text-sm text-muted">لسه محدش اتعرض عليه العقار ده</p>}
          </Card>
          {p.notes && <Card className="p-5"><SectionTitle title="ملاحظات" /><p className="text-sm">{p.notes}</p></Card>}
        </div>
      </div>

      {viewer != null && photos[viewer] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 anim-fade" onClick={() => setViewer(null)}>
          <img src={urls[photos[viewer].storage_path]} alt="" className="max-h-[85dvh] max-w-[92vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          <div className="absolute top-4 end-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <IconButton label="مسح الصورة" className="bg-white/10 text-white" onClick={() => removePhoto(photos[viewer])}><Trash2 size={20} /></IconButton>
            <IconButton label="إغلاق" className="bg-white/10 text-white" onClick={() => setViewer(null)}><X size={20} /></IconButton>
          </div>
          {photos.length > 1 && <>
            <IconButton label="السابقة" className="absolute start-3 bg-white/10 text-white" onClick={(e) => { e.stopPropagation(); setViewer((viewer - 1 + photos.length) % photos.length); }}><ChevronRight size={24} /></IconButton>
            <IconButton label="التالية" className="absolute end-3 bg-white/10 text-white" onClick={(e) => { e.stopPropagation(); setViewer((viewer + 1) % photos.length); }}><ChevronLeft size={24} /></IconButton>
          </>}
        </div>
      )}
    </div>
  );
}
