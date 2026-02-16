# MiWang Inventory App - Project Memory

## Stack
- **Framework**: Next.js 16 + TypeScript + App Router (src directory)
- **Styling**: Tailwind CSS v4 + shadcn/ui (new-york style, radix-ui v1.4.3)
- **Auth**: Supabase Auth with `@supabase/ssr`
- **Forms**: react-hook-form v7 + zod v4 + @hookform/resolvers v5
- **State**: Minimal - mostly server components, client state via React hooks
- **Icons**: lucide-react
- **Theme**: next-themes (class-based dark/light)
- **Toast**: sonner

## Key File Paths
- Supabase clients: `src/lib/supabase/server.ts`, `browser.ts`, `client.ts`, `middleware.ts`
- UI components: `src/components/ui/` (shadcn)
- App shell: `src/components/app-shell/` (sidebar, header, mobile-nav)
- Protected routes: `src/app/(protected)/` with auth check in layout
- Login: `src/app/login/page.tsx`
- Types: `src/lib/types/database.ts`

## Conventions
- All UI text in Korean
- `html lang="ko"` with `suppressHydrationWarning`
- Server components by default, `"use client"` only where needed
- Zod v4 import: `from "zod"` (NOT `from "zod/v4"`)
- Supabase browser client: `src/lib/supabase/browser.ts` (preferred for client components)
- Route groups: `(protected)` for authenticated routes

## Navigation Items (5 total)
| Label | Path | Icon |
|-------|------|------|
| 대시보드 | /dashboard | LayoutDashboard |
| 스캔 | /scan | ScanLine |
| 재고 | /inventory | Package |
| 창고맵 | /map | Map |
| 설정 | /settings | Settings |

## AI Prediction System
- Prediction engine: `src/lib/prediction.ts` (SMA + linear trend, no external APIs)
- Server actions: `src/app/(protected)/dashboard/prediction-actions.ts`
- UI component: `src/components/dashboard/prediction-panel.tsx` (client component with table, sparklines, alerts)
- Supabase admin client: `src/lib/supabase/admin.ts` (bypasses RLS, uses anon key)
- Dashboard integration: prediction data fetched in parallel via `Promise.all` in dashboard `page.tsx`
- Prediction uses sale order_items from last 6 months, groups by month, applies SMA-3 + linear slope

## Gotchas
- globals.css had duplicate `@apply` lines - cleaned up
- Prior iterations left conflicting route groups `(auth)` and `(dashboard)` - removed
- shadcn components use `radix-ui` package directly (not `@radix-ui/*` scoped packages)
- Next.js build lock file can get stuck in `.next/lock` - delete it if build fails with lock error
