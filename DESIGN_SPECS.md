# Miwang Inventory - Design Specifications
## Day 1: Authentication & Main App Shell

**Date**: February 15, 2026
**Platform**: Next.js 16 (App Router), Shadcn UI (new-york), Tailwind CSS v4
**Design Tokens**: Neutral OkLch theme with dark mode support

---

## 1. Login Page

### Purpose
Secure user authentication screen for existing Miwang Inventory users. Provides a welcoming, professional entry point with clear branding and straightforward form interaction.

### User Flow
1. User lands on login page (unauthenticated route)
2. Enters email and password credentials
3. Clicks "Sign in" button
4. (On success) Redirect to Dashboard
5. (On error) Display inline error message
6. New users can navigate to Signup via link below form

### Layout Specification

**Desktop (1024px+)**
- Full-height centered container with flexbox
- Left side: Miwang branding and illustration/messaging (optional, 40% width)
- Right side: Login form card (60% width, max-width 480px within right section)
- Form card: 400px wide with 48px padding, positioned center-right
- Minimum viewport: 1024px for optimal layout

**Tablet (768px - 1023px)**
- Single column, centered layout
- Form card: Full width with 24px horizontal margins
- Branding text/logo centered at top with 32px margin-bottom
- Total usable width: 100% - 48px margins

**Mobile (320px - 767px)**
- Full-screen single column
- Form card: Full width with 16px horizontal padding
- Branding at top with 24px margin-bottom
- Total usable width: 100% - 32px padding

### Component Breakdown

#### 1.1 Page Container
**Component**: Custom `<div>`
**Layout**: Flexbox, full-height
**Spec**:
```
min-h-screen
flex items-center justify-center
bg-background
p-4 md:p-0
```

#### 1.2 Branding Section (Desktop Only)
**Component**: `<div>` (hidden on mobile/tablet)
**Content**:
- Miwang logo (64px x 64px, use placeholder SVG or image)
- Tagline: "Smart Inventory Management" (18px, medium weight)
- Brand description: 2-3 lines describing the platform

**Spec (Desktop only)**:
```
hidden lg:flex flex-col items-center justify-center
w-[40%] pr-12
text-center
```

**Colors**:
- Logo background: var(--primary) (oklch(0.205 0 0))
- Text: var(--foreground)
- Secondary text: var(--muted-foreground)

#### 1.3 Form Card
**Component**: Shadcn `<Card>`
**Dimensions**:
- Desktop: 480px max-width
- Tablet: 100% with 24px margins (max ~600px)
- Mobile: 100% with 16px padding

**Spacing**:
- Outer padding: 48px (desktop), 32px (tablet), 24px (mobile)
- Inner section gaps: 24px
- Form field gaps: 20px

**Spec**:
```
Card with shadow-lg on desktop, shadow-md on mobile
border-border rounded-lg
bg-card text-card-foreground
```

#### 1.4 Form Title
**Component**: `<h1>` with Heading 1 styles
**Typography**:
- Font: Geist Sans
- Size: 32px desktop / 28px mobile
- Weight: 600 (semibold)
- Line height: 1.2
- Letter spacing: -0.5px
- Color: var(--foreground)
- Margin: 0 0 8px 0

**Text**: "Welcome back"

#### 1.5 Form Subtitle
**Component**: `<p>`
**Typography**:
- Font: Geist Sans
- Size: 14px
- Weight: 400
- Line height: 1.5
- Color: var(--muted-foreground)
- Margin-bottom: 32px

**Text**: "Sign in to your Miwang account to continue"

#### 1.6 Email Input Field
**Component**: Shadcn `<Input>` wrapped in form field
**Layout**:
```
flex flex-col gap-2
```

**Label Spec**:
- Component: Shadcn `<Label>`
- Typography: 14px, 500 weight, var(--foreground)
- Text: "Email"
- htmlFor: "email"

**Input Spec**:
- Type: "email"
- Placeholder: "you@example.com"
- Required: true
- AutoComplete: "email"
- Class: h-10 px-3 py-2
- Border: border-input
- Focus: ring-2 ring-ring ring-offset-2
- Background: bg-background

**States**:
- Default: border-input, cursor-text
- Hover: border-border (slightly darker)
- Focus: ring-2 ring-ring outline-none
- Error: border-destructive ring-destructive/50
- Disabled: bg-muted cursor-not-allowed opacity-50

#### 1.7 Password Input Field
**Component**: Shadcn `<Input>` wrapped in form field
**Layout**: Same as email field

**Label Spec**:
- Text: "Password"
- htmlFor: "password"

