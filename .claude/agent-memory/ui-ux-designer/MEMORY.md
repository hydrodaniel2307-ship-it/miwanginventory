# Miwang Inventory App - Design System & Implementation Notes

**Status**: Day 1 Complete - All design specs delivered
**Deliverables**:
- DESIGN_SPECS.md (comprehensive 1000+ line spec)
- IMPLEMENTATION_GUIDE.md (code examples and patterns)
- COLOR_TOKENS.md (quick reference for colors)
- RESPONSIVE_CHECKLIST.md (mobile-first testing guide)

## Project Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4, Shadcn UI (new-york style)
- **State Management**: React Hook Form + Zod
- **Icons**: Lucide React
- **Theme**: next-themes (dark mode)
- **Backend**: Supabase (SSR)
- **Typography**: Geist Sans (--font-geist-sans), Geist Mono (--font-geist-mono)

## Color System (OkLch)
**Light Mode**:
- Background: oklch(1 0 0) - white
- Foreground: oklch(0.145 0 0) - near-black (#252525)
- Primary: oklch(0.205 0 0) - dark gray (#3a3a3a)
- Primary Foreground: oklch(0.985 0 0) - almost white
- Card/Popover: oklch(1 0 0) - white
- Border: oklch(0.922 0 0) - light gray (#eaeaea)
- Muted: oklch(0.97 0 0) - very light gray
- Destructive: oklch(0.577 0.245 27.325) - red/orange

**Dark Mode**:
- Background: oklch(0.145 0 0) - near-black
- Foreground: oklch(0.985 0 0) - almost white
- Primary: oklch(0.922 0 0) - light gray (#f5f5f5)
- Card/Popover: oklch(0.205 0 0) - dark gray (#3a3a3a)
- Sidebar: oklch(0.205 0 0) - dark gray

## Border Radius Scale
- --radius-sm: calc(var(--radius) - 4px) = 4px (0.25rem)
- --radius-md: calc(var(--radius) - 2px) = 8px (0.5rem)
- --radius-lg: var(--radius) = 10px (0.625rem) [DEFAULT]
- --radius-xl: calc(var(--radius) + 4px) = 14px (0.875rem)
- --radius-2xl: calc(var(--radius) + 8px) = 18px (1.125rem)

## Existing Shadcn Components Available
- Button, Input, Label, Card
- Form (react-hook-form integration)
- Avatar
- Dropdown Menu
- Sheet (mobile sidebar)
- Separator
- Tooltip

## Directory Structure
```
src/
├── app/
│   ├── layout.tsx (root)
│   ├── globals.css (design tokens)
│   └── page.tsx (homepage)
├── components/
│   └── ui/ (shadcn components)
└── lib/
    └── utils.ts (cn() utility)
```

## Key Design Tokens to Reference
- Use OkLch color variables directly: var(--primary), var(--border), etc.
- Spacing scale: 4px (0.25rem), 8px, 12px, 16px, 24px, 32px, 48px, 64px
- Ring color for focus: var(--ring)
- All components use border-border and outline-ring/50 by default

## Accessibility Standards
- Minimum touch target: 44x44px (8px padding around text)
- Color contrast: WCAG AA (4.5:1 for body text, 3:1 for large text)
- Focus indicators: Use ring-ring CSS, clearly visible in light & dark
- Form labels must be explicitly associated with inputs
