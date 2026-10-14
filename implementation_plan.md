# Hotel Management System — Implementation Plan

This plan transforms the two system specification documents into a buildable, modular, production-grade Hotel Management System, incorporating all feedback from the review and answers to clarifying questions.

---

## Key Decisions (Locked In)

| Decision | Choice |
|---|---|
| Deployment model | Single-tenant (one hotel per deployment) |
| Roles | `front_desk`, `housekeeping`, `manager`, `owner` |
| Architecture | Online-first, cloud-native |
| Payment integration | Deferred to post-MVP |
| Priority | Quality > speed, 8hrs/day dedicated |
| Tech stack | Next.js 14+ (App Router), TypeScript, Supabase, Tailwind CSS, Shadcn UI, TanStack Query, Zod |

---

## Proposed Changes

### Project Architecture

The codebase uses a **feature-module** folder structure. Each module is a self-contained folder with its own components, hooks, types, and utilities. Shared code lives in a `shared/` layer.

#### [NEW] Project folder structure

```
f:/Hotel Manager/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── (auth)/                   # Auth layout group (login page)
│   │   │   └── login/
│   │   ├── (dashboard)/              # Protected layout group (all modules)
│   │   │   ├── layout.tsx            # Sidebar + header + auth guard
│   │   │   ├── page.tsx              # Dashboard home (redirects by role)
│   │   │   ├── rooms/                # Room management pages
│   │   │   ├── reservations/         # Reservation pages
│   │   │   ├── guests/               # Guest CRM pages
│   │   │   ├── billing/              # Folio & billing pages
│   │   │   ├── housekeeping/         # Housekeeping views
│   │   │   ├── reports/              # Analytics & reporting
│   │   │   └── settings/             # System settings (manager only)
│   │   ├── api/                      # API routes (server-side logic)
│   │   └── layout.tsx                # Root layout
│   │
│   ├── modules/                      # ⭐ FEATURE MODULES (core pattern)
│   │   ├── rooms/
│   │   │   ├── components/           # RoomGrid, RoomCard, RoomForm, etc.
│   │   │   ├── hooks/                # useRooms, useRoomStatus, etc.
│   │   │   ├── services/             # Room API calls (Supabase queries)
│   │   │   ├── types/                # Room TypeScript interfaces
│   │   │   └── index.ts              # Public barrel export
│   │   ├── reservations/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── guests/
│   │   ├── billing/
│   │   ├── housekeeping/
│   │   ├── reports/
│   │   └── auth/                     # Login form, auth context, role guards
│   │
│   ├── shared/                       # Cross-module shared code
│   │   ├── components/               # Button, Modal, DataTable, StatusBadge
│   │   ├── hooks/                    # useAuth, useSupabase, useToast
│   │   ├── lib/                      # Supabase client, formatters, constants
│   │   ├── types/                    # Global types (Database, Enums, User)
│   │   └── middleware/               # Auth middleware, role guards
│   │
│   └── styles/                       # Global CSS, Tailwind config
│
├── supabase/
│   ├── migrations/                   # Versioned SQL migration files
│   └── seed.sql                      # Demo data for development
│
├── public/                           # Static assets
├── .env.local                        # Supabase keys (gitignored)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

> [!IMPORTANT]
> **Module boundary rule**: Modules import from `shared/` and their own folder. They NEVER import directly from another module's internal folders. Cross-module communication goes through shared hooks or the database. This keeps modules independently testable and replaceable.

---

### Database Schema (Complete Redesign)

#### [NEW] `supabase/migrations/001_initial_schema.sql`

The schema uses **PostgreSQL enums** for type safety, **audit columns** on every table, **CHECK constraints** for data integrity, and **separate tables** for charges vs. payments.

```sql
-- ============================================================
-- ENUMS (type-safe status fields, no free-text typos)
-- ============================================================
CREATE TYPE user_role AS ENUM ('front_desk', 'housekeeping', 'manager', 'owner');
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'reserved', 'dirty', 'maintenance');
CREATE TYPE booking_status AS ENUM ('reserved', 'checked_in', 'checked_out', 'cancelled', 'no_show');
CREATE TYPE payment_method AS ENUM ('cash', 'momo', 'orange_money', 'card', 'bank_transfer');
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE maintenance_status AS ENUM ('reported', 'in_progress', 'resolved');

-- ============================================================
-- 1. PROFILES (extends Supabase Auth users)
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'front_desk',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ROOM TYPES
-- ============================================================
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),
    max_capacity INT NOT NULL DEFAULT 2 CHECK (max_capacity > 0),
    amenities TEXT[],                  -- e.g., {'WiFi', 'AC', 'TV', 'Mini Fridge'}
    is_active BOOLEAN DEFAULT true,    -- soft delete
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- 3. ROOMS
-- ============================================================
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(10) NOT NULL UNIQUE,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    floor_number INT NOT NULL DEFAULT 1 CHECK (floor_number > 0),
    status room_status NOT NULL DEFAULT 'available',
    notes TEXT,                        -- e.g., "Near elevator, noisy"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- 4. GUESTS
