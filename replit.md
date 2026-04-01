# HomeAdvisor CRM

## Overview

HomeAdvisor CRM is a professional Customer Relationship Management system designed for managing leads, clients, and sales pipelines. The application enables sales teams to track leads through various states (New Leads, Follow Up, Meeting, Done Deal, etc.), manage client information, log activities, and monitor team performance through a dashboard with analytics.

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
- **Internationalization (i18n)**: Custom LanguageProvider with complete Arabic/English support
  - Language file: `client/src/lib/i18n.tsx` (200+ translation keys)
  - Language toggle: `client/src/components/language-toggle.tsx`
  - Default language: Arabic (ar)
  - RTL layout for Arabic, LTR for English
  - Sidebar position: Right for Arabic, Left for English
  - Language stored in localStorage as "crm-language"
  - Arabic font: Tajawal (Google Fonts)
  - All pages fully translated: leads, clients, add-lead, states-management, users, teams, developers, projects, units, upload-leads, duplicated-leads, withdrawn-leads, actions-log, saved-filters
  - Dynamic Zod schema creation for translated validation messages
  - RTL search inputs with proper icon positioning (rtl:left-auto rtl:right-3)
  - CSV export headers translated
  - Lead Scoring keys: scoreHot, scoreWarm, scoreCold, leadScore, daysSinceContact
  - Auto-assign & team load keys: autoAssign, teamLoad, teamLoadSubtitle, noAgentsAvailable, leadsCount

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **API Design**: RESTful API endpoints under `/api/*` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod schemas generated from Drizzle schema via drizzle-zod

### Authentication & Authorization
- **Authentication**: Replit Auth (OpenID Connect) with automatic session management
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Role-Based Access Control (RBAC)**: Four user roles with different permissions
  - `super_admin` - Full access including user deletion
  - `admin` - Full access except data deletion
  - `sales_manager` - Team-level access only
  - `sales_agent` - Own leads access only
- **Auth Files**: `server/replit_integrations/auth/*` for auth setup
- **Middleware**: `isAuthenticated` for login check, `requireRole()` for RBAC

### Data Layer
- **Database**: PostgreSQL
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Auth Schema**: `shared/models/auth.ts` contains users, teams, and sessions tables
- **Core Entities**:
  - `users` - System users with role, team assignment, and active status
  - `teams` - Organizational groups for sales teams
  - `sessions` - OIDC session storage (required by Replit Auth)
  - `leadStates` - Customizable pipeline stages with color and order
  - `leads` - Potential customers with contact info, property preferences, and assignment
  - `clients` - Converted customers
  - `tasks` - Follow-up activities linked to leads
  - `leadHistory` - Audit trail of actions on leads
  - `developers` - Real estate developers with contact info
  - `projects` - Real estate projects linked to developers
  - `units` - Individual units within projects (apartments, villas, etc.)
  - `leadUnitInterests` - Links between leads and units they're interested in

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route-based page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database operations interface
│   └── db.ts         # Database connection
├── shared/           # Shared code between client and server
│   └── schema.ts     # Drizzle schema and Zod types
└── migrations/       # Drizzle database migrations
```

### Key Design Decisions

1. **Monorepo Structure**: Single repository with shared types between frontend and backend, reducing type duplication and ensuring API contract consistency.

2. **Path Aliases**: TypeScript path aliases (`@/` for client, `@shared/` for shared) for cleaner imports.

3. **Database Schema as Source of Truth**: Using drizzle-zod to generate validation schemas from database definitions ensures consistency between database, API, and client-side validation.

4. **Component-First UI**: Leveraging shadcn/ui provides accessible, customizable components while maintaining full control over the codebase (components are copied into the project, not imported from a package).

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection configured via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migration tool (`npm run db:push` to sync schema)

### UI Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Recharts**: Dashboard charts and data visualization
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **embla-carousel-react**: Carousel functionality

### Development Tools
- **Vite**: Frontend dev server with HMR
- **Replit Plugins**: Runtime error overlay, cartographer, and dev banner for Replit environment

### WhatsApp Integration (Baileys)
- **Library**: `@whiskeysockets/baileys` — WhatsApp Web protocol, no Meta API required
- **Session Service**: `server/whatsapp.ts` — per-agent session management, QR generation, reconnection
- **Session Persistence**: Sessions stored in `.whatsapp_sessions/<userId>/` directories
- **QR Generation**: `qrcode` package generates base64 QR code data URLs
- **Tables**:
  - `whatsapp_templates` — admin-managed message templates with Arabic text and dynamic variables
  - `whatsapp_messages_log` — records of WhatsApp messages sent per lead per agent
- **Routes**: `/api/whatsapp/*` — status, connect, disconnect, send, templates CRUD
- **Frontend**: 
  - `client/src/pages/whatsapp-settings.tsx` — agent WhatsApp connection UI with QR display
  - `client/src/pages/whatsapp-templates.tsx` — admin template management
  - `client/src/components/whatsapp-panel.tsx` — WhatsApp action panel in lead detail Actions tab
- **Ban Avoidance**: Random 2-5s delay before sending, session persistence avoids re-scan
- **Privacy**: Manager can see WhatsApp activity count in lead history without seeing message content

### Nawy.com Data Import & Inventory
- **Data Source**: Scraped nawy.com for العاصمة الإدارية الجديدة (New Capital City, Egypt)
- **Stats**: 78 developers, 144 projects (compounds), 615 units imported
- **Data Enrichment**: Each compound enriched with Arabic description, payment plans, unit type size/price ranges, amenities (from nawy.com pages)
- **Data format in `description` field**:
  - `عن [COMPOUND]:` Arabic description text
  - `📋 أنظمة السداد:` Payment plan options (pipe-separated)
  - `🏠 أنواع الوحدات وأسعارها:` Unit types with area ranges and price ranges
  - `🔗 المصدر:` Source nawy.com URL

### Inventory UI (Rebuilt)
- **Developers page** (`client/src/pages/developers.tsx`): Search bar, project count badges per developer, click → filter projects
- **Projects page** (`client/src/pages/projects.tsx`): Rich cards (price range, unit type badges, payment plans, amenities preview), filter panel (developer/status/unit type/delivery year), project detail sheet (full description, unit ranges, payment plans, nawy link)
- **Units page** (`client/src/pages/units.tsx`): Compound info panel (developer, price range, payment plans, amenities, nawy link)

### Planned/Available Integrations (based on build config)
- **OpenAI / Google Generative AI**: AI capabilities
- **Stripe**: Payment processing
- **Nodemailer**: Email sending
- **Multer**: File upload handling
- **xlsx**: Spreadsheet import/export for lead uploads