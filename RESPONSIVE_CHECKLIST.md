# Responsive Design Checklist
## Mobile-First Development Guide

---

## Viewport Configuration

### Add to `src/app/layout.tsx` in `<head>`
```tsx
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
```

This ensures:
- Content scales properly on mobile
- Users can zoom up to 5x (accessibility)
- Prevents horizontal scroll on mobile

---

## Breakpoint Reference

### Tailwind Breakpoints
```
Default (mobile first): 0-639px        → No prefix
sm:  640px+                             → Small phones/landscape
md:  768px+                             → Tablets/larger phones
lg:  1024px+                            → Desktops/large tablets
xl:  1280px+                            → Large desktops
2xl: 1536px+                            → Very large displays
```

### Miwang App Breakpoints
- **Mobile**: 320px - 639px (sm)
- **Tablet**: 640px - 1023px (md + lg boundary)
- **Desktop**: 1024px+ (lg)
- **Large Desktop**: 1440px+

### Device Tests
| Device | Size | Breakpoint | Notes |
|--------|------|-----------|-------|
| iPhone SE | 375x667 | sm | Test form inputs, touch targets |
| iPhone 15 | 393x852 | sm | Standard mobile width |
| iPad Mini | 768x1024 | md | Tablet single column → 2 column |
| iPad Pro | 1024x1366 | lg | Full desktop layout |
| Desktop | 1440x900 | lg | Standard desktop |
| 4K Display | 2560x1440 | 2xl | Large monitors |

---

## CSS Grid Responsive Patterns

### 1. Summary Cards (4 → 2 → 1)
```jsx
{/* Desktop: 4 columns, Tablet: 2 columns, Mobile: 1 column */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Grid items */}
</div>
```

**Tailwind Pattern**:
- `grid-cols-1` → Mobile default
- `md:grid-cols-2` → Tablet: 2 columns
- `lg:grid-cols-4` → Desktop: 4 columns
- `gap-4` → Default 16px, adjust with `md:gap-6 lg:gap-8`

### 2. Two-Column Layout (Restack)
```jsx
{/* Desktop: 2 columns, Tablet: 2 columns, Mobile: 1 column */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Grid items */}
</div>
```

### 3. Quick Actions (2x2 → 2x1 → 1x1 per row)
```jsx
<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 4 items: Mobile 2x2, Tablet 2x1, Desktop 4x1 */}
</div>
```

---

## Responsive Component Patterns

### Login/Signup Form
```jsx
{/* Hide branding on mobile/tablet, show on desktop */}
<div className="hidden lg:flex flex-col w-2/5">
  {/* Branding section */}
</div>

{/* Card takes full width on mobile, centered on desktop */}
<div className="w-full max-w-md px-4 sm:px-0">
  <Card>{/* Form content */}</Card>
</div>
```

### Sidebar Navigation
```jsx
{/* Desktop: Fixed sidebar, visible */}
<aside className="hidden lg:flex flex-col w-64 bg-sidebar">
  {/* Sidebar navigation */}
</aside>

{/* Tablet: Collapsible sidebar, 80px when collapsed */}
<aside className="hidden md:flex lg:hidden w-20">
  {/* Compact sidebar */}
</aside>

{/* Mobile: Sheet overlay triggered by hamburger */}
<Sheet>
  <SheetContent className="w-4/5 max-w-xs">
    {/* Mobile sidebar */}
  </SheetContent>
</Sheet>
```

### Page Padding (Responsive)
```jsx
<div className="px-4 md:px-6 lg:px-8">
  {/* Mobile: 16px, Tablet: 24px, Desktop: 32px */}
</div>
```

### Typography Responsive Sizing
```jsx
{/* Title scales with breakpoint */}
<h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-semibold">
  Dashboard
</h1>

{/* Body text scaling */}
<p className="text-sm md:text-base lg:text-lg leading-normal md:leading-relaxed">
  Description text
</p>
```

---

## Mobile-Specific Considerations

### Touch Targets (Minimum 44x44px)
```jsx
{/* Button with proper touch size */}
<button className="min-h-11 min-w-11 px-3 py-2">
  {/* Tap-friendly button */}
</button>

{/* Icon button with larger hit area */}
<button className="w-10 h-10 flex items-center justify-center">
  <Icon className="w-5 h-5" />
</button>
```

### Mobile Navigation
```jsx
{/* Use hamburger menu on mobile */}
<button className="md:hidden">
  <Menu className="w-6 h-6" />
</button>

{/* Hide on mobile, show on desktop */}
<nav className="hidden md:flex">
  {/* Full navigation */}
</nav>
```

### Mobile Form Fields
```jsx
{/* Larger inputs for touch */}
<input className="h-11 px-3 py-2 text-base">
  {/* h-11 = 44px height for touch targets */}
</input>

{/* Don't use placeholder as label */}
<label>Email</label>
<input placeholder="you@example.com" />
```

