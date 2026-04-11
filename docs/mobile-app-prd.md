# HomeAdvisor CRM — Mobile Application PRD
## Product Requirements Document v1.0
### Date: April 11, 2026

---

## 1. Executive Summary

### 1.1 Purpose
Mobile-first companion application for the HomeAdvisor CRM platform — a multi-tenant Real Estate CRM built for the Egyptian market. The mobile app connects to the **existing** backend API and PostgreSQL database, providing role-optimized dashboards and workflows for all 7 user roles.

### 1.2 Why Mobile
- 90%+ of Egyptian real estate sales agents work primarily from their phones
- WhatsApp conversations happen on mobile — agents need CRM context while chatting
- Site visits, meetings, and property showings happen in the field
- Managers need real-time visibility into team performance from anywhere
- Quick lead responses (under 5 minutes) dramatically increase conversion rates

### 1.3 Tech Stack (Recommended)
- **Framework**: React Native with Expo (recommended for Replit deployment)
- **State Management**: TanStack Query (same as web app for consistency)
- **UI Components**: React Native Paper or NativeWind (Tailwind for RN)
- **Navigation**: React Navigation v6
- **Push Notifications**: Expo Notifications + backend webhook
- **Authentication**: Same session-based auth (passport-local) via API calls
- **Backend**: Connects to existing Express.js API — **NO new backend needed**

### 1.4 Backend Connection
```
Base URL: https://[deployed-replit-url]
Auth: POST /api/login → session cookie
All existing API endpoints are reused as-is
```

---

## 2. Existing System Overview

### 2.1 Database (PostgreSQL — Shared with Web)
The mobile app reads/writes to the **same database** as the web app. Key tables:

| Table | Purpose |
|:---|:---|
| `users` | Auth, roles, team assignment |
| `teams` | Sales team grouping |
| `leads` | Core CRM entity — name, phone, email, state, score, assigned agent |
| `lead_states` | Funnel pipeline stages with categories (untouched/active/won/lost) |
| `lead_history` | Full audit trail with typed entries (state_change, assignment, call, whatsapp, note, reassignment) |
| `clients` | Converted leads (done deals) |
| `tasks` | To-do items linked to leads |
| `reminders` | Scheduled follow-up alerts |
| `communications` | Call logs, notes, WhatsApp messages |
| `call_logs` | Call outcomes and follow-up scheduling |
| `developers` | Real estate development companies (248 developers) |
| `projects` | Compounds/developments (776 projects) |
| `units` | Individual property units (3,124 units) |
| `lead_unit_interests` | Lead ↔ Unit interest tracking |
| `documents` | Uploaded files for leads/clients |
| `whatsapp_messages_log` | WhatsApp conversation history |
| `whatsapp_templates` | Approved message templates |
| `whatsapp_campaigns` | Bulk messaging campaigns |
| `notifications` | In-app notification queue |
| `commissions` | Agent earnings tracking |
| `monthly_targets` | KPI targets per agent per month |
| `scoring_config` | Lead scoring algorithm settings |
| `chatbot_settings` | AI bot personality and behavior |
| `stale_lead_settings` | Per-state staleness thresholds |
| `role_permissions` | Dynamic permission overrides |
| `custom_roles` | User-defined roles |

### 2.2 User Roles (7 Predefined + Custom)

| Role | Arabic Name | Primary Use Case |
|:---|:---|:---|
| `super_admin` | مدير النظام | Full system control |
| `company_owner` | صاحب الشركة | Executive oversight & reporting |
| `admin` | مدير | General administration |
| `sales_admin` | سيلز أدمن | Operations & lead distribution |
| `sales_manager` | سيلز مانجر | Team performance tracking |
| `team_leader` | تيم ليدر | Managing specific team |
| `sales_agent` | سيلز | Daily lead handling |

### 2.3 Permission Matrix (Affects Mobile UI Visibility)

| Permission | Super Admin | Owner | Admin | Sales Admin | Manager | Team Leader | Agent |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `canViewAllLeads` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canManageUsers` | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canManageTeams` | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canDeleteData` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canTransferLeads` | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canViewAllReports` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canAccessInventory` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canManageCampaigns` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canAccessKanban` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `canAccessWhatsApp` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `canAccessCommissions` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `canAccessLeaderboard` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `canAccessMyDay` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. API Endpoints (All Existing — No New Backend Needed)

### 3.1 Authentication
```
POST   /api/login                          → { username, password }
POST   /api/logout
GET    /api/user                           → current user session
```

### 3.2 Leads
```
GET    /api/leads                          → filtered by role permissions
GET    /api/leads/:id                      → full lead details + score
POST   /api/leads                          → create new lead
PATCH  /api/leads/:id                      → update (with transition rules)
DELETE /api/leads/:id                      → requires canDeleteData
POST   /api/leads/:id/transfer             → reassign with privacy control
POST   /api/leads/auto-assign              → auto-assign to agent
POST   /api/leads/import                   → bulk import from file
```

### 3.3 Lead History & Timeline (Lead Passport)
```
GET    /api/leads/:leadId/history          → typed timeline (state_change, assignment, call, whatsapp, note, reassignment)
GET    /api/history                        → global actions log
```

### 3.4 Tasks & Reminders
```
GET    /api/leads/:leadId/tasks
POST   /api/tasks
GET    /api/reminders
GET    /api/reminders/user/:userId
POST   /api/reminders
PATCH  /api/reminders/:id
```

### 3.5 Communications
```
POST   /api/leads/:leadId/communications   → log call/note
GET    /api/leads/:leadId/communications
GET    /api/leads/:leadId/call-logs
POST   /api/leads/:leadId/call-logs
```

### 3.6 WhatsApp
```
GET    /api/whatsapp/status                → connection status
POST   /api/whatsapp/connect               → QR code generation
POST   /api/whatsapp/send                  → send message
GET    /api/leads/:leadId/whatsapp-conversation → chat history
POST   /api/leads/:leadId/ai/suggest-replies → AI reply suggestions
POST   /api/leads/:leadId/bot/takeover     → stop bot, agent takes over
GET    /api/chatbot/settings
PUT    /api/chatbot/settings
```

