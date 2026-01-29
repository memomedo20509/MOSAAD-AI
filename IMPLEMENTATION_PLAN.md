# HomeAdvisor CRM - Implementation Plan
## خطة التنفيذ التفصيلية

---

## نظرة عامة على المراحل

| المرحلة | الوصف | المدة المتوقعة | الأولوية |
|---------|-------|----------------|----------|
| **1** | نظام المصادقة والمستخدمين | 2-3 أيام | Critical |
| **2** | المخزون العقاري | 3-4 أيام | Critical |
| **3** | مصادر العملاء والاتصالات | 1-2 يوم | High |
| **4** | التقارير المتقدمة | 1-2 يوم | High |
| **5** | تحسينات واجهة المستخدم | 1-2 يوم | Medium |

---

## المرحلة 1: نظام المصادقة والمستخدمين

### 1A: إنشاء جداول قاعدة البيانات

**جدول الفرق (teams)**
```typescript
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**تحديث جدول المستخدمين (users)**
```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  name: varchar("name").notNull(),
  phone: varchar("phone"),
  avatar: varchar("avatar"),
  role: varchar("role").default("sales_agent"), // super_admin, admin, sales_manager, sales_agent
  teamId: varchar("team_id").references(() => teams.id),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**جدول الجلسات (sessions)**
