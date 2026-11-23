-- =====================================================================
-- Bella — demo data (always is_demo = true, removable without touching real data)
-- =====================================================================
create or replace function public.seed_demo_data()
returns void language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
  p1 uuid; p2 uuid; p3 uuid;
  son uuid; dau uuid;
  d date := current_date;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.clients where owner_id = uid and is_demo) then return; end if;

  insert into public.clients (full_name, phone, whatsapp, client_type, lead_source, property_type, preferred_area, budget_min, budget_max, requirements, priority, status, last_contact_at, next_followup_date, next_followup_time, is_demo)
  values ('أحمد سامي', '01001234567', '01001234567', 'buyer', 'فيسبوك', 'apartment', 'التجمع الخامس', 2500000, 3200000, 'شقة 3 غرف قريبة من التسعين، تشطيب كامل', 'high', 'interested', d - 3, d, '11:00', true)
  returning id into c1;
  insert into public.clients (full_name, phone, whatsapp, client_type, lead_source, property_type, preferred_area, budget_min, budget_max, requirements, priority, status, last_contact_at, next_followup_date, next_followup_time, is_demo)
  values ('منى عبد الرحمن', '01112223344', '01112223344', 'tenant', 'ترشيح', 'apartment', 'الشيخ زايد', 18000, 25000, 'إيجار مفروش لمدة سنة', 'normal', 'viewing_scheduled', d - 1, d + 1, '17:00', true)
  returning id into c2;
  insert into public.clients (full_name, phone, client_type, lead_source, property_type, preferred_area, budget_min, budget_max, requirements, priority, status, last_contact_at, next_followup_date, is_demo)
  values ('م. خالد فؤاد', '01223334455', 'investor', 'إنستجرام', 'commercial', 'العاصمة الإدارية', 5000000, 8000000, 'محل تجاري أو عيادة بعائد إيجاري', 'urgent', 'negotiation', d - 6, d - 2, true)
  returning id into c3;
  insert into public.clients (full_name, phone, client_type, lead_source, property_type, preferred_area, priority, status, is_demo)
  values ('سارة محمود', '01009998877', 'seller', 'تيك توك', 'villa', '6 أكتوبر', 'normal', 'new', true)
  returning id into c4;
  insert into public.clients (full_name, phone, client_type, lead_source, preferred_area, priority, status, last_contact_at, is_demo)
  values ('هشام الشريف', '01556667788', 'landlord', 'عميل قديم', 'المعادي', 'low', 'closed_won', d - 20, true)
  returning id into c5;

  insert into public.properties (ref_code, title, property_type, deal_type, location, area, size_sqm, price, bedrooms, bathrooms, floor, finishing, description, owner_name, owner_phone, status, is_demo)
  values ('B-101', 'شقة 165م بالتجمع الخامس — بحري', 'apartment', 'sale', 'النرجس عمارات', 'التجمع الخامس', 165, 2950000, 3, 2, 'الثالث', 'سوبر لوكس', 'واجهة بحرية، قريبة من شارع التسعين والخدمات.', 'أ. عادل', '01001112233', 'available', true)
  returning id into p1;
  insert into public.properties (ref_code, title, property_type, deal_type, location, area, size_sqm, price, bedrooms, bathrooms, floor, finishing, description, owner_name, owner_phone, status, is_demo)
  values ('B-102', 'شقة مفروشة بالشيخ زايد', 'apartment', 'rent', 'الحي السادس', 'الشيخ زايد', 140, 22000, 2, 2, 'الأول', 'مفروش بالكامل', 'فرش مودرن، قريبة من مول العرب.', 'م. رانيا', '01114445566', 'available', true)
  returning id into p2;
  insert into public.properties (ref_code, title, property_type, deal_type, location, area, size_sqm, price, status, finishing, description, is_demo)
  values ('B-103', 'عيادة 60م بالعاصمة الإدارية', 'commercial', 'sale', 'الداون تاون', 'العاصمة الإدارية', 60, 6400000, 'reserved', 'نصف تشطيب', 'دور أرضي بواجهة على شارع رئيسي.', true)
  returning id into p3;

  insert into public.client_properties (client_id, property_id, relation, shown_at, feedback, is_demo) values
    (c1, p1, 'shown', d - 3, 'عجبته المساحة ومتردد في السعر', true),
    (c2, p2, 'interested', d - 1, null, true),
    (c3, p3, 'offered', d - 6, 'عرض 6.1 مليون', true);

  insert into public.client_interactions (client_id, kind, summary, occurred_at, property_id, is_demo) values
    (c1, 'call', 'مكالمة أولى — محتاج 3 غرف وميزانية لحد 3.2 مليون', now() - interval '5 days', null, true),
    (c1, 'viewing', 'معاينة شقة النرجس — رد فعل إيجابي', now() - interval '3 days', p1, true),
    (c2, 'message', 'بعتنا صور الشقة المفروشة على واتساب', now() - interval '1 day', p2, true),
    (c3, 'meeting', 'اجتماع تفاوض على العيادة', now() - interval '6 days', p3, true);

  insert into public.children (name, gender, birthday, school, grade, emergency_contact, color, is_demo)
  values ('يوسف', 'son', d - interval '11 years', 'مدرسة النيل الدولية', 'الصف السادس', '01001234000', '#7C9A86', true) returning id into son;
  insert into public.children (name, gender, birthday, school, grade, emergency_contact, color, is_demo)
  values ('ليلى', 'daughter', d - interval '8 years', 'مدرسة النيل الدولية', 'الصف الثالث', '01001234000', '#C48B8B', true) returning id into dau;

  insert into public.school_schedules (child_id, weekday, school_name, start_time, end_time, is_demo)
  select son, w, 'مدرسة النيل الدولية', '07:45'::time, '14:30'::time, true from unnest(array[0,1,2,3,4]) w
  union all
  select dau, w, 'مدرسة النيل الدولية', '07:45'::time, '13:30'::time, true from unnest(array[0,1,2,3,4]) w;

  insert into public.lessons (child_id, subject, teacher_name, teacher_phone, location, weekday, start_time, end_time, cost, payment_status, reminder_minutes, is_demo) values
    (son, 'رياضيات', 'أ. محمد حسن', '01012345678', 'سنتر الأوائل', 0, '17:00', '18:30', 1200, 'paid', 60, true),
    (son, 'إنجليزي', 'Ms. Nadia', '01098765432', 'أونلاين', 2, '18:00', '19:00', 900, 'unpaid', 30, true),
    (son, 'سباحة', 'كابتن عمر', null, 'نادي الصيد', 6, '10:00', '11:30', 800, 'paid', 60, true),
    (dau, 'عربي', 'أ. هبة', '01234567890', 'البيت', 1, '16:00', '17:00', 700, 'paid', 30, true),
    (dau, 'باليه', 'Ms. Laila', null, 'أكاديمية الفنون', 3, '17:30', '18:30', 1000, 'unpaid', 60, true),
    (dau, 'رسم', 'أ. سلمى', null, 'أتيليه', 5, '12:00', '13:00', 500, 'paid', 30, true);

  insert into public.homework (child_id, title, subject, due_date, priority, status, is_demo) values
    (son, 'حل تمارين الكسور ص 45', 'رياضيات', d + 1, 'high', 'in_progress', true),
    (dau, 'قراءة قصة وتلخيصها', 'عربي', d + 2, 'normal', 'not_started', true),
    (son, 'مشروع العلوم', 'علوم', d - 1, 'urgent', 'not_started', true);

  insert into public.exams (child_id, subject, exam_date, exam_time, prep_notes, reminder_minutes, is_demo) values
    (son, 'رياضيات — شهري', d + 5, '09:00', 'مراجعة الوحدة التانية', 1440, true),
    (dau, 'إنجليزي — Quiz', d + 3, '08:30', null, 1440, true);

  insert into public.child_activities (child_id, title, kind, activity_date, start_time, location, is_demo) values
    (dau, 'عيد ميلاد صاحبتها مريم', 'birthday', d + 4, '16:00', 'كيدزانيا', true),
    (son, 'رحلة المدرسة', 'trip', d + 9, '08:00', 'الأهرامات', true);

  insert into public.appointments (title, category, start_date, start_time, end_time, location, priority, reminder_minutes, client_id, property_id, is_demo) values
    ('معاينة شقة النرجس مع أحمد سامي', 'real_estate', d, '11:00', '12:00', 'التجمع الخامس', 'high', 60, c1, p1, true),
    ('معاينة المفروشة — منى', 'real_estate', d + 1, '17:00', '18:00', 'الشيخ زايد', 'normal', 60, c2, p2, true),
    ('دكتور الأسنان', 'medical', d + 2, '19:00', '19:45', 'المهندسين', 'normal', 120, null, null, true),
    ('مشتريات البيت الأسبوعية', 'shopping', d, '13:00', '14:00', 'كارفور', 'normal', 30, null, null, true);
  insert into public.appointments (title, category, start_date, start_time, end_time, repeat, priority, is_demo)
  values ('جيم', 'personal', d - 7, '08:30', '09:30', 'weekly', 'low', true);

  insert into public.tasks (title, category, due_date, due_time, priority, status, client_id, is_demo) values
    ('أبعت عروض شقق التجمع لأحمد', 'real_estate', d, '10:00', 'high', 'not_started', c1, true),
    ('تجديد إعلان العيادة على فيسبوك', 'real_estate', d - 1, null, 'normal', 'not_started', null, true),
    ('حجز ميعاد صيانة التكييف', 'household', d + 2, null, 'normal', 'not_started', null, true),
    ('شراء هدية عيد ميلاد مريم', 'children', d + 3, null, 'normal', 'in_progress', null, true),
    ('قراءة 20 صفحة', 'personal', null, null, 'low', 'not_started', null, true);

  insert into public.household_tasks (title, category, due_date, priority, assigned_to, repeat, status, is_demo) values
    ('تنظيف المطبخ', 'kitchen', d, 'normal', 'أم محمد', 'daily', 'not_started', true),
    ('غسيل الملايات', 'laundry', d + 1, 'normal', null, 'weekly', 'not_started', true),
    ('تنظيف التلاجة', 'kitchen', d - 2, 'high', null, 'monthly', 'not_started', true),
    ('ترتيب الدواليب', 'organization', d + 5, 'low', null, 'none', 'not_started', true);

  insert into public.shopping_items (name, quantity, category, est_price, is_demo) values
    ('لبن', '3 علب', 'groceries', 135, true),
    ('فراخ', '2 كيلو', 'groceries', 380, true),
    ('مسحوق غسيل', '1', 'cleaning', 220, true),
    ('كراسات مدرسة', '5', 'children', 150, true),
    ('شامبو', '1', 'personal_care', 160, true);

  insert into public.inventory_items (name, quantity, min_quantity, unit, category, is_demo) values
    ('رز', 1, 2, 'كيلو', 'groceries', true),
    ('زيت', 2, 1, 'لتر', 'groceries', true),
    ('سكر', 3, 2, 'كيلو', 'groceries', true),
    ('بن', 0, 1, 'عبوة', 'groceries', true),
    ('منظف أرضيات', 1, 1, 'عبوة', 'cleaning', true);

  insert into public.maintenance_records (item, maintenance_type, last_date, next_date, technician, technician_phone, cost, is_demo) values
    ('التكييف', 'تنظيف فلاتر وشحن فريون', d - 170, d + 10, 'م. سيد', '01011112222', 650, true),
    ('فلتر المياه', 'تغيير شمعات', d - 85, d + 5, 'شركة أكوا', '19999', 450, true);

  insert into public.bills (name, category, amount, due_date, status, repeat, reminder_days, is_demo) values
    ('فاتورة الكهرباء', 'electricity', 850, d + 3, 'unpaid', 'monthly', 2, true),
    ('الإنترنت المنزلي', 'internet', 650, d + 8, 'unpaid', 'monthly', 2, true),
    ('الغاز', 'gas', 120, d - 2, 'unpaid', 'monthly', 2, true),
    ('قسط المدرسة — الترم التاني', 'school', 45000, d + 20, 'partial', 'none', 7, true),
    ('خط الموبايل', 'mobile', 300, d - 10, 'paid', 'monthly', 1, true);
  update public.bills set paid_amount = 20000 where owner_id = uid and is_demo and category = 'school';
  update public.bills set paid_amount = amount, paid_date = d - 10 where owner_id = uid and is_demo and status = 'paid';

  insert into public.expenses (amount, category, spent_on, description, payment_method, is_demo) values
    (1250, 'household', d - 1, 'مشتريات سوبر ماركت', 'card', true),
    (1200, 'lessons', d - 4, 'درس رياضيات يوسف', 'cash', true),
    (450, 'transport', d - 2, 'بنزين', 'cash', true),
    (800, 'personal', d - 6, 'كوافير', 'instapay', true),
    (300, 'real_estate', d - 3, 'إعلان ممول', 'card', true),
    (650, 'children', d - 8, 'لبس مدرسة', 'card', true),
    (300, 'bills', d - 10, 'خط الموبايل', 'wallet', true);

  insert into public.income (amount, source, category, received_on, client_id, is_demo) values
    (45000, 'عمولة بيع شقة المعادي', 'commission', d - 12, c5, true),
    (8000, 'إيجار شقة', 'rent', d - 5, null, true);

  insert into public.budgets (category, monthly_limit, is_demo) values
    ('total', 30000, true), ('household', 8000, true), ('children', 6000, true), ('personal', 3000, true), ('shopping', 2500, true)
  on conflict (owner_id, category) do nothing;

  insert into public.notes (title, content, category, tags, favorite, is_demo) values
    ('أفكار محتوى للعقارات', 'فيديو "3 أخطاء قبل ما تشتري شقة في التجمع" + جولة في شقة النرجس', 'idea', '{محتوى,عقارات}', true, true),
    (null, 'باسورد الواي فاي الجديد عند أم محمد', 'household', '{}', false, true),
    ('يومياتي', 'يوم طويل بس الحمد لله قفلت صفقة المعادي ❤️', 'journal', '{}', false, true);
end; $$;

create or replace function public.clear_demo_data()
returns void language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); t text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  foreach t in array array['client_interactions','client_properties','appointments','tasks','expenses','income','notes',
    'school_schedules','lessons','homework','exams','child_activities','children',
    'properties','clients','household_tasks','shopping_items','inventory_items','maintenance_records','bills','budgets','reminders'] loop
    execute format('delete from public.%I where owner_id = $1 and is_demo', t) using uid;
  end loop;
  delete from public.notifications where owner_id = uid and source_key like 'demo:%';
end; $$;

revoke all on function public.seed_demo_data(), public.clear_demo_data() from public, anon;
grant execute on function public.seed_demo_data(), public.clear_demo_data() to authenticated;
