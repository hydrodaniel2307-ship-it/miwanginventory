# Getting Started with Design Implementation
## Developer Quick-Start Checklist

**Estimated Time**: 30 minutes to get oriented, 3-5 days to implement

---

## Phase 0: Orientation (30 minutes)

### [ ] Read Documentation (15 minutes)
```
Start here:
├── README_DESIGN.md (5 min) - Navigation guide
├── SPEC_SUMMARY.md (5 min) - What's being built
└── Top of DESIGN_SPECS.md (5 min) - First screens overview
```

### [ ] Understand the Design System (10 minutes)
```
Review in globals.css:
├── Color variables (OkLch format)
├── Border radius scale
├── Spacing tokens
└── Typography setup
```

### [ ] Install Shadcn Components (5 minutes)
```bash
cd /c/Users/danie/Desktop/miwanginventory-app

# Install all required components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add form
npx shadcn@latest add avatar
npx shadcn@latest add dropdown-menu
npx shadcn@latest add sheet
npx shadcn@latest add separator
npx shadcn@latest add tooltip
npx shadcn@latest add alert
npx shadcn@latest add skeleton
```

---

## Phase 1: Setup Project Structure (1 hour)

### [ ] Create Auth Route Group
```bash
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/signup
touch src/app/\(auth\)/layout.tsx
```

### [ ] Create Authenticated Route Group
```bash
mkdir -p src/app/\(authenticated\)/dashboard
touch src/app/\(authenticated\)/layout.tsx
```

### [ ] Create Component Directories
```bash
mkdir -p src/components/auth
mkdir -p src/components/layout
mkdir -p src/components/dashboard
```

### [ ] Copy-Paste Folder Structure
Your folders should look like:
```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (authenticated)/
│   │   ├── layout.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── layout.tsx (root)
│   └── globals.css (done)
├── components/
│   ├── ui/ (Shadcn components installed here)
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── MobileHeader.tsx
│   │   └── AppShell.tsx
│   └── dashboard/
│       ├── SummaryCard.tsx
│       ├── ActivityList.tsx
│       └── QuickActions.tsx
└── lib/
    └── utils.ts (done)
```

---

## Phase 2: Build Login Page (2-3 hours)

### [ ] Create Login Page Layout
**File**: `src/app/(auth)/login/page.tsx`

Open: `IMPLEMENTATION_GUIDE.md` → Search for "## 1. Login Page Implementation"

Copy the complete component code.

**Key sections**:
- Form state management
- Email/password fields
- Error display
- Loading state
- Sign up link

### [ ] Test Login Page
- [ ] Form renders
- [ ] Can type in fields
- [ ] Submit button works
- [ ] Error state displays
- [ ] Loading state works
- [ ] Link to signup works

**Responsive check**:
- [ ] Mobile (375px): Form centered, no scroll
- [ ] Tablet (768px): Form still centered
- [ ] Desktop (1024px): Branding visible on left

---

## Phase 3: Build Signup Page (2-3 hours)

### [ ] Create Signup Page Layout
**File**: `src/app/(auth)/signup/page.tsx`

Open: `IMPLEMENTATION_GUIDE.md` → Search for "## 2. Signup Page Implementation"

Copy the complete component code.

**Key sections**:
- Name, email, password, confirm fields
- Password strength indicator
- Field validation
- Error display
- Sign in link

### [ ] Test Signup Page
- [ ] All form fields render
- [ ] Password strength indicator appears
- [ ] Password visibility toggle works
- [ ] Validation messages appear
- [ ] Form submits (with TODO auth)

**Responsive check**:
- [ ] Mobile (375px): Fields stack, form readable
- [ ] Tablet (768px): Same as mobile
- [ ] Desktop (1024px): Branding visible

---

## Phase 4: Build App Shell / Layout (2-3 hours)

### [ ] Create Sidebar Component
**File**: `src/components/layout/Sidebar.tsx`

Open: `IMPLEMENTATION_GUIDE.md` → Search for "## 3. App Shell / Sidebar Implementation"

Copy the Sidebar.tsx component code.