**Input Spec**:
- Type: "password"
- Placeholder: "••••••••"
- Required: true
- AutoComplete: "current-password"
- Class: h-10 px-3 py-2

**States**: Same as email field

**Icon/Toggle** (optional enhancement):
- Eye icon (Lucide `Eye`/`EyeOff`) on right side
- 32x32px clickable area
- Toggle password visibility on click
- Position: absolute right-3 top-1/2 transform -translate-y-1/2

#### 1.8 "Remember me" Checkbox (Optional)
**Component**: Custom checkbox or future Shadcn checkbox component
**Layout**:
```
flex items-center gap-2 mt-2
```

**Specs**:
- Checkbox: 18x18px, border-input, rounded-sm
- Label: 14px, var(--foreground), cursor-pointer
- Text: "Remember me for 30 days"

#### 1.9 Sign In Button
**Component**: Shadcn `<Button>`
**Dimensions**:
- Width: 100%
- Height: 40px (h-10)
- Padding: 8px 16px
- Margin-top: 24px

**Typography**:
- Font: Geist Sans
- Size: 14px
- Weight: 500
- Text: "Sign in"

**States**:
- Default: bg-primary text-primary-foreground, cursor-pointer
- Hover: bg-primary/90 (10% darker)
- Active: bg-primary/80
- Focus: ring-2 ring-ring ring-offset-2
- Disabled: bg-muted text-muted-foreground cursor-not-allowed opacity-50
- Loading: cursor-not-allowed, spinner icon before text, opacity-70

**Loading State**:
- Display spinner icon (Lucide `Loader2`) with rotation animation
- Text changes to "Signing in..."
- Button disabled during submission

#### 1.10 Error Message Display
**Component**: Alert or custom error div
**Layout**: Below password input, above "Remember me"
**Spec**:
```
flex items-start gap-2
p-3 rounded-md
bg-destructive/10 border border-destructive/30
text-destructive text-sm
```

**Content**:
- Icon: Lucide `AlertCircle` (16x16px, flex-shrink-0)
- Text: Specific error message (e.g., "Invalid email or password")

**Animation**: Fade in, 150ms ease-out

#### 1.11 Signup Link
**Component**: Paragraph with inline link
**Layout**: Centered below button, margin-top 24px
**Typography**:
- Font: Geist Sans
- Size: 14px
- Weight: 400
- Color: var(--muted-foreground)

**Link Spec**:
- Text: "Sign up"
- Color: var(--primary)
- Hover: underline
- Focus: ring-2 ring-ring rounded-sm
- Class: font-medium hover:underline

**Full text**: "Don't have an account? [Sign up](#)"

#### 1.12 Divider & Social Login (Optional Phase 2)
**Component**: Shadcn `<Separator>` + optional social buttons
**Layout**:
```
flex items-center gap-4 my-6
```

**Spec**:
- Separator with centered text: "or continue with"
- Optional: Google + GitHub login buttons below

---

## 2. Signup Page

### Purpose
User registration for new Miwang Inventory accounts. Provides form with email, password confirmation, and name entry with input validation.

### User Flow
1. User navigates to signup page or clicks signup link from login
2. Enters full name, email, password, confirm password
3. Optionally accepts terms & conditions
4. Clicks "Create account" button
5. (On success) Account created, redirect to dashboard or verification screen
6. (On error) Display inline validation errors
7. Existing users can return to login via link

### Layout Specification

**Responsive Pattern**: Identical to Login Page
- Desktop: Sidebar + centered form (if branding included)
- Tablet: Centered form with margins
- Mobile: Full-width form with padding

### Component Breakdown

#### 2.1 Form Container & Title
**Identical to Login** with adjustments:
- Title: "Create your account"
- Subtitle: "Join Miwang to start managing inventory"
- Padding: 48px desktop, 32px tablet, 24px mobile

#### 2.2 Name Input Field
**Component**: Shadcn `<Input>`
**Order**: First field (before email)
**Layout**:
```
flex flex-col gap-2
```

**Label**: "Full Name"
**Input Spec**:
- Type: "text"
- Placeholder: "John Doe"
- Required: true
- AutoComplete: "name"
- Validation: Min 2 chars, max 100 chars

**States**: Same as email/password inputs

#### 2.3 Email Input Field
**Identical to Login page** but with signup validation
- Must not exist in database (async validation with debounce)
- Error if already registered: "Email already in use"

