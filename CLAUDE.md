# Sheepdog Society for Men of Faith

## Overview
Community platform for men's Bible study organization. Real-time chat, Bible reader, AI devotionals, group management, prayer system.

## Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI**: shadcn/ui + Tailwind CSS v4 + Radix UI + Lucide icons
- **Auth**: Clerk (4-tier RBAC: admin, group_leader, asst_leader, member)
- **Database**: Supabase PostgreSQL with Row-Level Security
- **ORM**: Drizzle (`src/db/schema.ts`)
- **Real-time**: Supabase Realtime (Broadcast + Presence)
- **AI**: @ai-sdk/anthropic (Claude API)
- **Bible**: ESV API + API.Bible (NIV, NKJV)
- **Rich Text**: TipTap (blog editor)
- **Theme**: next-themes (dark mode default)

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npx drizzle-kit push # Push schema to Supabase
npx drizzle-kit generate # Generate migration files
npx tsx src/db/seed.ts   # Seed default data
```

## Key Patterns
- Server Components by default; "use client" only for interactivity
- Clerk auth via middleware.ts — protects all routes except /sign-in, /sign-up, /api/webhooks
- Supabase clients: server.ts (with Clerk JWT), client.ts (browser), admin.ts (service role)
- Database schema in src/db/schema.ts — single source of truth for all 25 tables
- RLS policies enforce access at the database level
- All API routes under src/app/api/
- Admin approval: new users start with status "pending"

## Design System
- **Dark mode default** — navy-charcoal backgrounds
- **Primary**: Blue (#3B82F6)
- **Accent**: Bronze/gold (#D4A574) — use `text-bronze` or `bg-bronze`
- **Fonts**: Inter (UI), Merriweather (scripture — use `font-scripture` class)
- **Voice**: Hemingway — direct, professional, polite, warm

## File Structure
```
src/
├── app/
│   ├── layout.tsx          # Root: ClerkProvider + ThemeProvider
│   ├── (app)/              # Authenticated routes
│   │   ├── page.tsx        # Home dashboard
│   │   ├── channels/       # Chat
│   │   ├── bible/          # Bible reader
│   │   ├── devotionals/    # AI devotionals
│   │   ├── prayer/         # Prayer requests
│   │   ├── groups/         # Group management
│   │   ├── blog/           # Blog posts
│   │   └── admin/          # Admin dashboard
│   ├── api/                # API routes
│   ├── sign-in/            # Clerk sign-in
│   └── sign-up/            # Clerk sign-up
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # App shell (sidebar, nav)
│   ├── chat/               # Chat components
│   └── ...                 # Feature-specific components
├── db/
│   ├── schema.ts           # Drizzle schema (all tables)
│   ├── index.ts            # Drizzle client
│   └── seed.ts             # Seed script
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── bible/              # Bible API wrappers
│   └── utils.ts            # Utility functions
├── hooks/                  # React hooks
└── middleware.ts            # Clerk auth middleware
```

## GitHub
- Repo: red11scout/sheepdogsociety
- Deploy target: Replit Autoscale