-- ============================================================
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    id_type VARCHAR(30),              -- 'national_id', 'passport', 'drivers_license'
    id_number VARCHAR(50),
    nationality VARCHAR(50),
    address TEXT,
    vip BOOLEAN DEFAULT false,
    notes TEXT,                        -- preferences, special requests
    total_stays INT DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- 5. RESERVATIONS (bookings)
-- ============================================================
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_code VARCHAR(20) NOT NULL UNIQUE, -- human-readable, e.g. "BK-20261014-001"
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    actual_check_in TIMESTAMPTZ,       -- when guest actually arrived
    actual_check_out TIMESTAMPTZ,      -- when guest actually left
    num_guests INT DEFAULT 1 CHECK (num_guests > 0),
    nightly_rate DECIMAL(10,2) NOT NULL CHECK (nightly_rate > 0), -- locked rate at booking
    status booking_status NOT NULL DEFAULT 'reserved',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),

    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

-- ============================================================
-- 6. FOLIO CHARGES (what the guest owes)
-- ============================================================
CREATE TABLE folio_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
    category VARCHAR(30) NOT NULL,     -- 'room', 'food', 'laundry', 'minibar', 'damage', etc.
    description VARCHAR(150) NOT NULL,
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL, -- quantity * unit_price (denormalized for speed)
    is_voided BOOLEAN DEFAULT false,
    voided_by UUID REFERENCES profiles(id),
    voided_reason TEXT,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- 7. PAYMENTS (what the guest has paid)
-- ============================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    method payment_method NOT NULL DEFAULT 'cash',
    reference VARCHAR(100),            -- MoMo transaction ID, card auth code, etc.
    received_by UUID REFERENCES profiles(id),
    is_voided BOOLEAN DEFAULT false,
    voided_by UUID REFERENCES profiles(id),
    voided_reason TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. HOUSEKEEPING TASKS