#### 2.4 Password Input Field
**Component**: Shadcn `<Input>` with validation feedback
**Label**: "Password"
**Input Spec**:
- Type: "password" (with optional visibility toggle)
- Placeholder: "••••••••"
- Required: true
- AutoComplete: "new-password"
- Min length: 8 characters
- Must contain: uppercase, lowercase, number, special char (optional but recommended)

**Password Strength Indicator** (optional enhancement):
- Bar under input: 4px height, 100% width
- Colors: red (weak), yellow (fair), green (strong)
- Updates as user types
- Text below bar: "Strength: Weak / Fair / Strong"
- Positioning: Below input, above next field

#### 2.5 Confirm Password Input Field
**Component**: Shadcn `<Input>`
**Label**: "Confirm Password"
**Input Spec**:
- Type: "password"
- Placeholder: "••••••••"
- Required: true
- Must match password field
- Error: "Passwords do not match"

#### 2.6 Terms & Conditions Checkbox (Optional)
**Component**: Checkbox + label
**Layout**:
```
flex items-start gap-2 mt-4
```

**Spec**:
- Checkbox: 18x18px, rounded-sm, margin-top: 2px (align with text)
- Label: 14px, var(--foreground)
- Text: "I agree to the [Terms of Service](#) and [Privacy Policy](#)"
- Required: true
- Error state: border-destructive background

**Links**:
- Color: var(--primary)
- Hover: underline
- Accessible: proper focus rings

#### 2.7 Create Account Button
**Component**: Shadcn `<Button>`
**Spec**:
- Width: 100%
- Height: 40px (h-10)
- Margin-top: 32px (extra spacing because of additional fields)
- Text: "Create account"
- States: Same as login button (default, hover, active, focus, disabled, loading)

**Loading Spinner**: Lucide `Loader2` icon with rotation animation

#### 2.8 Field-Level Error Messages
**Component**: Small text below each input
**Typography**:
- Font: Geist Sans
- Size: 12px
- Weight: 400
- Color: var(--destructive)
- Margin-top: 4px

**Validation Messages**:
- Email: "Please enter a valid email" or "Email already in use"
- Password: "Min 8 characters" or "Include uppercase, lowercase, number"
- Confirm: "Passwords do not match"
- Name: "Please enter your name"

**Animation**: Fade in 100ms ease-out

#### 2.9 Back to Login Link
**Component**: Centered paragraph below button
**Layout**: Margin-top 24px
**Typography**: 14px, var(--muted-foreground)
**Text**: "Already have an account? [Sign in](#)"
**Link Styling**: var(--primary), hover:underline, focus ring

---

## 3. App Shell / Main Layout

### Purpose
Primary application container with persistent sidebar navigation, main content area, and responsive layout for all authenticated pages. Serves as wrapper for Dashboard, Inventory, Products, and other app pages.

### User Flow
1. Authenticated user enters app
2. Layout renders sidebar with persistent navigation
3. User navigates between sections (Dashboard, Inventory, etc.)
4. Sidebar collapses on mobile for space
5. User clicks avatar in sidebar footer to access profile/logout menu
6. Logout redirects to login page

### Layout Specification

**Desktop (1024px+)**
- Sidebar: 256px fixed width, full height, sticky
- Content area: flex-grow, full height
- Layout: CSS Grid or Flexbox with sidebar + main
- No hamburger menu

**Tablet (768px - 1023px)**
- Sidebar: Collapsible (compact mode), 80px width when collapsed, 240px when expanded
- Toggle button: Top-left of content area (24px margin)
- Content area: Adjusts width based on sidebar state
- Header: Shows when sidebar is expanded

**Mobile (320px - 767px)**
- Sidebar: Hidden by default
- Sheet overlay: Hamburger menu triggers full-screen sidebar (Sheet component)
- Header: Hamburger icon (32x32px), Logo/title, User avatar
- Content area: Full width

### Component Breakdown

#### 3.1 Root Layout Structure
**File Location**: `src/app/(authenticated)/layout.tsx`

**Wrapper Component**: Custom or Shadcn Sidebar integration
**Structure**:
```
<div className="flex h-screen">
  <Sidebar /> {/* or custom sidebar */}
  <main className="flex-1 overflow-auto">
    {children}
  </main>
</div>
```

**Styling**:
- Display: flex
- Height: 100vh
- Background: var(--background)
- Font: var(--font-sans)

#### 3.2 Sidebar Container
**Component**: Custom `<aside>` or Shadcn Sidebar
**Dimensions**:
- Desktop: 256px width, 100vh height, position fixed/sticky
- Tablet: 80px (compact) / 240px (expanded)
- Mobile: Hidden, overlaid on Sheet

