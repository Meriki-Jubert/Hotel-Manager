# Cloud-Native HMS: Tech Stack & 4-Week Rapid Demo Roadmap

Given your shift to an online-first architecture and a strict timeline of under one month, the priority is **speed of delivery, maintainability, and clean UI/UX**. Utilizing fully managed backends and proven web frameworks will allow you to focus on core business logic rather than infrastructure setup.

---

## 1. Recommended Modern Tech Stack

### Frontend & UI
* **Framework:** **Next.js (React)** or **Vite + React**
  * *Why:* Fast build times, built-in routing, and excellent ecosystem support. Next.js App Router allows server-side fetching for fast initial page loads.
* **Styling & UI Components:** **Tailwind CSS** + **Shadcn UI** or **Mantine UI**
  * *Why:* Pre-built components (Dialogs, Tables, Date Pickers, Tabs, Forms) drastically cut UI assembly time.
* **State & Data Fetching:** **TanStack Query (React Query)**
  * *Why:* Handles server state caching, auto-refetching, and optimistic updates seamlessly.

### Backend & Database (BaaS)
* **Backend Platform:** **Supabase** (or **Firebase**)
  * *Why:* Provides an instant PostgreSQL database, built-in Authentication, Role-Based Access Control (Row Level Security), and real-time subscriptions with zero setup time.
  * *Database:* **PostgreSQL** (hosted via Supabase).
* **API / Serverless Functions:** Next.js API Routes or Supabase Edge Functions for handling complex workflows (e.g., Night Audit calculations, MoMo payment webhook listeners).

---

## 2. Core Demo Scope (Minimum Viable Product)

To present a compelling pitch to hotel managers in Buea, restrict the demo to these **4 critical modules**:

1. **Dashboard & Room Grid:** Visual calendar/grid view showing room statuses (Available, Occupied, Reserved, Cleaning/Out of Order).
2. **Check-In / Check-Out Engine:** Fast modal form to create a booking, record guest details, select room, and assign payment status (Cash / MoMo).
3. **Guest Folio & Billing:** Simple page calculating nightly rate total + additional charges (e.g., drinks, food), printing/downloading a PDF receipt.
4. **Owner/Manager Analytics:** Real-time summary showing Today's Revenue, Occupancy Rate, and Daily Cash Flow.

---

## 3. 4-Week Accelerated Development Roadmap

```
Week 1: Setup & Data Architecture ──► Week 2: Room Grid & Front Desk Logic ──► Week 3: Billing & Reporting ──► Week 4: Polish & Pitch Readiness
```

### Week 1: Database Setup, Auth & Layout Setup
* **Days 1–2: Database Architecture**
  * Spin up a Supabase project.
  * Create tables: `users`, `room_types`, `rooms`, `guests`, `reservations`, and `transactions`.
  * Set up Role-Based Access Control (RBAC) roles: `Manager` and `FrontDesk`.
* **Days 3–5: Core UI Frame & Auth Workflow**
  * Scaffold Next.js project with Tailwind CSS and Shadcn UI.
  * Build Login/Logout screens.
  * Build the main layout header/sidebar navigation.

### Week 2: Front Desk Operations & Room Status Grid
* **Days 6–8: Interactive Room Grid View**
  * Create a visual card grid or timeline showing all rooms categorized by type and floor.
  * Implement color-coded status badges: 🟢 Available, 🔴 Occupied, 🟡 Pending Cleaning, 🔵 Reserved.
* **Days 9–11: Reservation & Check-In Flow**
  * Build a "New Check-In" modal form: Guest Name, Phone Number, ID Number, Room Selection, Check-In/Check-Out Dates, and Deposit Paid.
  * Add quick action buttons: **Check-In**, **Check-Out**, and **Change Cleaning Status**.

### Week 3: Billing, Receipts & Nightly Audit
* **Days 12–14: Guest Folio & Receipt Generation**
  * Create a Folio detail view per guest booking.
  * Add ability to post itemized charges (e.g., Room Charge, Laundry, Drinks).
  * Integrate client-side PDF generation (using `html2pdf.js` or `@react-pdf/renderer`) for printing receipt bills.
* **Days 15–17: Owner Dashboard & Analytics**
  * Implement metrics cards: Today's Revenue, Total Occupancy %, Active Guests, and Pending Payments.
  * Add simple charts (using `Recharts` or `Tremor`) showing weekly revenue trends.

### Week 4: Refinement, Mock Data & Demo Preparation
* **Days 18–20: Edge Case Hardening & Mobile Optimization**
  * Ensure UI is responsive and usable on tablets and smartphones.
  * Add toast notifications for key actions (e.g., "Check-in Successful").
* **Days 21–24: Seed Data & Sales Demo Walkthrough**
  * Populate database with realistic local dummy data (e.g., "Molyko Suite", "Standard Fan Room", local phone numbers).
  * Prepare a 5-minute interactive pitch script focusing on preventing manual errors and owner visibility.

---

## 4. Simplified Database Schema (PostgreSQL / Supabase)

Here is a lean SQL schema to launch the demo fast:

```sql
-- 1. ROOM TYPES
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL, -- e.g., 'Standard Single', 'Deluxe Executive'
    base_price DECIMAL(10, 2) NOT NULL,
    max_capacity INT DEFAULT 2
);

-- 2. ROOMS
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(10) NOT NULL UNIQUE,
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'occupied', 'dirty', 'maintenance'
    floor_number INT DEFAULT 1
);

-- 3. GUESTS
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    id_card_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RESERVATIONS / BOOKINGS
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE RESTRICT,
    guest_id UUID REFERENCES guests(id) ON DELETE RESTRICT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    booking_status VARCHAR(20) DEFAULT 'checked_in', -- 'reserved', 'checked_in', 'checked_out', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TRANSACTIONS / FOLIO ITEMS
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    description VARCHAR(100) NOT NULL, -- e.g., 'Nightly Rate', 'Extra Towel', 'Mineral Water'
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash', -- 'cash', 'momo', 'orange_money', 'card'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. Tips for a High-Impact Sales Demo

1. **Pre-load Realistic Data:** Do not present empty screens. Pre-populate 15–20 rooms with existing checked-in guests, pending check-outs, and historical revenue figures.
2. **Emphasize Owner Control:** Demonstrate the system on a smartphone browser to show hotel managers how they can track revenue real-time from anywhere in Buea.
3. **Simulate a Live Check-In:** During the demo, ask the manager for a dummy guest name, check them into a room live, print/view the receipt PDF, and show how the room status color instantly changes from green to red.