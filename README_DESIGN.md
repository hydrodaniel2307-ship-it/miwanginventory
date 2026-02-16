# Miwang Inventory App - Design Documentation
## Complete Design Specifications for Day 1 Implementation

**Date**: February 15, 2026
**Status**: Production Ready
**Version**: 1.0

---

## Quick Start Guide

### For Project Managers / Stakeholders
Start here: **SPEC_SUMMARY.md**
- Overview of all screens
- Key design decisions
- Timeline and phases
- Feature checklist

### For Frontend Developers
Follow this order:
1. **DESIGN_SPECS.md** - Complete specification document
2. **IMPLEMENTATION_GUIDE.md** - Copy-paste code examples
3. **COLOR_TOKENS.md** - Color reference while coding
4. **RESPONSIVE_CHECKLIST.md** - Testing guide

### For Designers / Design Review
Start here: **DESIGN_SPECS.md**
- Visual specifications
- Component breakdown
- Interactive states
- Responsive layouts

---

## Documentation Files

### 1. SPEC_SUMMARY.md (Start Here)
**Purpose**: Executive summary and navigation guide
**Length**: ~400 lines
**Contains**:
- What's delivered
- Key design decisions
- File structure
- Timeline
- Quick command reference

**When to read**: First thing, to understand the scope

---

### 2. DESIGN_SPECS.md (The Bible)
**Purpose**: Complete design specification
**Length**: ~1200 lines
**Contains**:

#### Screens Specified:
1. **Login Page**
   - Email/password form
   - Remember me checkbox
   - Error states
   - Branding section (desktop only)
   - Loading states

2. **Signup Page**
   - Name, email, password, confirm fields
   - Password strength indicator
   - Field validation
   - Terms acceptance

3. **App Shell / Main Layout**
   - Sidebar navigation (256px desktop)
   - Collapsible sidebar (80px tablet)
   - Mobile sheet overlay
   - User menu with logout
   - 7 navigation items

4. **Dashboard Page**
   - 4 summary metric cards
   - Recent activity list
   - Quick actions (4 buttons)
   - Loading/error states
   - Empty states

#### For each screen:
- Purpose & user flow
- Layout specification (mobile, tablet, desktop)
- Component breakdown with visual specs
- Interactive behaviors (all states)
- Responsive adjustments
- Accessibility notes
- Developer notes

**When to read**: Deep dive before implementation

---

### 3. IMPLEMENTATION_GUIDE.md (Code Examples)
**Purpose**: Ready-to-use code patterns
**Length**: ~800 lines
**Contains**:

```
Login Page (full React component)
├── Form validation
├── Error handling
├── Loading states
└── Form submission

Signup Page (full React component)
├── Password strength checker
├── Password visibility toggle
├── Field-level validation
└── Confirmation matching

App Shell Components
├── Sidebar.tsx (navigation & user menu)
├── Layout structure
└── Mobile header

Dashboard Page (full React component)
├── Summary cards
├── Activity list
├── Quick actions
└── Loading skeletons
```

**Plus**:
- Tailwind classes reference
- Shadcn component usage patterns
- Form handling patterns
- Common responsive patterns
- Testing breakpoints

**When to read**: While writing code

---

### 4. COLOR_TOKENS.md (Design Token Reference)
**Purpose**: Quick color lookup
**Length**: ~300 lines
**Contains**:

- All 30+ CSS custom properties
- Light mode values (OkLch format)
- Dark mode values (OkLch format)
- Usage examples
- Contrast ratios (WCAG AA)
- Copy-paste patterns

**Examples**:
```
Foreground: oklch(0.145 0 0) - Dark text on light
Destructive: oklch(0.577 0.245 27.325) - Red for errors
Border: oklch(0.922 0 0) - Light gray borders
```

**When to read**: While styling components

---

### 5. RESPONSIVE_CHECKLIST.md (Testing & Mobile-First)
**Purpose**: Responsive design guide
**Length**: ~500 lines
**Contains**:

#### Responsive Patterns
- Grid layouts (4 → 2 → 1)
- Component visibility patterns
- Form field sizing
- Spacing adjustments
- Typography scaling

