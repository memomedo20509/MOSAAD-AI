# PRD — WhatsApp AI Lead Management System
## وثيقة متطلبات المنتج: نظام إدارة العملاء عبر الواتساب بالذكاء الاصطناعي

**الإصدار:** 1.0  
**التاريخ:** أبريل 2025  
**مُعد من:** HomeAdvisor CRM — نظام قائم وجاهز للتكيف مع تطبيقات أخرى  

---

## 1. نظرة عامة على النظام

هذا النظام يربط واتساب بقاعدة بيانات العملاء (CRM) عبر بوت ذكاء اصطناعي يعمل تلقائياً. عندما يرسل أي شخص رسالة على واتساب، يتحوّل تلقائياً إلى **عميل محتمل (Lead)** مُسجَّل في النظام، ويبدأ البوت في التحدث معه لجمع المعلومات المطلوبة وتأهيله، حتى يتحول إلى ملف كامل جاهز للوكيل البشري.

### البنية العامة

```
[مستخدم واتساب]
       │
       ▼
[خادم Baileys/WhatsApp Web Socket]
       │
       ├─► [Lead Management] ──► PostgreSQL DB
       │
       ├─► [AI Bot Engine]   ──► OpenRouter API (Gemini / GPT-4)
       │
       └─► [Agent Dashboard] ──► React Web App
```

---

## 2. مكونات النظام بالتفصيل

### 2.1 طبقة الاتصال بواتساب (WhatsApp Connection Layer)

#### المكتبة المستخدمة
- **`@whiskeysockets/baileys`** — مكتبة Node.js مفتوحة المصدر تحاكي واتساب ويب  
- تعمل كـ "client" للواتساب دون الحاجة لـ WhatsApp Business API الرسمية  
- مناسبة للبيئات التي لا تحتاج approval من Meta  

#### أهم المفاهيم التقنية

**JID (Jabber ID):**  
كل رقم واتساب له معرّف فريد بالصيغة `20XXXXXXXXXX@s.whatsapp.net`

**LID (Linked Identity):**  
واتساب أضاف نظام LID الجديد كـ privacy layer — الرقم الحقيقي مخفي خلف معرّف مشفر مثل `abc123@lid`. النظام يحل هذه المشكلة بـ:
- حفظ mapping بين LID ← → رقم الهاتف في ملف `lid-mapping_*.json`
- الاستماع لحدث `contacts.upsert` عند المزامنة
- الرجوع للملفات المحفوظة عند وصول رسالة جديدة

**Multi-tenant Session:**  
كل مستخدم في النظام (Admin / Agent) يمكنه ربط واتساب الخاص به بشكل مستقل. كل session محفوظة في مجلد منفصل: `.whatsapp_sessions/{userId}/`

---

### 2.2 إدارة الجلسة (Session Management)

#### دورة حياة الجلسة الكاملة

```
┌─────────────────────────────────────────────────────────────┐
│                     SESSION LIFECYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Agent] ──► POST /api/whatsapp/connect                     │
│                        │                                    │
│                        ▼                                    │
│             startConnection(userId)                         │
│                        │                                    │
│              ┌─────────┴─────────┐                          │
│              │                   │                          │
│         [Auth Files         [No Auth Files                  │
│          Exist?]              Found]                        │
│              │                   │                          │
│              ▼                   ▼                          │
│         Auto-login          Generate QR Code               │
│         (Silent)            (Base64 Image)                  │
│              │                   │                          │
│              │              ┌────┴────┐                     │
│              │         [Send to FE    │                     │
│              │          via polling]  │                     │
│              │                   │   │                      │
│              │              [Agent scans │                  │
│              │               with phone] │                  │
│              │                   │                          │
│              ▼                   ▼                          │
│         ┌─────────────────────────────┐                     │
│         │     Status: CONNECTED       │                     │
│         │  Auth files saved to disk   │                     │
│         └─────────────────────────────┘                     │
│                        │                                    │
│                        ▼                                    │
│             Listen for incoming messages                    │
│             Send outgoing messages                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### ملفات الجلسة المحفوظة
```
.whatsapp_sessions/
  └── {userId}/
        ├── creds.json          ← بيانات المصادقة الرئيسية
        ├── app-state-*.json    ← حالة التطبيق
        ├── session-*.json      ← مفاتيح التشفير
        └── lid-mapping-*.json  ← خريطة LID → رقم الهاتف
