# Hotel Management System — Plan Review & Feedback

## Overall Verdict

Your system planner did solid work. The **system specification** (Doc 2) is genuinely impressive — it covers the right modules, has correct data flows, and addresses real hotel operational concerns. The **tech stack & roadmap** (Doc 1) picks modern, proven tools and defines a realistic MVP scope.

That said, there are **critical gaps** in both documents that we need to address before writing code, especially given your priorities of **security, scalability, and modularity**.

---

## ✅ What's Strong

| Area | Assessment |
|---|---|
| **Module breakdown** (7 modules) | Comprehensive. Covers front desk, housekeeping, billing, POS, inventory, staff, and reporting — the full hotel lifecycle. |
| **Data flow diagram** | Correctly maps how check-in propagates to room matrix, billing, and housekeeping. This is the backbone of the system. |
| **MVP scope** (4 modules for demo) | Smart prioritization. Dashboard, Check-In/Out, Billing, and Analytics are the right first four. |
| **Tech stack choices** | Next.js + Supabase + Tailwind + Shadcn is a battle-tested stack. Good fit for a cloud-native system. |
| **Non-functional requirements** | Mentioning RLS, bcrypt, TLS 1.3, concurrency control, and audit trails shows the planner understands hotel system security needs. |

---

## ⚠️ Issues & Gaps to Address

### 1. Schema Is Too Thin for Production

The SQL schema in Doc 1 is fine for a quick demo but **falls short of your stated goals**:

| Problem | Why It Matters |
|---|---|
| **No `users` table defined** | Auth roles (Manager, FrontDesk) are mentioned but never modeled in the schema. |
| **No audit trail columns** | Doc 2 requires audit trails, but no `created_by`, `updated_by`, `updated_at` columns exist on any table. |
| **`transactions` conflates charges and payments** | A single table mixing "Nightly Rate" charges and "MoMo Payment" received leads to accounting chaos. You need separate `folio_charges` and `payments` tables. |
| **No `CHECK` constraints** | `check_out_date > check_in_date` is not enforced. `status` columns use free-text `VARCHAR` instead of `ENUM` or `CHECK` constraints — any typo becomes a silent bug. |
| **Missing partial payment tracking** | `amount_paid` on `reservations` can't track *which* payment was made *when* and *how* (cash vs. MoMo). |
| **No soft deletes** | `ON DELETE CASCADE` on rooms→room_types means deleting a room type wipes all rooms and their history. Production systems need soft-delete (`is_deleted` flag + `deleted_at`). |

> [!CAUTION]
> The current schema will cause real data integrity problems in production. We must redesign it before coding.

---

### 2. Multi-Tenancy Is Not Addressed

The plan targets "hotel managers in Buea" (plural), implying multiple hotels. But neither document addresses:
- Will each hotel get its own Supabase project (isolated)?
- Or will you use a shared database with a `hotel_id` column on every table (multi-tenant)?

> [!IMPORTANT]
> **My recommendation**: Start as a **single-tenant** system (one hotel per deployment). Multi-tenancy adds enormous complexity to RLS policies, data isolation, and billing. You can always add it later, but building it in from day one will slow you down significantly for the demo.

---

### 3. Night Audit Engine Needs More Design

Doc 2 describes the Night Audit conceptually (roll recurring charges, reconcile cash drawers, roll over business date), but there's no technical design for:
- How the "business date" differs from the calendar date
- What triggers the audit (cron job? manual button? scheduled Supabase Edge Function?)
- Rollback strategy if the audit fails mid-run
- Locking mechanism to prevent front desk operations during audit

This is one of the most error-prone parts of any hotel system. We should design it carefully.

---

### 4. Modularity Architecture Is Missing

You specifically asked for a **modular, easy-to-extend** codebase. Neither document defines:
- How the Next.js project will be structured (feature-based folders vs. type-based)
- How modules communicate (direct imports? event bus? API boundaries?)
- Shared vs. module-specific components, hooks, and utilities

This is where I'll add the most value. I'll propose a **feature-module folder structure** that keeps each module self-contained.

---

### 5. The 4-Week Timeline Is Aggressive

For a solo developer building all 4 MVP modules with auth, RLS, PDF generation, charts, and mobile responsiveness — 4 weeks is tight. Here's a more realistic assessment:

| Week | Original Plan | Reality Check |
|---|---|---|
| Week 1 | DB + Auth + Layout | ✅ Achievable if schema is pre-designed |
| Week 2 | Room Grid + Check-In | ⚠️ The room grid with real-time updates is more complex than it looks |
| Week 3 | Billing + Analytics | ⚠️ Folio/billing logic is the hardest part. PDF + charts in the same week is ambitious |
| Week 4 | Polish + Demo | ✅ Reasonable if weeks 2–3 don't slip |

> [!TIP]
> I'd add a 1-week buffer (5 weeks total) or cut the analytics charts from the MVP and show raw numbers instead. Charts are impressive but not mission-critical for the demo.

---

### 6. Security Specifics Are Vague

Doc 2 mentions the right buzzwords (RLS, bcrypt, TLS), but doesn't specify:
- **RLS policies per role** — What can a FrontDesk user see vs. a Manager?
- **API route protection** — How are Next.js API routes authenticated? (Supabase middleware? JWT verification?)
- **Input validation** — No mention of sanitizing user inputs (XSS, SQL injection via Supabase client)
- **Rate limiting** — No mention of protecting login/API endpoints from brute force

---

## 🏗️ What I Propose We Build

Given your feedback, here's my recommended approach:

### Phase 1 — Foundation (What we build first)
1. **Redesigned database schema** with proper normalization, constraints, audit columns, and soft deletes
2. **Project scaffolding** with a strict feature-module folder structure
3. **Auth + RBAC** with Supabase Auth, RLS policies, and role-based route guards
4. **Room Management module** (CRUD for room types and rooms + visual grid)

### Phase 2 — Core Operations
5. **Reservation & Check-In/Out engine** with concurrency protection
6. **Guest Profile module** with search and history
7. **Billing & Folio module** with separate charges and payments

### Phase 3 — Intelligence & Polish
8. **Dashboard & Analytics** with KPI calculations
9. **PDF receipt generation**
10. **Night Audit engine**

### Tech Stack (Confirmed with adjustments)
- **Next.js 14+** (App Router) with **TypeScript**
- **Supabase** (PostgreSQL + Auth + RLS + Realtime)
- **Tailwind CSS + Shadcn UI**
- **TanStack Query** for data fetching
- **Zod** for runtime input validation (security layer)
- **TypeScript** throughout (not mentioned in your docs but critical for maintainability)

---

## ❓ Questions Before We Proceed

1. **Single hotel or multi-hotel?** — Should the system manage one hotel per deployment, or multiple hotels from one dashboard?
2. **Who are the user roles?** — Just Manager and FrontDesk? Or also Housekeeping, Accountant, Owner (read-only)?
3. **Offline capability** — Do hotels in Buea experience frequent internet outages? If so, we may need offline-first design (much more complex).
4. **MoMo integration** — Is this for the MVP demo, or a future phase? Real MoMo API integration requires business registration and API keys.
5. **Timeline** — Are you committed to 4 weeks, or is quality more important than speed?