#### Testing Checklist
- Mobile (375px)
- Tablet (768px)
- Desktop (1024px)
- 4K (2560px)

#### Common Issues & Fixes
- Form fields too small
- Sidebar breaks on mobile
- Grids don't stack
- Images don't scale
- Padding overflows

#### Browser Testing
- Mobile browsers (Chrome, Safari, Samsung)
- Desktop browsers (Chrome, Safari, Firefox)
- DevTools debugging tips

**When to read**: Before testing

---

## Architecture Overview

### Route Structure
```
/                           → Root layout with ThemeProvider
├── (auth)/                 → Authentication group
│   ├── login/              → Login page
│   └── signup/             → Signup page
└── (authenticated)/        → App shell layout
    ├── dashboard/          → Dashboard page
    ├── inventory/          → Future
    ├── products/           → Future
    └── ...                 → Future pages
```

### Component Structure
```
components/
├── ui/                     → Shadcn components (Button, Card, etc.)
├── auth/
│   ├── LoginForm.tsx
│   └── SignupForm.tsx
├── layout/
│   ├── Sidebar.tsx
│   ├── MobileHeader.tsx
│   └── AppShell.tsx
└── dashboard/
    ├── SummaryCard.tsx
    ├── ActivityList.tsx
    └── QuickActions.tsx
```

---

## Design System Tokens

### Colors (CSS Variables)
All defined in `src/app/globals.css`
- **30+ CSS custom properties**
- **OkLch color space** (perceptually uniform)
- **Automatic dark mode** (via CSS only)
- **WCAG AA compliant** (all text)

### Spacing Scale
```
4px (0.25rem)    - xs
8px (0.5rem)     - sm
12px (0.75rem)   - md
16px (1rem)      - lg
24px (1.5rem)    - xl
32px (2rem)      - 2xl
48px (3rem)      - 3xl
64px (4rem)      - 4xl
```

### Typography
```
Font: Geist Sans (primary), Geist Mono (code)
Sizes: 12px, 14px, 16px, 18px, 20px, 24px, 28px, 32px
Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
Line Height: 1.2 (headings), 1.5 (body)
```

### Border Radius
```
4px (0.25rem)    - radius-sm
8px (0.5rem)     - radius-md
10px (0.625rem)  - radius-lg (default)
14px (0.875rem)  - radius-xl
18px (1.125rem)  - radius-2xl
```

---

## Shadcn Components Required

```bash
npx shadcn@latest add button input label card form
npx shadcn@latest add avatar dropdown-menu sheet
npx shadcn@latest add separator tooltip alert skeleton
```

All are styled with new-york preset, neutral base color, and CSS variables.

---

## Development Workflow

### Phase 1: Setup (Day 1)
```
1. Review all documentation
2. Install Shadcn components
3. Setup route structure
4. Create layout files
```

### Phase 2: Components (Days 2-3)
```
1. Build auth forms (Login, Signup)
2. Build layout components (Sidebar, Header)
3. Build dashboard components (Cards, Activity)
```

### Phase 3: Testing (Days 4-5)
```
1. Responsive testing (375px, 768px, 1024px)
2. Browser testing (Chrome, Safari, Firefox)
3. Accessibility testing (contrast, focus, keyboard)
4. Performance testing (LCP, FID, CLS)
```

### Phase 4: Polish (Days 5-6)
```
1. Dark mode testing
2. Error handling refinement
3. Loading state optimization
4. Analytics integration
```

---

## Verification Checklist

Before launching, verify:

### Desktop (1024px+)
- [ ] Sidebar is 256px wide and visible
- [ ] Summary cards display in 4 columns
- [ ] Activity list shows 3-5 items
- [ ] Quick actions are buttons
- [ ] Hover effects work
- [ ] Dropdown menu works

### Tablet (768px)
- [ ] Summary cards display in 2 columns
- [ ] Sidebar collapses to 80px
- [ ] Navigation items show icons only
- [ ] Content area adjusts width
- [ ] Touch targets are 44x44px+

