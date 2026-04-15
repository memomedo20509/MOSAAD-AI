# Facebook & Instagram Integration — Complete Technical PRD
## تكامل فيسبوك ماسنجر وإنستجرام مع HomeAdvisor CRM
### v1.0 — أبريل 2026

---

## Table of Contents
1. [نظرة عامة على النظام](#1-نظرة-عامة)
2. [مخطط البنية العامة](#2-مخطط-البنية)
3. [المرحلة 1: ربط صفحة فيسبوك — OAuth & Page Connection](#3-المرحلة-1)
4. [المرحلة 2: إعداد Webhook — استقبال الرسايل من ميتا](#4-المرحلة-2)
5. [المرحلة 3: استقبال الرسايل — Incoming Message Pipeline](#5-المرحلة-3)
6. [المرحلة 4: إنشاء الليدز تلقائياً — Lead Auto-Creation](#6-المرحلة-4)
7. [المرحلة 5: بوت الذكاء الاصطناعي — AI Chatbot على ماسنجر وإنستجرام](#7-المرحلة-5)
8. [المرحلة 6: استخراج البيانات وتكميل كارت العميل](#8-المرحلة-6)
9. [المرحلة 7: أتمتة CRM — Bot Actions](#9-المرحلة-7)
10. [المرحلة 8: تسليم المحادثة — Bot Handoff للسيلز](#10-المرحلة-8)
11. [المرحلة 9: الرد اليدوي — Agent Manual Reply](#11-المرحلة-9)
12. [المرحلة 10: صندوق الوارد — Social Inbox](#12-المرحلة-10)
13. [المرحلة 11: الإشعارات الفورية — Real-time Notifications](#13-المرحلة-11)
14. [المرحلة 12: التوزيع التلقائي — Auto-Assignment](#14-المرحلة-12)
15. [المرحلة 13: صفحة الإعدادات — Meta Settings Page](#15-المرحلة-13)
16. [المرحلة 14: إدارة الاتصال — Connection Management](#16-المرحلة-14)
17. [قاعدة البيانات — Database Schema](#17-قاعدة-البيانات)
18. [API Endpoints Reference](#18-api-endpoints)
19. [المشاكل الشائعة والحلول](#19-مشاكل-وحلول)
20. [اعتبارات الأمان](#20-أمان)

---

## 1. نظرة عامة على النظام

### إيه اللي بيعمله النظام ده؟

النظام بيربط صفحة فيسبوك (وحساب إنستجرام البيزنس المرتبط بيها) بالـ CRM. لما أي حد يبعت رسالة على ماسنجر الصفحة أو DM على إنستجرام:

1. الرسالة بتتوصل للسيرفر فوراً عن طريق Meta Webhook
2. النظام بيتشيك لو المرسل ده عميل موجود ولا جديد
3. لو جديد ← بيتنشأ ليد (عميل محتمل) تلقائي بكل بياناته
4. بوت الذكاء الاصطناعي (Gemini) بيرد تلقائياً بالعربي المصري
5. البوت بيجمع معلومات من المحادثة (الاسم، الميزانية، نوع الوحدة، المنطقة المفضلة)
6. البوت بيملا كارت العميل تلقائياً وبيحدث الـ score
7. لما البوت يجمع معلومات كفاية، بيسلم المحادثة لسيلز بشري
8. السيلز بيشوف كل تاريخ المحادثة والكارت المتملي تلقائياً

### الفرق بين ربط ماسنجر/إنستجرام وربط واتساب

| الخاصية | واتساب (Baileys) | ماسنجر/إنستجرام (Meta API) |
|:---|:---|:---|
| **طريقة الربط** | QR Code على الموبايل | OAuth تسجيل دخول فيسبوك |
| **الـ API** | غير رسمي (Baileys) | رسمي (Meta Graph API) |
| **معرّف المستخدم** | رقم الهاتف (JID) | PSID (Page-Scoped ID) |
| **التكلفة** | مجاني | مجاني (ضمن حدود الاستخدام) |
| **الموافقة** | لا تحتاج | تحتاج Meta App Review |
| **الثبات** | ممكن ينقطع | مستقر جداً |
| **الحملات** | ✅ متاح | ❌ خارج النطاق حالياً |

### Technology Stack

| Component | Technology | Purpose |
|:---|:---|:---|
| **Meta Connection** | Meta Graph API v18.0+ | Official API for Messenger & Instagram |
| **Authentication** | Facebook Login (OAuth 2.0) | Page access token acquisition |
| **Webhook** | Express.js endpoint | Receive real-time messages from Meta |
| **AI Engine** | Google Gemini (via OpenRouter) | Arabic chatbot responses |
| **Message Database** | PostgreSQL (Drizzle ORM) | Message history, lead data |
| **Real-time Updates** | Server-Sent Events (SSE) | Instant UI updates |
| **Frontend** | React + Shadcn UI | Settings page, inbox, lead details |

---

## 2. مخطط البنية العامة

```
┌─────────────────┐       ┌──────────────────────────┐       ┌──────────────┐
│                 │       │                          │       │              │
│  Facebook       │       │  HomeAdvisor CRM Server  │       │  PostgreSQL  │
│  Messenger      │──────►│  (Node.js / Express)     │◄─────►│  Database    │
│                 │  HTTP  │                          │  SQL  │              │
│  Instagram      │  POST  │  ┌────────────────────┐  │       └──────────────┘
│  Direct         │◄──────│  │  Webhook Handler   │  │
│                 │  HTTP  │  │  (POST /api/meta/  │  │
└─────────────────┘  GET   │  │   webhook)         │  │
                          │  └────────┬───────────┘  │
┌─────────────────┐       │           │              │       ┌──────────────┐
│                 │       │  ┌────────▼───────────┐  │       │              │
│  Meta Graph     │◄──────│  │  Message Pipeline  │  │──────►│  AI Engine   │
│  API            │  API   │  │  - Parse payload   │  │       │  (Gemini)    │
│  (Send msgs)    │  Call  │  │  - Find/Create Lead│  │       │              │
│                 │       │  │  - Log message     │  │       └──────────────┘
└─────────────────┘       │  │  - Trigger bot     │  │
                          │  └────────────────────┘  │
┌─────────────────┐       │  ┌────────────────────┐  │
│                 │       │  │  SSE Broadcaster   │  │
│  Agent Browser  │◄──────│  │  (Real-time push)  │──┼──► Notifications
│  (React App)    │  SSE   │  └────────────────────┘  │
│                 │       │                          │
└─────────────────┘       └──────────────────────────┘

تدفق البيانات:
1. عميل يبعت رسالة على ماسنجر أو إنستجرام DM
2. ميتا تبعت الرسالة لـ Webhook endpoint بتاعنا
3. السيرفر يتحقق من التوقيع (X-Hub-Signature-256)
4. يعمل parse للرسالة ويحدد المنصة (ماسنجر أو إنستجرام)
5. يدور على الليد بالـ senderId — لو مش موجود ينشئ واحد جديد
6. يسجل الرسالة في social_messages_log
7. لو البوت شغال → يبعت الرسالة للـ AI Engine
8. الـ AI يرد → السيرفر يبعت الرد عبر Graph API
9. SSE يبعت تحديث للفرونت إند → السيلز يشوف الرسالة فوراً
```

---

## 3. المرحلة 1: ربط صفحة فيسبوك — OAuth & Page Connection

### 3.1 تدفق الربط خطوة بخطوة

```
┌─────────────────────────────────────────────────────────────┐
│                  PAGE CONNECTION FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [أدمن/سيلز] ──► يفتح صفحة "إعدادات ميتا"                  │
│                        │                                    │
│                        ▼                                    │
│              يضغط زر "ربط صفحة فيسبوك"                      │
│                        │                                    │
│                        ▼                                    │
│              يفتح نافذة تسجيل دخول فيسبوك                    │
│              (Facebook Login SDK)                           │
│                        │                                    │
│              الأذونات المطلوبة:                               │
│              • pages_show_list                              │
│              • pages_messaging                              │
│              • pages_read_engagement                        │
│              • instagram_basic                              │
│              • instagram_manage_messages                    │
│                        │                                    │
│                        ▼                                    │
│              يوافق ويسجل دخول                                │
│                        │                                    │
│                        ▼                                    │
│              الفرونت يبعت الـ User Access Token              │
│              للباك إند: POST /api/meta/list-pages            │
│                        │                                    │
│                        ▼                                    │
│              الباك إند يستدعي: GET /me/accounts              │
│              (يجيب كل الصفحات اللي المستخدم أدمن فيها)       │
│                        │                                    │
│                        ▼                                    │
│              يعرض قائمة الصفحات للمستخدم                     │
│                        │                                    │
│                        ▼                                    │
│              المستخدم يختار الصفحة المطلوبة                   │
│                        │                                    │
│                        ▼                                    │
│              POST /api/meta/connect                         │
│              { userAccessToken, pageId }                    │
│                        │                                    │
│              ┌─────────┴─────────────────┐                  │
│              │                           │                  │
│              ▼                           ▼                  │
│         جلب Page Access Token      تشييك لو في حساب         │
│         من Graph API               إنستجرام مرتبط           │
│              │                           │                  │
│              └─────────┬─────────────────┘                  │
│                        ▼                                    │
│              حفظ في جدول meta_page_connections:              │
│              • pageId                                       │
│              • pageName                                     │
│              • pageAccessToken                              │
│              • instagramAccountId (لو موجود)                 │
│              • connectedBy (ID المستخدم)                     │
│              • isActive = true                              │
│                        │                                    │
│                        ▼                                    │
│              ✅ الصفحة متصلة بنجاح                            │
│              يظهر: "صفحة [اسم الصفحة] متصلة"                 │
│              + "إنستجرام: [اسم الحساب]" (لو مرتبط)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 ربط يدوي (Manual Connection) — للمطورين

بديل للـ OAuth، الأدمن يقدر يدخل البيانات يدوياً:

| الحقل | الوصف | مثال |
|:---|:---|:---|
| Page ID | رقم الصفحة من فيسبوك | `123456789012345` |
| Page Name | اسم الصفحة | `HomeAdvisor Egypt` |
| Page Access Token | توكن الصفحة (Long-lived) | `EAAGm0PX4ZC...` |
| Instagram Account ID | رقم حساب الإنستجرام البيزنس | `17841400123456` |

**متى نستخدم الربط اليدوي؟**
- لما الـ OAuth مش شغال في بيئة التطوير
- لما عاوزين نستخدم System User Token بدل User Token
- للاختبار السريع

### 3.3 أنواع الـ Tokens

| Token Type | العمر | الاستخدام |
|:---|:---|:---|
| **User Access Token** | ساعة-ساعتين | مؤقت — يُستخدم فقط لجلب قائمة الصفحات |
| **Page Access Token** | لا ينتهي* | هو اللي بيتحفظ ويُستخدم لكل عمليات الإرسال والاستقبال |
| **System User Token** | لا ينتهي | بديل أفضل في Production — يتعمل من Meta Business Suite |

> *ملاحظة: Page Access Token اللي بيتجاب من User Token اللي عمره طويل (Long-lived) بيكون هو كمان Long-lived.

---

## 4. المرحلة 2: إعداد Webhook — استقبال الرسايل من ميتا

### 4.1 إيه هو الـ Webhook؟

الـ Webhook هو URL على سيرفرنا بيستقبل رسايل من ميتا في الوقت الحقيقي. لما حد يبعت رسالة على ماسنجر أو إنستجرام، ميتا بتعمل HTTP POST لـ URL ده.

### 4.2 إعداد الـ Webhook في Meta Developer App

**الخطوات:**

1. فتح [Meta for Developers](https://developers.facebook.com)
2. الدخول على التطبيق (App)
3. Products → Messenger → Settings → Webhooks
4. إدخال:
   - **Callback URL:** `https://[your-domain]/api/meta/webhook`
   - **Verify Token:** قيمة سرية محفوظة في Environment Variable `META_VERIFY_TOKEN`
5. الاشتراك في الـ events:
   - `messages` — لاستقبال الرسايل
   - `messaging_postbacks` — لاستقبال ردود الأزرار
   - `message_reads` — لمعرفة لما العميل يقرأ الرسالة

### 4.3 Webhook Verification (Challenge)

لما ميتا تعمل إعداد أول مرة، بتبعت GET request للتحقق:

```
GET /api/meta/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_STRING
```

**السيرفر لازم:**
1. يتحقق إن `hub.verify_token` = `META_VERIFY_TOKEN` (المحفوظ عندنا)
2. يرد بـ `hub.challenge` كـ plain text
3. Status 200

**لو التوكن غلط:** يرد 403 Forbidden

### 4.4 Webhook Message Reception

لما تيجي رسالة:

```
POST /api/meta/webhook
Headers:
  X-Hub-Signature-256: sha256=abc123...
Body:
{
  "object": "page",
  "entry": [{
    "id": "PAGE_ID",
    "time": 1234567890,
    "messaging": [{
      "sender": { "id": "SENDER_PSID" },
      "recipient": { "id": "PAGE_ID" },
      "timestamp": 1234567890,
      "message": {
        "mid": "MESSAGE_ID",
        "text": "مرحبا، عاوز أسأل عن شقق في التجمع"
      }
    }]
  }]
}
```

**للإنستجرام — الفرق:**
```json
{
  "object": "instagram",
  "entry": [{
    "id": "INSTAGRAM_BUSINESS_ACCOUNT_ID",
    "time": 1234567890,
    "messaging": [{
      "sender": { "id": "IGSID" },
      "recipient": { "id": "INSTAGRAM_BUSINESS_ACCOUNT_ID" },
      "timestamp": 1234567890,
      "message": {
        "mid": "MESSAGE_ID",
        "text": "عاوز أعرف أسعار الشقق"
      }
    }]
  }]
}
```

### 4.5 التحقق من التوقيع (Signature Verification)

كل رسالة من ميتا بتيجي مع header `X-Hub-Signature-256`. لازم نتحقق منه:

```
المفتاح: META_APP_SECRET (من Meta Developer Dashboard)
الخوارزمية: HMAC-SHA256
المدخل: raw body of the request
النتيجة المتوقعة: = القيمة في X-Hub-Signature-256 header
```

**ليه مهم؟** عشان نتأكد إن الرسالة فعلاً جاية من ميتا، مش من حد تاني بيحاول يبعت رسايل مزيفة.

### 4.6 Environment Variables المطلوبة

| Variable | الوصف | من فين؟ |
|:---|:---|:---|
| `META_APP_ID` | رقم التطبيق | Meta Developer Dashboard |
| `META_APP_SECRET` | المفتاح السري للتطبيق | Meta Developer Dashboard |
| `META_VERIFY_TOKEN` | توكن التحقق من الـ Webhook | أنت بتعمله (أي نص عشوائي) |

---

## 5. المرحلة 3: استقبال الرسايل — Incoming Message Pipeline

### 5.1 تدفق معالجة الرسالة الواردة

```
[رسالة من ميتا عبر Webhook POST]
           │
           ▼
  ① التحقق من التوقيع (X-Hub-Signature-256)
           │
     ┌─────┴─────┐
   صحيح        خاطئ
     │           │
     ▼           ▼
  متابعة     403 + تسجيل تحذير أمني
     │
     ▼
  ② الرد فوراً بـ 200 "EVENT_RECEIVED"
     (ميتا بتستنى رد في أقل من 5 ثواني وإلا بتعيد الإرسال)
     │
     ▼
  ③ تحليل الـ payload (parseMetaWebhookPayload)
     │
     ├── استخراج senderId (PSID أو IGSID)
     ├── استخراج messageText
     ├── تحديد platform ("messenger" أو "instagram")
     ├── استخراج messageId
     └── استخراج timestamp
     │
     ▼
  ④ فحص التكرار (Deduplication)
     │
     ├── messageId موجود في الـ DB؟ → تجاهل
     └── messageId جديد → متابعة
     │
     ▼
  ⑤ البحث عن الليد بالـ senderId
     │
     ├── ليد موجود → تحديث + إضافة الرسالة لسجله
     └── ليد جديد → إنشاء ليد جديد (المرحلة 4)
     │
     ▼
  ⑥ تسجيل الرسالة في social_messages_log
     │
     ▼
  ⑦ تشغيل بوت AI (لو شغال) — المرحلة 5
     │
     ▼
  ⑧ إرسال إشعار فوري للسيلز المسؤول — المرحلة 11
     │
     ▼
  ⑨ بث تحديث SSE للفرونت إند
```

### 5.2 التعامل مع أنواع الرسايل المختلفة

| نوع الرسالة | المعالجة |
|:---|:---|
| **نص عادي** | يتحفظ ويتبعت للبوت |
| **صورة** | يتحفظ رابط الصورة — البوت يرد "شكراً على الصورة" |
| **موقع** | يتحفظ — مفيد لتحديد المنطقة المفضلة |
| **ملصق/Sticker** | يتجاهل من البوت |
| **رد سريع (Quick Reply)** | يتعامل معاه كنص عادي |
| **Postback (زر)** | يتعامل معاه حسب الـ payload |

---

## 6. المرحلة 4: إنشاء الليدز تلقائياً — Lead Auto-Creation

### 6.1 متى بيتنشأ ليد جديد؟

لما تيجي رسالة من `senderId` مش موجود في قاعدة البيانات.

### 6.2 بيانات الليد الجديد

```
┌─────────────────────────────────────────────┐
│           LEAD AUTO-CREATION                │
├─────────────────────────────────────────────┤
│                                             │
│  الاسم:     "ماسنجر - [آخر 6 أرقام]"        │
│             أو "إنستجرام - [آخر 6 أرقام]"   │
│             (البوت بيحدثه لما يعرف الاسم)    │
│                                             │
│  الهاتف:    [senderId / PSID]              │
│             (معرّف المنصة — مش رقم تليفون)   │
│                                             │
│  القناة:    "ماسنجر" أو "إنستجرام"          │
│                                             │
│  الحالة:    الحالة الافتراضية (ليد جديد)     │
│             Zone 1 — Untouched              │
│                                             │
│  البوت:     botActive = true                │
│             botStage = "greeting"           │
│                                             │
│  التوزيع:   يتوزع تلقائياً على سيلز         │
│             (حسب قواعد Auto-Assignment)      │
│             أو يتعيّن للمستخدم اللي ربط      │
│             الصفحة                           │
│                                             │
│  السجل:     يتنشأ سطر في lead_history       │
│             "تم إنشاء ليد من ماسنجر"          │
│                                             │
└─────────────────────────────────────────────┘
```

### 6.3 تدفق إنشاء الليد

```
[senderId جديد وصلت رسالة منه]
           │
           ▼
  ① البحث في جدول leads عن phone = senderId
           │
     ┌─────┴─────┐
   موجود       مش موجود
     │              │
     ▼              ▼
  رجع الليد    ② إنشاء ليد جديد:
  الموجود         name = "[platform] - [id]"
     │              phone = senderId
     │              channel = platform
     │              stateId = default state
     │              botActive = true
     │              botStage = "greeting"
     │              │
     │              ▼
     │         ③ Auto-Assignment (المرحلة 12)
     │              │
     │              ▼
     │         ④ تسجيل في lead_history
     │              │
     │              ▼
     │         ⑤ إشعار "ليد جديد من [platform]"
     │              │
     └──────────────┘
              │
              ▼
     [الليد جاهز — متابعة معالجة الرسالة]
```

### 6.4 ملاحظة مهمة: PSID vs رقم الهاتف

- **PSID (Page-Scoped User ID):** معرّف فريد لكل مستخدم **بالنسبة لصفحة معينة**
- نفس الشخص ممكن يكون عنده PSID مختلف لصفحات مختلفة
- الـ PSID مش رقم تليفون — مش هنقدر نتواصل معاه على واتساب تلقائياً
- **IGSID (Instagram-Scoped User ID):** نفس المفهوم بس لإنستجرام
- لو البوت قدر يجمع رقم الهاتف أثناء المحادثة → يتحفظ في field منفصل ويتعمل merge مع ليد واتساب لو موجود

---

## 7. المرحلة 5: بوت الذكاء الاصطناعي — AI Chatbot

### 7.1 متى البوت بيرد؟

```
[رسالة وصلت وتم تسجيلها]
           │
           ▼
  ① هل البوت مفعّل في إعدادات المستخدم (connectedBy)؟
     │
     ├── لا → ❌ لا يرد — ينتظر رد يدوي
     └── نعم
           │
           ▼
  ② هل البوت مفعّل لهذا الليد (botActive)?
     │
     ├── لا → ❌ لا يرد — تم تسليمه لسيلز
     └── نعم
           │
           ▼
  ③ هل الليد في مرحلة "handed_off"?
     │
     ├── نعم → ❌ لا يرد — سيلز متحكم
     └── لا
           │
           ▼
  ④ هل إحنا في ساعات العمل؟
     │
     ├── نعم + respondAlways = false → ❌ لا يرد
     ├── نعم + respondAlways = true → ✅ يرد
     └── لا (خارج ساعات العمل) → ✅ يرد
           │
           ▼
  ⑤ ✅ البوت بيرد تلقائياً
```

### 7.2 مراحل البوت (Bot Stages)

البوت بيمر بمراحل مع كل ليد:

| المرحلة | الوصف | البوت بيعمل إيه |
|:---|:---|:---|
| `greeting` | ترحيب أول | يرحب ويسأل عن احتياجات العميل |
| `collecting_needs` | جمع المتطلبات | يسأل عن: نوع الوحدة، المساحة، الميزانية، المنطقة |
| `presenting_options` | عرض الخيارات | يعرض مشاريع/وحدات مناسبة من قاعدة البيانات |
| `handling_objections` | التعامل مع الاعتراضات | يرد على أسئلة عن الأسعار والمواقع |
| `qualifying` | تأهيل العميل | يقيّم جدية العميل ويحدد لو جاهز للحجز |
| `handed_off` | تم التسليم | البوت بيوقف — السيلز يتحكم |

### 7.3 البيانات اللي بتتبعت للـ AI

```
{
  currentMessage: "عاوز شقة 3 غرف في التجمع",
  conversationHistory: [آخر 20 رسالة],
  botStage: "collecting_needs",
  leadData: {
    name: "ماسنجر - 123456",
    budget: null,
    unitType: null,
    preferredArea: null
  },
  availableProjects: [قائمة المشاريع المتاحة],
  botSettings: {
    personality: "مستشار عقاري محترف ودود",
    mission: "جمع بيانات العميل وتأهيله",
    language: "عربي مصري"
  }
}
```

### 7.4 رد الـ AI

```json
{
  "reply": "أهلاً بيك! شقة 3 غرف في التجمع اختيار ممتاز. تقريباً الميزانية اللي حضرتك حاططها قد إيه؟ عندنا مشاريع تبدأ من 2 مليون لحد 8 مليون.",
  "nextStage": "collecting_needs",
  "extractedData": {
    "unitType": "شقة",
    "rooms": 3,
    "preferredArea": "التجمع الخامس"
  },
  "shouldHandoff": false,
  "botActions": [
    {
      "action": "updateLeadScore",
      "value": "warm"
    }
  ]
}
```

---

## 8. المرحلة 6: استخراج البيانات وتكميل كارت العميل

### 8.1 البيانات اللي البوت بيستخرجها

| الحقل | مثال | كيف بيتملا |
|:---|:---|:---|
| **الاسم** | "أحمد محمد" | لما العميل يعرّف نفسه |
| **رقم الهاتف** | "01012345678" | لما العميل يشاركه (مهم جداً — بيسمح بالربط مع واتساب) |
| **الميزانية** | "3-5 مليون" | لما يذكر أرقام |
| **نوع الوحدة** | "شقة / فيلا / دوبلكس" | من وصف المتطلبات |
| **عدد الغرف** | "3 غرف" | من وصف المتطلبات |
| **المساحة** | "150-200 متر" | من وصف المتطلبات |
| **المنطقة المفضلة** | "التجمع / الشيخ زايد / العاصمة" | من ذكر الأماكن |
| **الغرض** | "سكن / استثمار" | من سياق المحادثة |
| **الجدول الزمني** | "خلال 3 شهور" | لما يذكر وقت |

### 8.2 تحديث الكارت

```
[AI يرجع extractedData]
           │
           ▼
  لكل حقل مستخرج:
     │
     ├── الحقل فاضي في الليد؟ → يتحدث فوراً
     └── الحقل فيه قيمة؟ → يتحدث لو القيمة الجديدة أدق
           │
           ▼
  تسجيل التحديث في lead_history:
  "البوت حدّث [الحقل] من [قديم] إلى [جديد]"
           │
           ▼
  تحديث الـ lead score بناءً على اكتمال البيانات
```

---

## 9. المرحلة 7: أتمتة CRM — Bot Actions

### 9.1 إيه هي Bot Actions؟

أفعال بيتخذها البوت تلقائياً بناءً على سياق المحادثة:

| Action | الوصف | مثال |
|:---|:---|:---|
| `changeState` | تغيير حالة الليد | من "ليد جديد" لـ "متابعة" |
| `updateScore` | تحديث درجة الاهتمام | من Cold لـ Warm أو Hot |
| `createReminder` | إنشاء تذكير للسيلز | "متابعة بعد يوم — العميل طلب وقت للتفكير" |
| `addNote` | إضافة ملاحظة | "العميل مهتم بمشروع X — يحتاج زيارة" |
| `tagLead` | إضافة تاج | "VIP" أو "مستعجل" |
| `handoff` | تسليم لسيلز | "العميل جاهز للحجز" |

### 9.2 تنفيذ الـ Actions

```
[AI يرجع botActions array]
           │
           ▼
  لكل action:
     │
     ├── changeState → storage.updateLeadState(leadId, newStateId)
     ├── updateScore → storage.updateLead(leadId, { score })
     ├── createReminder → storage.createReminder({ leadId, message, dueDate })
     ├── addNote → storage.createCommunication({ leadId, type: "note", notes })
     ├── tagLead → storage.updateLead(leadId, { tags })
     └── handoff → [المرحلة 8]
           │
           ▼
  تسجيل كل action في lead_history
           │
           ▼
  إشعار السيلز بالـ action اللي حصل
```

---

## 10. المرحلة 8: تسليم المحادثة — Bot Handoff

### 10.1 متى بيحصل Handoff؟

```
[AI يقرر shouldHandoff = true]
           │
           ▼
  الأسباب الممكنة:
  ├── العميل جمع بيانات كافية وجاهز لزيارة/حجز
  ├── العميل طلب التكلم مع شخص حقيقي
  ├── العميل عنده سؤال مش في نطاق البوت
  └── البوت مش قادر يفهم طلب العميل
           │
           ▼
  الخطوات:
  ① إرسال رسالة وداع من البوت:
     "شكراً ليك! هحوّلك لأحد مستشارينا العقاريين.
      هيتواصل معاك في أقرب وقت. 🏠"
           │
           ▼
  ② تحديث الليد:
     botActive = false
     botStage = "handed_off"
           │
           ▼
  ③ تغيير حالة الليد لـ "متابعة" (Active zone)
           │
           ▼
  ④ إشعار فوري للسيلز المسؤول:
     "🔔 العميل [الاسم] من [ماسنجر/إنستجرام] جاهز للتواصل!
      الميزانية: [X] - نوع الوحدة: [Y] - المنطقة: [Z]"
           │
           ▼
  ⑤ إنشاء تذكير تلقائي:
     "متابعة العميل [الاسم] — تم تسليمه من البوت"
     مستحق خلال: 30 دقيقة
```

### 10.2 ملخص الـ Handoff للسيلز

السيلز بيشوف في الإشعار:

```
┌──────────────────────────────────────────┐
│  🔔 ليد جاهز من ماسنجر                    │
├──────────────────────────────────────────┤
│  الاسم:    أحمد محمد                      │
│  القناة:   ماسنجر فيسبوك                  │
│  الميزانية: 3-5 مليون                     │
│  يدوّر على: شقة 3 غرف في التجمع           │
│  المساحة:  150-200 متر                    │
│  الغرض:    سكن                            │
│  الجدية:   🔥 Hot                         │
│                                          │
│  [فتح المحادثة]  [فتح كارت العميل]        │
└──────────────────────────────────────────┘
```

---

## 11. المرحلة 9: الرد اليدوي — Agent Manual Reply

### 11.1 السيلز بيرد إزاي؟

بعد الـ Handoff (أو في أي وقت)، السيلز يقدر يرد يدوياً:

1. يفتح تفاصيل الليد
2. يضغط على تاب "ماسنجر" أو "إنستجرام"
3. يشوف كل تاريخ المحادثة (رسايل العميل + ردود البوت + ردود السيلز)
4. يكتب الرد في مربع الرسالة
5. يضغط "إرسال" (أو Enter)
6. الرسالة بتتبعت عبر Meta Graph API
7. العميل بيشوفها في ماسنجر/إنستجرام

### 11.2 إرسال الرسالة عبر Graph API

```
POST https://graph.facebook.com/v18.0/me/messages
Headers:
  Authorization: Bearer PAGE_ACCESS_TOKEN
Body:
{
  "recipient": { "id": "SENDER_PSID_OR_IGSID" },
  "message": { "text": "أهلاً أحمد! أنا محمد من HomeAdvisor. شفت إنك مهتم بشقة في التجمع..." }
}
```

### 11.3 قواعد الرد

| القاعدة | التفاصيل |
|:---|:---|
| **نافذة الـ 24 ساعة** | ميتا بتسمح بالرد خلال 24 ساعة فقط من آخر رسالة من العميل |
| **بعد 24 ساعة** | لازم نستخدم Message Tags (محدودة) أو الرسايل المدفوعة |
| **Message Tags المسموحة** | `CONFIRMED_EVENT_UPDATE`, `POST_PURCHASE_UPDATE`, `ACCOUNT_UPDATE` |
| **البوت vs السيلز** | لما السيلز يرد يدوي، البوت بيوقف تلقائياً لهذا الليد |

---

## 12. المرحلة 10: صندوق الوارد — Social Inbox

### 12.1 مكان عرض الرسايل

الرسايل بتظهر في **تفاصيل الليد** في تاب مخصص:

```
┌──────────────────────────────────────────────────────┐
│  👤 أحمد محمد — ماسنجر                                │
├──────────────────────────────────────────────────────┤
│  [بيانات] [نشاط] [ماسنجر 💬] [مهام] [ملاحظات]        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────┐                      │
│  │ 🔵 أحمد                    │  12:30 PM            │
│  │ مرحبا، عاوز أسأل عن شقق   │                      │
│  │ في التجمع                  │                      │
│  └────────────────────────────┘                      │
│                                                      │
│         ┌────────────────────────────┐                │
│         │ 🤖 Bot                     │  12:30 PM      │
│         │ أهلاً بيك! شقة في التجمع   │                │
│         │ اختيار ممتاز. الميزانية     │                │
│         │ تقريباً قد إيه؟             │                │
│         └────────────────────────────┘                │
│                                                      │
│  ┌────────────────────────────┐                      │
│  │ 🔵 أحمد                    │  12:31 PM            │
│  │ حوالي 4 مليون              │                      │
│  └────────────────────────────┘                      │
│                                                      │
│         ┌────────────────────────────┐                │
│         │ 👤 محمد (سيلز)            │  12:35 PM      │
│         │ أهلاً أحمد! أنا محمد.     │                │
│         │ عندنا خيارات ممتازة...     │                │
│         └────────────────────────────┘                │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [اكتب رسالتك هنا...                    ] [إرسال 📤] │
└──────────────────────────────────────────────────────┘
```

### 12.2 التمييز بين أنواع الرسايل

| النوع | اللون | الأيقونة |
|:---|:---|:---|
| **رسالة العميل** | رمادي فاتح (يسار) | 🔵 دائرة زرقاء |
| **رد البوت** | بنفسجي فاتح (يمين) | 🤖 أيقونة روبوت |
| **رد السيلز** | أزرق (يمين) | 👤 أيقونة شخص |

### 12.3 خصائص الـ Inbox

- **تحديث تلقائي** كل 30 ثانية (polling) + تحديث فوري عبر SSE
- **علامة القراءة** — الرسايل الجديدة تظهر كـ "غير مقروءة" لحد ما السيلز يفتح التاب
- **عداد الرسايل** — يظهر عدد الرسايل غير المقروءة في التاب
- **Scroll to bottom** — لما تيجي رسالة جديدة، تنزل لآخر المحادثة تلقائياً

---

## 13. المرحلة 11: الإشعارات الفورية — Real-time Notifications

### 13.1 أنواع الإشعارات

| الحدث | نوع الإشعار | المستقبل |
|:---|:---|:---|
| **رسالة جديدة من عميل** | `social_message` | السيلز المسؤول عن الليد |
| **ليد جديد اتنشأ** | `new_lead` | السيلز اللي اتوزع عليه |
| **البوت عمل handoff** | `bot_handoff` | السيلز المسؤول |
| **البوت غيّر حالة** | `bot_action` | السيلز المسؤول |
| **البوت أنشأ تذكير** | `reminder` | السيلز المسؤول |

### 13.2 آلية الإشعارات

```
[حدث جديد في السيرفر]
           │
           ▼
  ① حفظ في جدول notifications
     { userId, type, message, leadId, isRead: false }
           │
           ▼
  ② بث عبر SSE للفرونت إند
           │
           ▼
  ③ الفرونت:
     ├── صوت إشعار 🔔
     ├── عداد الإشعارات يزيد
     ├── Toast notification يظهر
     └── لو صفحة الليد مفتوحة → refresh تلقائي
```

---

## 14. المرحلة 12: التوزيع التلقائي — Auto-Assignment

### 14.1 لما ليد جديد من ماسنجر/إنستجرام يتنشأ

```
[ليد جديد اتنشأ]
           │
           ▼
  ① هل في قواعد توزيع تلقائي مفعّلة؟
     │
     ├── لا → الليد يتعيّن للمستخدم اللي ربط الصفحة (connectedBy)
     └── نعم
           │
           ▼
  ② خوارزمية التوزيع: Least-Loaded Round-Robin
     │
     ├── جلب كل السيلز النشطين (role = sales_agent)
     ├── حساب عدد الليدز النشطين لكل سيلز
     └── تعيين الليد للسيلز الأقل حملاً
           │
           ▼
  ③ إشعار السيلز: "ليد جديد من [ماسنجر/إنستجرام] اتعيّنلك"
```

---

## 15. المرحلة 13: صفحة الإعدادات — Meta Settings Page

### 15.1 تصميم الصفحة

```
┌──────────────────────────────────────────────────────────────┐
│  ⚙️ إعدادات ربط فيسبوك وإنستجرام                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  📘 صفحة فيسبوك                                      │    │
│  │                                                      │    │
│  │  الحالة: ✅ متصلة                                     │    │
│  │  اسم الصفحة: HomeAdvisor Egypt                       │    │
│  │  Page ID: 123456789012345                             │    │
│  │  متصلة بواسطة: أحمد (Admin)                           │    │
│  │  تاريخ الربط: 13 أبريل 2026                           │    │
│  │                                                      │    │
│  │  [🔴 فصل الصفحة]                                     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  📸 إنستجرام                                         │    │
│  │                                                      │    │
│  │  الحالة: ✅ متصل (مرتبط بالصفحة)                      │    │
│  │  اسم الحساب: @homeadvisor_egypt                      │    │
│  │  Instagram ID: 17841400123456                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🔗 إعدادات Webhook                                   │    │
│  │                                                      │    │
│  │  Callback URL:                                       │    │
│  │  https://your-app.replit.app/api/meta/webhook        │    │
│  │  [📋 نسخ]                                            │    │
│  │                                                      │    │
│  │  Verify Token:                                       │    │
│  │  ********************************                    │    │
│  │  [👁 إظهار] [📋 نسخ]                                  │    │
│  │                                                      │    │
│  │  📋 خطوات الإعداد في Meta Developer:                  │    │
│  │  1. افتح developers.facebook.com                     │    │
│  │  2. اختر التطبيق                                     │    │
│  │  3. Products → Messenger → Webhooks                  │    │
│  │  4. الصق الـ Callback URL والـ Verify Token           │    │
│  │  5. اشترك في: messages, messaging_postbacks          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ─── أو ───                                                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  🔧 ربط يدوي (للمطورين)                               │    │
│  │                                                      │    │
│  │  Page ID:          [________________]                │    │
│  │  Page Name:        [________________]                │    │
│  │  Access Token:     [________________]                │    │
│  │  Instagram ID:     [________________] (اختياري)      │    │
│  │                                                      │    │
│  │  [ربط الصفحة يدوياً]                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 16. المرحلة 14: إدارة الاتصال — Connection Management

### 16.1 فصل الصفحة (Disconnect)

```
[أدمن يضغط "فصل الصفحة"]
           │
           ▼
  ① تأكيد: "هل أنت متأكد؟ لن تستقبل رسايل من ماسنجر وإنستجرام."
           │
           ▼
  ② تحديث meta_page_connections: isActive = false
           │
           ▼
  ③ الـ webhook بيتجاهل الرسايل الجاية من الصفحة دي
           │
           ▼
  ④ الليدز الموجودة مش بتتأثر (بتفضل محفوظة)
```

### 16.2 إعادة الربط

- المستخدم يقدر يربط نفس الصفحة تاني أو يربط صفحة تانية
- لما يربط تاني، الليدز القديمة بتتربط تلقائياً (نفس الـ PSID)

### 16.3 تجديد الـ Token

- Page Access Token ممكن ينتهي أو يتبطل
- النظام لازم يكشف الخطأ (Error 190: Invalid Access Token)
- يظهر تحذير في صفحة الإعدادات
- المستخدم يعيد الربط عبر OAuth

---

## 17. قاعدة البيانات — Database Schema

### 17.1 جدول meta_page_connections

```sql
CREATE TABLE meta_page_connections (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     TEXT NOT NULL UNIQUE,
  page_name   TEXT NOT NULL,
  page_access_token TEXT NOT NULL,
  instagram_account_id TEXT,
  connected_by VARCHAR REFERENCES users(id),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

### 17.2 جدول social_messages_log

```sql
CREATE TABLE social_messages_log (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     VARCHAR REFERENCES leads(id),
  platform    TEXT NOT NULL,  -- 'messenger' | 'instagram'
  sender_id   TEXT NOT NULL,
  direction   TEXT NOT NULL,  -- 'inbound' | 'outbound'
  message_text TEXT,
  message_id  TEXT UNIQUE,    -- Meta message ID (للتكرار)
  sent_by     VARCHAR REFERENCES users(id),  -- NULL for bot/inbound
  is_read     BOOLEAN DEFAULT false,
  is_bot_reply BOOLEAN DEFAULT false,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 17.3 العلاقة مع الجداول الموجودة

```
meta_page_connections
         │
         │ (الصفحة المتصلة)
         │
leads ───┼─── social_messages_log
  │      │         │
  │      │         ├── platform: messenger/instagram
  │      │         ├── direction: inbound/outbound
  │      │         └── message_text
  │      │
  ├── lead_history (سجل كل الأحداث)
  ├── notifications (إشعارات)
  ├── tasks (مهام السيلز)
  ├── reminders (تذكيرات)
  └── communications (مكالمات/اجتماعات)
```

---

## 18. API Endpoints Reference

### 18.1 إدارة الاتصال

| Method | Endpoint | الوصف |
|:---|:---|:---|
| `POST` | `/api/meta/list-pages` | جلب قائمة صفحات فيسبوك بعد OAuth |
| `POST` | `/api/meta/connect` | ربط صفحة محددة (OAuth flow) |
| `POST` | `/api/meta/connect-manual` | ربط يدوي بالـ token |
| `GET` | `/api/meta/connection` | حالة الاتصال الحالي |
| `POST` | `/api/meta/disconnect` | فصل الصفحة |

### 18.2 Webhook

| Method | Endpoint | الوصف |
|:---|:---|:---|
| `GET` | `/api/meta/webhook` | التحقق من Meta (Challenge) |
| `POST` | `/api/meta/webhook` | استقبال الرسايل |

### 18.3 الرسايل

| Method | Endpoint | الوصف |
|:---|:---|:---|
| `GET` | `/api/leads/:id/social-messages` | جلب رسايل ليد معين |
| `POST` | `/api/leads/:id/social-messages/send` | إرسال رد يدوي |
| `POST` | `/api/leads/:id/social-messages/read` | علامة كمقروء |

---

## 19. المشاكل الشائعة والحلول

### 19.1 مشاكل الربط

| المشكلة | السبب | الحل |
|:---|:---|:---|
| "لا توجد صفحات" بعد OAuth | المستخدم مش أدمن في أي صفحة | تأكد إن المستخدم admin في الصفحة على فيسبوك |
| "Token غير صالح" | انتهت صلاحية الـ token | إعادة الربط عبر OAuth |
| إنستجرام مش ظاهر | الحساب مش Instagram Business | تحويل الحساب لـ Business/Creator وربطه بالصفحة |
| Webhook مش شغال | الـ URL مش عام (localhost) | استخدام domain عام (مثل Replit) |

### 19.2 مشاكل الرسايل

| المشكلة | السبب | الحل |
|:---|:---|:---|
| رسايل مكررة | ميتا بتبعت retry | فحص التكرار بالـ messageId |
| الرد مش بيتوصل | نافذة الـ 24 ساعة انتهت | استخدام Message Tags أو انتظار رسالة جديدة من العميل |
| البوت مش بيرد | `botActive = false` أو ساعات العمل | تشييك إعدادات البوت والساعات |
| Error 10 | الصفحة مش مشتركة في الـ webhook | إضافة الصفحة في Webhook subscriptions |

### 19.3 مشاكل الأذونات

| المشكلة | السبب | الحل |
|:---|:---|:---|
| "(#200) Requires pages_messaging" | أذونات ناقصة | إعادة OAuth مع كل الأذونات المطلوبة |
| "This Page has restrictions" | الصفحة مقيدة | تشييك إعدادات الصفحة على فيسبوك |
| "App not approved" | التطبيق لسه في Development Mode | ده عادي في التطوير — في Production لازم App Review |

---

## 20. اعتبارات الأمان

### 20.1 حماية البيانات

| النقطة | التفاصيل |
|:---|:---|
| **التوقيع** | التحقق من `X-Hub-Signature-256` في كل webhook request |
| **الـ Tokens** | Page Access Token محفوظ مشفر في DB — لا يظهر في الفرونت |
| **Environment Variables** | `META_APP_SECRET` و `META_VERIFY_TOKEN` محفوظين في Replit Secrets |
| **HTTPS** | الـ Webhook لازم يكون على HTTPS (Replit بيوفر ده تلقائياً) |

### 20.2 Rate Limits

| الحد | القيمة |
|:---|:---|
| **إرسال الرسايل** | 200 طلب/ساعة/صفحة (في Development Mode) |
| **Graph API** | 200 طلب/ساعة/مستخدم |
| **Webhook** | ميتا بتستنى رد في 5 ثواني — لازم نرد 200 فوراً |

### 20.3 Privacy & Compliance

- البيانات المحفوظة: اسم المستخدم (لو اتشارك)، PSID، محتوى الرسايل
- لا نحفظ صور أو ملفات — فقط روابط
- المستخدم يقدر يطلب حذف بياناته (Data Deletion Request Callback — مطلوب من ميتا)
- الالتزام بسياسات ميتا لاستخدام Messenger Platform

---

## ملخص المتطلبات التقنية (Technical Checklist)

### Environment Variables مطلوبة
- [ ] `META_APP_ID`
- [ ] `META_APP_SECRET`
- [ ] `META_VERIFY_TOKEN`

### جداول قاعدة البيانات
- [ ] `meta_page_connections`
- [ ] `social_messages_log`

### API Endpoints
- [ ] `GET /api/meta/webhook` (Challenge verification)
- [ ] `POST /api/meta/webhook` (Message reception)
- [ ] `POST /api/meta/list-pages` (OAuth page listing)
- [ ] `POST /api/meta/connect` (Page connection)
- [ ] `POST /api/meta/connect-manual` (Manual connection)
- [ ] `GET /api/meta/connection` (Connection status)
- [ ] `POST /api/meta/disconnect` (Disconnect)
- [ ] `GET /api/leads/:id/social-messages` (Get messages)
- [ ] `POST /api/leads/:id/social-messages/send` (Send reply)
- [ ] `POST /api/leads/:id/social-messages/read` (Mark read)

### Frontend Pages/Components
- [ ] صفحة إعدادات ميتا (Meta Settings Page)
- [ ] مكوّن صندوق الرسايل (Social Messages Panel)
- [ ] تاب الرسايل في تفاصيل الليد
- [ ] إشعارات الرسايل الجديدة

### Backend Logic
- [ ] Webhook handler مع signature verification
- [ ] Payload parser لماسنجر وإنستجرام
- [ ] Lead auto-creation من social messages
- [ ] AI bot integration لماسنجر/إنستجرام
- [ ] Bot handoff logic
- [ ] Manual reply via Graph API
- [ ] SSE broadcast للتحديثات الفورية
- [ ] Auto-assignment للليدز الجديدة

---

*نهاية الوثيقة — v1.0 — أبريل 2026*
