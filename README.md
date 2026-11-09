# 💊 PharmaCore Enterprise | نظام إدارة الصيدليات ونقطة البيع المتكامل

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-purple?logo=pwa)](https://web.dev/progressive-web-apps/)
[![Microsoft SQL Server](https://img.shields.io/badge/Database-SQL_Server_%26_Cloud_SQL-CC292B?logo=microsoft-sql-server)](https://www.microsoft.com/sql-server)
[![License](https://img.shields.io/badge/License-Proprietary-gold.svg)]()

> **PharmaCore Enterprise** هو نظام سحابي وهجين (Hybrid Cloud & Local) لإدارة الصيدليات وسلاسل التجزئة الطبية، مصمم بأحدث معايير الأداء والسرعة اللحظية (Zero Latency) مع دعم كامل للعمل بدون إنترنت (Offline-First)، وإدارة شحنات الصلاحية بالأسبقية (FEFO)، والتعاقدات التأمينية، وتقارير استهلاك الأدوية وتوقع الطلب المستقبلي.

---

## 🌟 أبرز المميزات التشغيلية (Core Features)

### 1. ⚡ نقطة البيع السريعة الخارقة (Ultra-Fast POS)
- دعم كامل لقارئات الباركود وأزرار الاختصار السريعة باللوحة (`F1` للبحث، `F2` إضافة شريط، `F3` إضافة علبة، `F4` خصم، `F9` دفع فوري، `F12` طباعة إيصال).
- بيع سريع بالعلبة أو الشريط مع فحص فوري للتداخلات الدوائية الخطرة (Drug-Drug Interactions) قبل الحفظ.
- إصدار وطباعة فواتير حرارية قياسية (80mm Thermal Receipt) وفواتير ضريبية مبسطة مع رمز QR المعتمد.

### 2. 📦 محرك إدارة الشحنات وتواريخ الصلاحية (FEFO Engine)
- تطبيق آلي لقاعدة **ما ينتهي أولاً يُصرف أولاً (First Expired, First Out)** لمنع تلف الأدوية وحرق تواريخ الصلاحية القديمة.
- نظام إنذار مبكر للنواقص والأدوية التي اقتربت من الانتهاء (3 أشهر / 6 أشهر).

### 3. 📊 تقارير استهلاك الأدوية وتوقع الطلب المستقبلي (Analytics & Demand Forecasting)
- رسوم بيانية تفاعلية دقيقة باستخدام مكتبة **Recharts**:
  - **الأدوية الأكثر مبيعاً واستهلاكاً** (Bar Chart) مع تبديل لحظي بين الكميات المباعة والإيرادات.
  - **منحنى مسار الاستهلاك وتوقع الطلب المستقبلي** (Area & Line Chart) بالاعتماد على معدلات الحرق والمواسم الدوائية.
  - **توزيع الاستهلاك حسب الفئات العلاجية** (Donut / Pie Chart).
- مصفوفة الأمان ونواقص المخزون: حساب الأيام المتبقية لنفاد الدواء والكميات المقترحة لإعادة الطلب (Suggested Reorder PO).
- تصدير فوري إلى Excel/CSV وطباعة كشوف شهرية رسمية مختومة A4.

### 4. 🛡️ التعاقدات الطبية وشركات التأمين (Insurance & Corporate Claims)
- إدارة عقود التأمين (بوبا، التعاونية، ميدغلف، الرعاية الصحية، نقابات، وشركات خاصة).
- حساب نسب التحمل والخصم التلقائي عند البيع وتوليد أرقام المطالبات الطبية (Claims) ومتابعة سدادها.

### 5. 🔄 المعمارية الهجينة: ربط Microsoft SQL Server محلياً مع السحابة (Hybrid Sync)
- **بيع مستمر دون انقطاع**: قاعدة بيانات محلية في الصيدلية على **Microsoft SQL Server Express** للعمل فائق السرعة بدون إنترنت.
- **مزامنة تلقائية في الخلفية (Auto-Sync)**: رفع الفواتير وسحب تحديثات الأسعار والأدوية كل بضع ثوانٍ بمجرد توفر الإنترنت.
- سكريبت إنشاء الجداول المعتمد `PharmaCore_SQLServer_Schema.sql` جاهز للتنفيذ بضغطة واحدة في SSMS.

### 6. 💼 لوحة المالك ونظام الاشتراكات السحابية (SaaS & Multi-Tenant Engine)
- متابعة الفروع وإيرادات الصيدليات المشتركة (MRR / ARR / مبيعات الكاش مدى الحياة).
- بوابات دفع متنوعة (بطاقات ائتمان Stripe، فوري Fawry، فودافون كاش، تحويل بنكي).
- صلاحيات دقيقة للموظفين (RBAC) مع عزل تلقائي لأرباح وأسعار التكلفة عن الكاشير.
- توليد ومشاركة روابط الصيدليات المباشرة بنقرة واحدة عبر الواتساب ومشاركة الهاتف الذكية (`Web Share API`).

### 7. 📱 تطبيق ويب تقدمي متكامل (Installable PWA)
- تثبيت مباشر بضغطة زر كتطبيق على أجهزة Windows, macOS, Android, و iOS بدون متجر تطبيقات.
- يدعم التخزين المحلي المؤقت والكاش السريع عبر Service Workers.

---

## 🛠️ البنية التقنية (Tech Stack)

| المكون | التقنية المستخدمة |
| :--- | :--- |
| **واجهة المستخدم** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons |
| **الرسوم البيانية** | Recharts (ResponsiveContainer, Bar, Area, Pie) |
| **الخادم الخلفي** | Node.js / Express (Clean Controller Architecture) |
| **قواعد البيانات الهجينة** | Microsoft SQL Server (Local) + Cloud SQL PostgreSQL / Drizzle ORM |
| **المصادقة والأمان** | Firebase Auth / RBAC Multi-Role Permissions |
| **دعم الأوفلاين** | Progressive Web App (PWA), Service Worker, Local Storage Queue |

---

## 🚀 التثبيت والتشغيل المحلي (Quick Start)

### المتطلبات المسبقة:
- [Node.js](https://nodejs.org/) الإصدار 18 أو أحدث.
- [Git](https://git-scm.com/) مثبت على جهازك.

### خطوات التشغيل:
```bash
# 1. استنساخ المستودع (Clone the repository)
git clone https://github.com/YOUR_USERNAME/pharmacore-enterprise.git

# 2. الدخول إلى مجلد المشروع
cd pharmacore-enterprise

# 3. تثبيت الحزم والمكتبات
npm install

# 4. تشغيل خادم التطوير (Port 3000)
npm run dev
```
افتح المتصفح على: `http://localhost:3000`

---

## 🗄️ إعداد قاعدة بيانات Microsoft SQL Server المحلية

1. افتح برنامج **SQL Server Management Studio (SSMS)**.
2. افتح ملف السكريبت المرفق داخل المشروع:
   ```
   public/PharmaCore_SQLServer_Schema.sql
   ```
3. اضغط **Execute (F5)** لإنشاء قاعدة البيانات `PharmaCore_Local` والجداول ومحرك الـ FEFO.
4. ادخل إلى **لوحة المالك ➔ ربط SQL Server محلي وسحابي (Hybrid)** واضغط **"فحص الاتصال"** لبدء المزامنة التلقائية.

---

## 📱 روابط سريعة
- سكريبت SQL Server المحلي: `/public/PharmaCore_SQLServer_Schema.sql`
- أيقونات ومانيفست التطبيق: `/public/manifest.json`

---

## 📄 الترخيص (License)
هذا المشروع مخصص للاستخدام التجاري وإدارة الصيدليات (Proprietary Commercial Software). جميع الحقوق محفوظة للمطور.
