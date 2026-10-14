# Comprehensive Hotel Management System (HMS): System Architecture & Functional Specification

This document outlines the complete scope, functional requirements, technical specifications, and inter-module data flows for a production-grade Hotel Management System (HMS), expanding beyond the initial MVP to encompass full hotel operations.

---

## 1. System Scope & Complete Module Breakdown

The full HMS integrates back-of-house administration, front-desk operations, guest lifecycle management, inventory control, and financial reporting into a centralized database architecture.

### Module 1: Front Desk & Reservation Engine (Core Operations)
* **Multi-Channel Reservation Management:** Centralized booking engine handling direct walk-ins, phone reservations, corporate contracts, and Online Travel Agency (OTA) channel sync.
* **Interactive Room Matrix / Grid:** A drag-and-drop or click-to-assign visual grid displaying real-time room statuses (Available, Occupied, Reserved, Maintenance, Dirty/Cleaning).
* **Check-In / Check-Out Lifecycle:** Identity document scanning/recording, keycard tracking, deposit collection, express check-out, and late check-out fee management.
* **Guest Profile CRM:** Comprehensive history per guest including stay frequency, lifetime spend, room preferences, VIP flags, and special requests.

### Module 2: Housekeeping & Maintenance Management
* **Real-Time Room Status Synchronization:** Instant status updates triggered via mobile web views by housekeeping staff.
* **Task Allocation & Cleaning Schedules:** Automated or manual assignment of rooms to housekeeping personnel based on shift rosters and check-out queues.
* **Facility Maintenance Ticketing:** Incident logging system for plumbing, electrical, and furniture repairs with status tracking (Reported, In Progress, Resolved) and temporary room blocking.

### Module 3: Billing, Folio & Night Audit Engine
* **Master Guest Folio Management:** Single-ledger accounting per stay tracking room rates, taxes, service charges, dining additions, and incidentals.
* **Split & Group Billing:** Ability to split folios between corporate accounts and individual guests, or group booking master folios.
* **Automated Night Audit:** End-of-day routine that posts recurring room charges, calculates daily taxes, reconciles shift cash drawers, generates audit trails, and rolls over business dates.
* **Multi-Currency & Payment Gateway Integration:** Support for cash, local mobile money (MTN MoMo / Orange Money), credit cards, and bank transfers with instant receipt generation.

### Module 4: Point of Sale (POS) & Ancillary Services
* **Food & Beverage (F&B) / Restaurant POS:** Table management, menu item cataloguing, kitchen order tickets (KOT), and direct room-charge posting.
* **Ancillary Revenue Management:** Billing modules for conference hall rentals, laundry services, gym passes, and airport shuttle fees.

### Module 5: Inventory, Asset & Stock Control
* **Housekeeping Consumables:** Tracking stock levels for linens, towels, toiletries, and cleaning detergents with automated low-stock reorder alerts.
* **F&B Stock Control:** Ingredient and beverage inventory tracking connected with the restaurant POS to prevent stock shrinkage.
* **Fixed Asset Registry:** Serialized tracking of high-value assets (TVs, AC units, furniture) assigned across rooms.

### Module 6: Staff Management & Role-Based Access Control (RBAC)
* **Granular Permissions:** Role-defined access matrices for Managers, Front Desk Clerks, Housekeeping Staff, Accountants, and Auditors.
* **Shift Management & Cash Drawer Reconciliation:** Opening and closing cash float logs per cashier shift to isolate cash discrepancies.

### Module 7: Reporting & Executive Business Intelligence
* **Standard Financial Reports:** Daily revenue reports, tax summaries, shift collection reports, and accounts receivable aging.
* **Performance Metrics (KPIs):** Automated calculation of Occupancy Rate, Average Daily Rate (ADR), Revenue Per Available Room (RevPAR), and Length of Stay (LoS).
* **Owner Portal:** Mobile-optimized read-only analytics dashboard for remote business monitoring.

---

## 2. System Requirements

### Functional Requirements
1. **Concurrency Control:** The system must utilize database row-level locking or transaction isolation levels to prevent double-booking race conditions when multiple front desk staff attempt to book the same room simultaneously.
2. **Audit Trails:** All financial adjustments, folio voids, room rate overrides, and manual status changes must record the user ID, timestamp, and justification reason.
3. **Receipt Generation:** The system must generate professional itemized PDF receipts and invoices capable of thermal printing or digital sharing via email/WhatsApp.

### Non-Functional Requirements
1. **Performance:** Page load times and query responses for the room matrix must execute under 500 milliseconds under normal load.
2. **Security:** All data in transit must be encrypted via HTTPS/TLS 1.3. Passwords must be hashed using industry-standard algorithms (bcrypt/Argon2). Row-Level Security (RLS) policies must enforce tenant/role isolation at the database level.
3. **Availability & Reliability:** Target system uptime of 99.9% with automated daily database snapshots and point-in-time recovery capabilities.

---

## 3. Data Flow Between System Components & Modules

The system operates on an event-driven relational data model where core actions in one module instantly propagate state changes across dependent modules.

```
[Guest / Walk-In] 
       │
       ▼
[Front Desk Module] ──(Create Reservation)──► [Database: Reservations & Guests]
       │                                                 │
       ├─(Assign Room)───────────────────────────────────┼──► [Room Matrix Module] (Status: Available ➔ Occupied)
       │                                                 │
       └─(Initialize Folio)──────────────────────────────┼──► [Billing Module] (Creates Master Folio Ledger)
                                                         │
[Housekeeping Module] ◄──(Trigger Cleaning Task)─────────┤
       │                                                 │
       ▼                                                 │
[Staff Marks Clean] ──(Update Status)────────────────────┘
       │
       ▼
[Room Matrix Module] (Status: Dirty ➔ Available)


[Restaurant POS] ──(Order Placed & Charged to Room)──► [Billing Module] (Appends Item to Guest Folio)
                                                              │
                                                              ▼
[Night Audit Engine] ◄──(End of Day Processing)───────────────┤
       │                                                      │
       ▼                                                      ▼
[Generates Financial Reports] ◄──(Reconciles Ledger)──────────┘
```

### Detailed Module Interaction Walkthrough:
1. **Check-In Data Flow:** 
   When a front desk agent creates a reservation, data is written to the `guests` and `reservations` tables. This triggers a state transition in the `rooms` table changing status from *Available* to *Occupied*, instantly updating the visual **Room Matrix** for all active terminals. Simultaneously, a master record is initialized in the `transactions`/`folios` ledger.
2. **Ancillary Charge Data Flow:** 
   If a guest purchases a meal at the hotel restaurant, the **POS Module** queries active room occupancies, links the order to the guest's folio ID, and appends a line item to the **Billing Module**. This balance is immediately reflected in real-time on the guest's running bill without requiring manual front desk intervention.
3. **Night Audit Data Flow:** 
   At the business day cutoff (e.g., 03:00 AM), the **Night Audit Engine** locks the previous day's shift logs, runs batch inserts to apply recurring nightly room rates and taxes to all open folios, rolls over the calendar date, and compiles summary metrics for the **Owner Analytics Dashboard**.