**Styling**:
```
bg-sidebar text-sidebar-foreground
border-right border-sidebar-border
flex flex-col h-screen
overflow-y-auto
```

**Spacing**:
- Padding: 16px (desktop), 12px (tablet/mobile)
- Gap between sections: 24px

#### 3.3 Logo/Branding Section
**Component**: `<div>` at top of sidebar
**Content**:
- Logo: 32x32px SVG or image
- Brand name: "Miwang" (16px, 600 weight)
- Tagline: "Inventory" (12px, 400 weight, var(--sidebar-muted-foreground))

**Layout**:
```
flex items-center gap-3
pb-6
border-b border-sidebar-border
```

**Styling**:
- Logo container: 40x40px, bg-sidebar-primary rounded-md, flex items-center justify-center
- Text: var(--sidebar-foreground)

**States**:
- Normal: Full visibility
- Tablet (collapsed): Logo only, text hidden
- Mobile: Shown in header above sheet

#### 3.4 Navigation Menu Section
**Component**: `<nav>` containing navigation items
**Layout**:
```
flex-1 py-6
flex flex-col gap-1
```

**Navigation Items**:
1. Dashboard
2. Inventory
3. Products
4. Categories
5. Orders
6. Suppliers
7. Settings

#### 3.5 Navigation Item (Repeating Component)
**Component**: Custom nav item or shadcn Button variant
**Dimensions**:
- Height: 40px (h-10)
- Width: 100%
- Padding: 8px 12px

**Typography**:
- Font: Geist Sans
- Size: 14px
- Weight: 500
- Color (default): var(--sidebar-foreground)

**Layout**:
```
flex items-center gap-3
rounded-md
cursor-pointer
transition-colors duration-150ms ease-out
```

**Icons** (Lucide React):
- Dashboard: Home
- Inventory: Package
- Products: ShoppingCart
- Categories: Layers
- Orders: ClipboardList
- Suppliers: Truck
- Settings: Settings

**Icon Spec**:
- Size: 20x20px
- Color: var(--sidebar-foreground)
- Margin: 0

**States**:
- Default: bg-transparent, text-sidebar-foreground
- Hover: bg-sidebar-accent, text-sidebar-accent-foreground
- Active: bg-sidebar-primary, text-sidebar-primary-foreground
- Focus: ring-2 ring-sidebar-ring outline-none

**Active State Indicator**:
- Background: var(--sidebar-primary) oklch(0.205 0 0)
- Text: var(--sidebar-primary-foreground) oklch(0.985 0 0)
- Left border: 3px solid var(--sidebar-primary-foreground)

**Tablet Compact Mode**:
- Only icon visible (no text)
- Width: 48px
- Tooltip appears on hover (Shadcn Tooltip component)
- Tooltip: 12px text, 200ms delay, positioned right

**Mobile Hidden**: Items rendered inside Sheet overlay

#### 3.6 Sidebar Collapse Toggle (Tablet)
**Component**: Button with Lucide icon
**Position**: Top-right of sidebar, inside sidebar
**Dimensions**: 32x32px, square
**Icon**:
- Expand: ChevronRight
- Collapse: ChevronLeft
- Size: 16x16px

**Styling**:
```
bg-sidebar-accent rounded-md
color-sidebar-accent-foreground
hover:bg-sidebar-accent/80
```

**Action**: Toggle sidebar between 80px and 240px width
**Animation**: Width change over 200ms ease-in-out

#### 3.7 Sidebar Footer / User Menu
**Component**: `<div>` at bottom of sidebar, sticky/fixed bottom
**Layout**:
```
border-t border-sidebar-border
pt-4
mt-auto
flex flex-col gap-3
```

**Content**:
- Divider: Shadcn Separator
- User avatar section

**User Avatar Section**:
- Component: Shadcn Avatar + DropdownMenu
- Layout: Horizontal flex with gap-3
- Avatar: 40x40px, initials or profile image
- User info: Name (14px, 500), Email (12px, 400, var(--sidebar-muted-foreground))
- On click: Open dropdown menu

**Dropdown Menu Items**:
1. Profile
2. Account Settings
3. Separator
4. Logout

**Menu Styling**:
- Position: "right" or "top"
- Offset: 8px
- Background: var(--popover)
- Border: var(--border)

#### 3.8 Mobile Sheet Sidebar
**Component**: Shadcn `<Sheet>` with overlay
**Trigger**: Hamburger button (Menu icon) in mobile header
**Dimensions**:
- Width: 80vw (max 320px)
- Height: 100vh
- Position: Left side

