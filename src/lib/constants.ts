// Arabic labels + option lists shared by forms, filters and badges.
export type Opt = { value: string; label: string; color?: string };

export const PRIORITIES: Opt[] = [
  { value: 'urgent', label: 'عاجل', color: '#B4534B' },
  { value: 'high', label: 'مهم', color: '#B7842F' },
  { value: 'normal', label: 'عادي', color: '#6F8E79' },
  { value: 'low', label: 'بسيط', color: '#9A918A' },
];

export const APPT_CATEGORIES: Opt[] = [
  { value: 'real_estate', label: 'عقارات', color: '#8A6A55' },
  { value: 'personal', label: 'شخصي', color: '#B9787A' },
  { value: 'children', label: 'الأولاد', color: '#6F8E79' },
  { value: 'school', label: 'مدرسة', color: '#7D93AB' },
  { value: 'lessons', label: 'دروس', color: '#9883B0' },
  { value: 'household', label: 'البيت', color: '#C09A5B' },
  { value: 'medical', label: 'طبي', color: '#C2706A' },
  { value: 'social', label: 'اجتماعي', color: '#B0849E' },
  { value: 'shopping', label: 'مشتريات', color: '#8FA382' },
  { value: 'other', label: 'أخرى', color: '#A39A92' },
];

export const TASK_CATEGORIES: Opt[] = [
  { value: 'personal', label: 'شخصي', color: '#B9787A' },
  { value: 'work', label: 'شغل', color: '#7D93AB' },
  { value: 'real_estate', label: 'عقارات', color: '#8A6A55' },
  { value: 'children', label: 'الأولاد', color: '#6F8E79' },
  { value: 'household', label: 'البيت', color: '#C09A5B' },
  { value: 'shopping', label: 'مشتريات', color: '#8FA382' },
  { value: 'health', label: 'صحة', color: '#C2706A' },
  { value: 'other', label: 'أخرى', color: '#A39A92' },
];

export const TASK_STATUS: Opt[] = [
  { value: 'not_started', label: 'لسه' },
  { value: 'in_progress', label: 'شغالة عليها' },
  { value: 'done', label: 'خلصت' },
  { value: 'deferred', label: 'مؤجلة' },
];
export const SIMPLE_STATUS: Opt[] = TASK_STATUS.filter((s) => s.value !== 'deferred');

export const REPEAT: Opt[] = [
  { value: 'none', label: 'مرة واحدة' },
  { value: 'daily', label: 'يوميًا' },
  { value: 'weekly', label: 'أسبوعيًا' },
  { value: 'monthly', label: 'شهريًا' },
];

export const REMINDERS: Opt[] = [
  { value: '', label: 'من غير تذكير' },
  { value: '0', label: 'في نفس الوقت' },
  { value: '5', label: 'قبلها بـ 5 دقايق' },
  { value: '15', label: 'قبلها بربع ساعة' },
  { value: '30', label: 'قبلها بنص ساعة' },
  { value: '60', label: 'قبلها بساعة' },
  { value: '120', label: 'قبلها بساعتين' },
  { value: '1440', label: 'قبلها بيوم' },
];

export const CLIENT_TYPES: Opt[] = [
  { value: 'buyer', label: 'مشتري' },
  { value: 'seller', label: 'بايع' },
  { value: 'tenant', label: 'مستأجر' },
  { value: 'landlord', label: 'مالك (إيجار)' },
  { value: 'investor', label: 'مستثمر' },
];

export const PIPELINE: Opt[] = [
  { value: 'new', label: 'عميل جديد', color: '#A39A92' },
  { value: 'contacted', label: 'اتكلمنا', color: '#7D93AB' },
  { value: 'interested', label: 'مهتم', color: '#9883B0' },
  { value: 'properties_sent', label: 'بعتنا عروض', color: '#C09A5B' },
  { value: 'viewing_scheduled', label: 'معاينة متحددة', color: '#B9787A' },
  { value: 'viewing_done', label: 'عمل معاينة', color: '#B0849E' },
  { value: 'negotiation', label: 'تفاوض', color: '#B7842F' },
  { value: 'closed_won', label: 'اتقفلت ✓', color: '#6F8E79' },
  { value: 'lost', label: 'ضاع', color: '#B4534B' },
  { value: 'later', label: 'متابعة بعدين', color: '#8A6A55' },
];

