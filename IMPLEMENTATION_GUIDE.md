# Implementation Guide - Design Specifications
## Quick Reference for Developers

This guide provides code patterns, component usage, and Tailwind class references from the design specs.

---

## 1. Login Page Implementation

### File: `src/app/(auth)/login/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // TODO: Add Supabase authentication logic here
      // const { data, error } = await supabase.auth.signInWithPassword({
      //   email: formData.email,
      //   password: formData.password,
      // });
      // if (error) throw error;
      // router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-0">
      {/* Branding Section - Desktop Only */}
      <div className="hidden lg:flex flex-col items-center justify-center w-2/5 pr-12 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-lg mb-4">
          <span className="text-2xl font-bold text-primary-foreground">M</span>
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Miwang</h2>
        <p className="text-sm text-muted-foreground mb-4">Smart Inventory Management</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Streamline your inventory operations with real-time tracking, automated alerts, and detailed analytics.
        </p>
      </div>

      {/* Form Card */}
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-12 md:p-8 sm:p-6">
          <h1 className="text-3xl md:text-2xl font-semibold mb-2 text-foreground">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Sign in to your Miwang account to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 mt-6"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⌛</span>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <a
              href="/signup"
              className="font-medium text-primary hover:underline focus:ring-2 focus:ring-ring rounded px-1"
            >
              Sign up
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
```

### Key Tailwind Classes Used
- `min-h-screen`: Full viewport height
- `flex items-center justify-center`: Vertical and horizontal centering
- `p-4 md:p-0`: Responsive padding
- `hidden lg:flex`: Show only on desktop
- `w-full max-w-md`: Responsive width with max constraint
- `text-3xl md:text-2xl`: Responsive font sizes
- `space-y-5`: Gap between form elements
- `bg-destructive/10 border border-destructive/30`: Error styling
- `animate-in fade-in`: Error message animation

---

## 2. Signup Page Implementation

### File: `src/app/(auth)/signup/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