**Content**:
- Logo/Branding at top
- Full navigation menu (all 7 items visible, vertically stacked)
- User menu in footer
- Close button (X icon) top-right

**Animation**:
- Slide in from left: 300ms ease-out
- Overlay fade in: 200ms ease-out

**Styling**:
```
bg-sidebar
padding-4
flex flex-col gap-4
```

#### 3.9 Mobile Header
**Component**: Fixed header above Sheet, only on mobile
**Dimensions**: 56px height
**Layout**:
```
flex items-center justify-between
px-4 py-3
border-b border-border
bg-card
```

**Content**:
- Left: Hamburger button (Menu, 24x24px)
- Center: Logo or current page title
- Right: User avatar (32x32px) or notifications

**Hamburger Button**:
- 32x32px touch target, centered icon
- Color: var(--foreground)
- Hover: bg-muted rounded-md

#### 3.10 Main Content Area
**Component**: `<main>` or `<div>`
**Layout**:
```
flex-1 overflow-auto
bg-background
```

**Responsive Padding**:
- Desktop: 24px or 32px
- Tablet: 20px
- Mobile: 16px

**Content Max-Width** (optional): 1400px on large screens

---

## 4. Dashboard Page

### Purpose
Primary landing page for authenticated users showing inventory overview, key metrics, recent activity, and quick action shortcuts. Provides at-a-glance understanding of business status.

### User Flow
1. User logs in or navigates to Dashboard
2. Page loads with summary cards at top
3. User views key metrics (Products, Low Stock, Orders, Value)
4. User reviews recent activity in activity list
5. User accesses quick actions for common tasks
6. User can drill down into specific sections

### Layout Specification

**Desktop (1024px+)**
- Single column layout with full width
- Grid row 1: 4 summary cards in 4 columns (equal width)
- Grid row 2: Recent Activity section (full width)
- Grid row 3: Quick Actions section (full width or 2 columns)
- Max width: 1400px
- Padding: 32px

**Tablet (768px - 1023px)**
- Grid row 1: 2 summary cards per row (2 rows of 2)
- Grid row 2: Recent Activity (full width)
- Grid row 3: Quick Actions (2 columns)
- Padding: 20px
- Gap: 16px between cards

**Mobile (320px - 767px)**
- Single column layout
- Grid row 1: 1 card per row (4 rows of 1)
- Grid row 2: Recent Activity (full width)
- Grid row 3: Quick Actions (1 per row, stacked)
- Padding: 16px
- Gap: 12px between cards

### Component Breakdown

#### 4.1 Page Header
**Component**: `<div>` or `<header>`
**Position**: Top of main content, before cards
**Layout**:
```
flex items-center justify-between
mb-8
```

**Content**:
- Title: "Dashboard"
- Optional: Date/time or last updated timestamp

**Typography**:
- Title: 32px, 600 weight, var(--foreground)
- Timestamp: 14px, 400 weight, var(--muted-foreground)

**Spacing**:
- Margin-bottom: 32px
- Title to timestamp: 8px vertical gap

#### 4.2 Summary Cards Container
**Component**: CSS Grid or Flex
**Layout**:
```
grid grid-cols-4 md:grid-cols-2 sm:grid-cols-1 gap-6
mb-8
```

**Responsive Grid**:
- Desktop (1024px+): 4 columns
- Tablet (768px-1023px): 2 columns
- Mobile (320px-767px): 1 column
- Gap: 24px (desktop), 16px (tablet), 12px (mobile)

#### 4.3 Summary Card Component (Repeating)
**Component**: Shadcn `<Card>` wrapper
**Dimensions**: Equal width within grid, min-height 140px

**Content Structure**:
```
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      {Label}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">{Value}</div>
    <p className="text-xs text-muted-foreground mt-2">{Trend}</p>
  </CardContent>
</Card>
```

**Typography**:
- Label: 12px, 500 weight, var(--muted-foreground)
- Value: 32px, 700 weight, var(--foreground)
- Trend: 12px, 400 weight, var(--muted-foreground)

**Styling**:
- Background: var(--card)
- Border: 1px var(--border)
- Padding: 20px
- Border radius: var(--radius-lg) (10px)
- Shadow: shadow-sm

**States**:
- Default: static
- Hover: shadow-md, bg-card/50 slightly elevated (optional)

**Icons** (optional, top-right):
- Component: Lucide icon, 20x20px
- Color: var(--muted-foreground)
- Opacity: 50%
- Position: top-right corner, 16px from edges

