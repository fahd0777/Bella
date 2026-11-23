import * as C from '@/lib/constants';
import type { Table } from '@/lib/supabase';
import { todayISO } from '@/lib/format';

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'date' | 'time' | 'datetime' | 'select' | 'boolean' | 'phone' | 'relation' | 'tags' | 'multi' | 'color' | 'scale';
export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  options?: C.Opt[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  half?: boolean;
  quick?: boolean;          // shown in the fast "Quick Add" mode
  relation?: { table: Table; label: string; sub?: string };
  min?: number; max?: number;
  showIf?: (row: Record<string, any>) => boolean;
  customModule?: 'tasks' | 'appointments' | 'expenses' | 'clients' | 'household';
};

export type Resource = {
  key: string;
  table: Table;
  singular: string;          // "موعد"
  titleField: string;
  fields: FieldDef[];
  defaults?: () => Record<string, any>;
  icon: string;              // lucide icon name (resolved in components/icons)
  route?: string;
};

const priority: FieldDef = { name: 'priority', label: 'الأولوية', type: 'select', options: C.PRIORITIES, half: true };
const notes: FieldDef = { name: 'notes', label: 'ملاحظات', type: 'textarea' };
const child: FieldDef = { name: 'child_id', label: 'مين من الأولاد؟', type: 'relation', relation: { table: 'children', label: 'name' }, required: true, quick: true };
const reminder: FieldDef = { name: 'reminder_minutes', label: 'التذكير', type: 'select', options: C.REMINDERS, half: true };