### Mobile Spacing
```jsx
{/* Reduce spacing on mobile, increase on desktop */}
<div className="space-y-3 md:space-y-4 lg:space-y-6">
  {/* Items with responsive spacing */}
</div>

{/* Use smaller padding on mobile */}
<div className="p-3 sm:p-4 md:p-6 lg:p-8">
  {/* Content with responsive padding */}
</div>
```

---

## Responsive Image Handling

### Next.js Image Component
```tsx
import Image from 'next/image';

export default function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="Miwang Logo"
      width={200}
      height={200}
      className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20"
      priority={true} // For above-the-fold images
    />
  );
}
```

### Avatar Responsive Size
```jsx
<Avatar className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12">
  {/* Avatar with responsive size */}
</Avatar>
```

---

## Layout Patterns

### 1. Sidebar + Content (Desktop Only)
```jsx
<div className="flex h-screen">
  {/* Sidebar: Fixed 256px */}
  <aside className="hidden lg:flex w-64 flex-col">
    {/* Sidebar content */}
  </aside>

  {/* Main content: Flex grow */}
  <main className="flex-1 overflow-auto">
    {/* Page content */}
  </main>
</div>
```

### 2. Header + Content (Mobile Only)
```jsx
<div className="flex flex-col h-screen md:hidden">
  {/* Header: Fixed 56px */}
  <header className="h-14 border-b px-4 flex items-center justify-between">
    {/* Mobile header */}
  </header>

  {/* Content: Flex grow with scroll */}
  <main className="flex-1 overflow-auto">
    {/* Page content */}
  </main>
</div>
```

### 3. Stacked Layout (Mobile)
```jsx
{/* Single column on mobile, becomes grid on tablet */}
<div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items stack vertically on mobile */}
</div>
```

---

## Testing Checklist

### Mobile (375px)
- [ ] All form inputs are 44x44px minimum
- [ ] No horizontal scrolling
- [ ] Navigation is accessible (hamburger menu visible)
- [ ] Images scale properly
- [ ] Typography is readable without zooming
- [ ] Touch targets have space between them
- [ ] Padding is sufficient (16px minimum)
- [ ] Forms stack vertically

### Tablet (768px)
- [ ] 2-column layouts work properly
- [ ] Sidebar collapses to compact mode
- [ ] Cards don't overflow
- [ ] Touch targets still meet 44px minimum
- [ ] Typography sizes increase appropriately
- [ ] Spacing between elements increases

### Desktop (1024px+)
- [ ] Sidebar is fully visible (256px)
- [ ] 4-column grids display properly
- [ ] Max-width constraints respected
- [ ] Hover states work properly
- [ ] Cards have shadow depth
- [ ] Content doesn't stretch too wide

### 4K Display (2560px+)
- [ ] Content max-width respected (usually 1400px)
- [ ] Don't let content stretch full width
- [ ] Use `max-w-4xl` containers

---

## Common Responsive Issues & Fixes

### Issue: Form fields too small on mobile
```jsx
/* ❌ Bad */
<input className="px-2 py-1 text-sm" />

/* ✓ Good */
<input className="px-3 py-2 h-10 text-base md:text-sm" />
```

### Issue: Sidebar breaks on mobile
```jsx
/* ❌ Bad */
<aside className="w-64">
  {/* Shows on all screen sizes */}
</aside>

/* ✓ Good */
<aside className="hidden lg:flex w-64">
  {/* Only shows on desktop */}
</aside>
```

### Issue: Grid doesn't stack on mobile
```jsx
/* ❌ Bad */
<div className="grid grid-cols-3 gap-4">
  {/* Always 3 columns */}
</div>

/* ✓ Good */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive: 1, 2, 3 columns */}
</div>
```

### Issue: Images don't scale on mobile
```jsx
/* ❌ Bad */
<img src="..." width="400" height="300" />

/* ✓ Good */
<Image
  src="..."
  width={400}
  height={300}
  className="w-full h-auto max-w-md"
  alt="Description"
/>
```

### Issue: Padding causes overflow on mobile
```jsx
/* ❌ Bad */
<div className="p-8">
  {/* 32px padding leaves no space on 375px phone */}
</div>

/* ✓ Good */
<div className="p-4 md:p-6 lg:p-8">
  {/* Responsive: 16px, 24px, 32px */}
</div>
```

---

## Responsive Class Cheat Sheet

### Display/Visibility
```
hidden              /* display: none */
block               /* display: block */
flex                /* display: flex */
grid                /* display: grid */
md:flex              /* Flex on tablet+ */
lg:hidden            /* Hidden on desktop+ */
hidden lg:block      /* Hidden until desktop */
```