```

#### حالات الاتصال (Connection States)
| الحالة | المعنى | Action |
|--------|---------|--------|
| `disconnected` | لا يوجد اتصال | أظهر زر "اتصال" |
| `connecting` | جاري الاتصال | أظهر spinner |
| `qr` | ينتظر مسح QR | أظهر QR code للمستخدم |
| `connected` | متصل ويعمل | أظهر الـ inbox |

#### إعادة الاتصال التلقائية (Auto-Reconnect)
- عند انقطاع الاتصال: يحاول النظام إعادة الاتصال تلقائياً حتى **5 مرات**
- بين كل محاولة: تأخير 3 ثوانٍ
- إذا فشلت كل المحاولات: يعيّن الحالة `disconnected` ويُعلم الـ dashboard

#### مسح الجلسة (Reset Session)
```
POST /api/whatsapp/reset
  → حذف كل ملفات .whatsapp_sessions/{userId}/*
  → إيقاف الـ socket الحالي
  → إعادة بدء العملية من الصفر (QR جديد)
```

---

### 2.3 تدفق إنشاء العميل من واتساب (Lead Creation Flow)

#### عندما تصل رسالة جديدة — الخطوات بالتفصيل

```
[رسالة واردة من واتساب]
           │
           ▼
  ① استخراج رقم الهاتف من JID/LID
           │
           ▼
  ② التحقق من عدم التكرار (messageId في DB)
           │
     ┌─────┴─────┐
   موجود       جديد
     │           │
     ▼           ▼
  تجاهل     ③ البحث عن Lead بالرقم
                 │
           ┌─────┴─────┐
         موجود       غير موجود
           │           │
           │           ▼
           │    ④ إنشاء Lead جديد تلقائياً:
           │       - name: "واتساب - {رقم}"
           │       - phone: رقم الهاتف المُستخرج
           │       - channel: "واتساب"
           │       - status: "new"
           │       - botActive: true (افتراضي)
           │
           ▼
  ⑤ حفظ الرسالة في whatsapp_messages_log
           │
           ▼
  ⑥ إضافة سجل في lead_history
           │
           ▼
  ⑦ استخراج أرقام هواتف مصرية من نص الرسالة
     (regex: 01[0-9]{9}) → حفظ في phone2
           │
           ▼
  ⑧ تشغيل AI Bot (إذا مفعّل)
```

#### بنية جدول Lead في قاعدة البيانات
```sql
leads (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER,           -- الوكيل المسؤول
  name            TEXT,              -- اسم العميل (يُملأ بالذكاء الاصطناعي لاحقاً)
  phone           TEXT,              -- رقم واتساب
  phone2          TEXT,              -- رقم ثانٍ (مستخرج من المحادثة)
  email           TEXT,
  status          TEXT,              -- new | contacted | interested | not_interested | closed
  channel         TEXT,              -- واتساب | Facebook | ...
  source          TEXT,
  budget          TEXT,              -- الميزانية (يُملأ بالذكاء الاصطناعي)
  unit_type       TEXT,              -- نوع الوحدة المطلوبة (يُملأ بالذكاء الاصطناعي)
  notes           TEXT,
  score           TEXT,              -- hot | warm | cold
  bot_active      BOOLEAN DEFAULT true,
  bot_stage       TEXT,              -- مرحلة البوت الحالية
  ai_analyzed_at  TIMESTAMP
)
```

---

### 2.4 محرك الذكاء الاصطناعي (AI Bot Engine)

#### شروط تشغيل البوت
البوت يرد **فقط** إذا تحققت كل هذه الشروط:

```
✓ إعدادات البوت مفعّلة للمستخدم (chatbot_settings.bot_active = true)
✓ العميل لديه bot_active = true (لم يطلب إيقاف البوت)
✓ (خارج ساعات العمل) أو (respond_always = true)
✓ الرسالة ليست من نفس حساب الواتساب (لا يرد البوت على نفسه)
```

#### مراحل البوت (Bot Stages)

```
greeting
    │
    ▼ (يسأل عن الاسم)
collecting_name
    │
    ▼ (يحفظ الاسم في DB، يسأل عن الاحتياجات)
collecting_needs
    │
    ▼ (يجمع: نوع الوحدة، الميزانية، المنطقة، عدد الغرف)
recommending_units
    │
    ▼ (يعرض وحدات مناسبة من الـ inventory الحقيقي)
collecting_details
    │
    ▼ (يجمع: تفاصيل التواصل، التوقيت المناسب)
qualified
    │
    ▼ (Lead جاهز — يُحوَّل للوكيل البشري)
```

#### بناء الـ Prompt بالتفصيل

كل مرة يرسل المستخدم رسالة، يُبنى prompt شامل يحتوي على:

```
SYSTEM PROMPT:
├── شخصية البوت ودوره (من إعدادات المستخدم)
│     مثال: "أنت مساعد مبيعات عقاري لشركة XYZ..."
│
├── مهمة البوت (company_knowledge + bot_mission)
│     مثال: "مهمتك جمع: الاسم، الميزانية، نوع الوحدة..."
│
├── بيانات العميل الحالية
│     {name, budget, unit_type, score, botStage, ...}
│
├── Inventory متاح (Projects + Units من DB)
│     [{projectName, location, minPrice, units: [...]}]
│
└── تعليمات الـ JSON Actions:
      "يمكنك إرجاع actions بالصيغة التالية..."

USER MESSAGES (آخر 8 رسائل):
├── [user]: "عاوز شقة في أكتوبر"
├── [assistant]: "أهلاً! ما الميزانية المناسبة؟"
└── [user]: "الرسالة الجديدة"
```

#### CRM Actions — ما يمكن للبوت تنفيذه تلقائياً

البوت لا يرد فقط بنص — بل يمكنه تنفيذ إجراءات في CRM:

```json
{
  "message": "تمام! سجّلت اسمك. ما هي ميزانيتك؟",
  "actions": [
    {
      "type": "update_lead",
      "data": {
        "name": "أحمد محمد",
        "budget": "2-3 مليون",
        "unit_type": "شقة",
        "score": "warm"
      }
    },
    {
      "type": "change_state",
      "data": { "status": "interested" }
    },
    {
      "type": "create_reminder",
      "data": {
        "title": "متابعة أحمد",
        "dueDate": "2025-04-15T10:00:00Z",
        "note": "طلب موعد اتصال صباحاً"
      }
    },
    {
      "type": "update_score",
      "data": { "score": "hot" }
    }
  ],
  "nextStage": "collecting_needs",
  "shouldHandoff": false
}
```

| Action | الوصف | متى يُستخدم |
|--------|-------|-------------|
| `update_lead` | تحديث بيانات الـ Lead | عند جمع أي معلومة جديدة |
| `change_state` | تغيير حالة العميل | عند تأهيله أو رفضه |
| `create_reminder` | إنشاء مهمة متابعة | عند طلب موعد اتصال |
| `update_score` | تحديث درجة الاهتمام | بناءً على تفاعل العميل |

#### تسليم المحادثة للوكيل البشري (Handoff)

```
شروط الـ Handoff:
├── البوت وصل لمرحلة "qualified"
├── المستخدم قال: "تكلم معايا واحد | عاوز موظف | speak to human"
├── المستخدم غاضب أو غير راضٍ
└── الوكيل يضغط يدوياً على "إيقاف البوت"

عند الـ Handoff:
├── bot_active = false (لهذا Lead)
├── إشعار للوكيل المسؤول
└── Bot لا يرد على أي رسائل لاحقة من هذا العميل
```

---

### 2.5 جداول قاعدة البيانات المتعلقة

#### `whatsapp_messages_log` — سجل كل الرسائل
```sql
CREATE TABLE whatsapp_messages_log (
  id          SERIAL PRIMARY KEY,
  lead_id     INTEGER REFERENCES leads(id),
  user_id     INTEGER,
  direction   TEXT,        -- 'in' | 'out'
  message     TEXT,
  message_id  TEXT UNIQUE, -- لمنع التكرار
  is_read     BOOLEAN DEFAULT false,
  sent_at     TIMESTAMP DEFAULT NOW()
);
```

#### `chatbot_settings` — إعدادات البوت لكل مستخدم
```sql
CREATE TABLE chatbot_settings (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER UNIQUE,
  bot_active       BOOLEAN DEFAULT false,
  bot_name         TEXT,           -- "سارة" | "مساعد"
  company_name     TEXT,
  bot_role         TEXT,           -- "مساعد مبيعات" | "موظف استقبال"
  bot_personality  TEXT,           -- "ودود ومحترف" | "رسمي"
  bot_mission      TEXT,           -- المهام المحددة للبوت
  company_knowledge TEXT,          -- معلومات الشركة للبوت
  respond_always   BOOLEAN DEFAULT false,  -- يرد خارج ساعات العمل فقط؟
  work_start       TEXT,           -- "09:00"
  work_end         TEXT            -- "18:00"
);
```

#### `whatsapp_templates` — قوالب الرسائل الجاهزة
```sql
CREATE TABLE whatsapp_templates (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER,
  title     TEXT,    -- "رد على استفسار"
  content   TEXT,    -- نص الرسالة مع variables مثل {{name}}
  category  TEXT     -- "follow_up" | "greeting" | "offer"
);
```

#### `lead_history` — سجل كل تغييرات Lead
```sql
CREATE TABLE lead_history (
  id          SERIAL PRIMARY KEY,
  lead_id     INTEGER REFERENCES leads(id),
  user_id     INTEGER,
  action      TEXT,    -- "message_received" | "status_changed" | "bot_responded"
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

### 2.6 API Endpoints الكاملة

#### إدارة الاتصال
```
POST /api/whatsapp/connect          → بدء الاتصال / الحصول على QR
GET  /api/whatsapp/status           → حالة الاتصال الحالية
POST /api/whatsapp/reset            → مسح الجلسة والبدء من الصفر
```

#### الرسائل والـ Inbox
```
GET  /api/whatsapp/inbox            → كل المحادثات مجمّعة بالـ Lead
POST /api/whatsapp/send             → إرسال رسالة لعميل محدد
     Body: { leadId, message }
POST /api/whatsapp/inbox/:id/mark-read → تحديد المحادثة كمقروءة
```

#### القوالب
```
GET    /api/whatsapp/templates      → كل القوالب
POST   /api/whatsapp/templates      → إنشاء قالب جديد
PATCH  /api/whatsapp/templates/:id  → تعديل قالب
DELETE /api/whatsapp/templates/:id  → حذف قالب
```

#### إعدادات البوت
```
GET   /api/chatbot/settings         → جلب الإعدادات
POST  /api/chatbot/settings         → حفظ الإعدادات
PATCH /api/leads/:id/bot-toggle     → تفعيل/إيقاف البوت لعميل بعينه
```

---

### 2.7 واجهة المستخدم (Frontend Components)

#### صفحة الـ Inbox الرئيسية (`whatsapp-inbox.tsx`)
```
┌─────────────────────────────────────────────────────────────┐
│  WhatsApp Inbox                                             │
│  ┌──────────────────┐  ┌───────────────────────────────┐   │
│  │  قائمة المحادثات  │  │      نافذة المحادثة           │   │
│  │                  │  │                               │   │
│  │  🟢 أحمد محمد   │  │  [رسائل واردة وصادرة]         │   │
│  │  ⬤ سارة علي     │  │                               │   │
│  │  ⬤ محمد حسن     │  │  [Bot Active Badge]           │   │
│  │                  │  │                               │   │
│  │  [Badge رسائل   │  │  ┌─────────────────────────┐  │   │
│  │   غير مقروءة]   │  │  │  اكتب رسالة...  [إرسال] │  │   │
│  │                  │  │  │  [القوالب الجاهزة]       │  │   │
│  └──────────────────┘  │  └─────────────────────────┘  │   │
│                        └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### صفحة إعدادات الاتصال (`whatsapp-settings.tsx`)
```
┌─────────────────────────────────────────────────────────────┐
│  إعدادات واتساب                                             │
│                                                             │
│  ┌─────────────────────────┐                                │
│  │  الاتصال بواتساب         │                               │
│  │                         │                               │
│  │  [حالة: منفصل]           │                               │
│  │                         │                               │
│  │  ┌─────────────────┐    │                               │
│  │  │  [QR Code هنا]  │    │                               │
│  │  └─────────────────┘    │                               │
│  │                         │                               │
│  │  [اتصل] [إعادة تعيين]  │                               │
│  └─────────────────────────┘                                │
│                                                             │
│  ┌─────────────────────────┐                                │
│  │  إعدادات البوت الذكي    │                               │
│  │  اسم البوت: [         ] │                               │
│  │  دور البوت: [         ] │                               │
│  │  الشخصية:   [         ] │                               │
│  │  المهمة:    [         ] │                               │
│  │  الرد دائماً: [Switch] │                                │
│  └─────────────────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. التدفق الكامل من البداية للنهاية

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPLETE FLOW                            │
└─────────────────────────────────────────────────────────────┘

الخطوة 1: الإعداد
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Admin] يفتح صفحة إعدادات واتساب
  → يضغط "اتصال"
  → POST /api/whatsapp/connect
  → النظام يفتح Baileys socket
  → يُنشئ QR Code Base64
  → Frontend يعرض QR Code
[Admin] يفتح واتساب على هاتفه
  → يمسح QR Code
  → النظام يحفظ session في .whatsapp_sessions/{userId}/
  → الحالة تصبح "connected"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
الخطوة 2: رسالة واردة من عميل جديد
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[عميل] يرسل: "السلام عليكم، عاوز أعرف عن الشقق"
  → Baileys يستقبل الحدث messages.upsert
  → النظام يستخرج رقم الهاتف: "201012345678"
  → يبحث في DB: SELECT * FROM leads WHERE phone = '201012345678'
  → غير موجود → يُنشئ Lead جديد:
      {name: "واتساب - 201012345678", phone: "201012345678",
       channel: "واتساب", status: "new", bot_active: true}
  → يحفظ الرسالة في whatsapp_messages_log
  → يُضيف سجل في lead_history

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
الخطوة 3: البوت الذكي يبدأ المحادثة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  → النظام يتحقق: bot_active=true, respondAlways=true
  → يبني Prompt:
      System: "أنت سارة، مساعدة مبيعات في شركة XYZ..."
      Context: Lead{name: null, budget: null, unit_type: null}
      Inventory: [حمام سباحة، جيم...]
      Stage: "greeting"
  → يرسل لـ OpenRouter API (Gemini Flash)
  → يستقبل الرد:
      {
        message: "أهلاً وسهلاً! 😊 أنا سارة، مساعدتك في XYZ\nممكن أعرف اسمك؟",
        actions: [],
        nextStage: "collecting_name"
      }
  → يُرسل الرسالة عبر واتساب: sendWhatsAppMessage(userId, phone, text)
  → يحفظ الرد في whatsapp_messages_log (direction: 'out')
  → يحدّث bot_stage = "collecting_name"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
الخطوة 4: العميل يرد — جمع البيانات
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[عميل]: "أنا أحمد"
  → البوت:
      Actions: [update_lead: {name: "أحمد"}]
      Response: "أهلاً أحمد! 🏠 إيه اللي بتدور عليه؟ شقة؟ فيلا؟"
      NextStage: "collecting_needs"
  → DB UPDATE leads SET name='أحمد' WHERE id=...

[عميل]: "شقة 3 غرف في أكتوبر، ميزانيتي 3 مليون"
  → البوت:
      Actions: [
        update_lead: {unit_type: "شقة", budget: "3 مليون", score: "warm"},
        change_state: {status: "interested"}
      ]
      Response: "ممتاز! 🎯 لقيتلك كمبوندات في أكتوبر بسعرك:\n..."
      NextStage: "recommending_units"

[عميل]: "Palm Hills عاجبني، ممكن حد يكلمني؟"
  → البوت:
      Actions: [
        update_score: {score: "hot"},
        create_reminder: {title: "اتصل بأحمد", dueDate: "..."}
      ]
      shouldHandoff: true
      Response: "حلو! هيتواصل معاك أحد من فريقنا قريب 🙏"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
الخطوة 5: تسليم للوكيل البشري
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  → bot_active = false للـ Lead ده
  → Lead في Dashboard يظهر بـ status: "interested", score: "hot"
  → ملف العميل كامل: الاسم، الميزانية، نوع الوحدة، المنطقة
  → الوكيل يفتح المحادثة ويكمّل مع العميل يدوياً
  → Reminder ظاهر في الـ Tasks: "اتصل بأحمد"
```

---

## 4. تطبيق النظام في مجال طبي

### تكييف النظام للتطبيق الطبي

#### ما يتغير في سياق طبي

| المكوّن | CRM العقاري | التطبيق الطبي |
|---------|------------|---------------|
| **Lead** | عميل محتمل | مريض / حالة |
| **Unit Type** | شقة / فيلا | نوع الخدمة / التخصص |
| **Budget** | ميزانية الشراء | غطاء تأميني / تكلفة متوقعة |
| **Score** | hot/warm/cold | urgent/routine/follow-up |
| **Handoff** | وكيل مبيعات | طبيب / منسق مواعيد |
| **Inventory** | مخزون الوحدات | جداول المواعيد / الأطباء المتاحين |
| **Stages** | greeting→qualified | greeting→symptoms→appointment |

#### مراحل البوت الطبي المقترحة

```
greeting
    │ (مرحبا! أنا مساعدك في مستشفى/عيادة XYZ)
    ▼
collecting_name
    │ (ما اسمك الكريم؟)
    ▼
collecting_symptoms
    │ (ما الشكوى الأساسية؟ منذ متى؟)
    ▼
assessing_urgency
    │ (هل هي حالة طارئة؟ أم موعد عادي؟)
    ▼
collecting_insurance
    │ (هل لديك تأمين طبي؟)
    ▼
booking_appointment
    │ (اقتراح مواعيد متاحة من الجدول)
    ▼
confirmed
    │ (تأكيد الموعد + إرسال تذكير)
    ▼
[تسليم لمنسق المواعيد أو الطبيب]
```

#### CRM Actions في السياق الطبي

```json
{
  "type": "update_patient",
  "data": {
    "name": "سارة أحمد",
    "symptoms": "ألم في الركبة منذ أسبوعين",
    "specialty_needed": "عظام",
    "insurance": "AXA",
    "urgency": "routine"
  }
},
{
  "type": "book_appointment",
  "data": {
    "doctorId": "dr_hassan",
    "date": "2025-04-20",
    "time": "10:00"
  }
},
{
  "type": "send_reminder",
  "data": {
    "message": "تذكير: موعدك مع د. حسن غداً الساعة 10ص",
    "sendAt": "2025-04-19T09:00:00Z"
  }
}
```

---

## 5. المتطلبات التقنية للتنفيذ

### Stack التقني المُستخدم فعلياً في النظام الأصلي

| المكوّن | التقنية |
|---------|---------|
| Backend | Node.js + Express + TypeScript |
| WhatsApp Library | @whiskeysockets/baileys 6.x |
| Database | PostgreSQL + Drizzle ORM |
| AI Provider | OpenRouter API (Gemini Flash 1.5 / GPT-4o) |
| Frontend | React + Vite + TanStack Query |
| Session Storage | ملفات محلية على الخادم |
| QR Display | qrcode npm package → base64 |

### متطلبات الخادم

```
- Node.js 18+
- 2GB RAM minimum (Baileys يستهلك ذاكرة)
- مساحة تخزين للـ sessions: ~50MB لكل جلسة
- اتصال إنترنت مستمر وسريع (للـ WebSocket)
- ضروري: استخدام VPS أو سيرفر ثابت (ليس serverless)
```

### اعتبارات مهمة

```
⚠️  Baileys ليس API رسمي من Meta — قد يُغلَق مستقبلاً
⚠️  كل رقم واتساب = جلسة واحدة فقط (لا يمكن تسجيل الدخول من جهازين)
⚠️  لو الرقم محظور من واتساب، تُفقد كل الجلسة
⚠️  للاستخدام التجاري الكبير: يُفضّل WhatsApp Business API الرسمي (WABA)
```

### بديل رسمي: WhatsApp Business API (WABA)

| | Baileys | WABA الرسمي |
|---|---------|------------|
| التكلفة | مجاني | $0.01-0.05 لكل رسالة |
| الموثوقية | متوسطة | عالية جداً |
| الموافقة | لا تحتاج | تحتاج review من Meta |
| Templates | غير مطلوبة | مطلوبة للرسائل الأولى |
| حجم الاستخدام | صغير - متوسط | أي حجم |

---

## 6. خلاصة للمطوّر

### للتطبيق السريع (2-4 أسابيع)

```
Week 1:
  □ إعداد Baileys + Session Management
  □ API Endpoints (connect, status, reset, send)
  □ جدول messages_log في DB
  □ Auto-create Lead من رسالة واردة

Week 2:
  □ إعداد OpenRouter/OpenAI API
  □ Prompt Engineering للسياق المطلوب
  □ Bot Stages Logic
  □ JSON Actions Parser

Week 3:
  □ Frontend: صفحة الـ Inbox
  □ Frontend: صفحة الإعدادات + QR Display
  □ Real-time updates (Polling أو WebSocket)

Week 4:
  □ Templates System
  □ Bot Settings Page
  □ Testing + Bug Fixes
  □ Deployment على VPS ثابت
```

### أهم درس من التطبيق الفعلي

> اللي يجعل النظام ذا قيمة حقيقية هو **جودة الـ Prompt** وليس التقنية. البوت الجيد يُفرّق بين عميل "سؤال عام" وعميل "مشترٍ جاد" — وده يحتاج prompt مُدروس يعكس طبيعة العمل الفعلية والأسئلة الحقيقية التي يطرحها العملاء.

---

*نهاية الوثيقة — أعدّت بناءً على نظام HomeAdvisor CRM المُنفَّذ فعلياً*