### 3.7 Inventory
```
GET    /api/developers
GET    /api/projects
GET    /api/projects/:projectId/units
GET    /api/units
POST   /api/lead-unit-interests            → link lead to unit
```

### 3.8 Pipeline States
```
GET    /api/states                         → all states with categories/zones
POST   /api/states
PATCH  /api/states/:id
DELETE /api/states/:id
```

### 3.9 Teams & Users
```
GET    /api/teams
POST   /api/teams
GET    /api/users
POST   /api/users
PATCH  /api/users/:id
```

### 3.10 Reports & Analytics
```
GET    /api/reports/reassignments
GET    /api/reports/marketing
GET    /api/reports/response-time
GET    /api/reports/sales-activity
GET    /api/reports/funnel
GET    /api/dashboard/team-activity
GET    /api/analytics/funnel-overview
GET    /api/analytics/time-in-stage
GET    /api/analytics/stale-leads
GET    /api/analytics/agent-funnel
GET    /api/analytics/lead-flow
GET    /api/analytics/stale-settings
PUT    /api/analytics/stale-settings/:stateId
```

### 3.11 Performance & Targets
```
GET    /api/commissions
POST   /api/commissions
GET    /api/monthly-targets
POST   /api/monthly-targets
GET    /api/leaderboard
GET    /api/monthly-targets-with-achievement
```

### 3.12 Notifications
```
GET    /api/notifications
GET    /api/notifications/unread-count
POST   /api/notifications/:id/read
```

### 3.13 Permissions & Roles
```
GET    /api/role-permissions
PUT    /api/role-permissions/:role
GET    /api/custom-roles
POST   /api/custom-roles
```

---

## 4. Mobile App Architecture

### 4.1 Navigation Structure

```
├── Auth Stack (unauthenticated)
│   └── Login Screen
│
├── Main Tab Navigator (authenticated)
│   ├── Tab 1: Home (role-based dashboard)
│   ├── Tab 2: Leads
│   ├── Tab 3: Quick Action (FAB-style center button)
│   ├── Tab 4: Messages (WhatsApp Inbox)
│   └── Tab 5: More (Settings, Profile, etc.)
│
├── Lead Detail Stack
│   ├── Lead Info
│   ├── Lead Passport (Timeline CV)
│   ├── Communications Tab
│   ├── Tasks & Reminders
│   ├── Documents
│   └── Unit Interests
│
├── Inventory Stack
│   ├── Developers List
│   ├── Projects List
│   └── Unit Details
│
├── Reports Stack (Manager+)
│   ├── Funnel Health
│   ├── Sales Activity
│   ├── Response Time
│   ├── Marketing ROI
│   └── Reassignment Report
│
└── Settings Stack
    ├── Profile
    ├── Pipeline States (Admin)
    ├── Users Management (Admin)
    ├── Teams Management (Admin/Manager)
    ├── WhatsApp Settings
    ├── Chatbot Settings
    ├── Notification Preferences
    └── Language (Arabic/English)
```

### 4.2 State Management
```
TanStack Query (React Query) v5
├── Same queryKey conventions as web app
├── Shared cache invalidation patterns
├── Offline query caching with AsyncStorage persistence
└── Background refetch on app focus
```

---

## 5. Role-Based Mobile Dashboards

### 5.1 Sales Agent Dashboard (سيلز)
**This is the most critical screen — 80% of users are agents.**

```
┌─────────────────────────────┐
│  صباح الخير، أحمد 👋         │
│  الجمعة 11 أبريل 2026        │
├─────────────────────────────┤
│                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  12  │ │  3   │ │  2   │ │
│  │ ليد  │ │متابعة│ │ جدد  │ │
│  │الكل  │ │اليوم │ │اليوم │ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  🔥 عاجل — متابعات اليوم    │
│  ┌─────────────────────────┐ │
│  │ 📞 محمد علي    Following │ │
│  │    آخر تواصل: أمس 3:00م │ │
│  │    [اتصال] [واتساب]     │ │
│  ├─────────────────────────┤ │
│  │ 📞 سارة أحمد   Meeting  │ │
│  │    معاينة غداً 10:00ص   │ │
│  │    [اتصال] [واتساب]     │ │
│  └─────────────────────────┘ │
│                              │
│  📥 ليدات جديدة (Fresh)     │
│  ┌─────────────────────────┐ │
│  │ ⚡ عمر خالد   Fresh Lead │ │
│  │   الميزانية: 2-3 مليون  │ │
│  │   المصدر: Facebook      │ │
│  │   [تواصل الآن]          │ │
│  └─────────────────────────┘ │
│                              │
│  📊 أدائي هذا الشهر         │
│  ┌─────────────────────────┐ │
│  │ مكالمات: 45/60          │ │
│  │ ██████████░░░░  75%     │ │
│  │ صفقات: 2/5              │ │
│  │ ████░░░░░░░░░░  40%     │ │
│  └─────────────────────────┘ │
│                              │
│  🏆 ترتيبي: #3 من 12 سيلز  │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
│الرئيسية│ليدات│ سريع │رسائل│المزيد│
└──────┴──────┴──────┴────┴───┘
```

**Key Features:**
- Today's follow-ups sorted by urgency (overdue first, then due today)
- One-tap call or WhatsApp for each lead
- New/Fresh leads prominently displayed with quick action buttons
- Monthly target progress bars
- Leaderboard rank to motivate competition
- Pull-to-refresh for real-time updates
- Badge count on Messages tab for unread WhatsApp