#### 4.4 Summary Card - Total Products
**Label**: "Total Products"
**Icon**: ShoppingCart or Package
**Value Format**: Number (e.g., "1,234")
**Trend**: "+12 from last month" or "+2.5%"
**Trend Color**: Green (success) or neutral

#### 4.5 Summary Card - Low Stock Alerts
**Label**: "Low Stock Alerts"
**Icon**: AlertCircle or TrendingDown
**Value Format**: Number with color (e.g., "23" in red if high)
**Trend**: "5 critical" (warning text in red)
**Color Variation**: If value > 10, text becomes more prominent red

#### 4.6 Summary Card - Pending Orders
**Label**: "Pending Orders"
**Icon**: ClipboardList or Package2
**Value Format**: Number (e.g., "18")
**Trend**: "4 arriving today"
**Trend Color**: Blue (info) for upcoming

#### 4.7 Summary Card - Total Inventory Value
**Label**: "Total Inventory Value"
**Icon**: DollarSign or TrendingUp
**Value Format**: Currency (e.g., "$45,231.50")
**Trend**: "+8.2% from last period"
**Trend Color**: Green (positive) or red (negative)

#### 4.8 Recent Activity Section
**Component**: Shadcn `<Card>` wrapper
**Dimensions**: Full width, min-height 300px
**Position**: Below summary cards, margin-top 32px

**Card Structure**:
```
<Card>
  <CardHeader>
    <CardTitle>Recent Activity</CardTitle>
    <CardDescription>Latest inventory updates</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Activity list */}
  </CardContent>
</Card>
```

**Header Typography**:
- Title: 18px, 600 weight, var(--foreground)
- Description: 14px, 400 weight, var(--muted-foreground)

**Card Styling**:
- Background: var(--card)
- Border: 1px var(--border)
- Padding: 24px
- Border radius: var(--radius-lg)

#### 4.9 Activity List Container
**Component**: Vertical list or timeline
**Layout**:
```
flex flex-col gap-0
divide-y divide-border
```

**Height**: Max 600px with scrollable content
**Overflow**: overflow-y-auto

#### 4.10 Activity Item (Repeating)
**Component**: Custom list item
**Dimensions**: Full width, min-height 60px, padding 16px 0
**Layout**:
```
flex items-start gap-3
py-4
px-0
border-b border-border last:border-b-0
```

**Content Structure**:
```
<div className="flex-shrink-0">
  {/* Avatar or Icon */}
</div>
<div className="flex-1 min-w-0">
  <p className="font-medium text-sm">{Action}</p>
  <p className="text-muted-foreground text-xs">{Details}</p>
  <p className="text-muted-foreground text-xs mt-1">{Timestamp}</p>
</div>
```

**Avatar/Icon**:
- Size: 36x36px
- Component: Shadcn Avatar or Lucide icon in circle
- Background: var(--muted) or color-coded by action type
- Icon size: 18x18px

**Action Text**:
- Font: Geist Sans, 14px, 500 weight
- Color: var(--foreground)

**Details Text**:
- Font: Geist Sans, 13px, 400 weight
- Color: var(--muted-foreground)
- Truncate: text-ellipsis, max-width 100%

**Timestamp**:
- Font: Geist Sans, 12px, 400 weight
- Color: var(--muted-foreground)
- Format: "2 hours ago" or "Feb 15, 2:34 PM"

**Activity Types** (color-coded by action):
- Stock Updated: bg-blue-100 (light), icon Package
- Order Received: bg-green-100, icon CheckCircle
- Low Stock Alert: bg-red-100, icon AlertCircle
- New Product: bg-purple-100, icon Plus
- Order Shipped: bg-orange-100, icon Send

#### 4.11 Empty State (No Activity)
**Component**: Centered message in activity section
**Display**: If no recent activity
**Content**:
- Icon: Activity or History (64x64px, var(--muted-foreground))
- Text: "No recent activity"
- Subtext: "Your activity will appear here"
- Layout: flex flex-col items-center gap-3 py-12
- Typography: 16px title, 14px subtitle, var(--muted-foreground)

#### 4.12 Quick Actions Section
**Component**: Shadcn `<Card>` or section
**Dimensions**:
- Desktop: 2 columns (split with Recent Activity if layout allows)
- Tablet/Mobile: Full width below Recent Activity
- Margin-top: 32px

**Card Structure** (if using card):
```
<Card>
  <CardHeader>
    <CardTitle>Quick Actions</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Grid of action buttons */}
  </CardContent>
</Card>
```

**Action Buttons Container**:
```
grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 gap-4
```