**Key sections**:
- Logo/branding
- Navigation items (7 items)
- Active state styling
- User menu with dropdown
- Logout functionality

### [ ] Create Authenticated Layout
**File**: `src/app/(authenticated)/layout.tsx`

Copy the layout structure that:
- Wraps content with Sidebar
- Adds main content area
- Includes mobile header

### [ ] Test App Shell
- [ ] Sidebar visible on desktop
- [ ] Navigation items clickable
- [ ] User menu dropdown works
- [ ] Active state highlights correct nav item
- [ ] Mobile hamburger appears (on mobile)

**Responsive check**:
- [ ] Mobile (375px): Sidebar hidden, header visible
- [ ] Tablet (768px): Sidebar compact (80px)
- [ ] Desktop (1024px): Sidebar 256px, full visible

---

## Phase 5: Build Dashboard Page (2-3 hours)

### [ ] Create Dashboard Page
**File**: `src/app/(authenticated)/dashboard/page.tsx`

Open: `IMPLEMENTATION_GUIDE.md` → Search for "## 4. Dashboard Page Implementation"

Copy the complete component code.

**Key sections**:
- Summary cards grid
- Recent activity list
- Quick actions buttons
- Loading states
- Empty state handling

### [ ] Test Dashboard
- [ ] Summary cards display
- [ ] Activity list shows items
- [ ] Quick action buttons clickable
- [ ] Loading skeleton appears while loading
- [ ] Empty state shows when no activity

**Responsive check**:
- [ ] Mobile (375px): Cards 1 column, activity stacks
- [ ] Tablet (768px): Cards 2 columns
- [ ] Desktop (1024px): Cards 4 columns

---

## Phase 6: Polish & Testing (1-2 days)

### [ ] Responsive Testing
Use Chrome DevTools responsive mode (Ctrl+Shift+M):

**Mobile (375px)**
- [ ] No horizontal scroll
- [ ] Touch targets 44x44px+
- [ ] Form inputs legible
- [ ] Text size at least 16px
- [ ] Navigation accessible

**Tablet (768px)**
- [ ] 2-column layouts work
- [ ] Sidebar adjusts
- [ ] Content area proper width
- [ ] All touch targets 44x44px+

**Desktop (1024px)**
- [ ] 4-column grids display
- [ ] Sidebar 256px wide
- [ ] Hover effects work
- [ ] Max-width respected

### [ ] Accessibility Testing
```
Chrome DevTools → Lighthouse → Accessibility

Target: Score 90+
Check:
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators visible
- [ ] Keyboard navigation (Tab, Arrow keys)
- [ ] Form labels associated
- [ ] Error messages clear
```

### [ ] Dark Mode Testing
```
Open DevTools console:
document.documentElement.classList.add('dark')

Then refresh and check:
- [ ] Colors invert properly
- [ ] Text readable
- [ ] Contrast still WCAG AA
- [ ] All elements visible
```

### [ ] Browser Testing
Test on:
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Common Implementation Patterns

### Using Shadcn Components

```tsx
// Import
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Use in component
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>

<Button>Click me</Button>
```

### Tailwind Classes

```tsx
// Responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// Flexbox
<div className="flex items-center justify-between px-4 py-2">

// Colors
<div className="bg-card text-foreground border border-border rounded-lg">

// States
<button className="hover:bg-muted active:bg-primary disabled:opacity-50">
```

### Form Handling

```tsx
import { useState } from 'react';

const [formData, setFormData] = useState({ email: '', password: '' });

const handleChange = (e) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
};

const handleSubmit = async (e) => {
  e.preventDefault();
  // TODO: Add auth logic
};
```

---

## Quick Reference While Coding

Keep these open in separate tabs:

1. **IMPLEMENTATION_GUIDE.md** - Code examples
2. **COLOR_TOKENS.md** - Color values
3. **DESIGN_SPECS.md** - Detailed specs for reference
4. **RESPONSIVE_CHECKLIST.md** - Testing checklist

---

## File Locations for Copy-Paste

All code examples are in:
```
/c/Users/danie/Desktop/miwanginventory-app/IMPLEMENTATION_GUIDE.md
```