-- ============================================================
CREATE TABLE housekeeping_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id),
    task_type VARCHAR(30) NOT NULL DEFAULT 'cleaning', -- 'cleaning', 'inspection', 'turndown'
    priority maintenance_priority DEFAULT 'medium',
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- 9. MAINTENANCE TICKETS
-- ============================================================
CREATE TABLE maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES profiles(id),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    priority maintenance_priority DEFAULT 'medium',
    status maintenance_status DEFAULT 'reported',
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. AUDIT LOG (tracks sensitive operations)
-- ============================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action VARCHAR(50) NOT NULL,       -- 'void_charge', 'rate_override', 'manual_checkout', etc.
    entity_type VARCHAR(30) NOT NULL,  -- 'reservation', 'payment', 'room', etc.
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES (performance)
-- ============================================================
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_room ON reservations(room_id);
CREATE INDEX idx_reservations_guest ON reservations(guest_id);
CREATE INDEX idx_folio_charges_reservation ON folio_charges(reservation_id);
CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE INDEX idx_guests_phone ON guests(phone);
CREATE INDEX idx_guests_name ON guests(full_name);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
```

---

### Auth & Security Layer

#### [NEW] `supabase/migrations/002_rls_policies.sql`

RLS policies per role, following the user's exact permission matrix:

| Resource | `front_desk` | `housekeeping` | `manager` | `owner` |
|---|---|---|---|---|
| Rooms (read) | ✅ | ✅ (status only) | ✅ | ✅ |
| Rooms (modify status) | ✅ | ✅ (dirty→clean) | ✅ | ❌ |
| Reservations | ✅ CRUD | ❌ | ✅ CRUD | ✅ Read |
| Guests | ✅ CRUD | ❌ | ✅ CRUD | ❌ |
| Folio charges | ✅ Create | ❌ | ✅ Full (+ void) | ✅ Read |
| Payments | ✅ Create | ❌ | ✅ Full (+ void) | ✅ Read |
| Reports/KPIs | ❌ | ❌ | ✅ | ✅ Read |
| User management | ❌ | ❌ | ✅ | ❌ |
| Audit log | ❌ | ❌ | ✅ Read | ✅ Read |
| Housekeeping tasks | ❌ | ✅ Own tasks | ✅ | ❌ |
| Maintenance tickets | ❌ | ✅ Create | ✅ | ✅ Read |
| System settings | ❌ | ❌ | ✅ | ❌ |

#### [NEW] `src/shared/middleware/auth.ts`

Server-side middleware that:
1. Validates the Supabase JWT on every protected route
2. Extracts the user's role from the `profiles` table
3. Blocks access to routes the role isn't permitted to view
4. Redirects unauthenticated users to `/login`

#### [NEW] `src/shared/lib/role-guard.tsx`

Client-side `<RoleGuard allowedRoles={['manager', 'owner']}>` wrapper component that conditionally renders children based on the user's role. Used to hide UI elements (buttons, menu items) that the role can't access.

---

### Shared UI Layer

#### [NEW] `src/shared/components/`

Core reusable components built on Shadcn UI:

- `AppSidebar` — Collapsible sidebar with role-filtered navigation links
- `DataTable` — Sortable, filterable table wrapper (used across all modules)
- `StatusBadge` — Color-coded badge for room/booking statuses
- `ConfirmDialog` — Reusable confirmation modal for destructive actions
- `PageHeader` — Consistent page title + breadcrumb + action buttons
- `StatCard` — Metric display card for dashboard KPIs

---

### Phase 1 Modules

#### [NEW] `src/modules/auth/`

- Login form with email/password
- Auth context provider (`useAuth` hook)
- Role-based redirect after login (manager → dashboard, housekeeping → room status grid)

#### [NEW] `src/modules/rooms/`

- `RoomGrid` — Visual card grid of all rooms, color-coded by status
- `RoomCard` — Individual room card showing number, type, status, guest name (if occupied)
- `RoomForm` — Create/edit room modal (manager only)
- `RoomTypeManager` — CRUD interface for room types and pricing (manager only)
- `useRooms` hook — TanStack Query hook for real-time room data with Supabase Realtime subscription

---

### Phase 2 Modules

#### [NEW] `src/modules/reservations/`

- `ReservationForm` — Walk-in check-in / advance reservation modal
- `ReservationList` — Filterable table of all reservations
- `CheckInFlow` — Step modal: select room → enter guest details → collect deposit → confirm
- `CheckOutFlow` — Summary modal: show folio balance → collect remaining payment → generate receipt → release room
- Concurrency protection via Supabase RPC function with `SELECT ... FOR UPDATE`

#### [NEW] `src/modules/guests/`

- `GuestSearch` — Search by name, phone, or ID number
- `GuestProfile` — Detail view with stay history and lifetime spend
- `GuestForm` — Create/edit guest modal

#### [NEW] `src/modules/billing/`

- `FolioView` — Itemized charge list per reservation with running balance
- `AddChargeForm` — Post new charges (room service, minibar, laundry, etc.)
- `RecordPaymentForm` — Record cash/MoMo payment against a folio
- `VoidChargeDialog` — Manager-only void with mandatory reason (logged to audit_log)
- `ReceiptPDF` — Client-side PDF generation with `@react-pdf/renderer`

---

### Phase 3 Modules

#### [NEW] `src/modules/reports/`

- `DashboardHome` — Today's KPIs: occupancy %, revenue, active guests, pending payments
- `RevenueChart` — Weekly/monthly revenue trend (Recharts)
- `OccupancyChart` — Historical occupancy visualization
- `ShiftReport` — Per-cashier collection summary (manager only)

#### [NEW] `src/modules/housekeeping/`

- `HousekeepingBoard` — Mobile-optimized checklist of rooms needing cleaning
- `MaintenanceForm` — Report a maintenance issue with priority
- `TaskStatusToggle` — One-tap dirty → clean status update

---

## Build Phases & Timeline Estimate

| Phase | Scope | Estimated Days (8hr/day) |
|---|---|---|
| **Phase 1: Foundation** | Scaffolding, schema, auth, layout, room management | 5–6 days |
| **Phase 2: Core Ops** | Reservations, check-in/out, guests, billing, receipts | 7–8 days |
| **Phase 3: Intelligence** | Dashboard, charts, night audit, housekeeping | 5–6 days |
| **Buffer & Polish** | Edge cases, mobile optimization, seed data | 3–4 days |
| **Total** | | **~20–24 working days (4–5 weeks)** |

---

## Verification Plan

### Automated Testing

Since this is a greenfield project, we'll add verification incrementally:

1. **Database schema validation** — After running migrations, verify all tables, enums, constraints, and indexes exist:
   ```bash
   # Run in Supabase SQL editor or via CLI
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```

2. **RLS policy testing** — For each role, attempt CRUD operations on each table and verify the policy allows/denies correctly. This will be done via Supabase's SQL editor using `SET ROLE` statements.

3. **Build verification** — After each phase:
   ```bash
   npm run build
   ```
   Must complete with zero TypeScript errors.

### Browser Testing (after each phase)

Using the browser tool, we will verify:

1. **Phase 1**: Login flow → role-based redirect → sidebar shows correct links → room grid renders with status colors → create/edit room type works
2. **Phase 2**: Full check-in flow → guest creation → room status changes → folio charges appear → payment recorded → check-out releases room → PDF receipt downloads
3. **Phase 3**: Dashboard KPIs show correct calculations → charts render → housekeeping staff sees only their allowed views

### Manual Verification (User)

After Phase 2, I'll ask you to:
1. Open the app on your phone browser and verify the UI is responsive
2. Walk through a complete guest lifecycle (reserve → check-in → add charges → pay → check-out)
3. Verify that logging in as different roles shows/hides the correct features