#### 4.13 Quick Action Button (Repeating)
**Component**: Shadcn Button variant or custom button
**Dimensions**:
- Height: 80px (mobile), 100px (tablet/desktop)
- Width: 100% in grid
- Aspect ratio: 1:1 on desktop, responsive on mobile

**Layout**:
```
flex flex-col items-center justify-center gap-2
rounded-lg
border border-border
bg-card
cursor-pointer
transition all duration-150ms ease-out
```

**Content**:
- Icon: Lucide, 32x32px (desktop), 24x24px (mobile)
- Label: 14px, 500 weight, text-center, max 2 lines

**States**:
- Default: border-border, bg-card, color var(--foreground)
- Hover: border-primary, bg-muted, shadow-md, scale 1.02
- Active: bg-primary, color var(--primary-foreground)
- Focus: ring-2 ring-ring outline-none

**Quick Actions List**:
1. "Add Product" - Icon Plus, color blue
2. "Check Stock" - Icon Package, color green
3. "Create Order" - Icon ShoppingCart, color purple
4. "View Reports" - Icon BarChart3, color orange

#### 4.14 Responsive Adjustments

**Mobile (320px - 767px)**:
- Cards stack to 1 column
- Quick Actions: 2 columns per row (still fits)
- Heights reduced: 80px for action buttons
- Font sizes: Title 28px, value 24px

**Tablet (768px - 1023px)**:
- Summary cards: 2x2 grid
- Quick Actions: 2 columns
- Padding: 20px
- Font sizes: Title 28px, value 28px

**Desktop (1024px+)**:
- Summary cards: 4 columns
- Quick Actions: Can expand to different layout if space
- Padding: 32px
- Max width: 1400px centered

#### 4.15 Loading States

**Page Loading**:
- Skeleton cards instead of summary cards
- Skeleton list items in Recent Activity
- Fade in animation over 300ms when data arrives

**Skeleton Card**:
```
<Card>
  <div className="h-4 bg-muted rounded animate-pulse mb-2"></div>
  <div className="h-8 bg-muted rounded animate-pulse"></div>
</Card>
```

**Activity List Skeleton**:
- 3-5 placeholder items with avatar skeleton + text skeleton
- Staggered animation (each item 50ms delay)

#### 4.16 Error State

**Display**: If data fetch fails
**Component**: Alert or card with error message
**Content**:
- Icon: AlertTriangle or AlertCircle (24x24px)
- Title: "Failed to load dashboard"
- Message: "Please refresh the page or contact support"
- Button: "Retry" (Shadcn Button, secondary)

**Styling**:
```
bg-destructive/10
border border-destructive/30
text-destructive
rounded-lg
padding-4
```

---

## Design Tokens Reference

### Color Variables (CSS)
```
--background: oklch(1 0 0) [Light: white, Dark: near-black]
--foreground: oklch(0.145 0 0) [Light: near-black, Dark: white]
--primary: oklch(0.205 0 0) [Dark gray, inverts in dark mode]
--primary-foreground: oklch(0.985 0 0) [Nearly white]
--card: oklch(1 0 0) [Light: white, Dark: dark gray]
--card-foreground: oklch(0.145 0 0) [Light: near-black, Dark: white]
--border: oklch(0.922 0 0) [Light gray border]
--input: oklch(0.922 0 0) [Input background/border]
--muted: oklch(0.97 0 0) [Very light gray/secondary]
--muted-foreground: oklch(0.556 0 0) [Muted text gray]
--destructive: oklch(0.577 0.245 27.325) [Red/orange for errors]
--ring: oklch(0.708 0 0) [Focus ring color]
--sidebar: oklch(0.985 0 0) [Light: white, Dark: dark gray]
--sidebar-foreground: oklch(0.145 0 0) [Text in sidebar]
--sidebar-primary: oklch(0.205 0 0) [Active nav item background]
--sidebar-primary-foreground: oklch(0.985 0 0) [Active nav text]
--sidebar-accent: oklch(0.97 0 0) [Hover nav item background]
--sidebar-accent-foreground: oklch(0.205 0 0) [Hover nav text]
--sidebar-border: oklch(0.922 0 0) [Dividers in sidebar]
```

### Border Radius
```
--radius: 0.625rem (10px) - default
--radius-sm: 4px (0.25rem)
--radius-md: 8px (0.5rem)
--radius-lg: 10px (0.625rem) - default, use for cards
--radius-xl: 14px (0.875rem)
--radius-2xl: 18px (1.125rem)
--radius-3xl: 22px (1.375rem)
--radius-4xl: 26px (1.625rem)
```