### Find Sections By Searching For:
- "## 1. Login Page" → Login component
- "## 2. Signup Page" → Signup component
- "## 3. App Shell" → Sidebar + Layout
- "## 4. Dashboard" → Dashboard component

---

## Troubleshooting

### Styling Issues
Problem: Colors don't look right
Solution: Check COLOR_TOKENS.md, make sure using correct variable names

Problem: Components look different than spec
Solution: Check DESIGN_SPECS.md for exact padding/sizing, apply with Tailwind classes

### Responsive Issues
Problem: Layout breaks on mobile
Solution: Open RESPONSIVE_CHECKLIST.md, check grid classes and breakpoint prefixes

Problem: Touch targets too small
Solution: Ensure buttons/inputs are at least h-10 (40px) or 44x44px total

### Dark Mode Issues
Problem: Dark mode colors wrong
Solution: Colors use CSS variables, no changes needed. Check globals.css for var definitions

---

## Development Tips

### Use TypeScript Types
```tsx
interface FormData {
  email: string;
  password: string;
}

interface ActivityItem {
  id: string;
  action: string;
  timestamp: Date;
}
```

### Component Organization
Keep related components together:
```
components/
├── auth/          → Auth-related components
├── layout/        → Layout components
├── dashboard/     → Dashboard components
└── ui/            → Shadcn components
```

### Use CSS Variables
```tsx
// Good
className="bg-primary text-primary-foreground"

// Bad
className="bg-slate-950 text-white"
```

### Test Mobile First
Always design/test mobile first (375px), then expand to tablet (768px), then desktop (1024px).

---

## Performance Checklist

- [ ] No console errors
- [ ] No console warnings
- [ ] Images optimized (use Next.js Image)
- [ ] No unused imports
- [ ] No inline styles (use Tailwind)
- [ ] Memoize expensive components if needed
- [ ] Use 'use client' only where needed

---

## Before Shipping

- [ ] All pages accessible at correct routes
- [ ] Form validation works
- [ ] Error states display correctly
- [ ] Loading states show properly
- [ ] Mobile responsive (375px, 768px, 1024px)
- [ ] Accessibility (WCAG AA, keyboard, focus rings)
- [ ] Browser support (Chrome, Safari, Firefox)
- [ ] Dark mode works
- [ ] No console errors/warnings

---

## Code Quality Checklist

- [ ] TypeScript strict mode enabled
- [ ] No `any` types used
- [ ] Components have proper Props types
- [ ] Files follow naming convention
- [ ] Components properly exported
- [ ] No unused variables
- [ ] Functions have clear names
- [ ] Comments for complex logic
- [ ] Error handling included

---

## Time Estimates

```
Phase 0: Orientation          → 30 minutes
Phase 1: Setup               → 1 hour
Phase 2: Login Page          → 2-3 hours
Phase 3: Signup Page         → 2-3 hours
Phase 4: App Shell/Layout    → 2-3 hours
Phase 5: Dashboard Page      → 2-3 hours
Phase 6: Polish & Testing    → 1-2 days

Total: 3-5 days for complete implementation
```

---

## Next Steps

1. Read README_DESIGN.md (navigation guide)
2. Read SPEC_SUMMARY.md (executive summary)
3. Read top of DESIGN_SPECS.md (requirements)
4. Install Shadcn components
5. Create folder structure
6. Start with Phase 2: Login Page
7. Reference IMPLEMENTATION_GUIDE.md while coding
8. Test with RESPONSIVE_CHECKLIST.md

---

## Questions?

Refer to these files:
- **Layout/Spacing**: DESIGN_SPECS.md sections on Layout Specification
- **Colors**: COLOR_TOKENS.md
- **Code Examples**: IMPLEMENTATION_GUIDE.md
- **Testing**: RESPONSIVE_CHECKLIST.md
- **Components**: Shadcn documentation + IMPLEMENTATION_GUIDE.md

---

**Ready?** Start with Phase 0 above!

**Questions?** Check README_DESIGN.md for document navigation.

---

**Last Updated**: February 15, 2026
**Status**: Ready to Build