export const LEAD_SOURCES: Opt[] = ['فيسبوك', 'إنستجرام', 'تيك توك', 'واتساب', 'ترشيح', 'عميل قديم', 'موقع عقاري', 'مكالمة', 'أخرى'].map((v) => ({ value: v, label: v }));

export const PROPERTY_TYPES: Opt[] = [
  { value: 'apartment', label: 'شقة' },
  { value: 'villa', label: 'فيلا' },
  { value: 'duplex', label: 'دوبلكس' },
  { value: 'penthouse', label: 'بنتهاوس' },
  { value: 'commercial', label: 'تجاري' },
  { value: 'office', label: 'مكتب إداري' },
  { value: 'land', label: 'أرض' },
  { value: 'other', label: 'أخرى' },
];
export const DEAL_TYPES: Opt[] = [
  { value: 'sale', label: 'بيع' },
  { value: 'rent', label: 'إيجار' },
];
export const PROPERTY_STATUS: Opt[] = [
  { value: 'available', label: 'متاح', color: '#6F8E79' },
  { value: 'reserved', label: 'محجوز', color: '#B7842F' },
  { value: 'sold', label: 'اتباع', color: '#8A6A55' },
  { value: 'rented', label: 'اتأجر', color: '#7D93AB' },
  { value: 'unavailable', label: 'مش متاح', color: '#A39A92' },
];

export const INTERACTION_KINDS: Opt[] = [
  { value: 'call', label: 'مكالمة' },
  { value: 'meeting', label: 'مقابلة' },
  { value: 'message', label: 'رسالة / واتساب' },
  { value: 'followup', label: 'متابعة' },
  { value: 'offer', label: 'عرض عقار' },
  { value: 'viewing', label: 'معاينة' },
  { value: 'note', label: 'ملاحظة' },
  { value: 'status_change', label: 'تغيير مرحلة' },
];
export const CLIENT_PROPERTY_RELATION: Opt[] = [
  { value: 'shown', label: 'اتعرض عليه' },
  { value: 'interested', label: 'مهتم بيه' },
  { value: 'offered', label: 'قدّم عرض' },
  { value: 'owner', label: 'المالك' },
];

export const WEEKDAYS: Opt[] = [
  { value: '6', label: 'السبت' },
  { value: '0', label: 'الأحد' },
  { value: '1', label: 'الاتنين' },
  { value: '2', label: 'التلات' },
  { value: '3', label: 'الأربع' },
  { value: '4', label: 'الخميس' },
  { value: '5', label: 'الجمعة' },
];
export const weekdayLabel = (n: number) => WEEKDAYS.find((w) => w.value === String(n))?.label ?? '';

export const PAYMENT_STATUS: Opt[] = [
  { value: 'unpaid', label: 'لسه متدفعش', color: '#B4534B' },
  { value: 'paid', label: 'اتدفع', color: '#6F8E79' },
  { value: 'partial', label: 'جزء منه', color: '#B7842F' },
];

export const ACTIVITY_KINDS: Opt[] = [
  { value: 'sports', label: 'رياضة' },
  { value: 'club', label: 'نادي / نشاط' },
  { value: 'school_event', label: 'فعالية مدرسة' },
  { value: 'trip', label: 'رحلة' },
  { value: 'birthday', label: 'عيد ميلاد' },
  { value: 'other', label: 'أخرى' },
];

export const HOUSEHOLD_CATEGORIES: Opt[] = [
  { value: 'cleaning', label: 'تنضيف' },
  { value: 'laundry', label: 'غسيل' },
  { value: 'kitchen', label: 'مطبخ' },
  { value: 'organization', label: 'ترتيب' },
  { value: 'shopping', label: 'مشتريات' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'other', label: 'أخرى' },
];
export const HOUSEHOLD_REPEAT: Opt[] = [...REPEAT, { value: 'custom', label: 'كل كام يوم' }];

