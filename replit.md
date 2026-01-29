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
- **Internationalization (i18n)**: Custom LanguageProvider with Arabic/English support
  - Language file: `client/src/lib/i18n.tsx`
  - Language toggle: `client/src/components/language-toggle.tsx`
  - Default language: Arabic (ar)
  - RTL layout for Arabic, LTR for English
  - Sidebar position: Right for Arabic, Left for English
  - Language stored in localStorage as "crm-language"
  - Arabic font: Tajawal (Google Fonts)

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

### Planned/Available Integrations (based on build config)
- **OpenAI / Google Generative AI**: AI capabilities
- **Stripe**: Payment processing
- **Nodemailer**: Email sending
- **Multer**: File upload handling
- **xlsx**: Spreadsheet import/export for lead uploads