**Data Sources:**
- `GET /api/leads` (filtered to assigned leads)
- `GET /api/reminders/user/:userId` (today's follow-ups)
- `GET /api/monthly-targets-with-achievement`
- `GET /api/leaderboard`
- `GET /api/notifications/unread-count`

---

### 5.2 Team Leader Dashboard (تيم ليدر)
**Focus: Team performance monitoring + own leads**

```
┌─────────────────────────────┐
│  مرحباً، خالد — تيم ليدر    │
│  فريق: المعادي               │
├─────────────────────────────┤
│                              │
│  👥 أداء الفريق اليوم       │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  8   │ │  23  │ │  5   │ │
│  │أعضاء │ │مكالمة│ │ صفقة │ │
│  │نشط   │ │ اليوم│ │الشهر │ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  ⚠️ تنبيهات الفريق          │
│  ┌─────────────────────────┐ │
│  │ 🔴 أحمد: 3 ليدات بدون   │ │
│  │    تواصل منذ 3 أيام     │ │
│  │ 🟡 سارة: 2 ليدات جديدة  │ │
│  │    لم يتم الرد عليها    │ │
│  │ 🟢 محمد: أعلى مكالمات   │ │
│  └─────────────────────────┘ │
│                              │
│  📊 توزيع الليدات بالفريق   │
│  أحمد  ████████  24         │
│  سارة  ██████    18         │
│  محمد  █████████ 27         │
│  نور   ████      12         │
│                              │
│  🔥 متابعاتي الشخصية        │
│  ┌─────────────────────────┐ │
│  │ (same as agent section) │ │
│  └─────────────────────────┘ │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Key Features:**
- Team members' activity summary (calls today, messages, deals this month)
- Alert cards for stale leads in the team (leads not contacted for X days)
- Lead distribution across team members with visual bars
- Ability to view any team member's leads
- Personal follow-ups section (same as agent)
- Cannot transfer leads (no `canTransferLeads` permission)

**Data Sources:**
- `GET /api/dashboard/team-activity`
- `GET /api/analytics/stale-leads`
- `GET /api/leads` (filtered to team members)
- `GET /api/leaderboard`

---

### 5.3 Sales Manager Dashboard (سيلز مانجر)
**Focus: Performance metrics, pipeline health, team oversight**

```
┌─────────────────────────────┐
│  سيلز مانجر — لوحة التحكم   │
├─────────────────────────────┤
│                              │
│  📈 ملخص الأداء              │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 156  │ │  12  │ │ 7.7% │ │
│  │ليد   │ │صفقة  │ │نسبة  │ │
│  │نشط   │ │الشهر │ │التحويل│ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  🏗️ صحة الـ Funnel          │
│  Untouched ████████░  45    │
│  Active    ████████████ 78  │
│  Won       ███           12 │
│  Lost      ██            8  │
│                              │
│  ⏱️ متوسط الوقت بالمراحل    │
│  Fresh→Following:  1.2 يوم  │
│  Following→Meeting: 4.5 يوم │
│  Meeting→Reserve:   2.1 يوم │
│  Reserve→Done Deal: 7.3 يوم │
│                              │
│  🏆 ترتيب السيلز            │
│  1. محمد علي    — 5 صفقات   │
│  2. سارة أحمد   — 4 صفقات   │
│  3. أحمد خالد   — 3 صفقات   │
│                              │
│  ⚠️ ليدات متعثرة: 14        │
│  [عرض التفاصيل →]           │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Key Features:**
- Funnel health overview with zone-colored bars
- Time-in-stage metrics to identify bottlenecks
- Leaderboard with deal counts
- Stale leads count with drill-down
- Can transfer leads between agents
- Can manage campaigns
- All reports accessible

**Data Sources:**
- `GET /api/analytics/funnel-overview`
- `GET /api/analytics/time-in-stage`
- `GET /api/analytics/stale-leads`
- `GET /api/analytics/agent-funnel`
- `GET /api/analytics/lead-flow`
- `GET /api/leaderboard`
- `GET /api/reports/response-time`

---

### 5.4 Sales Admin Dashboard (سيلز أدمن)
**Focus: Operations, lead assignment, team management**

```
┌─────────────────────────────┐
│  سيلز أدمن — العمليات        │
├─────────────────────────────┤
│                              │
│  📥 ليدات تحتاج توزيع       │
│  ┌─────────────────────────┐ │
│  │ 🔴 7 ليدات غير موزعة    │ │
│  │ [توزيع تلقائي] [يدوي]   │ │
│  └─────────────────────────┘ │
│                              │
│  📊 ملخص سريع               │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  7   │ │  34  │ │  5   │ │
│  │غير   │ │ جدد  │ │تحويل │ │
│  │موزع  │ │اليوم │ │اليوم │ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  👥 حالة الفرق              │
│  ┌─────────────────────────┐ │
│  │ فريق المعادي  — 24 ليد  │ │
│  │ فريق مدينتي  — 31 ليد  │ │
│  │ فريق الساحل  — 18 ليد  │ │
│  └─────────────────────────┘ │
│                              │
│  📋 آخر الإجراءات           │
│  ┌─────────────────────────┐ │
│  │ أحمد حرك ليد → Meeting  │ │
│  │ سارة أضافت ملاحظة       │ │
│  │ محمد أكمل مكالمة        │ │
│  └─────────────────────────┘ │
│                              │
│  🔔 إشعارات: 5 جديدة       │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Key Features:**
- Unassigned leads counter with auto-assign and manual assign buttons
- Team workload overview
- Recent actions feed (global activity log)
- Can manage users, teams, and settings
- Full lead transfer capabilities with privacy control
- Campaign management access

**Data Sources:**
- `GET /api/leads` (filter unassigned)
- `GET /api/dashboard/team-activity`
- `GET /api/history` (recent actions)
- `GET /api/teams`
- `GET /api/notifications`

---

### 5.5 Admin Dashboard (مدير)
**Focus: System administration + everything Sales Admin has**

```
┌─────────────────────────────┐
│  مدير النظام — لوحة التحكم   │
├─────────────────────────────┤
│                              │
│  🏢 نظرة عامة على النظام    │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  10  │ │ 143  │ │  3   │ │
│  │مستخدم│ │ ليد  │ │ فريق │ │
│  │نشط   │ │ كل   │ │      │ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  📈 ملخص الشهر               │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  45  │ │  12  │ │26.7% │ │
│  │ ليد  │ │صفقة  │ │تحويل │ │
│  │ جديد │ │مغلقة │ │      │ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  🏗️ Funnel Health           │
│  (same as Manager view)     │
│                              │
│  ⚙️ إدارة سريعة             │
│  ┌────────────┬────────────┐ │
│  │ 👤 المستخدمين│ 🏷️ المراحل│ │
│  ├────────────┼────────────┤ │
│  │ 👥 الفرق   │ 🔐 الصلاحيات│ │
│  ├────────────┼────────────┤ │
│  │ 🏗️ المشاريع│ 📊 التقارير│ │
│  └────────────┴────────────┘ │
│                              │
│  📋 آخر الإجراءات           │
│  (global activity feed)     │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Key Features:**
- Everything from Sales Admin + Sales Manager
- Quick access grid to all admin functions
- System overview stats
- Can delete data (only role with this besides super_admin)
- Full settings management
- User creation and role assignment

---

### 5.6 Company Owner Dashboard (صاحب الشركة)
**Focus: High-level KPIs and executive reporting — read-mostly**

```
┌─────────────────────────────┐
│  صاحب الشركة — التقرير التنفيذي│
├─────────────────────────────┤
│                              │
│  💰 الإيرادات هذا الشهر      │
│  ┌─────────────────────────┐ │
│  │     2,450,000 ج.م.      │ │
│  │     ▲ 15% عن الشهر السابق│ │
│  └─────────────────────────┘ │
│                              │
│  📊 مؤشرات الأداء            │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  12  │ │  45  │ │ 156  │ │
│  │صفقة  │ │ ليد  │ │ ليد  │ │
│  │مغلقة │ │ جديد │ │ نشط  │ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  📈 اتجاه المبيعات (3 أشهر) │
│  ┌─────────────────────────┐ │
│  │    ╱╲                    │ │
│  │   ╱  ╲  ╱╲              │ │
│  │  ╱    ╲╱  ╲             │ │
│  │ فبراير  مارس  أبريل     │ │
│  └─────────────────────────┘ │
│                              │
│  🏆 أفضل السيلز             │
│  1. محمد — 5 صفقات          │
│  2. سارة — 4 صفقات          │
│                              │
│  📊 ROI بالمصدر              │
│  Facebook: 45 ليد → 5 صفقات │
│  WhatsApp: 30 ليد → 4 صفقات │
│  Referral: 12 ليد → 3 صفقات │
│                              │
│  🏗️ Funnel Overview         │
│  (simplified funnel chart)  │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Key Features:**
- Revenue/commission summary
- Sales trend charts (monthly comparison)
- Top performers leaderboard
- Marketing ROI by lead source
- Funnel overview (simplified)
- Read-only access to all leads
- Cannot manage users or settings (not their role)

**Data Sources:**
- `GET /api/commissions`
- `GET /api/reports/marketing`
- `GET /api/analytics/funnel-overview`
- `GET /api/analytics/lead-flow`
- `GET /api/leaderboard`

---

### 5.7 Super Admin Dashboard (مدير النظام)
**Same as Admin Dashboard + Permissions management + ability to override anything.**
- Only role that can access `/api/role-permissions` and `/api/custom-roles`
- Can delete teams
- Can reset any user's password
- Has a "System Health" card showing active users, DB stats, WhatsApp connection status

---

## 6. Core Mobile Screens (Detailed)

### 6.1 Login Screen
```
┌─────────────────────────────┐
│                              │
│       🏠 HomeAdvisor CRM     │
│                              │
│  ┌─────────────────────────┐ │
│  │ اسم المستخدم             │ │
│  │ [                      ] │ │
│  └─────────────────────────┘ │
│  ┌─────────────────────────┐ │
│  │ كلمة المرور              │ │
│  │ [                    👁️] │ │
│  └─────────────────────────┘ │
│                              │
│  ┌─────────────────────────┐ │
│  │      [تسجيل الدخول]      │ │
│  └─────────────────────────┘ │
│                              │
│  🌐 العربية | English       │
│                              │
└─────────────────────────────┘
```

**Behavior:**
- `POST /api/login` with username + password
- Store session cookie in secure storage
- On success, fetch `GET /api/user` to get role and permissions
- Remember last username (not password)
- Language toggle persists to AsyncStorage
- Biometric login (Face ID / Fingerprint) after first successful login

---

### 6.2 Leads List Screen
```
┌─────────────────────────────┐
│  الليدات        🔍  🔽 فلتر │
├─────────────────────────────┤
│  [الكل] [جدد] [متابعة] [اجتماع]│
│                              │
│  ┌─────────────────────────┐ │
│  │ 🟢 محمد علي      ★ 85  │ │
│  │    Following | 2M-3M    │ │
│  │    📞 آخر مكالمة: أمس   │ │
│  │    [📞] [💬] [⋯]        │ │
│  ├─────────────────────────┤ │
│  │ 🟡 سارة أحمد     ★ 62  │ │
│  │    Meeting | 1.5M-2M    │ │
│  │    📅 معاينة غداً       │ │
│  │    [📞] [💬] [⋯]        │ │
│  ├─────────────────────────┤ │
│  │ 🔴 عمر خالد      ★ 30  │ │
│  │    Fresh Lead | 3M-5M   │ │
│  │    ⚡ جديد — لم يُتصل    │ │
│  │    [📞] [💬] [⋯]        │ │
│  └─────────────────────────┘ │
│                              │
│  عرض 25 من 143 ليد          │
│  [تحميل المزيد]              │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Features:**
- Horizontal scroll filter chips for pipeline states (colored by zone)
- Search by name, phone, email
- Score displayed as colored star (green > 70, yellow 40-70, red < 40)
- Quick action buttons: tap phone icon → native dialer, tap WhatsApp icon → WhatsApp deeplink or in-app chat
- Pull-to-refresh
- Infinite scroll pagination
- Swipe actions: swipe right → call, swipe left → change state
- Filter drawer: by state, source, date range, score range, assigned agent (if admin)
- Sort: by score, date, name, last activity

**Data Source:** `GET /api/leads?page=1&limit=25&stateId=X&search=Y`

---

### 6.3 Lead Detail Screen
```
┌─────────────────────────────┐
│  ← محمد علي                  │
├─────────────────────────────┤
│                              │
│  ┌─────────────────────────┐ │
│  │ 📞 01012345678          │ │
│  │ ✉️ mohamed@email.com     │ │
│  │ 📊 Score: 85 ★★★★       │ │
│  │ 🏷️ Following (Active)   │ │
│  │ 👤 مسؤول: أحمد خالد     │ │
│  │ 📅 دخل: 5 أبريل 2026   │ │
│  │ 💰 الميزانية: 2-3 مليون │ │
│  │ 📍 المصدر: Facebook     │ │
│  └─────────────────────────┘ │
│                              │
│  ┌────┐┌────┐┌────┐┌────┐   │
│  │ 📞 ││ 💬 ││ 📝 ││ 📋 │   │
│  │اتصل││واتس││ملاحظة││مهمة│  │
│  └────┘└────┘└────┘└────┘   │
│                              │
│  [المعلومات] [السيرة] [المهام] [المشاريع]│
│                              │
│  ── السيرة الذاتية ──        │
│  📥 11 أبريل — دخل السيستم  │
│  👤 11 أبريل — وُزع على أحمد │
│  🔄 11 أبريل — Fresh → Following│
│  📞 11 أبريل — مكالمة (مهتم) │
│  💬 12 أبريل — واتساب (رد)   │
│                              │
│  ── تغيير المرحلة ──         │
│  [Following ▾]               │
│  → Meeting | Follow Up |     │
│    No Answer | Reserve       │
│  (only valid transitions shown)│
│                              │
└─────────────────────────────┘
```

**Features:**
- Header card with all lead info
- 4 quick action buttons: Call (native dialer), WhatsApp (in-app or deeplink), Add Note, Add Task
- Tab navigation: Info, Timeline (Lead Passport), Tasks, Projects (Unit Interests)
- **Lead Passport Timeline**: Full CV showing every interaction chronologically with colored icons per type
- State change dropdown showing ONLY valid transitions based on funnel zone rules
- Admin sees: Transfer button with privacy control dialog
- Unit interests: browse inventory and link projects to lead
- Call logging: after native call ends, prompt to log outcome (answered, no answer, busy, etc.)
- Note/communication quick-add modal

**Data Sources:**
- `GET /api/leads/:id`
- `GET /api/leads/:leadId/history`
- `GET /api/leads/:leadId/tasks`
- `GET /api/leads/:leadId/communications`
- `GET /api/leads/:leadId/call-logs`
- `GET /api/leads/:leadId/whatsapp-conversation`

---

### 6.4 WhatsApp Inbox Screen
```
┌─────────────────────────────┐
│  💬 رسائل واتساب    🔍      │
├─────────────────────────────┤
│                              │
│  ┌─────────────────────────┐ │
│  │ 🟢 محمد علي      2:30م │ │
│  │    أنا مهتم بالمشروع...  │ │
│  │    🤖 الرد التلقائي نشط │ │
│  ├─────────────────────────┤ │
│  │ 🔵 سارة أحمد     1:15م │ │
│  │    ممكن تبعتلي التفاصيل │ │
│  │    ✅ تم الرد            │ │
│  ├─────────────────────────┤ │
│  │ 🟡 عمر خالد     أمس     │ │
│  │    شكراً                 │ │
│  │    ⏳ في انتظار الرد     │ │
│  └─────────────────────────┘ │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Tap on conversation → Chat Screen:**
```
┌─────────────────────────────┐
│  ← محمد علي  [👤 عرض الليد] │
├─────────────────────────────┤
│                              │
│       ┌──────────────┐       │
│       │ أنا مهتم      │       │
│       │ بمشروع سيراس  │       │
│       └──────────────┘       │
│                  2:30م       │
│                              │
│  ┌──────────────┐            │
│  │ أهلاً محمد!   │            │
│  │ سيراس متاح   │            │
│  │ بأسعار تبدأ  │            │
│  │ من 2.5 مليون │            │
│  └──────────────┘            │
│  2:31م  🤖 رد تلقائي        │
│                              │
│  ┌─────────────────────────┐ │
│  │ 🤖 اقتراحات AI:         │ │
│  │ [أرسل الكتالوج]         │ │
│  │ [حدد موعد معاينة]       │ │
│  │ [اسأل عن الميزانية]     │ │
│  └─────────────────────────┘ │
│                              │
│  [🤖 إيقاف البوت] أو        │
│  [✋ أنا هتولى الرد]         │
│                              │
│  ┌─────────────────────┐ 📎  │
│  │ اكتب رسالة...       │ ➤  │
│  └─────────────────────┘     │
└─────────────────────────────┘
```

**Features:**
- Conversation list sorted by last message time
- Status indicators: bot active (green), replied (blue), waiting (yellow)
- Full chat view with message bubbles
- AI-suggested replies (tap to send or edit)
- Bot takeover button to manually respond
- Send text, images, documents
- Link to lead detail from chat header
- Unread badge count on tab

**Data Sources:**
- `GET /api/leads` (with WhatsApp message status)
- `GET /api/leads/:leadId/whatsapp-conversation`
- `POST /api/whatsapp/send`
- `POST /api/leads/:leadId/ai/suggest-replies`
- `POST /api/leads/:leadId/bot/takeover`

---

### 6.5 Kanban Board (Mobile-Optimized)
```
┌─────────────────────────────┐
│  📋 Kanban         🔽 فلتر  │
├─────────────────────────────┤
│                              │
│  ← [Fresh(3)] [Following(5)] [Meeting(2)] →│
│                              │
│  ── Following (Active) ──    │
│  ┌─────────────────────────┐ │
│  │ محمد علي         ★ 85  │ │
│  │ 01012345678              │ │
│  │ 📅 آخر تواصل: أمس      │ │
│  │ [📞] [💬] [→ تغيير]     │ │
│  ├─────────────────────────┤ │
│  │ أحمد محمود       ★ 72  │ │
│  │ 01098765432              │ │
│  │ 📅 آخر تواصل: 3 أيام   │ │
│  │ [📞] [💬] [→ تغيير]     │ │
│  └─────────────────────────┘ │
│                              │
│  + 3 ليدات أخرى             │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Mobile Adaptation:**
- Horizontal swipeable columns (one column visible at a time)
- Column header shows state name + count + zone color
- Each lead card has quick action buttons
- "Change State" button opens bottom sheet with valid transitions only
- Long-press on card → drag to reorder within column (optional)
- No drag-and-drop between columns (not mobile-friendly) — use state change button instead
- Column indicators at top show all states with dot navigation

---

### 6.6 Quick Action Screen (Center Tab)
```
┌─────────────────────────────┐
│                              │
│     ┌────────────────────┐   │
│     │  ➕ إضافة ليد جديد  │   │
│     └────────────────────┘   │
│     ┌────────────────────┐   │
│     │  📞 تسجيل مكالمة   │   │
│     └────────────────────┘   │
│     ┌────────────────────┐   │
│     │  📝 إضافة ملاحظة   │   │
│     └────────────────────┘   │
│     ┌────────────────────┐   │
│     │  ⏰ إنشاء تذكير    │   │
│     └────────────────────┘   │
│     ┌────────────────────┐   │
│     │  📷 مسح بطاقة عمل  │   │ (Future: OCR business card scan)
│     └────────────────────┘   │
│                              │
└─────────────────────────────┘
```

**Features:**
- FAB-style center tab opens quick action sheet
- Add Lead: simplified form (name, phone, source, notes)
- Log Call: select lead from recent → log outcome
- Add Note: select lead → add note
- Create Reminder: select lead → set date/time
- Future: Business card scanner with OCR

---

### 6.7 Inventory Browser (Admin/Sales Admin)
```
┌─────────────────────────────┐
│  🏗️ المشاريع       🔍 بحث  │
├─────────────────────────────┤
│  [الكل] [القاهرة] [الساحل] [6أكتوبر]│
│                              │
│  ┌─────────────────────────┐ │
│  │ 🖼️ [Project Image]      │ │
│  │ Mountain View iCity      │ │
│  │ المطور: DMG              │ │
│  │ 📍 أكتوبر الجديدة       │ │
│  │ 💰 2.5M - 8.5M          │ │
│  │ 🏠 45 وحدة متاحة       │ │
│  ├─────────────────────────┤ │
│  │ 🖼️ [Project Image]      │ │
│  │ Badya Palm Hills         │ │
│  │ المطور: Palm Hills       │ │
│  │ 📍 6 أكتوبر             │ │
│  │ 💰 3.2M - 12M           │ │
│  │ 🏠 120 وحدة متاحة      │ │
│  └─────────────────────────┘ │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Tap on project → Units List:**
```
┌─────────────────────────────┐
│  ← Mountain View iCity       │
├─────────────────────────────┤
│  [فيلا] [تاون هاوس] [شقة] [دوبلكس]│
│                              │
│  ┌─────────────────────────┐ │
│  │ فيلا مستقلة A-12        │ │
│  │ 4 غرف | 320 م²         │ │
│  │ 💰 8,500,000 ج.م.       │ │
│  │ 🟢 متاح                 │ │
│  │ [ربط بليد] [مشاركة]     │ │
│  ├─────────────────────────┤ │
│  │ تاون هاوس B-7           │ │
│  │ 3 غرف | 220 م²         │ │
│  │ 💰 5,200,000 ج.م.       │ │
│  │ 🟢 متاح                 │ │
│  │ [ربط بليد] [مشاركة]     │ │
│  └─────────────────────────┘ │
│                              │
└─────────────────────────────┘
```

**Features:**
- Project cards with images, developer name, location, price range
- Filter by location/area (horizontal chips)
- Unit type filter tabs
- "Link to Lead" button: opens lead picker to create interest
- "Share" button: generate formatted WhatsApp message with unit details to send to lead
- Unit comparison: select 2-3 units to compare side-by-side (optional feature)

---

### 6.8 Reports Screen (Manager+)
```
┌─────────────────────────────┐
│  📊 التقارير                 │
├─────────────────────────────┤
│                              │
│  [Funnel] [نشاط] [استجابة] [ROI] [تحويلات]│
│                              │
│  ── Funnel Health ──         │
│  ┌─────────────────────────┐ │
│  │ Untouched  ████░  45    │ │
│  │ Active     ████████ 78  │ │
│  │ Won        ██       12  │ │
│  │ Lost       █         8  │ │
│  └─────────────────────────┘ │
│                              │
│  ── تدفق الليدات ──          │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  5   │ │  34  │ │ 120  │ │
│  │اليوم │ │الأسبوع│ │الشهر │ │
│  └──────┘ └──────┘ └──────┘ │
│                              │
│  ── وقت كل مرحلة ──          │
│  Fresh→Following:  1.2 يوم  │
│  Following→Meeting: 4.5 يوم │
│  Meeting→Reserve:   2.1 يوم │
│                              │
│  ── ليدات متعثرة: 14 ──      │
│  [عرض الكل →]                │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Tabs:**
1. **Funnel Health**: Zone bars, conversion rates, time-in-stage
2. **Sales Activity**: Calls, messages, meetings per agent
3. **Response Time**: Average first response time per agent
4. **Marketing ROI**: Lead source → conversion tracking
5. **Reassignment Report**: Transfer history audit

---

### 6.9 My Day Screen
```
┌─────────────────────────────┐
│  📅 يومي                     │
├─────────────────────────────┤
│                              │
│  🔴 متأخر (3)               │
│  ┌─────────────────────────┐ │
│  │ 📞 اتصل بـ محمد         │ │
│  │    كان المفروض أمس      │ │
│  │    [اتصل الآن]          │ │
│  └─────────────────────────┘ │
│                              │
│  🟡 اليوم (5)               │
│  ┌─────────────────────────┐ │
│  │ 📅 معاينة مع سارة 10ص   │ │
│  │    Mountain View iCity   │ │
│  │    [📞] [📍 خريطة]      │ │
│  ├─────────────────────────┤ │
│  │ 📞 متابعة عمر 2م        │ │
│  │    Following | Budget 3M │ │
│  │    [اتصل] [واتساب]      │ │
│  └─────────────────────────┘ │
│                              │
│  ✅ مكتمل اليوم (2)          │
│  ┌─────────────────────────┐ │
│  │ ✅ اتصل بـ خالد — مهتم   │ │
│  │ ✅ ملاحظة أضيفت لـ نور   │ │
│  └─────────────────────────┘ │
│                              │
├──────┬──────┬──────┬────┬───┤
│ 🏠   │ 👥   │  ➕  │ 💬 │ ⋯ │
└──────┴──────┴──────┴────┴───┘
```

**Features:**
- Overdue reminders highlighted in red at top
- Today's reminders and tasks sorted by time
- Completed items shown at bottom
- One-tap call/WhatsApp from each item
- Mark complete directly from the list

---

### 6.10 Notifications Screen
```
┌─────────────────────────────┐
│  🔔 الإشعارات               │
├─────────────────────────────┤
│                              │
│  اليوم                       │
│  ┌─────────────────────────┐ │
│  │ 🆕 ليد جديد: عمر خالد   │ │
│  │    تم توزيعه عليك       │ │
│  │    منذ 5 دقائق          │ │
│  ├─────────────────────────┤ │
│  │ 💬 رسالة واتساب جديدة   │ │
│  │    محمد علي: أنا مهتم   │ │
│  │    منذ 15 دقيقة         │ │
│  ├─────────────────────────┤ │
│  │ ⏰ تذكير: اتصل بـ سارة  │ │
│  │    الموعد: 2:00 مساءً    │ │
│  │    منذ ساعة              │ │
│  └─────────────────────────┘ │
│                              │
│  أمس                         │
│  ┌─────────────────────────┐ │
│  │ 🔄 تم تحويل ليد إليك   │ │
│  │ 📊 تقرير أسبوعي جاهز   │ │
│  └─────────────────────────┘ │
│                              │
└─────────────────────────────┘
```

---

### 6.11 Settings & More Screen
```
┌─────────────────────────────┐
│  ⚙️ المزيد                   │
├─────────────────────────────┤
│                              │
│  👤 أحمد خالد               │
│     سيلز | فريق المعادي     │
│     [تعديل الملف الشخصي]    │
│                              │
│  ─── إعدادات عامة ───        │
│  🌐 اللغة: العربية ← →      │
│  🔔 الإشعارات               │
│  🌙 الوضع الليلي            │
│                              │
│  ─── إعدارة (Admin only) ─── │
│  👥 إدارة المستخدمين        │
│  🏢 إدارة الفرق             │
│  🏷️ إدارة المراحل           │
│  🔐 الصلاحيات               │
│  💬 إعدادات واتساب           │
│  🤖 إعدادات البوت           │
│  📧 تقارير البريد            │
│                              │
│  ─── حسابي ───               │
│  📱 عن التطبيق              │
│  🚪 تسجيل الخروج            │
│                              │
└─────────────────────────────┘
```

**Features:**
- Profile section with role and team
- Language switch (Arabic/English) — same i18n system as web
- Dark/Light mode toggle
- Admin sections shown/hidden based on role permissions
- Push notification preferences
- Logout

---

## 7. Mobile-Specific Features

### 7.1 Push Notifications
The web app already has an in-app notification system (`notifications` table). For mobile:

**Events that trigger push:**
| Event | Recipients | Priority |
|:---|:---|:---|
| New lead assigned | Assigned agent | HIGH |
| New WhatsApp message | Assigned agent | HIGH |
| Reminder due | Reminder creator | HIGH |
| Lead transferred to you | New agent | MEDIUM |
| Task assigned | Assignee | MEDIUM |
| Stale lead alert | Assigned agent + TL | LOW |
| Daily performance summary | All agents | LOW (scheduled) |

**Implementation:**
- Add `pushToken` column to `users` table
- New endpoint: `POST /api/users/:id/push-token` (register device token)
- New endpoint: `DELETE /api/users/:id/push-token` (unregister on logout)
- Backend sends push via Expo Push Notification service
- Tapping notification deep-links to relevant screen (lead detail, chat, etc.)

### 7.2 Click-to-Call with Auto-Log
1. User taps call button on lead card
2. App opens native phone dialer with lead's number
3. When user returns to app, prompt appears:
   ```
   ┌─────────────────────────┐
   │ نتيجة المكالمة مع محمد  │
   │                         │
   │ [📞 رد]   [❌ لم يرد]    │
   │ [📵 مشغول] [🚫 خارج]    │
   │                         │
   │ ملاحظات: [           ]  │
   │ متابعة بعد: [تاريخ  ]   │
   │                         │
   │ [حفظ]                    │
   └─────────────────────────┘
   ```
4. Saves to `call_logs` and `communications`
5. Optionally creates a reminder for follow-up

### 7.3 WhatsApp Deep Integration
- Tap WhatsApp icon on lead → opens WhatsApp with pre-filled message
- URI: `whatsapp://send?phone=20XXXXXXXXXX&text=...`
- For in-app chat: uses existing `POST /api/whatsapp/send` API
- Share unit details: generates formatted message with project info, unit specs, price

### 7.4 Biometric Authentication
- After first successful login, offer to enable Face ID / Fingerprint
- Store encrypted session in Keychain (iOS) / Keystore (Android)
- On app open: biometric prompt → restore session → verify with `GET /api/user`
- Fallback to username/password if biometric fails

### 7.5 Offline Mode (Phase 2)
- Cache recent leads list, my reminders, and my tasks in AsyncStorage
- Show cached data with "offline" banner when no connectivity
- Queue actions (notes, call logs, state changes) and sync when online
- Conflict resolution: server timestamp wins

### 7.6 Location Features (Phase 2)
- Map view of properties (projects have location data)
- Directions to site visits
- Check-in at property showings

---

## 8. Bilingual Support (Arabic/English)

The web app already has a full i18n system (`client/src/lib/i18n.tsx`) with Arabic and English translations. The mobile app must:

1. **Reuse the same translation keys** from the web app's i18n system
2. **RTL Layout**: Full right-to-left support for Arabic
3. **Language Persistence**: Store preference in AsyncStorage, sync with user profile
4. **Default**: Arabic (primary market is Egypt)
5. **Number Formatting**: Egyptian locale for currency (ج.م.) and dates
6. **Unit Types**: Use `getUnitTypeDisplay(unit, language)` helper for proper Arabic/English unit type names

---

## 9. Design Guidelines

### 9.1 Theme
- Match web app's existing theme (defined in `index.css`)
- Primary color: from web app's `--primary` CSS variable
- Zone colors: Gray (Untouched), Blue (Active), Green (Won), Red (Lost)
- Dark mode support using same color variables

### 9.2 Mobile-First Patterns
- Bottom navigation (5 tabs) — never top tabs for main nav
- Bottom sheets for modals and action menus (not centered dialogs)
- Pull-to-refresh on all list screens
- Skeleton loading states (not spinners)
- Haptic feedback on important actions
- Large touch targets (minimum 44px)
- Swipe gestures for common actions

### 9.3 Typography
- Arabic: system default (SF Arabic on iOS, Noto Kufi on Android)
- English: system default
- Numbers: always LTR even in RTL layout

---

## 10. Security Requirements

### 10.1 Authentication
- Session-based auth (same as web — passport-local)
- Session cookie stored in secure storage (Keychain/Keystore)
- Auto-logout after 30 days of inactivity
- Biometric lock for sensitive data (commissions, reports)

### 10.2 Data Access
- All permission checks happen server-side (existing middleware)
- Mobile app respects same `canViewAllLeads`, `canTransferLeads`, etc. permissions
- History privacy filter applies (leads with `historyVisibleToAssigned = false`)
- No local data storage of sensitive info beyond session

### 10.3 Network
- HTTPS only (Replit provides TLS)
- Certificate pinning (recommended for production)
- Request timeout: 30 seconds
- Retry with exponential backoff on network failures

---

## 11. Performance Requirements

| Metric | Target |
|:---|:---|
| App cold start | < 2 seconds |
| Login flow | < 3 seconds |
| Lead list load | < 1.5 seconds |
| Lead detail load | < 1 second |
| WhatsApp conversation load | < 1.5 seconds |
| Push notification delivery | < 5 seconds |
| State change (API call) | < 1 second |

---

## 12. Implementation Phases

### Phase 1: Core (MVP)
1. Login / Auth
2. Role-based Dashboard (all 7 roles)
3. Leads List with search/filter
4. Lead Detail with all tabs (Info, Lead Passport, Tasks, Communications)
5. State change with transition rules
6. Quick actions: Add Lead, Log Call, Add Note
7. WhatsApp Inbox (read conversations)
8. My Day (reminders and follow-ups)
9. Notifications
10. Bilingual support (Arabic/English)

### Phase 2: Full Feature Parity
1. WhatsApp send messages (in-app)
2. Kanban board (mobile-optimized)
3. Inventory browser with unit linking
4. Reports & Funnel Health dashboard
5. Leaderboard
6. Commissions
7. Push notifications
8. Click-to-call with auto-log
9. Lead import from contacts

### Phase 3: Mobile-Exclusive Features
1. Biometric authentication
2. Offline mode with sync
3. Business card scanner (OCR)
4. Location-based features (map, directions, check-in)
5. Voice notes for lead comments
6. Shake to report a bug

### Phase 4: Admin Mobile
1. User management
2. Team management
3. Pipeline state management
4. WhatsApp settings
5. Chatbot settings
6. Permission management
7. Campaign management

---

## 13. API Additions Needed for Mobile

The web backend is almost complete for mobile. Only these small additions are needed:

| Endpoint | Purpose |
|:---|:---|
| `POST /api/users/:id/push-token` | Register push notification device token |
| `DELETE /api/users/:id/push-token` | Unregister push token on logout |
| `GET /api/leads/summary` | Lightweight lead counts by state for dashboard cards |
| `GET /api/my-day` | Consolidated endpoint: today's reminders + overdue + tasks |
| `PATCH /api/users/:id/preferences` | Language, dark mode, notification preferences |

These are simple additions (< 50 lines of backend code each).

---

## 14. Testing Strategy

- **Unit Tests**: React Native Testing Library for components
- **Integration Tests**: API endpoint testing with test user accounts
- **E2E Tests**: Detox (iOS) or Maestro (cross-platform)
- **Manual Testing**: Each role × each screen × Arabic + English
- **Performance**: Lighthouse-equivalent for RN (Flashlight)

---

## 15. Deployment

- **Build**: Expo EAS Build for iOS and Android
- **Distribution**: 
  - Internal testing: Expo Dev Client or TestFlight/Internal Track
  - Production: App Store + Google Play
- **Updates**: Expo OTA (Over-the-Air) for JS bundle updates without store review
- **Backend**: Same deployed Replit app — no separate backend needed

---

## 16. Appendix: Screen Count Summary

| Category | Screens | Priority |
|:---|:---|:---|
| Auth | 1 | P0 |
| Dashboards (7 roles) | 7 | P0 |
| Leads (list, detail, add, filter) | 5 | P0 |
| WhatsApp (inbox, chat) | 2 | P0 |
| My Day | 1 | P0 |
| Notifications | 1 | P0 |
| Quick Actions | 1 | P0 |
| Kanban | 1 | P1 |
| Inventory (developers, projects, units) | 3 | P1 |
| Reports (5 tabs) | 1 | P1 |
| Leaderboard | 1 | P1 |
| Commissions | 1 | P1 |
| Settings (profile, prefs, admin screens) | 8 | P2 |
| **Total** | **~33 screens** | |

---

*End of PRD v1.0 — HomeAdvisor CRM Mobile Application*