export const RESOURCES: Record<string, Resource> = {
  appointment: {
    key: 'appointment', table: 'appointments', singular: 'موعد', titleField: 'title', icon: 'CalendarDays', route: '/calendar',
    defaults: () => ({ start_date: todayISO(), category: 'personal', priority: 'normal', repeat: 'none', status: 'scheduled', reminder_minutes: 30 }),
    fields: [
      { name: 'title', label: 'العنوان', type: 'text', required: true, quick: true, placeholder: 'مثلاً: معاينة شقة التجمع' },
      { name: 'category', label: 'النوع', type: 'select', options: C.APPT_CATEGORIES, quick: true, half: true, customModule: 'appointments' },
      { name: 'start_date', label: 'التاريخ', type: 'date', required: true, quick: true, half: true },
      { name: 'start_time', label: 'من الساعة', type: 'time', quick: true, half: true },
      { name: 'end_time', label: 'لحد الساعة', type: 'time', half: true },
      { name: 'location', label: 'المكان', type: 'text' },
      priority, reminder,
      { name: 'repeat', label: 'التكرار', type: 'select', options: C.REPEAT, half: true },
      { name: 'repeat_until', label: 'يتكرر لحد', type: 'date', half: true, showIf: (r) => r.repeat && r.repeat !== 'none' },
      { name: 'client_id', label: 'عميل مرتبط', type: 'relation', relation: { table: 'clients', label: 'full_name', sub: 'phone' } },
      { name: 'property_id', label: 'عقار مرتبط', type: 'relation', relation: { table: 'properties', label: 'title', sub: 'ref_code' } },
      { name: 'child_id', label: 'خاص بـ', type: 'relation', relation: { table: 'children', label: 'name' } },
      { name: 'status', label: 'الحالة', type: 'select', options: [{ value: 'scheduled', label: 'متحدد' }, { value: 'done', label: 'تم' }, { value: 'cancelled', label: 'اتلغى' }] },
      notes,
    ],
  },
  task: {
    key: 'task', table: 'tasks', singular: 'مهمة', titleField: 'title', icon: 'CheckCircle2', route: '/tasks',
    defaults: () => ({ category: 'personal', priority: 'normal', status: 'not_started', repeat: 'none' }),
    fields: [
      { name: 'title', label: 'المهمة', type: 'text', required: true, quick: true, placeholder: 'عايزة تعملي إيه؟' },
      { name: 'due_date', label: 'الميعاد', type: 'date', quick: true, half: true, hint: 'ممكن تسيبيه فاضي' },
      { name: 'due_time', label: 'الساعة', type: 'time', half: true },
      { name: 'category', label: 'التصنيف', type: 'select', options: C.TASK_CATEGORIES, quick: true, half: true, customModule: 'tasks' },
      { ...priority, quick: true },
      { name: 'status', label: 'الحالة', type: 'select', options: C.TASK_STATUS, half: true },
      { name: 'repeat', label: 'التكرار', type: 'select', options: C.REPEAT, half: true },
      reminder,
      { name: 'client_id', label: 'عميل مرتبط', type: 'relation', relation: { table: 'clients', label: 'full_name', sub: 'phone' }, half: true },
      { name: 'description', label: 'التفاصيل', type: 'textarea' },
    ],
  },
  reminder: {
    key: 'reminder', table: 'reminders', singular: 'تذكير', titleField: 'title', icon: 'BellRing', route: '/notifications',
    defaults: () => ({ remind_at: new Date(Date.now() + 3600_000).toISOString() }),
    fields: [
      { name: 'title', label: 'فكريني بـ', type: 'text', required: true, quick: true },
      { name: 'remind_at', label: 'إمتى؟', type: 'datetime', required: true, quick: true },
      notes,
    ],
  },
  client: {
    key: 'client', table: 'clients', singular: 'عميل', titleField: 'full_name', icon: 'UserRound', route: '/crm',
    defaults: () => ({ client_type: 'buyer', priority: 'normal', status: 'new' }),
    fields: [
      { name: 'full_name', label: 'الاسم', type: 'text', required: true, quick: true },
      { name: 'phone', label: 'الموبايل', type: 'phone', quick: true, half: true },
      { name: 'whatsapp', label: 'واتساب', type: 'phone', half: true, hint: 'لو نفس الموبايل سيبيه فاضي' },
      { name: 'client_type', label: 'نوع العميل', type: 'select', options: C.CLIENT_TYPES, quick: true, half: true },
      { name: 'status', label: 'المرحلة', type: 'select', options: C.PIPELINE, half: true },
      { name: 'lead_source', label: 'جه منين؟', type: 'select', options: C.LEAD_SOURCES, half: true, customModule: 'clients' },
      priority,
      { name: 'property_type', label: 'نوع العقار المطلوب', type: 'select', options: C.PROPERTY_TYPES, half: true },
      { name: 'preferred_area', label: 'المنطقة', type: 'text', half: true, quick: true, placeholder: 'التجمع، زايد...' },
      { name: 'budget_min', label: 'الميزانية من', type: 'money', half: true },
      { name: 'budget_max', label: 'الميزانية لحد', type: 'money', half: true },
      { name: 'requirements', label: 'المتطلبات', type: 'textarea' },
      { name: 'next_followup_date', label: 'المتابعة الجاية', type: 'date', half: true },
      { name: 'next_followup_time', label: 'الساعة', type: 'time', half: true },
      { name: 'last_contact_at', label: 'آخر تواصل', type: 'date', half: true },
      notes,
    ],
  },
  interaction: {
    key: 'interaction', table: 'client_interactions', singular: 'تواصل', titleField: 'summary', icon: 'MessageCircle',
    defaults: () => ({ kind: 'call', occurred_at: new Date().toISOString() }),
    fields: [
      { name: 'client_id', label: 'العميل', type: 'relation', relation: { table: 'clients', label: 'full_name' }, required: true },
      { name: 'kind', label: 'النوع', type: 'select', options: C.INTERACTION_KINDS, quick: true },
      { name: 'summary', label: 'حصل إيه؟', type: 'textarea', required: true, quick: true },
      { name: 'occurred_at', label: 'الوقت', type: 'datetime', half: true },
      { name: 'property_id', label: 'عقار', type: 'relation', relation: { table: 'properties', label: 'title' }, half: true },
    ],
  },
  property: {
    key: 'property', table: 'properties', singular: 'عقار', titleField: 'title', icon: 'Building2', route: '/properties',
    defaults: () => ({ property_type: 'apartment', deal_type: 'sale', status: 'available' }),
    fields: [
      { name: 'title', label: 'عنوان العقار', type: 'text', required: true, quick: true, placeholder: 'شقة 150م بالتجمع' },
      { name: 'ref_code', label: 'رقم مرجعي', type: 'text', half: true },
      { name: 'property_type', label: 'النوع', type: 'select', options: C.PROPERTY_TYPES, quick: true, half: true },
      { name: 'deal_type', label: 'بيع ولا إيجار', type: 'select', options: C.DEAL_TYPES, quick: true, half: true },
      { name: 'status', label: 'الحالة', type: 'select', options: C.PROPERTY_STATUS, half: true },
      { name: 'price', label: 'السعر', type: 'money', quick: true, half: true },
      { name: 'size_sqm', label: 'المساحة (م²)', type: 'number', half: true },
      { name: 'area', label: 'المنطقة', type: 'text', quick: true, half: true },
      { name: 'location', label: 'العنوان / الموقع', type: 'text', half: true },
      { name: 'bedrooms', label: 'الغرف', type: 'number', half: true },
      { name: 'bathrooms', label: 'الحمامات', type: 'number', half: true },
      { name: 'floor', label: 'الدور', type: 'text', half: true },
      { name: 'finishing', label: 'التشطيب', type: 'text', half: true },
      { name: 'description', label: 'الوصف', type: 'textarea' },
      { name: 'owner_name', label: 'اسم المالك', type: 'text', half: true },
      { name: 'owner_phone', label: 'موبايل المالك', type: 'phone', half: true },
      notes,
    ],
  },
  client_property: {
    key: 'client_property', table: 'client_properties', singular: 'ربط عميل بعقار', titleField: 'relation', icon: 'Link',
    defaults: () => ({ relation: 'shown', shown_at: todayISO() }),
    fields: [
      { name: 'client_id', label: 'العميل', type: 'relation', relation: { table: 'clients', label: 'full_name', sub: 'phone' }, required: true },
      { name: 'property_id', label: 'العقار', type: 'relation', relation: { table: 'properties', label: 'title', sub: 'ref_code' }, required: true },
      { name: 'relation', label: 'العلاقة', type: 'select', options: C.CLIENT_PROPERTY_RELATION, half: true },
      { name: 'shown_at', label: 'التاريخ', type: 'date', half: true },
      { name: 'feedback', label: 'رأي العميل', type: 'textarea' },
    ],
  },
  child: {
    key: 'child', table: 'children', singular: 'ابن / بنت', titleField: 'name', icon: 'Baby', route: '/children',
    defaults: () => ({ gender: 'son', color: '#6F8E79' }),
    fields: [
      { name: 'name', label: 'الاسم', type: 'text', required: true, quick: true },
      { name: 'gender', label: 'ابن ولا بنت؟', type: 'select', options: [{ value: 'son', label: 'ابني' }, { value: 'daughter', label: 'بنتي' }], half: true, quick: true },
      { name: 'birthday', label: 'تاريخ الميلاد', type: 'date', half: true },
      { name: 'school', label: 'المدرسة', type: 'text', half: true },
      { name: 'grade', label: 'السنة الدراسية', type: 'text', half: true },
      { name: 'color', label: 'لونه في الكالندر', type: 'color', half: true },
      { name: 'emergency_contact', label: 'رقم للطوارئ', type: 'phone', half: true },
      { name: 'medical_notes', label: 'ملاحظات صحية (خاصة)', type: 'textarea' },
      notes,
    ],
  },
  school: {
    key: 'school', table: 'school_schedules', singular: 'يوم مدرسة', titleField: 'school_name', icon: 'School',
    defaults: () => ({ weekday: 0, start_time: '07:45', end_time: '14:00' }),
    fields: [
      child,
      { name: 'weekday', label: 'اليوم', type: 'select', options: C.WEEKDAYS, half: true, quick: true },
      { name: 'school_name', label: 'المدرسة', type: 'text', half: true },
      { name: 'start_time', label: 'من', type: 'time', required: true, half: true, quick: true },
      { name: 'end_time', label: 'لحد', type: 'time', required: true, half: true, quick: true },
      { name: 'activities', label: 'أنشطة اليوم', type: 'text' },
      notes,
    ],
  },
  lesson: {
    key: 'lesson', table: 'lessons', singular: 'درس', titleField: 'subject', icon: 'BookOpen', route: '/children',
    defaults: () => ({ weekday: 0, payment_status: 'unpaid', active: true, reminder_minutes: 60 }),
    fields: [
      child,
      { name: 'subject', label: 'المادة / النشاط', type: 'text', required: true, quick: true },
      { name: 'weekday', label: 'اليوم (بيتكرر كل أسبوع)', type: 'select', options: C.WEEKDAYS, half: true, quick: true },
      { name: 'start_time', label: 'الساعة', type: 'time', required: true, half: true, quick: true },
      { name: 'end_time', label: 'لحد', type: 'time', half: true },
      reminder,
      { name: 'teacher_name', label: 'المدرس', type: 'text', half: true },
      { name: 'teacher_phone', label: 'موبايل المدرس', type: 'phone', half: true },
      { name: 'location', label: 'المكان', type: 'text', half: true },
      { name: 'transport_notes', label: 'المواصلات', type: 'text', half: true },
      { name: 'cost', label: 'التكلفة', type: 'money', half: true },
      { name: 'payment_status', label: 'الدفع', type: 'select', options: C.PAYMENT_STATUS, half: true },
      { name: 'active', label: 'الدرس شغال', type: 'boolean' },
      notes,
    ],
  },
  homework: {
    key: 'homework', table: 'homework', singular: 'واجب', titleField: 'title', icon: 'NotebookPen', route: '/children',
    defaults: () => ({ priority: 'normal', status: 'not_started', due_date: todayISO() }),
    fields: [
      child,
      { name: 'title', label: 'الواجب', type: 'text', required: true, quick: true },
      { name: 'subject', label: 'المادة', type: 'text', half: true },
      { name: 'due_date', label: 'التسليم', type: 'date', half: true, quick: true },
      priority,
      { name: 'status', label: 'الحالة', type: 'select', options: C.SIMPLE_STATUS, half: true },
      notes,
    ],
  },
  exam: {
    key: 'exam', table: 'exams', singular: 'امتحان', titleField: 'subject', icon: 'GraduationCap', route: '/children',
    defaults: () => ({ reminder_minutes: 1440 }),
    fields: [
      child,
      { name: 'subject', label: 'المادة', type: 'text', required: true, quick: true },
      { name: 'exam_date', label: 'التاريخ', type: 'date', required: true, half: true, quick: true },
      { name: 'exam_time', label: 'الساعة', type: 'time', half: true },
      reminder,
      { name: 'prep_notes', label: 'المذاكرة', type: 'textarea' },
      { name: 'study_tasks', label: 'خطة المراجعة', type: 'textarea' },
    ],
  },
  activity: {
    key: 'activity', table: 'child_activities', singular: 'نشاط', titleField: 'title', icon: 'PartyPopper', route: '/children',
    defaults: () => ({ kind: 'other' }),
    fields: [
      child,
      { name: 'title', label: 'النشاط', type: 'text', required: true, quick: true },
      { name: 'kind', label: 'النوع', type: 'select', options: C.ACTIVITY_KINDS, half: true },
      { name: 'activity_date', label: 'التاريخ', type: 'date', half: true, quick: true },
      { name: 'start_time', label: 'الساعة', type: 'time', half: true },
      { name: 'location', label: 'المكان', type: 'text', half: true },
      notes,
    ],
  },
  household_task: {
    key: 'household_task', table: 'household_tasks', singular: 'مهمة بيت', titleField: 'title', icon: 'Sparkles', route: '/household',
    defaults: () => ({ category: 'cleaning', priority: 'normal', status: 'not_started', repeat: 'none', due_date: todayISO() }),
    fields: [
      { name: 'title', label: 'المهمة', type: 'text', required: true, quick: true },
      { name: 'category', label: 'النوع', type: 'select', options: C.HOUSEHOLD_CATEGORIES, half: true, quick: true, customModule: 'household' },
      { name: 'due_date', label: 'الميعاد', type: 'date', half: true, quick: true },
      priority,
      { name: 'assigned_to', label: 'مين هيعملها؟', type: 'text', half: true },
      { name: 'repeat', label: 'التكرار', type: 'select', options: C.HOUSEHOLD_REPEAT, half: true },
      { name: 'repeat_every_days', label: 'كل كام يوم؟', type: 'number', half: true, showIf: (r) => r.repeat === 'custom' },
      { name: 'status', label: 'الحالة', type: 'select', options: C.SIMPLE_STATUS, half: true },
      notes,
    ],
  },
  shopping: {
    key: 'shopping', table: 'shopping_items', singular: 'حاجة للشراء', titleField: 'name', icon: 'ShoppingBasket', route: '/household?tab=shopping',
    defaults: () => ({ category: 'groceries', purchased: false }),
    fields: [
      { name: 'name', label: 'الحاجة', type: 'text', required: true, quick: true },
      { name: 'quantity', label: 'الكمية', type: 'text', half: true, quick: true },
      { name: 'category', label: 'القسم', type: 'select', options: C.SHOP_CATEGORIES, half: true, quick: true },
      { name: 'est_price', label: 'السعر التقريبي', type: 'money', half: true },
      notes,
    ],
  },
  inventory: {
    key: 'inventory', table: 'inventory_items', singular: 'صنف في البيت', titleField: 'name', icon: 'Package', route: '/household?tab=inventory',
    defaults: () => ({ category: 'groceries', quantity: 1, min_quantity: 1 }),
    fields: [
      { name: 'name', label: 'الصنف', type: 'text', required: true, quick: true },
      { name: 'quantity', label: 'الموجود', type: 'number', half: true, quick: true },
      { name: 'min_quantity', label: 'أقل كمية', type: 'number', half: true, quick: true, hint: 'لما يوصلها هقترح نضيفه للمشتريات' },
      { name: 'unit', label: 'الوحدة', type: 'text', half: true, placeholder: 'كيلو، علبة...' },
      { name: 'category', label: 'القسم', type: 'select', options: C.SHOP_CATEGORIES, half: true },
      notes,
    ],
  },
  maintenance: {
    key: 'maintenance', table: 'maintenance_records', singular: 'صيانة', titleField: 'item', icon: 'Wrench', route: '/household?tab=maintenance',
    fields: [
      { name: 'item', label: 'الجهاز / الحاجة', type: 'text', required: true, quick: true, placeholder: 'التكييف، فلتر المياه...' },
      { name: 'maintenance_type', label: 'نوع الصيانة', type: 'text' },
      { name: 'last_date', label: 'آخر صيانة', type: 'date', half: true },
      { name: 'next_date', label: 'الصيانة الجاية', type: 'date', half: true, quick: true },
      { name: 'technician', label: 'الفني', type: 'text', half: true },
      { name: 'technician_phone', label: 'موبايل الفني', type: 'phone', half: true },
      { name: 'cost', label: 'التكلفة', type: 'money', half: true },
      notes,
    ],
  },
  bill: {
    key: 'bill', table: 'bills', singular: 'فاتورة', titleField: 'name', icon: 'ReceiptText', route: '/bills',
    defaults: () => ({ category: 'other', status: 'unpaid', repeat: 'monthly', reminder_days: 2, due_date: todayISO(), paid_amount: 0 }),
    fields: [
      { name: 'name', label: 'الفاتورة', type: 'text', required: true, quick: true },
      { name: 'category', label: 'النوع', type: 'select', options: C.BILL_CATEGORIES, half: true, quick: true },
      { name: 'amount', label: 'المبلغ', type: 'money', required: true, half: true, quick: true },
      { name: 'due_date', label: 'آخر ميعاد', type: 'date', required: true, half: true, quick: true },
      { name: 'repeat', label: 'بتتكرر', type: 'select', options: C.BILL_REPEAT, half: true },
      { name: 'status', label: 'الحالة', type: 'select', options: C.PAYMENT_STATUS, half: true },
      { name: 'paid_amount', label: 'المدفوع', type: 'money', half: true, showIf: (r) => r.status === 'partial' },
      { name: 'paid_date', label: 'تاريخ الدفع', type: 'date', half: true, showIf: (r) => r.status !== 'unpaid' },
      { name: 'reminder_days', label: 'فكريني قبلها بكام يوم', type: 'number', half: true },
      notes,
    ],
  },
  expense: {
    key: 'expense', table: 'expenses', singular: 'مصروف', titleField: 'description', icon: 'Wallet', route: '/finance',
    defaults: () => ({ spent_on: todayISO(), category: 'household', payment_method: 'cash' }),
    fields: [
      { name: 'amount', label: 'المبلغ', type: 'money', required: true, quick: true },
      { name: 'category', label: 'على إيه؟', type: 'select', options: C.EXPENSE_CATEGORIES, quick: true, half: true, customModule: 'expenses' },
      { name: 'spent_on', label: 'التاريخ', type: 'date', half: true },
      { name: 'description', label: 'الوصف', type: 'text', quick: true },
      { name: 'payment_method', label: 'طريقة الدفع', type: 'select', options: C.PAYMENT_METHODS, half: true },
      { name: 'client_id', label: 'عميل (اختياري)', type: 'relation', relation: { table: 'clients', label: 'full_name' }, half: true },
      { name: 'property_id', label: 'عقار (اختياري)', type: 'relation', relation: { table: 'properties', label: 'title' } },
      notes,
    ],
  },
  income: {
    key: 'income', table: 'income', singular: 'دخل', titleField: 'source', icon: 'Coins', route: '/finance',
    defaults: () => ({ received_on: todayISO(), category: 'commission' }),
    fields: [
      { name: 'amount', label: 'المبلغ', type: 'money', required: true, quick: true },
      { name: 'source', label: 'المصدر', type: 'text', required: true, quick: true, placeholder: 'عمولة شقة...' },
      { name: 'category', label: 'النوع', type: 'select', options: C.INCOME_CATEGORIES, half: true },
      { name: 'received_on', label: 'التاريخ', type: 'date', half: true },
      { name: 'client_id', label: 'عميل (اختياري)', type: 'relation', relation: { table: 'clients', label: 'full_name' } },
      notes,
    ],
  },
  budget: {
    key: 'budget', table: 'budgets', singular: 'ميزانية', titleField: 'category', icon: 'PiggyBank', route: '/finance',
    fields: [
      { name: 'category', label: 'البند', type: 'select', required: true, options: [{ value: 'total', label: 'الميزانية الكلية' }, ...C.EXPENSE_CATEGORIES] },
      { name: 'monthly_limit', label: 'الحد الشهري', type: 'money', required: true },
    ],
  },
  note: {
    key: 'note', table: 'notes', singular: 'ملاحظة', titleField: 'title', icon: 'StickyNote', route: '/notes',
    defaults: () => ({ category: 'personal', tags: [], note_date: todayISO() }),
    fields: [
      { name: 'content', label: 'اكتبي اللي في بالك', type: 'textarea', required: true, quick: true },
      { name: 'title', label: 'العنوان (اختياري)', type: 'text' },
      { name: 'category', label: 'التصنيف', type: 'select', options: C.NOTE_CATEGORIES, half: true, quick: true },
      { name: 'note_date', label: 'التاريخ', type: 'date', half: true },
      { name: 'tags', label: 'تاجز', type: 'tags', hint: 'افصلي بينهم بفاصلة' },
      { name: 'client_id', label: 'عميل مرتبط', type: 'relation', relation: { table: 'clients', label: 'full_name' }, half: true },
      { name: 'favorite', label: 'مفضلة ⭐', type: 'boolean' },
    ],
  },
  period: {
    key: 'period', table: 'period_records', singular: 'دورة', titleField: 'start_date', icon: 'Flower2',
    defaults: () => ({ start_date: todayISO(), symptoms: [] }),
    fields: [
      { name: 'start_date', label: 'بدأت يوم', type: 'date', required: true, half: true, quick: true },
      { name: 'end_date', label: 'خلصت يوم', type: 'date', half: true, quick: true },
      { name: 'flow', label: 'الكثافة', type: 'select', options: [{ value: '', label: '—' }, ...C.FLOW], half: true },
      { name: 'pain_level', label: 'الألم (0-10)', type: 'scale', min: 0, max: 10, half: true },
      { name: 'symptoms', label: 'الأعراض', type: 'multi', options: C.SYMPTOMS, hint: 'ممكن تضيفي عرض جديد' },
      { name: 'mood', label: 'المود', type: 'select', options: [{ value: '', label: '—' }, ...C.MOODS], half: true },
      { name: 'energy', label: 'الطاقة (1-5)', type: 'scale', min: 1, max: 5, half: true },
      notes,
    ],
  },
  wellness: {
    key: 'wellness', table: 'wellness_records', singular: 'يوميات صحتي', titleField: 'record_date', icon: 'HeartPulse',
    defaults: () => ({ record_date: todayISO() }),
    fields: [
      { name: 'record_date', label: 'اليوم', type: 'date', required: true, half: true },
      { name: 'mood', label: 'المود', type: 'select', options: [{ value: '', label: '—' }, ...C.MOODS], half: true, quick: true },
      { name: 'sleep_hours', label: 'ساعات النوم', type: 'number', half: true },
      { name: 'energy', label: 'الطاقة (1-5)', type: 'scale', min: 1, max: 5, half: true, quick: true },
      { name: 'notes', label: 'ملاحظات', type: 'textarea', quick: true },
    ],
  },
};

export const QUICK_ADD = ['appointment', 'task', 'client', 'property', 'lesson', 'homework', 'expense', 'income', 'shopping', 'bill', 'note', 'reminder'] as const;
