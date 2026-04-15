# SalesBot AI — Real Estate CRM with WhatsApp AI Bot

## Overview

SalesBot AI is a real estate CRM platform with an integrated AI-powered WhatsApp chatbot. The system manages leads, tracks WhatsApp conversations, auto-creates leads from incoming messages, and uses AI to qualify prospects through configurable conversation stages (greeting → name → needs → recommend → qualified → handoff).

Built as a full-stack TypeScript application with React frontend and Express backend, using PostgreSQL for data persistence and Baileys (WhatsApp Web) for messaging.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **Internationalization (i18n)**: Custom LanguageProvider with Arabic/English support
  - Language file: `client/src/lib/i18n.tsx`
  - Default language: Arabic (ar)
  - RTL layout for Arabic, LTR for English

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (tsx for development)
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **WhatsApp**: Baileys library (QR-based connection, not Cloud API)
- **AI Engine**: OpenRouter (default, Gemini models) or OpenAI — configurable via Integrations page with DB-persisted settings (integration_settings table: ai_provider, openrouter_api_key, openrouter_model)

### Data Model (shared/schema.ts)
- **leads** — CRM leads with bot tracking fields (botActive, botStage)
- **whatsapp_messages_log** — All WhatsApp messages (inbound/outbound)
- **chatbot_settings** — Per-user bot config (personality, mission, working hours, enabled projects)
- **knowledge_base_items** — Products, services, FAQs for AI chatbot context
- **projects** / **units** — Real estate inventory the bot recommends
- **lead_states** — Pipeline stages for leads
- **reminders** / **notifications** — CRM action items
- **whatsapp_templates** — Reusable message templates
- **whatsapp_campaigns** — Bulk messaging campaigns
- **subscription_plans** — Plan catalog (Free/Professional/Enterprise) with feature flags and limits
- **subscriptions** — Per-company active subscription (status: trial/active/past_due/suspended/cancelled)
- **usage_records** — Monthly counters: leads_count, messages_count, users_count, ai_calls_count
- **invoices** — Billing records per company subscription
- **Conversation** / **Message** — TypeScript interfaces mapping WhatsApp inbox data

### Auth Data Model (shared/models/auth.ts)
- **users** – Platform users with roles: super_admin, admin, sales_admin, team_leader, sales_agent
- **teams** – User team groupings
- **sessions** – Express session storage

### Pages
- `/` → Dashboard (overview stats)
- `/leaderboard` → Sales agent rankings with deals/leads metrics (manager+)
- `/analytics` → Performance analytics and reports
- `/leads/pipeline` → Kanban board with drag-and-drop state management
- `/leads` → Lead management table (all leads)
- `/follow-ups` → Today's reminders and tasks with completion toggles
- `/leads/upload` → Import leads from Excel/CSV files (manager+)
- `/leads/duplicates` → Detect and manage duplicate leads by phone number
- `/leads/withdrawn` → View/restore leads in "lost" category states
- `/activity-log` → Global timeline of all lead actions and history
- `/knowledge-base` → Manage AI knowledge base items (products/services/FAQs)
- `/conversations` → WhatsApp inbox with real-time messaging, bot toggle per lead
- `/chatbot-config` → Bot personality, mission, working hours, enabled projects
- `/integrations` → WhatsApp connection, API keys
- `/settings` → Company profile settings
- `/settings/users` → User management (admin only)
- `/settings/teams` → Team management (admin only)

### Key API Endpoints
- `GET /api/subscription` — Current company subscription (with plan details)
- `GET /api/usage` — Current month usage counters + plan limits
- `GET /api/invoices` — Company invoice history
- `GET/POST/PATCH/DELETE /api/platform/plans` — Subscription plan CRUD (super_admin only)
- `PATCH /api/platform/subscriptions/:id` — Update subscription status (super_admin only)
- `GET/POST/PATCH/DELETE /api/knowledge-base` — Knowledge base CRUD
- `GET/PUT /api/chatbot/settings` — Chatbot configuration (bot personality, hours, projects)
- `GET /api/whatsapp/inbox` — WhatsApp conversations grouped by lead
- `POST /api/whatsapp/send` — Send WhatsApp message to lead
- `GET /api/leads/:leadId/whatsapp-log` — Message history for a lead
- `POST /api/leads/:leadId/bot/takeover` — Agent takes over from bot
- `POST /api/leads/:leadId/bot/reactivate` — Reactivate bot for lead
- `POST /api/whatsapp/inbox/:leadId/mark-read` — Mark messages as read
- `GET/POST/PATCH/DELETE /api/leads` — Lead management
- `POST /api/whatsapp/connect` / `POST /api/whatsapp/disconnect` — WhatsApp session
- `GET /api/whatsapp/status` — Connection status + QR code

### AI Bot Flow (server/ai.ts + server/routes.ts)
1. Incoming WhatsApp message → auto-create lead if new
2. AI generates reply based on: current stage, lead data, conversation history, inventory, knowledge base
3. Bot extracts lead info (name, budget, unit type, location, etc.)
4. Bot executes CRM actions: change_state, create_reminder, update_score
5. When qualified (name + budget/interest + unit type) → handoff to human agent

### Key Files
- `shared/schema.ts` – Database schema and types (Drizzle)
- `shared/models/auth.ts` – Authentication schema (users, teams, sessions)
- `server/ai.ts` – AI engine (generateBotReply, suggestReplies, analyzeLead)
- `server/whatsapp.ts` – Baileys WhatsApp connection management
- `server/storage.ts` – Storage interface and PostgreSQL implementation
- `server/routes.ts` – All API route handlers
- `server/auth.ts` – Passport authentication setup
- `server/index.ts` – Express app entry point (creates tables on startup)
- `server/subscription-middleware.ts` – requireFeature() and checkUsageLimit() middleware
- `client/src/pages/conversations.tsx` – WhatsApp inbox UI
- `client/src/pages/chatbot-config.tsx` – Bot settings UI
- `client/src/pages/knowledge-base.tsx` – Knowledge base management UI
- `client/src/pages/dashboard.tsx` – Dashboard with usage widget

## Default Credentials
- Username: `admin`
- Password: `Admin@123`