### Width
```
w-full              /* 100% */
w-1/2               /* 50% */
max-w-md            /* max-width: 448px */
w-72                /* width: 288px (18rem) */
md:w-2/3            /* 66% on tablet+ */
lg:w-1/4            /* 25% on desktop+ */
```

### Height
```
h-screen            /* 100vh */
h-full              /* 100% */
h-10                /* 40px */
min-h-screen        /* minimum 100vh */
md:h-96             /* 384px on tablet+ */
```

### Padding/Margin
```
p-4                 /* padding: 16px */
px-4                /* padding-left/right: 16px */
py-2                /* padding-top/bottom: 8px */
m-0                 /* margin: 0 */
mb-4                /* margin-bottom: 16px */
md:p-6 lg:p-8       /* 24px tablet, 32px desktop */
```

### Gap
```
gap-2               /* gap: 8px */
gap-4               /* gap: 16px */
md:gap-6            /* gap: 24px on tablet+ */
space-y-3           /* margin-bottom: 12px on children */
```

### Text
```
text-xs sm:text-sm md:text-base lg:text-lg  /* Responsive sizing */
text-center md:text-left                     /* Center on mobile */
line-clamp-2                                 /* Truncate after 2 lines */
truncate                                     /* Single line ellipsis */
```

---

## Dark Mode Responsive

All colors automatically handle dark mode via CSS variables.

```jsx
{/* No special responsive classes needed for dark mode */}
<div className="bg-card text-card-foreground">
  {/* Automatically inverted in dark mode */}
</div>

{/* Can add dark-mode-specific layout if needed */}
<div className="dark:hidden md:dark:flex">
  {/* Shown only in dark mode on tablet+ */}
</div>
```

---

## Performance Considerations

### Mobile Performance
1. Lazy load images off-screen
2. Reduce animation complexity
3. Use system fonts (no custom fonts on mobile)
4. Minimize bundle size
5. Use skeleton screens instead of spinners

### Responsive Images
```tsx
{/* Serve different image sizes */}
<picture>
  <source media="(max-width: 639px)" srcSet="small.png" />
  <source media="(min-width: 640px)" srcSet="large.png" />
  <img src="large.png" alt="Description" />
</picture>

{/* Or use Next.js Image with layout fill */}
<Image
  src={imagePath}
  alt="alt"
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw,
         (max-width: 1024px) 50vw,
         33vw"
/>
```

---

## Browser Support Testing

### Mobile Browsers
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Samsung Internet
- [ ] Firefox Mobile

### Desktop Browsers
- [ ] Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Edge

### Use BrowserStack or Similar
- Test on real devices
- Test on various versions
- Test on various network speeds (throttle in DevTools)

---

## Debugging Responsive Issues

### DevTools
1. Press F12 to open DevTools
2. Click responsive mode icon (Ctrl+Shift+M on Windows, Cmd+Shift+M on Mac)
3. Select device from dropdown or enter custom size
4. Test touch by holding Ctrl while clicking (or Shift on Mac)

### Check Breakpoints
```jsx
{/* Add utility for debugging */}
<div className="fixed bottom-4 right-4 px-2 py-1 bg-black text-white text-xs">
  <span className="sm:hidden">Mobile</span>
  <span className="hidden sm:inline md:hidden">Tablet</span>
  <span className="hidden md:inline lg:hidden">Desktop</span>
  <span className="hidden lg:inline">Large</span>
</div>
```

### Use Chrome DevTools
- Device mode (Ctrl+Shift+M)
- Responsive design (Ctrl+Shift+C)
- Toggle device toolbar
- Throttle network speed
- Simulate touch

---

## Final Checklist Before Launch

### Mobile (320px - 639px)
- [ ] Form fields are 44x44px minimum
- [ ] No horizontal scrolling
- [ ] Navigation is mobile-friendly
- [ ] Images are responsive
- [ ] Text is readable (16px minimum)
- [ ] Touch targets have spacing
- [ ] Padding doesn't overflow
- [ ] Modal/drawer width is 80vw or less

### Tablet (640px - 1023px)
- [ ] Sidebar collapses properly
- [ ] 2-column layouts work
- [ ] Images scale appropriately
- [ ] Touch targets still 44px+
- [ ] Spacing increases appropriately

### Desktop (1024px+)
- [ ] Sidebar is visible
- [ ] 4-column layouts work
- [ ] Max-width constraints applied
- [ ] Hover states functional
- [ ] Cards have proper shadow
- [ ] Content doesn't stretch full width

### All Sizes
- [ ] No console errors
- [ ] Images load properly
- [ ] Fonts load properly
- [ ] No layout shift (CLS)
- [ ] Animations perform well
- [ ] Touch targets accessible
- [ ] Focus indicators visible
- [ ] Color contrast passes WCAG AA

---

**Last Updated**: February 15, 2026