```typescript
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 1B: API Endpoints للمصادقة

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | /api/auth/login | تسجيل الدخول |
| POST | /api/auth/logout | تسجيل الخروج |
| GET | /api/auth/me | الحصول على بيانات المستخدم الحالي |
| POST | /api/auth/register | تسجيل مستخدم جديد (admin only) |
| PATCH | /api/auth/password | تغيير كلمة المرور |

### 1C: صفحات الواجهة

- `/login` - صفحة تسجيل الدخول
- `/profile` - صفحة البروفايل الشخصي
- `/users` - صفحة إدارة المستخدمين (admin only)
- `/teams` - صفحة إدارة الفرق (admin only)

### 1D: نظام الصلاحيات

**Middleware للتحقق من المصادقة:**
```typescript
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  
  const session = await storage.getSessionByToken(token);
  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: "Session expired" });
  }
  
  req.user = await storage.getUser(session.userId);
  next();
}
```

**مصفوفة الصلاحيات:**
| الإجراء | super_admin | admin | sales_manager | sales_agent |
|---------|-------------|-------|---------------|-------------|
| إدارة المستخدمين | ✅ | ✅ | ❌ | ❌ |
| عرض كل العملاء | ✅ | ✅ | ✅ (فريقه) | ❌ |
| إدارة عملائه | ✅ | ✅ | ✅ | ✅ |
| إدارة المخزون | ✅ | ✅ | ✅ | ⚠️ (عرض فقط) |
| التقارير الشاملة | ✅ | ✅ | ✅ (فريقه) | ❌ |
| حذف البيانات | ✅ | ❌ | ❌ | ❌ |

---

## المرحلة 2: المخزون العقاري

### 2A: جداول قاعدة البيانات

**جدول المطورين (developers)**
```typescript
export const developers = pgTable("developers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  logo: varchar("logo"),
  website: varchar("website"),
  phone: varchar("phone"),
  email: varchar("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**جدول المشاريع (projects)**
```typescript
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  developerId: varchar("developer_id").references(() => developers.id),
  name: varchar("name").notNull(),
  location: varchar("location"),
  city: varchar("city"),
  type: varchar("type"), // residential, commercial, mixed
  status: varchar("status"), // under_construction, ready, upcoming
  launchDate: date("launch_date"),
  deliveryDate: date("delivery_date"),
  description: text("description"),
  amenities: text("amenities").array(),
  brochureUrl: varchar("brochure_url"),
  masterPlanUrl: varchar("master_plan_url"),
  images: text("images").array(),
  minPrice: decimal("min_price"),
  maxPrice: decimal("max_price"),
  pricePerMeter: decimal("price_per_meter"),
  downPaymentPercent: decimal("down_payment_percent"),
  installmentYears: integer("installment_years"),
  commission: decimal("commission"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**جدول الوحدات (units)**
```typescript
export const units = pgTable("units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  buildingName: varchar("building_name"),
  floor: integer("floor"),
  unitNumber: varchar("unit_number").notNull(),
  unitType: varchar("unit_type"), // apartment, villa, duplex, penthouse, studio, office, shop
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: decimal("area"),
  gardenArea: decimal("garden_area"),
  roofArea: decimal("roof_area"),
  view: varchar("view"),
  finishing: varchar("finishing"), // core_shell, semi_finished, fully_finished, furnished
  status: varchar("status").default("available"), // available, reserved, sold, blocked
  originalPrice: decimal("original_price"),
  sellingPrice: decimal("selling_price"),
  pricePerMeter: decimal("price_per_meter"),
  floorPlanUrl: varchar("floor_plan_url"),
  images: text("images").array(),
  notes: text("notes"),
  reservedBy: varchar("reserved_by"),
  reservedAt: timestamp("reserved_at"),
  soldAt: timestamp("sold_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**جدول اهتمامات العملاء بالوحدات (leadUnitInterests)**
```typescript
export const leadUnitInterests = pgTable("lead_unit_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  unitId: varchar("unit_id").references(() => units.id).notNull(),
  interestLevel: varchar("interest_level"), // low, medium, high
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 2B: API Endpoints للمخزون

**المطورين:**
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | /api/developers | قائمة المطورين |
| GET | /api/developers/:id | تفاصيل مطور |
| POST | /api/developers | إضافة مطور |
| PATCH | /api/developers/:id | تعديل مطور |
| DELETE | /api/developers/:id | حذف مطور |

**المشاريع:**
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | /api/projects | قائمة المشاريع مع فلترة |
| GET | /api/projects/:id | تفاصيل مشروع |
| POST | /api/projects | إضافة مشروع |
| PATCH | /api/projects/:id | تعديل مشروع |
| DELETE | /api/projects/:id | حذف مشروع |

**الوحدات:**
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | /api/units | قائمة الوحدات مع فلترة |
| GET | /api/units/:id | تفاصيل وحدة |
| GET | /api/projects/:id/units | وحدات مشروع معين |
| GET | /api/projects/:id/stacking-plan | Stacking Plan لمشروع |
| POST | /api/units | إضافة وحدة |
| PATCH | /api/units/:id | تعديل وحدة |
| DELETE | /api/units/:id | حذف وحدة |
| POST | /api/units/:id/reserve | حجز وحدة |
| POST | /api/units/:id/sell | بيع وحدة |

**اهتمامات العملاء:**
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | /api/leads/:id/interests | الوحدات المهتم بها العميل |
| POST | /api/lead-interests | ربط عميل بوحدة |
| DELETE | /api/lead-interests/:id | إزالة الربط |

### 2C-2E: صفحات الواجهة

**صفحة المطورين `/developers`:**
- Grid من الكروت مع اللوجو والاسم وعدد المشاريع
- Modal لإضافة/تعديل مطور
- النقر على كارت يفتح مشاريع المطور

**صفحة المشاريع `/projects`:**
- Grid view و List view
- فلترة: المطور، المدينة، النوع، الحالة، نطاق السعر
- كارت المشروع: صورة، اسم، موقع، أسعار، وحدات متاحة
- صفحة تفاصيل المشروع الكاملة

**صفحة الوحدات `/units`:**
- Stacking Plan ملون (جدول الأدوار والوحدات)
  - أخضر = متاح
  - أصفر = محجوز
  - أحمر = مباع
  - رمادي = محظور
- فلترة حسب كل الحقول
- Quick view للوحدة عند النقر
- ربط بعميل محتمل من الوحدة

---

## المرحلة 3: مصادر العملاء والاتصالات

### 3A: جدول مصادر العملاء

```typescript
export const leadSources = pgTable("lead_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type"), // social_media, portal, referral, walk_in, call, website, other
  cost: decimal("cost"), // التكلفة الشهرية
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**تحديث جدول العملاء المحتملين:**
- إضافة `sourceId` كـ FK لجدول المصادر
- إضافة `campaign` لتتبع الحملة

### 3B: صفحة مصادر العملاء `/lead-sources`

- قائمة المصادر مع التكلفة
- إحصائيات لكل مصدر:
  - عدد العملاء
  - معدل التحويل
  - تكلفة اكتساب العميل

### 3C: جدول سجل الاتصالات

```typescript
export const communications = pgTable("communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // call, sms, whatsapp, email, meeting
  direction: varchar("direction"), // incoming, outgoing
  duration: integer("duration"), // بالثواني للمكالمات
  notes: text("notes"),
  status: varchar("status"), // completed, missed, scheduled
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 3D: واجهة سجل الاتصالات

- Tab جديد في Lead Detail Panel للاتصالات
- إضافة مكالمة/موعد جديد
- عرض سجل الاتصالات بالترتيب الزمني

---

## المرحلة 4: التقارير المتقدمة

### 4A: API Endpoints للتقارير

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | /api/reports/sales | تقرير المبيعات |
| GET | /api/reports/leads | تقرير العملاء المحتملين |
| GET | /api/reports/sources | تقرير المصادر |
| GET | /api/reports/inventory | تقرير المخزون |
| GET | /api/reports/team | تقرير أداء الفريق |
| GET | /api/reports/export | تصدير التقرير |

**Parameters لكل تقرير:**
- `startDate`, `endDate` - الفترة الزمنية
- `userId` - فلترة بموظف
- `projectId` - فلترة بمشروع
- `sourceId` - فلترة بمصدر
- `format` - json, csv, excel

### 4B: صفحة التقارير `/reports`

**أنواع التقارير:**

1. **تقرير المبيعات**
   - المبيعات حسب الفترة
   - رسم بياني خطي للمبيعات
   - أفضل المشاريع مبيعاً
   - قيمة المبيعات الإجمالية

2. **تقرير العملاء المحتملين**
   - عدد العملاء الجدد
   - توزيع على المراحل (Pie chart)
   - معدل التحويل
   - العملاء المتأخرين

3. **تقرير المصادر**
   - عدد العملاء من كل مصدر
   - معدل التحويل لكل مصدر
   - تكلفة اكتساب العميل
   - ROI لكل مصدر

4. **تقرير المخزون**
   - الوحدات حسب الحالة
   - قيمة المخزون المتاح
   - نسبة الإشغال

5. **تقرير أداء الفريق**
   - Leaderboard للموظفين
   - عدد الصفقات لكل موظف
   - المهام المكتملة والمتأخرة

### 4C: تصدير التقارير

- تصدير CSV
- تصدير Excel (xlsx)
- زر "تصدير" في كل تقرير

---

## المرحلة 5: تحسينات واجهة المستخدم

### 5A: Kanban View للعملاء المحتملين

- عرض الأعمدة حسب المراحل
- Drag & Drop لنقل العميل بين المراحل
- تحديث تلقائي للحالة عند النقل
- عرض ملخص العميل في الكارت

### 5B: نظام الإشعارات

**جدول الإشعارات:**
```typescript
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // task_reminder, new_lead, lead_assigned, etc.
  title: varchar("title").notNull(),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  link: varchar("link"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**أنواع الإشعارات:**
- تذكير بمهمة متأخرة
- عميل جديد تم تعيينه لك
- تغيير حالة عميل
- موعد قادم

### 5C: Import/Export للعملاء

- استيراد من Excel:
  - تحميل ملف Excel
  - معاينة البيانات
  - تعيين الأعمدة
  - استيراد مع تقرير الأخطاء

- تصدير للعملاء:
  - تصدير العملاء المفلترين
  - اختيار الأعمدة
  - تصدير Excel/CSV

---

## الجدول الزمني المقترح

```
الأسبوع 1:
├── المرحلة 1A: جداول المستخدمين والفرق
├── المرحلة 1B: API المصادقة
├── المرحلة 1C: صفحات تسجيل الدخول والمستخدمين
└── المرحلة 1D: middleware الصلاحيات

الأسبوع 2:
├── المرحلة 2A: جداول المخزون
├── المرحلة 2B: API المخزون
├── المرحلة 2C: صفحة المطورين
└── المرحلة 2D: صفحة المشاريع

الأسبوع 3:
├── المرحلة 2E: صفحة الوحدات + Stacking Plan
├── المرحلة 2F: ربط العملاء بالوحدات
├── المرحلة 3A: مصادر العملاء
└── المرحلة 3B: صفحة المصادر

الأسبوع 4:
├── المرحلة 3C: سجل الاتصالات
├── المرحلة 3D: واجهة الاتصالات
├── المرحلة 4A: API التقارير
└── المرحلة 4B: صفحة التقارير

الأسبوع 5:
├── المرحلة 4C: تصدير التقارير
├── المرحلة 5A: Kanban View
├── المرحلة 5B: الإشعارات
├── المرحلة 5C: Import/Export
└── المرحلة النهائية: الاختبار والتوثيق
```

---

## معايير القبول

### المصادقة:
- [ ] يمكن للمستخدم تسجيل الدخول بالبريد وكلمة المرور
- [ ] يتم تشفير كلمات المرور
- [ ] الجلسة تنتهي بعد 24 ساعة
- [ ] كل مستخدم يرى عملاءه فقط (حسب الدور)

### المخزون:
- [ ] يمكن إضافة مطورين ومشاريع ووحدات
- [ ] Stacking Plan يعرض حالة الوحدات بالألوان
- [ ] يمكن ربط عميل بوحدة معينة
- [ ] الفلترة تعمل بشكل صحيح

### التقارير:
- [ ] كل التقارير تعرض بيانات صحيحة
- [ ] الفلترة بالتاريخ والموظف تعمل
- [ ] التصدير ينتج ملفات صالحة

---

*تم إعداد هذه الخطة في يناير 2026*