type PasswordStrength = 'weak' | 'fair' | 'strong';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  submit?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const evaluatePasswordStrength = (pwd: string): PasswordStrength => {
    if (pwd.length < 8) return 'weak';
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*]/.test(pwd);

    const strength = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
    if (strength >= 3) return 'strong';
    if (strength >= 2) return 'fair';
    return 'weak';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof Errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    // Evaluate password strength
    if (name === 'password') {
      setPasswordStrength(evaluatePasswordStrength(value));
    }
  };

  const validate = (): boolean => {
    const newErrors: Errors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your name';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Min 8 characters';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Min 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    try {
      // TODO: Add Supabase signup logic here
      // const { data, error } = await supabase.auth.signUp({
      //   email: formData.email,
      //   password: formData.password,
      //   options: {
      //     data: { full_name: formData.name }
      //   }
      // });
      // if (error) throw error;
      // router.push('/dashboard');
    } catch (err: any) {
      setErrors(prev => ({
        ...prev,
        submit: err.message || 'An error occurred. Please try again.'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = (): string => {
    switch (passwordStrength) {
      case 'strong': return 'bg-green-500';
      case 'fair': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-0">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-12 md:p-8 sm:p-6">
          <h1 className="text-3xl md:text-2xl font-semibold mb-2 text-foreground">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Join Miwang to start managing inventory
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full w-1/3 ${getStrengthColor()} transition-all duration-200`} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength: <span className="capitalize">{passwordStrength}</span>
                  </p>
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{errors.submit}</p>
              </div>
            )}

            {/* Create Account Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 mt-8"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⌛</span>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <a
              href="/login"
              className="font-medium text-primary hover:underline focus:ring-2 focus:ring-ring rounded px-1"
            >
              Sign in
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
```

---

## 3. App Shell / Sidebar Implementation

### File: `src/components/layout/Sidebar.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Home,
  Package,
  ShoppingCart,
  Layers,
  ClipboardList,
  Truck,
  Settings,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Products', href: '/products', icon: ShoppingCart },
  { label: 'Categories', href: '/categories', icon: Layers },
  { label: 'Orders', href: '/orders', icon: ClipboardList },
  { label: 'Suppliers', href: '/suppliers', icon: Truck },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    // TODO: Implement logout logic
    // await supabase.auth.signOut();
  };

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border sticky top-0 transition-all duration-200 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-sidebar-primary rounded-md">
              <span className="text-lg font-bold text-sidebar-primary-foreground">M</span>
            </div>
            <div>
              <h1 className="font-semibold text-sidebar-foreground">Miwang</h1>
              <p className="text-xs text-sidebar-muted-foreground">Inventory</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4 space-y-3">
        <Separator />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 hover:bg-sidebar-accent rounded-md p-2 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    John Doe
                  </p>
                  <p className="text-xs text-sidebar-muted-foreground truncate">
                    john@example.com
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
```

### File: `src/app/(authenticated)/layout.tsx`

```tsx
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileHeader } from '@/components/layout/MobileHeader';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
```

---

## 4. Dashboard Page Implementation

### File: `src/app/(authenticated)/dashboard/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ShoppingCart,
  AlertCircle,
  ClipboardList,
  DollarSign,
  Plus,
  Package,
  Activity,
  BarChart3,
  CheckCircle,
  Send,
  Loader2,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  details: string;
  timestamp: Date;
  type: 'stock' | 'order' | 'alert' | 'product' | 'shipped';
}

interface SummaryMetric {
  label: string;
  value: string | number;
  trend: string;
  icon: React.ReactNode;
  color?: 'default' | 'warning' | 'success';
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setActivity([
        {
          id: '1',
          action: 'Stock Updated',
          details: 'Updated inventory for SKU-001 (Widget A)',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          type: 'stock',
        },
        {
          id: '2',
          action: 'Order Received',
          details: 'Purchase order #PO-2024-456 confirmed',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          type: 'order',
        },
        {
          id: '3',
          action: 'Low Stock Alert',
          details: 'Widget B quantity below threshold',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          type: 'alert',
        },
      ]);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const summaryCards: SummaryMetric[] = [
    {
      label: 'Total Products',
      value: '1,234',
      trend: '+12 from last month',
      icon: <ShoppingCart className="w-5 h-5" />,
    },
    {
      label: 'Low Stock Alerts',
      value: '23',
      trend: '5 critical',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'warning',
    },
    {
      label: 'Pending Orders',
      value: '18',
      trend: '4 arriving today',
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      label: 'Inventory Value',
      value: '$45,231.50',
      trend: '+8.2% from last period',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'success',
    },
  ];

  const quickActions = [
    { label: 'Add Product', icon: Plus, color: 'text-blue-500' },
    { label: 'Check Stock', icon: Package, color: 'text-green-500' },
    { label: 'Create Order', icon: ShoppingCart, color: 'text-purple-500' },
    { label: 'View Reports', icon: BarChart3, color: 'text-orange-500' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'stock':
        return <Package className="w-4 h-4" />;
      case 'order':
        return <CheckCircle className="w-4 h-4" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4" />;
      case 'product':
        return <Plus className="w-4 h-4" />;
      case 'shipped':
        return <Send className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'stock':
        return 'bg-blue-100';
      case 'order':
        return 'bg-green-100';
      case 'alert':
        return 'bg-red-100';
      case 'product':
        return 'bg-purple-100';
      case 'shipped':
        return 'bg-orange-100';
      default:
        return 'bg-muted';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-4">
        <h1 className="text-3xl md:text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back! Here's your inventory overview.
        </p>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-6 lg:px-8 pb-8 space-y-8">
        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCards.map((metric, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </CardTitle>
                  <div className="text-muted-foreground opacity-50">
                    {metric.icon}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {metric.value}
                </div>
                <p className={`text-xs mt-2 ${
                  metric.color === 'warning'
                    ? 'text-destructive'
                    : metric.color === 'success'
                    ? 'text-green-600'
                    : 'text-muted-foreground'
                }`}>
                  {metric.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest inventory updates</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4 py-4 border-b last:border-0">
                    <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length > 0 ? (
              <div className="space-y-0 max-h-96 overflow-y-auto">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-4 px-0 border-b border-border last:border-0"
                  >
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${getActivityColor(item.type)} flex items-center justify-center text-muted-foreground`}>
                      {getActivityIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {item.action}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.details}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(item.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground">
                  Your activity will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:shadow-md hover:scale-105 transition-all"
                  >
                    <Icon className={`w-8 h-8 ${action.color}`} />
                    <span className="text-xs text-center font-medium">
                      {action.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 5. Key Tailwind Classes Reference

### Layout & Positioning
```
min-h-screen, h-screen, h-full
flex, flex-col, flex-row, flex-wrap
items-center, items-start, items-end
justify-center, justify-between, justify-start
gap-2, gap-3, gap-4, gap-6, gap-8
p-4, px-4, py-2, pt-4, etc.
mb-4, mt-2, ml-3, etc.
```

### Responsive Breakpoints
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px

Usage: md:grid-cols-2, lg:flex-row, sm:p-2
```

### Typography
```
text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl
font-normal, font-medium, font-semibold, font-bold
leading-tight, leading-normal, leading-relaxed
tracking-tight, tracking-normal, tracking-wide
text-foreground, text-muted-foreground, text-destructive
```

### Colors
```
bg-background, bg-card, bg-muted, bg-destructive
text-foreground, text-primary, text-accent
border-border, border-input, border-primary
hover:bg-muted, hover:text-foreground
focus:ring-2 focus:ring-ring
disabled:opacity-50 disabled:cursor-not-allowed
```

### Common Patterns
```
// Centered flex container
className="flex items-center justify-center"

// Form field with label
<div className="space-y-2">
  <Label>Label</Label>
  <Input />
</div>

// Card with padding
<Card className="p-6 shadow-lg rounded-lg">

// Hover effect
className="hover:bg-muted transition-colors"

// Loading spinner
className="animate-spin"

// Responsive grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
```

---

## Shadcn Component Usage Patterns

### Button States
```tsx
<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button disabled>Disabled</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

### Input with Label
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="Enter email"
  />
</div>
```

### Card Structure
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Form Integration
```tsx
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';

const form = useForm({ defaultValues: { email: '' } });

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
        </FormItem>
      )}
    />
  </form>
</Form>
```

---

## Testing Breakpoints

### Mobile View (375px - iPhone SE)
```
chrome://devtools → responsive mode → 375x667
Test: Touch targets, stacking, readability
```

### Tablet View (768px - iPad)
```
chrome://devtools → responsive mode → 768x1024
Test: Column layouts, navigation, spacing
```

### Desktop View (1440px)
```
chrome://devtools → responsive mode → 1440x900
Test: Full width utilization, sidebars, multi-column layouts
```

---

## Performance & Accessibility Checklist

### Performance
- [ ] Use `'use client'` only where needed
- [ ] Implement skeleton/loading states
- [ ] Lazy load images with next/image
- [ ] Memoize expensive components with React.memo
- [ ] Use dynamic imports for large components

### Accessibility
- [ ] All inputs have associated labels
- [ ] Keyboard navigation works (Tab, Arrow keys)
- [ ] Focus rings visible (outline-ring)
- [ ] Color contrast passes WCAG AA
- [ ] Error messages associated with fields
- [ ] Loading states hidden from screen readers

---

**Last Updated**: February 15, 2026
**Status**: Ready for Implementation
