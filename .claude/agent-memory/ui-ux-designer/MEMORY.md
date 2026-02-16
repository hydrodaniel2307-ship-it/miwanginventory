# Miwang Inventory App - Design System & 3D Editor Notes

**Status**: Day 2 - 3D Editor UX Spec Complete
**Latest Deliverables**:
- **3D_EDITOR_UX_SPEC.md** (comprehensive Korean UX spec - 1500+ lines)
  - 와이어프레임 (Wireframes) - 10개 화면
  - 컴포넌트 목록 (Component List) - 100+ 컴포넌트
  - 상태 모델 (State Model) - 8개 상태 다이어그램
  - 모바일/태블릿 UX 규칙 (Responsive Rules)
  - 검증 체크리스트 (15 checklist items)
  - 개발자 구현 티켓 (10 implementation tickets)

## Project Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4, Shadcn UI (new-york style)
- **State Management**: React Hook Form + Zod + React Context
- **3D Graphics**: Three.js + @react-three/fiber + @react-three/drei
- **Icons**: Lucide React
- **Notifications**: Sonner (toasts)
- **Backend**: Supabase (SSR)

## 3D Warehouse Editor Key Principles
1. **5-minute completion**: Fast editing workflow optimized for warehouse staff
2. **Change detection**: Automatic unsaved changes tracking + exit warnings
3. **Conflict prevention**: 10-second polling for inventory changes by other users
4. **Beginner-friendly**: Snap/grid ON by default, simple mode available
5. **Korean-first**: All UI text in Korean, optimized for Korean keyboard
6. **Accessible**: WCAG AA, complete keyboard navigation, screen reader support
7. **Responsive**: Mobile (320px), tablet (768px), desktop (1024px)

## Color System (OkLch)
Light Mode: white bg, dark gray text (#252525)
Dark Mode: near-black bg (#145), almost white text
Primary: dark gray (#3a3a3a) | Light: light gray (#f5f5f5)
Card/Popover: white (light), dark gray (dark)
Destructive: red/orange (oklch(0.577 0.245 27.325))

## 3D Editor Architecture Pattern
- **EditorContext**: Global state (editorMode, visualMode, selectedDecorId, hasChanges)
- **Warehouse3DScene**: Three.js canvas with InstancedMesh for performance
- **DecorItem**: { id, kind, x, z, width, depth, height, rotationY }
- **localStorage**: persist layout with MAP_LAYOUT_STORAGE_KEY
- **Polling**: 10s interval to detect inventory conflicts
- **Modals**: Save confirm, delete confirm, exit warning, conflict warning

## Key UX Patterns
1. **Modals**: Centered, 90% width (max 400px), escape to close
2. **Toasts**: Sonner, top-right, colored by type (success/error/warning/info)
3. **Touch targets**: 44x44px minimum with proper padding
4. **Focus**: ring-2 ring-primary on all interactive elements
5. **Loading**: Loader2 spinner + descriptive text
6. **Responsive**: Sheet component for mobile sidebars

## Keyboard Shortcuts (Complete)
- C: copy selected object
- Delete: delete selected object
- Z: undo (Ctrl+Z redo)
- A: select all
- Escape: deselect / close modal
- Tab: next object
- 1: 3D view
- 2: 2D view
- Shift+L: light mode toggle
- Ctrl+S: save layout
- ?: show help

## Responsive Breakpoints
- **Mobile**: 320-767px (bottom tab nav, 300px canvas height)
- **Tablet**: 768-1023px (collapsed panels, pinch zoom)
- **Desktop**: 1024px+ (side panels, full canvas)

## Implementation Tickets (Priority Order)
1. EditorContext + state management
2. 3D object drag/rotate in canvas
3. Save API + optimistic updates
4. Modals (save/delete/exit/conflict)
5. Toast notifications
6. Conflict polling (10s interval)
7. Keyboard shortcuts + help modal
8. Mobile responsive layout
9. Progress timer (5-minute tracker)
10. E2E tests (happy path + error cases)

## Design Token References
- Spacing: 4px (0.25rem), 8px, 12px, 16px, 24px, 32px, 48px, 64px
- Border radius: 4px, 8px, 10px (default), 14px, 18px
- Focus color: var(--ring), contrast min 4.5:1 (AA)
- 3D canvas height: 450-750px (responsive)

## Accessibility Checklist
- [ ] All buttons have aria-label or text
- [ ] Form inputs have associated <label htmlFor="">
- [ ] Modals: role="dialog" + aria-modal="true"
- [ ] Color contrast: WCAG AA (4.5:1 text, 3:1 large)
- [ ] Touch targets: 44x44px minimum
- [ ] Keyboard nav: complete Tab/Shift+Tab support
- [ ] Focus indicators: visible in light & dark modes
- [ ] Screen reader: all dynamic content announced

## File Locations
- Editor spec: `/3D_EDITOR_UX_SPEC.md`
- 3D components: `/src/components/map/warehouse-map-*.tsx`
- Map layout types: `/src/lib/map-layout.ts`
- Design specs: `/DESIGN_SPECS.md`