export const SHOP_CATEGORIES: Opt[] = [
  { value: 'groceries', label: 'بقالة وأكل' },
  { value: 'cleaning', label: 'منظفات' },
  { value: 'personal_care', label: 'عناية شخصية' },
  { value: 'children', label: 'للأولاد' },
  { value: 'household', label: 'للبيت' },
  { value: 'other', label: 'أخرى' },
];

export const BILL_CATEGORIES: Opt[] = [
  { value: 'electricity', label: 'كهرباء' },
  { value: 'water', label: 'مياه' },
  { value: 'gas', label: 'غاز' },
  { value: 'internet', label: 'إنترنت' },
  { value: 'mobile', label: 'موبايل' },
  { value: 'school', label: 'مدرسة' },
  { value: 'lessons', label: 'دروس' },
  { value: 'rent', label: 'إيجار' },
  { value: 'installments', label: 'أقساط' },
  { value: 'other', label: 'أخرى' },
];
export const BILL_REPEAT: Opt[] = [
  { value: 'none', label: 'مرة واحدة' },
  { value: 'monthly', label: 'كل شهر' },
  { value: 'yearly', label: 'كل سنة' },
];

export const EXPENSE_CATEGORIES: Opt[] = [
  { value: 'household', label: 'البيت', color: '#C09A5B' },
  { value: 'children', label: 'الأولاد', color: '#6F8E79' },
  { value: 'education', label: 'تعليم', color: '#7D93AB' },
  { value: 'lessons', label: 'دروس', color: '#9883B0' },
  { value: 'real_estate', label: 'شغل العقارات', color: '#8A6A55' },
  { value: 'personal', label: 'شخصي', color: '#B9787A' },
  { value: 'shopping', label: 'تسوق', color: '#8FA382' },
  { value: 'bills', label: 'فواتير', color: '#B0849E' },
  { value: 'medical', label: 'طبي', color: '#C2706A' },
  { value: 'transport', label: 'مواصلات', color: '#A88E7A' },
  { value: 'other', label: 'أخرى', color: '#A39A92' },
];
export const PAYMENT_METHODS: Opt[] = [
  { value: 'cash', label: 'كاش' },
  { value: 'card', label: 'كارت' },
  { value: 'instapay', label: 'إنستاباي' },
  { value: 'wallet', label: 'محفظة' },
  { value: 'transfer', label: 'تحويل بنكي' },
  { value: 'other', label: 'أخرى' },
];
export const INCOME_CATEGORIES: Opt[] = [
  { value: 'commission', label: 'عمولة' },
  { value: 'salary', label: 'مرتب' },
  { value: 'rent', label: 'إيجار' },
  { value: 'gift', label: 'هدية' },
  { value: 'other', label: 'أخرى' },
];

export const NOTE_CATEGORIES: Opt[] = [
  { value: 'personal', label: 'شخصي' },
  { value: 'idea', label: 'فكرة' },
  { value: 'work', label: 'شغل' },
  { value: 'client', label: 'عميل' },
  { value: 'household', label: 'البيت' },
  { value: 'shopping', label: 'مشتريات' },
  { value: 'important', label: 'مهم' },
  { value: 'journal', label: 'يوميات' },
];

export const FLOW: Opt[] = [
  { value: 'light', label: 'خفيف' },
  { value: 'medium', label: 'متوسط' },
  { value: 'heavy', label: 'كتير' },
];
export const SYMPTOMS: Opt[] = ['تقلصات', 'صداع', 'إرهاق', 'انتفاخ', 'تقلب مزاج', 'وجع ضهر', 'حبوب', 'غثيان'].map((v) => ({ value: v, label: v }));
export const MOODS: Opt[] = ['😊 مبسوطة', '😌 هادية', '😐 عادي', '😔 متضايقة', '😤 متوترة', '😴 تعبانة'].map((v) => ({ value: v, label: v }));

export const labelOf = (opts: Opt[], v: unknown) => opts.find((o) => o.value === String(v ?? ''))?.label ?? (v == null ? '' : String(v));
export const colorOf = (opts: Opt[], v: unknown) => opts.find((o) => o.value === String(v ?? ''))?.color ?? '#A39A92';
