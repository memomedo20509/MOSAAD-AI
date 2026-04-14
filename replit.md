# SalesBot AI

## Overview

SalesBot AI is a generic AI-powered sales chatbot platform. The application enables teams to configure an AI chatbot, manage knowledge base content, track conversations, capture leads, and monitor performance through analytics. It is built as an industry-agnostic platform with no real-estate specific features.

The system is built as a full-stack TypeScript application with a React frontend and Express backend, using PostgreSQL for data persistence.

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
  - Language stored in localStorage as "crm-language"

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (tsx for development)
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Data Model (shared/schema.ts)
- **company_profile** – Singleton company settings (name, industry, description, contact info)
- **knowledge_base_items** – Q&A pairs and documents the AI uses to answer questions
- **chatbot_config** – Chatbot personality, greeting, escalation settings, active channels
- **conversations** – Chat sessions (platform, session_id, status, contact info, assigned agent)
- **messages** – Individual messages within a conversation (role, content, timestamps)
- **leads** – Captured leads (name, phone, email, interest, source, status, notes)

### Auth Data Model (shared/models/auth.ts)
- **users** – Platform users with roles: admin, manager, sales_agent, viewer
- **teams** – User team groupings
- **sessions** – Express session storage

### Pages
- `/` → Dashboard (overview stats)
- `/conversations` → All chatbot conversations
- `/leads` → Lead management table
- `/knowledge-base` → Manage AI knowledge base items
- `/analytics` → Performance analytics
- `/settings` → Company profile and chatbot configuration
- `/users` → User and team management (admin only)
- `/auth` → Login / registration

### API Endpoints
- `GET/PATCH /api/company-profile` – Company settings
- `GET/POST/PATCH/DELETE /api/knowledge-base` – Knowledge base items
- `GET/PATCH /api/chatbot-config` – Chatbot configuration
- `GET /api/conversations`, `GET/PATCH /api/conversations/:id` – Conversation management
- `GET /api/conversations/:id/messages` – Messages in a conversation
- `GET/POST/PATCH/DELETE /api/leads` – Lead management
- `GET /api/analytics/overview` – Aggregated analytics
- `GET/POST/PATCH/DELETE /api/users` – User management
- `GET/POST/PATCH/DELETE /api/teams` – Team management
- `POST /api/login`, `POST /api/logout`, `GET /api/user` – Authentication

### Key Files
- `shared/schema.ts` – SalesBot AI database schema and types
- `shared/models/auth.ts` – Authentication schema (users, teams, sessions)
- `server/storage.ts` – Storage interface and PostgreSQL implementation
- `server/routes.ts` – All API route handlers
- `server/auth.ts` – Passport authentication setup
- `server/index.ts` – Express app entry point (creates tables on startup)
- `server/seed.ts` – Default admin seeding (admin / Admin@123)
- `client/src/App.tsx` – Main app with routing and providers
- `client/src/components/app-sidebar.tsx` – Navigation sidebar
- `client/src/pages/` – All page components

## Default Credentials
- Username: `admin`
- Password: `Admin@123`
