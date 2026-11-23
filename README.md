# Bella — تطبيق إدارة الحياة والشغل (خاص)

تطبيق ويب حقيقي (React + TypeScript + Tailwind + Supabase) عربي RTL و Mobile-first، ومعمول كـ PWA يتثبت على الموبايل.

## الـ Stack
- **Frontend:** Vite + React 19 + TypeScript + Tailwind v4 + TanStack Query + Recharts
- **Backend:** Supabase — Auth + PostgreSQL + Row Level Security + Storage (bucket خاص `media`)
- **Supabase project:** `bella` (ref: `zzqbqdsyigkrjqlwnngt`, region eu-central-1) — الـ Schema متطبق عليه فعلاً.

## التشغيل لوكال
```bash
npm install
cp .env.example .env   # (ملف .env الجاهز فيه بيانات مشروع bella العامة)
npm run dev            # http://localhost:5173
npm run build          # الناتج في dist/
```

## متغيرات البيئة
| المتغير | القيمة |
|---|---|
| `VITE_SUPABASE_URL` | `https://zzqbqdsyigkrjqlwnngt.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | الـ publishable key (عام بطبيعته، الحماية كلها من RLS) |

> ⚠️ ممنوع تحطي `service_role` key في أي متغير `VITE_` — التطبيق مش محتاجه أصلاً.

## النشر
**GitHub Pages (متفعّل):** أي push على `main` بيشغّل `.github/workflows/deploy.yml` يعمل build وينشر على `https://<user>.github.io/<repo>/` تلقائي.

### بدائل
**Vercel:** Import من GitHub → Framework: Vite → ضيفي المتغيرين → Deploy. (`vercel.json` فيه SPA rewrites + Security headers)

**Netlify / Cloudflare Pages:** Build command `npm run build` — Output `dist` — ضيفي المتغيرين. (`public/_redirects` و `public/_headers` جاهزين)

## إعداد Supabase بعد النشر (مهم — 5 دقايق من الداشبورد)
1. **Authentication → URL Configuration:** Site URL = دومين التطبيق، وضيفي نفس الدومين في Redirect URLs (عشان لينك تأكيد الإيميل واسترجاع الباسورد).
2. افتحي التطبيق واعملي **حساب المالكة** من شاشة "إعداد Bella لأول مرة" وأكدي الإيميل.
3. **Authentication → Sign In / Providers → Email:** اقفلي "Allow new users to sign up" (طبقة حماية تانية؛ الداتابيز نفسها بترفض أي حساب تاني تلقائي).
4. **Authentication → Sessions (لو متاح في خطتك):** حددي أقصى مدة للجلسة / inactivity timeout.
5. **Authentication → Attack Protection:** فعّلي Leaked password protection.

## الأمان — اللي متطبق فعلاً
- RLS مفعّل و `FORCE` على كل الجداول (28 جدول) — كل سجل مربوط بـ `owner_id = auth.uid()`.
- **قفل المالكة الواحدة:** Trigger على `auth.users` بيرفض إنشاء أي حساب بعد أول حساب.
- `anon` ملوش أي صلاحية على الجداول؛ الحاجة الوحيدة المتاحة له `owner_exists()` (بترجع true/false بس).
- الرقم السري (PIN) لمساحتي الخاصة متخزن bcrypt، والعمود ممنوع من القراءة من الـ client (column privileges).
- الصور في bucket خاص بـ signed URLs لمدة ساعة، ومسارها لازم يبدأ بـ user id.
- قفل تلقائي بعد عدم الاستخدام (بيطلب الباسورد)، وتسجيل خروج من كل الأجهزة.
- الـ Service Worker بيكاش الواجهة بس — عمره ما بيكاش API أو صور خاصة.
- اتعمل اختبار عزل على الداتابيز: مستخدم تاني شاف 0 سجلات، وتحديثه أثّر على 0، والإدخال باسم المالكة اترفض، و anon اترفض.

**حدود لازم تكوني عارفاها:** الـ PIN قفل واجهة (UX) فوق الباسورد مش تشفير للبيانات. التنبيهات بتشتغل طول ما التطبيق مفتوح (تاب أو PWA)؛ الإشعارات والتطبيق مقفول تمامًا محتاجة Push server (Phase 2).

## الـ Migrations
`supabase/migrations/001…005` — نفس اللي اتطبق على المشروع بالترتيب.

## Phase 2 المقترحة
- مساعد AI بالعربي ("عندي معاينة بكرة الساعة 4" → يقترح الموعد) — الـ `RESOURCES` config معمول عشان أي parser يطلع `{resource, fields}` ويفتح نفس الفورم.
- Web Push حقيقي عبر Edge Function + VAPID.
- مزامنة Google Calendar.