### Mobile (375px)
- [ ] Cards stack in 1 column
- [ ] Hamburger menu appears
- [ ] Sidebar hidden by default
- [ ] No horizontal scroll
- [ ] Form inputs are 44px tall
- [ ] Text is readable (16px+)

### Accessibility
- [ ] Focus rings visible everywhere
- [ ] Color contrast WCAG AA
- [ ] All inputs have labels
- [ ] Keyboard navigation works
- [ ] Screen readers work

---

## Key Files & Locations

### Design Documentation
```
/SPEC_SUMMARY.md              - Start here (this file)
/DESIGN_SPECS.md              - Complete specifications
/IMPLEMENTATION_GUIDE.md      - Code examples
/COLOR_TOKENS.md              - Color reference
/RESPONSIVE_CHECKLIST.md      - Testing guide
/README_DESIGN.md             - This navigation document
```

### Project Files
```
src/app/globals.css           - Design tokens (already done)
src/lib/utils.ts              - cn() utility (already done)
components.json               - Shadcn config (already done)
package.json                  - Dependencies (already done)
```

### Implementation Files (To Create)
```
src/app/(auth)/login/page.tsx
src/app/(auth)/signup/page.tsx
src/app/(authenticated)/layout.tsx
src/app/(authenticated)/dashboard/page.tsx
src/components/layout/Sidebar.tsx
src/components/dashboard/SummaryCard.tsx
```

---

## Common Questions

### Q: Where do I start?
A: Read SPEC_SUMMARY.md, then DESIGN_SPECS.md, then start coding with IMPLEMENTATION_GUIDE.md

### Q: Can I change the design?
A: Update DESIGN_SPECS.md first, then code. Keep specs as source of truth.

### Q: How do I handle dark mode?
A: Colors use CSS variables that automatically invert. No special handling needed.

### Q: What about mobile navigation?
A: Use Shadcn Sheet component with hamburger trigger on mobile, sidebar on desktop.

### Q: How do I add a new page?
A: Follow the same pattern: create folder in (authenticated), add layout/page as needed.

### Q: When should I add loading states?
A: Always. Use skeleton screens from IMPLEMENTATION_GUIDE.md

---

## Performance Targets

- **LCP**: < 2.5s (page content visible)
- **FID**: < 100ms (interaction response)
- **CLS**: < 0.1 (layout stability)

Strategies used:
- Skeleton screens (perceived performance)
- Responsive images (Next.js Image)
- CSS variables (no runtime overhead)
- Minimal bundle (Shadcn tree-shakes)

---

## Accessibility Standards

All designs meet or exceed:
- **WCAG 2.1 Level AA** (contrast, keyboard, structure)
- **ARIA Labels** for icons and interactive elements
- **Focus Indicators** visible on all interactive elements
- **Touch Targets** 44x44px minimum (mobile)
- **Color Not Only** (don't rely on color alone)

---

## Browser Support

### Minimum Versions
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

### Mobile
- iOS Safari 14+
- Chrome Android 90+

---

## Next Steps

1. Read SPEC_SUMMARY.md (5 minutes)
2. Read DESIGN_SPECS.md (20 minutes)
3. Review IMPLEMENTATION_GUIDE.md (10 minutes)
4. Setup project (5 minutes)
5. Start building (refer to guides as needed)

---

## Document Map

```
START HERE
     ↓
SPEC_SUMMARY.md ──→ Get overview, timeline, structure
     ↓
DESIGN_SPECS.md ──→ Deep dive into each screen
     ↓
IMPLEMENTATION_GUIDE.md ──→ Copy-paste code while building
     ↓
COLOR_TOKENS.md ──→ Reference colors while styling
     ↓
RESPONSIVE_CHECKLIST.md ──→ Test all breakpoints
```

---

**Ready to build?** Start with SPEC_SUMMARY.md, then DESIGN_SPECS.md.

For code, open IMPLEMENTATION_GUIDE.md side-by-side with your editor.

Questions? Check the relevant guide sections listed above.

---

**Design System v1.0**
**Status**: Production Ready
**Last Updated**: February 15, 2026