### Typography Scale
```
Font Family (Sans): var(--font-geist-sans)
Font Family (Mono): var(--font-geist-mono)

Size Scale:
- 12px: Small labels, timestamps
- 13px: Body text, descriptions
- 14px: Standard body, form labels
- 16px: Larger body text
- 18px: Section titles
- 20px: Smaller headings
- 24px: Larger headings
- 28px: Page titles (mobile)
- 32px: Main page title (desktop)

Weight Scale:
- 400: Regular (body, descriptions)
- 500: Medium (labels, emphasis)
- 600: Semibold (headings, titles)
- 700: Bold (large values, strong emphasis)

Line Height:
- 1.2: Headings
- 1.4: Large body text
- 1.5: Standard body text
- 1.6: Small body text

Letter Spacing:
- -0.5px: Large headings (optical balance)
- 0px: Standard (default)
- 0.5px: Small caps
```

### Spacing Scale (Tailwind)
```
0px: 0
4px: 1 (xs)
8px: 2 (sm)
12px: 3 (md)
16px: 4 (lg)
20px: 5 (xl)
24px: 6 (2xl)
32px: 8 (3xl)
48px: 12 (4xl)
64px: 16 (5xl)
```

### Shadow Scale
```
shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
```

### Animation/Transition
```
Duration: 150ms (ui interactions), 200ms (nav), 300ms (modals)
Easing: ease-out (entrances), ease-in (exits), ease-in-out (sustained)
Disable: prefers-reduced-motion for animations
```

---

## Shadcn Components to Install

Required for implementation:
- Button
- Input
- Label
- Card
- Form
- Avatar
- DropdownMenu
- Sheet (mobile sidebar)
- Separator
- Tooltip (for tablet compact sidebar)
- Alert (error states)
- Skeleton (loading states)

## Implementation Priority

**Phase 1 (MVP)**:
1. Login Page
2. Signup Page
3. App Shell with sidebar
4. Dashboard with summary cards and recent activity

**Phase 2**:
- Quick actions
- Activity filtering
- Dark mode toggle in sidebar
- Password strength indicator on signup

**Phase 3**:
- Social login
- Terms/Privacy modal
- Profile page
- Advanced dashboard analytics

---

## Mobile-First Development Notes

1. Design all layouts starting from mobile (320px), then enhance for larger screens
2. Touch targets: Minimum 44x44px for all interactive elements
3. Viewport: Use `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
4. Test on actual devices: iPhone SE (375px), iPad (768px), Desktop (1440px+)
5. Use Tailwind's responsive prefixes consistently: `sm:`, `md:`, `lg:`
6. Breakpoints:
   - Mobile: 0-639px (sm: 640px)
   - Tablet: 640px-1023px (md: 768px, lg: 1024px)
   - Desktop: 1024px+

---

## Accessibility Checklist

- [ ] All form inputs have associated labels
- [ ] Color contrast: Minimum WCAG AA (4.5:1 for body text, 3:1 for large)
- [ ] Focus indicators: Visible ring on all interactive elements
- [ ] Keyboard navigation: Tab through forms, sidebar nav, buttons
- [ ] Screen reader: ARIA labels for icons, alt text for images
- [ ] Error messages: Associated with form fields, announced to screen readers
- [ ] Loading states: Hidden from screen readers with aria-hidden
- [ ] Motion: Respects prefers-reduced-motion, animations are optional
- [ ] Touch targets: 44x44px minimum

## Dark Mode Specification

All color variables use OkLch with automatic dark mode support via CSS custom properties.

**Implementation**:
- Use `next-themes` ThemeProvider in layout.tsx
- Add dark class to `<html>` element automatically
- Toggle button: Settings page or header
- Persist preference in localStorage

**Color Behavior**:
- Light mode (default): High contrast, white backgrounds
- Dark mode: Inverted text/backgrounds, maintained contrast
- No additional component changes needed—CSS variables handle everything

---

## File Structure for Implementation

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
│   │   ├── layout.tsx (app shell with sidebar)
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── inventory/
│   │   │   └── page.tsx
│   │   ├── products/
│   │   │   └── page.tsx
│   │   └── ... (other sections)
│   ├── layout.tsx (root with ThemeProvider)
│   └── globals.css
├── components/
│   ├── ui/ (shadcn components)
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── AppShell.tsx
│   └── dashboard/
│       ├── SummaryCard.tsx
│       ├── ActivityList.tsx
│       └── QuickActions.tsx
└── lib/
    └── utils.ts
```

---

**Last Updated**: February 15, 2026
**Status**: Ready for Implementation
**Next Steps**: Assign to frontend developer, begin component implementation in priority order
