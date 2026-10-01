# Implementation Plan — Module 07: Academic Marketplace & Compute Resource Sharing (Phased Execution)

> **Document:** Module 07 Implementation Plan  
> **Location:** `docs/plans/07-marketplace-plan.md`  
> **Status:** Awaiting Approval (Proposed Architecture & Contradiction Resolution)  
> **Reference Specs:** [docs/specs/07-marketplace.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/specs/07-marketplace.md), [docs/data-model.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/data-model.md), [docs/feature-plan.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/feature-plan.md), [AGENTS.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/AGENTS.md)  
> **Depends on:** Spec 00 (Foundation), Spec 01 (Auth/RBAC), Spec 02 (Research Workspace), Shared `FileAsset`

---

## Table of Contents

1. [Contradiction Analysis & Resolutions](#1-contradiction-analysis--resolutions)
2. [Core Architectural, Security & Escrow Rules](#2-core-architectural-security--escrow-rules)
3. [Sub-Feature Phasing Map](#3-sub-feature-phasing-map)
4. [Phase 7.1: Database Schema & Supabase Migration](#phase-71-database-schema--supabase-migration)
5. [Phase 7.2: Shared TypeScript Contracts & State Machines](#phase-72-shared-typescript-contracts--state-machines)
6. [Phase 7.3: Backend — Services, Escrow Engine & Sandbox Gateway](#phase-73-backend--services-escrow-engine--sandbox-gateway)
7. [Phase 7.4: Backend — Express Routes & RBAC/Ownership Middleware](#phase-74-backend--express-routes--rbacownership-middleware)
8. [Phase 7.5: Frontend — API Client Hooks & State Management](#phase-75-frontend--api-client-hooks--state-management)
9. [Phase 7.6: Frontend — Marketplace UI Components](#phase-76-frontend--marketplace-ui-components)
10. [Phase 7.7: Frontend — Marketplace Pages & Admin Moderation Center](#phase-77-frontend--marketplace-pages--admin-moderation-center)
11. [Phase 7.8: End-to-End Verification & Testing Matrix](#phase-78-end-to-end-verification--testing-matrix)
12. [Acceptance Criteria Verification Checklist](#12-acceptance-criteria-verification-checklist)

---

## 1. Contradiction Analysis & Resolutions

Before beginning implementation, all planning documents (`07-marketplace.md`, `data-model.md`, `feature-plan.md`, `build-plan.md`, and `AGENTS.md`) were cross-analyzed. The following contradictions and ambiguities were identified along with their authoritative resolutions per the precedence rules in `AGENTS.md` §2:

### Contradiction 1: Module Numbering Mismatch
- **Issue:** In `docs/feature-plan.md` §6 and `docs/data-model.md` §6, Marketplace is listed as "Module 6" (and Community Forum as Module 7). However, in `docs/specs/`, Community Forum is `06-forum-community.md` and Marketplace is `07-marketplace.md`. `docs/build-plan.md` lists "Phase 7 — Marketplace".
- **Resolution:** Per `AGENTS.md` §2 (Module Spec in `docs/specs/` is highest precedence), this implementation is **Module 07: Academic Marketplace & Compute Resource Sharing (Spec 07)**.

### Contradiction 2: Hardware vs Dataset Booking Life-Cycle & Slot Requirement
- **Issue:** `docs/data-model.md` shows `Booking.slotId` as `FK→AvailabilitySlot?` (nullable), but `07-marketplace.md` acceptance criteria imply time-slot locking. Datasets do not have time slots (they are downloaded or accessed immediately upon purchase/free grant), whereas Hardware rentals require discrete scheduling slots (`startTime` to `endTime`).
- **Resolution:** 
  - For `Hardware` listings: `slotId` is **mandatory** during booking creation. Double booking is prevented at the database and service level.
  - For `Dataset` listings: `slotId` is **NULL**. Purchasing/requesting a dataset initiates an immediate booking record that transitions to `PaymentEscrowed` -> `AccessReleased` (providing dataset download/preview link).
  - For `Free` / `Institutional Free` resources: If `isFree = true` or `freeForInstitutionStudents = true`, payment amount is 0, and booking auto-advances to `AccessReleased` upon provider acceptance without requiring card input.

### Contradiction 3: Access Details Security & Masking View
- **Issue:** `Booking.accessDetails` stores sensitive credentials (SSH commands, host IPs, port, private dataset download URLs). If a client reads the booking object before payment escrow is confirmed, the provider's server could be compromised for free.
- **Resolution:**
  - Database and API level: `accessDetails` is strictly **masked as NULL** for the requester until `Booking.status IN ('AccessReleased', 'Completed')`.
  - The provider can configure/submit `accessDetails` during `Accepted` or `PaymentEscrowed`.
  - RLS dynamic masking / service sanitization ensures unauthorized parties and pre-escrow requesters never receive `accessDetails`.

### Contradiction 4: Messaging Isolation (AGENTS.md §9 vs Shared Chat)
- **Issue:** `AGENTS.md` §9 strictly dictates: *"Project messages and Direct Messages must remain separate messaging systems. Listing inquiries must remain separate from project messages and Direct Messages."*
- **Resolution:** `ListingInquiry` table is maintained as an isolated entity (`listing_inquiries`) scoped strictly to listing owner and inquiry sender. It does not mix with forum DMs or workspace channel messages.

### Contradiction 5: Admin Conflict of Interest & Flat Community Rights
- **Issue:** Admin has platform moderation powers (approving listings, resolving disputes, viewing the full financial ledger). 
- **Resolution:**
  - Admin **cannot** create listings or book marketplace resources (preventing conflict of interest).
  - Researcher and Supervisor have identical flat marketplace rights (both can be Providers or Consumers).
  - Supervisors have an optional badge toggle: mark a listing as `isInstitutional = true` and `freeForInstitutionStudents = true`.

---

## 2. Core Architectural, Security & Escrow Rules

### Ownership & Access Model

| Entity | Owner Column | Access Path |
| :--- | :--- | :--- |
| `Listing` | `owner_id` | Provider (Researcher/Supervisor) has full CRUD on draft/pending listings. Approved listings are publicly searchable. Admin can approve, reject, or delist. Admin cannot create listings. |
| `AvailabilitySlot` | (via `listing_id` → `Listing.owner_id`) | Listing owner manages slots (`startTime`, `endTime`, `isBooked`). Public read on approved listings. |
| `Booking` | `requester_id` & `listing_id` owner | Requester initiates; Provider accepts/rejects; Requester pays; Provider/System releases access; Requester/System completes. Admin reads in dispute context. |
| `Transaction` | (via `booking_id`) | Requester and Provider read their own transactions; Admin reads the entire platform ledger. |
| `ListingReview` | `rater_id` | Requester writes review (1 per completed booking). Public read on listing. |
| `Dispute` | `raised_by` | Booking participant creates. Provider & Requester view. Admin resolves (updates transaction/booking). |
| `ListingInquiry` | `sender_id` & `listing_id` owner | Sender and Listing Owner can view and reply in the inquiry thread. |

### Booking State Machine

```
               ┌─────────────┐
               │  Requested  │ ────► Rejected (by Provider)
               └──────┬──────┘ ────► Cancelled (by Requester)
                      │
                      ▼ (Provider Accepts)
               ┌─────────────┐
               │  Accepted   │ ────► Cancelled (by Requester/Timeout)
               └──────┬──────┘
                      │
                      ▼ (Requester Pays Sandbox Escrow / Free Auto-Escrow)
               ┌─────────────┐
               │PaymentEscrow│ ────► Disputed
               └──────┬──────┘
                      │
                      ▼ (Access Details Released by Provider/System)
               ┌─────────────┐
               │AccessRelease│ ────► Disputed
               └──────┬──────┘
                      │
                      ▼ (Usage Window Expires or Requester Confirms)
               ┌─────────────┐
               │  Completed  │ ────► Eligible for ListingReview
               └─────────────┘
```

### Funds & Escrow State Machine

```
 [ Payment Initiated ] ──► [ Status: Held (Escrowed in Sandbox) ]
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       [ Status: Released ]             [ Status: Refunded ]
   (Booking Completed / Admin Payout)   (Dispute Resolved in Requester Favor / Cancelled)
```

---

## 3. Sub-Feature Phasing Map

```
Phase 7.1: Database Schema & Migration (tables, constraints, RLS, indexes)
   ↓
Phase 7.2: Shared TypeScript Contracts & State Machine Types (@researchos/shared-types)
   ↓
Phase 7.3: Backend Data Access, Services & Sandbox Payment Engine (MarketplaceService, EscrowService)
   ↓
Phase 7.4: Backend Express Routes & RBAC/Ownership Middleware (Validation, guards, admin routes)
   ↓
Phase 7.5: Frontend State Management & TanStack Query Hooks (API client, caching, optimistic updates)
   ↓
Phase 7.6: Frontend Marketplace UI Components (Hardware Cards, Dataset Cards, Booking Dialog, Escrow Modal, Inquiry Chat, Dispute Drawer)
   ↓
Phase 7.7: Frontend Marketplace Pages (Marketplace Catalog, Listing Details, Manage Hub, Admin Governance & Ledger)
   ↓
Phase 7.8: End-to-End Verification & Comprehensive Test Suite (Unit, integration, route, component tests)
```

---

## Phase 7.1: Database Schema & Supabase Migration

**File:** `supabase/migrations/20261002000000_marketplace.sql`

### Tables to Create:

1. `listings`:
   - `id` (UUID PK default `gen_random_uuid()`)
   - `owner_id` (UUID FK -> `profiles.id` ON DELETE CASCADE)
   - `type` (`TEXT CHECK (type IN ('Hardware', 'Dataset'))`)
   - `title` (`TEXT NOT NULL`)
   - `description` (`TEXT`)
   - `gpu_cpu_model` (`TEXT`)
   - `vram` (`TEXT`)
   - `ram` (`TEXT`)
   - `storage` (`TEXT`)
   - `os` (`TEXT`)
   - `location` (`TEXT`)
   - `access_method` (`TEXT CHECK (access_method IN ('SSH', 'RemoteDesktop'))`)
   - `hourly_price` (`NUMERIC(10, 2) CHECK (hourly_price >= 0)`)
   - `daily_price` (`NUMERIC(10, 2) CHECK (daily_price >= 0)`)
   - `domain` (`TEXT`)
   - `size_bytes` (`BIGINT CHECK (size_bytes >= 0)`)
   - `format` (`TEXT`)
   - `license` (`TEXT`)
   - `sample_preview_file_id` (`UUID FK -> file_assets.id` ON DELETE SET NULL)
   - `dataset_file_id` (`UUID FK -> file_assets.id` ON DELETE SET NULL)
   - `online_price` (`NUMERIC(10, 2) CHECK (online_price >= 0)`)
   - `is_free` (`BOOLEAN NOT NULL DEFAULT false`)
   - `is_institutional` (`BOOLEAN NOT NULL DEFAULT false`)
   - `free_for_institution_students` (`BOOLEAN NOT NULL DEFAULT false`)
   - `institution_name` (`TEXT`)
   - `approval_status` (`TEXT NOT NULL DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'))`)
   - `rejection_reason` (`TEXT`)
   - `is_delisted` (`BOOLEAN NOT NULL DEFAULT false`)
   - `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
   - `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

2. `availability_slots`:
   - `id` (UUID PK default `gen_random_uuid()`)
   - `listing_id` (UUID FK -> `listings.id` ON DELETE CASCADE)
   - `start_time` (`TIMESTAMPTZ NOT NULL`)
   - `end_time` (`TIMESTAMPTZ NOT NULL CHECK (end_time > start_time)`)
   - `is_booked` (`BOOLEAN NOT NULL DEFAULT false`)
   - `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

3. `bookings`:
   - `id` (UUID PK default `gen_random_uuid()`)
   - `listing_id` (UUID FK -> `listings.id` ON DELETE CASCADE)
   - `requester_id` (UUID FK -> `profiles.id` ON DELETE CASCADE)
   - `slot_id` (UUID FK -> `availability_slots.id` ON DELETE SET NULL)
   - `status` (`TEXT NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Accepted', 'Rejected', 'PaymentEscrowed', 'AccessReleased', 'Completed', 'Cancelled', 'Disputed'))`)
   - `total_price` (`NUMERIC(10, 2) NOT NULL DEFAULT 0.00`)
   - `access_details` (`TEXT`)
   - `requester_notes` (`TEXT`)
   - `rejection_reason` (`TEXT`)
   - `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
   - `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

4. `transactions`:
   - `id` (UUID PK default `gen_random_uuid()`)
   - `booking_id` (UUID FK -> `bookings.id` ON DELETE CASCADE)
   - `amount` (`NUMERIC(10, 2) NOT NULL CHECK (amount >= 0)`)
   - `commission_amount` (`NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (commission_amount >= 0)`)
   - `gateway_ref` (`TEXT NOT NULL`)
   - `status` (`TEXT NOT NULL DEFAULT 'Held' CHECK (status IN ('Held', 'Released', 'Refunded', 'Failed'))`)
   - `invoice_file_id` (`UUID FK -> file_assets.id` ON DELETE SET NULL)
   - `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
   - `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

5. `listing_reviews`:
   - `id` (UUID PK default `gen_random_uuid()`)
   - `booking_id` (UUID UNIQUE FK -> `bookings.id` ON DELETE CASCADE)
   - `listing_id` (UUID FK -> `listings.id` ON DELETE CASCADE)
   - `rater_id` (UUID FK -> `profiles.id` ON DELETE CASCADE)
   - `rating` (`INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5)`)
   - `comment` (`TEXT`)
   - `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

6. `disputes`:
   - `id` (UUID PK default `gen_random_uuid()`)
   - `booking_id` (UUID FK -> `bookings.id` ON DELETE CASCADE)
   - `raised_by` (UUID FK -> `profiles.id` ON DELETE CASCADE)
   - `reason` (`TEXT NOT NULL`)
   - `status` (`TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'UnderReview', 'Resolved', 'Rejected'))`)
   - `resolved_by` (`UUID FK -> profiles.id` ON DELETE SET NULL)
   - `resolution_note` (`TEXT`)
   - `resolution_action` (`TEXT CHECK (resolution_action IN ('RefundRequester', 'ReleaseToProvider', 'DismissDispute'))`)
   - `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
   - `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

7. `listing_inquiries`:
   - `id` (UUID PK default `gen_random_uuid()`)
   - `listing_id` (UUID FK -> `listings.id` ON DELETE CASCADE)
   - `sender_id` (UUID FK -> `profiles.id` ON DELETE CASCADE)
   - `body` (`TEXT NOT NULL`)
   - `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)

### Database Indexes & Performance:
- `CREATE INDEX idx_listings_approved_type ON listings(approval_status, type, is_delisted);`
- `CREATE INDEX idx_listings_owner ON listings(owner_id);`
- `CREATE INDEX idx_availability_slots_listing ON availability_slots(listing_id, is_booked);`
- `CREATE INDEX idx_bookings_requester ON bookings(requester_id);`
- `CREATE INDEX idx_bookings_listing ON bookings(listing_id);`
- `CREATE INDEX idx_transactions_booking ON transactions(booking_id);`
- `CREATE INDEX idx_listing_inquiries_listing ON listing_inquiries(listing_id, sender_id);`

### RLS Policies:
- Enable RLS on all 7 tables.
- Defense-in-depth policies ensuring:
  - Users can read approved, non-delisted listings.
  - Owners can read and modify their own listings.
  - Admins can read all listings and update approval/delist status.
  - Bookings are accessible only by `requester_id`, listing `owner_id`, or Admin.
  - Access details are guarded against unauthorized exposure.

---

## Phase 7.2: Shared TypeScript Contracts & State Machines

**File:** `packages/shared-types/src/index.ts`

### Enums & Constant Dictionaries:
```typescript
export type ListingType = 'Hardware' | 'Dataset';
export type HardwareAccessMethod = 'SSH' | 'RemoteDesktop';
export type ListingApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type BookingStatus = 
  | 'Requested' 
  | 'Accepted' 
  | 'Rejected' 
  | 'PaymentEscrowed' 
  | 'AccessReleased' 
  | 'Completed' 
  | 'Cancelled' 
  | 'Disputed';

export type TransactionStatus = 'Held' | 'Released' | 'Refunded' | 'Failed';
export type DisputeStatus = 'Open' | 'UnderReview' | 'Resolved' | 'Rejected';
export type DisputeResolutionAction = 'RefundRequester' | 'ReleaseToProvider' | 'DismissDispute';
```

### Entity Interfaces & DTOs:
- `Listing`, `ListingWithStats`, `CreateListingDTO`, `UpdateListingDTO`
- `AvailabilitySlot`, `CreateSlotDTO`
- `Booking`, `BookingWithDetails`, `RequestBookingDTO`
- `Transaction`, `TransactionWithBooking`
- `ListingReview`, `CreateListingReviewDTO`
- `Dispute`, `CreateDisputeDTO`, `ResolveDisputeDTO`
- `ListingInquiry`, `CreateListingInquiryDTO`
- `MarketplaceLedgerStats`, `MarketplaceFilterParams`

---

## Phase 7.3: Backend — Services, Escrow Engine & Sandbox Gateway

**Files:**
- `apps/api/src/services/marketplace.service.ts`
- `apps/api/src/services/escrow.service.ts`

### 1. `MarketplaceService`:
- `searchListings(filters, currentUserId)`: Search approved listings with filters (type, price range, GPU model, domain, institutional). If current user is owner, returns own draft/pending listings.
- `getListingById(id, currentUserId)`: Returns listing with average rating, review count, availability slots, and provider profile.
- `createListing(ownerId, userRole, data)`: Validates role (Researcher or Supervisor only; rejects Admin). Sets `approvalStatus = 'Pending'`.
- `updateListing(id, ownerId, data)`: Updates listing details (cannot self-approve).
- `deleteListing(id, ownerId)`: Deletes if no active bookings.
- `createAvailabilitySlots(listingId, ownerId, slots)`: Validates ownership and creates slots.
- `deleteAvailabilitySlot(slotId, ownerId)`: Deletes slot if not booked.

### 2. `EscrowService` & Booking State Manager:
- `requestBooking(requesterId, requesterRole, listingId, slotId, notes)`:
  - Validates requester cannot book their own listing.
  - Validates Admin cannot book (conflict of interest).
  - If Hardware, locks slot atomically (`is_booked = true`).
  - Calculates `total_price` (daily/hourly or dataset onlinePrice; or 0.00 if free/institutional).
- `acceptBooking(bookingId, ownerId)`: Validates provider ownership. Moves status `Requested -> Accepted`.
- `rejectBooking(bookingId, ownerId, reason)`: Moves status `Requested -> Rejected`. Unlocks slot if Hardware.
- `payBookingSandbox(bookingId, requesterId, paymentDetails)`:
  - Validates requester identity and status is `Accepted`.
  - Simulates sandbox gateway payment (e.g., mock Stripe token / sandbox card).
  - Creates `Transaction` record with `status = 'Held'`, `gatewayRef = 'sbx_tx_' + uuid`, calculates platform commission (e.g. 10%).
  - Transitions `Booking.status -> PaymentEscrowed`.
- `releaseAccess(bookingId, actorId, accessDetails)`:
  - Provider or System releases access info.
  - Updates `access_details` on booking.
  - Transitions `Booking.status -> AccessReleased`.
- `completeBooking(bookingId, actorId)`:
  - Releasing escrowed funds to provider (`Transaction.status -> Released`).
  - Transitions `Booking.status -> Completed`.
- `openDispute(bookingId, raisedBy, reason)`:
  - Validates participant. Transitions `Booking.status -> Disputed`. Creates `Dispute` record (`status = 'Open'`).
- `resolveDispute(disputeId, adminId, resolution)`:
  - Admin only.
  - If `RefundRequester`: sets `Transaction.status -> Refunded`, `Booking.status -> Cancelled`.
  - If `ReleaseToProvider`: sets `Transaction.status -> Released`, `Booking.status -> Completed`.
  - If `DismissDispute`: restores booking status.

### 3. Listing Inquiries & Reviews:
- `sendInquiry(listingId, senderId, body)`: Records inquiry, sends notification to listing owner.
- `getListingInquiries(listingId, userId)`: Fetches inquiry messages between user and owner.
- `submitReview(bookingId, raterId, rating, comment)`: Validates booking is `Completed`, rater is `requesterId`, and no prior review exists.

---

## Phase 7.4: Backend — Express Routes & RBAC/Ownership Middleware

**Files:**
- `apps/api/src/routes/marketplace.routes.ts`
- `apps/api/src/routes/admin.routes.ts` (expanded with marketplace admin handlers)
- `apps/api/src/middleware/marketplace.guards.ts`

### Route Endpoints Mapping:

| Method | Path | Auth / Role | Handler Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/marketplace/listings` | Authenticated | Browse & filter approved listings + own listings |
| `POST` | `/marketplace/listings` | Researcher / Supervisor | Create new listing (Pending approval) |
| `GET` | `/marketplace/listings/:id` | Authenticated | View listing details & available slots |
| `PATCH` | `/marketplace/listings/:id` | Owner Guard | Edit listing details |
| `DELETE` | `/marketplace/listings/:id` | Owner Guard | Delete listing |
| `POST` | `/marketplace/listings/:id/availability` | Owner Guard | Bulk create availability slots |
| `DELETE` | `/marketplace/availability/:slotId` | Owner Guard | Remove an open availability slot |
| `POST` | `/marketplace/listings/:id/bookings` | Researcher / Supervisor | Request a booking on slot/dataset |
| `GET` | `/marketplace/bookings` | Authenticated | List user's bookings (as requester or provider) |
| `GET` | `/marketplace/bookings/:id` | Participant Guard | Get booking details (with masked access info) |
| `POST` | `/marketplace/bookings/:id/accept` | Provider Guard | Accept booking request |
| `POST` | `/marketplace/bookings/:id/reject` | Provider Guard | Reject booking request |
| `POST` | `/marketplace/bookings/:id/pay` | Requester Guard | Submit sandbox payment for escrow |
| `POST` | `/marketplace/bookings/:id/release-access` | Provider Guard | Submit access details and release |
| `POST` | `/marketplace/bookings/:id/complete` | Participant Guard | Confirm completion & release payout |
| `POST` | `/marketplace/bookings/:id/cancel` | Requester Guard | Cancel pending/accepted booking |
| `POST` | `/marketplace/bookings/:id/dispute` | Participant Guard | Open dispute for escrowed booking |
| `POST` | `/marketplace/bookings/:id/review` | Requester Guard | Submit 1-5 star review & feedback |
| `GET` | `/marketplace/listings/:id/inquiries` | Participant Guard | Get inquiry messages |
| `POST` | `/marketplace/listings/:id/inquiries` | Authenticated | Send message to listing owner |
| `GET` | `/marketplace/transactions` | Authenticated | View user's financial transactions |
| `GET` | `/admin/marketplace/listings/pending` | Admin Only | Listing approval queue |
| `POST` | `/admin/marketplace/listings/:id/approve` | Admin Only | Approve pending listing |
| `POST` | `/admin/marketplace/listings/:id/reject` | Admin Only | Reject pending listing with note |
| `POST` | `/admin/marketplace/listings/:id/delist` | Admin Only | Delist an active listing |
| `GET` | `/admin/marketplace/disputes` | Admin Only | Open disputes queue |
| `POST` | `/admin/marketplace/disputes/:id/resolve` | Admin Only | Admin dispute verdict (Refund / Release) |
| `GET` | `/admin/marketplace/ledger` | Admin Only | Full platform transaction ledger & analytics |

---

## Phase 7.5: Frontend — API Client Hooks & State Management

**Files:**
- `apps/web/src/lib/marketplaceApi.ts`
- `apps/web/src/hooks/useMarketplace.ts`

### TanStack Query Hooks:
- `useMarketplaceListings(filters)`: Query catalog with search, category (Hardware/Dataset), price filters, GPU specs.
- `useListingDetails(listingId)`: Query single listing with slots, reviews, and provider profile.
- `useMyListings()`: Query provider's own listings and stats.
- `useMyBookings()`: Query bookings categorized into "My Rentals / Purchases" and "Incoming Client Requests".
- `useListingInquiries(listingId)`: Query inquiry message thread.
- `useUserTransactions()`: Query transaction history and download mock invoice.
- `useAdminPendingListings()` & `useAdminDisputes()` & `useAdminLedger()`: Admin governance hooks.
- Mutation hooks with automatic cache invalidation and toast notifications:
  - `useCreateListing()`, `useUpdateListing()`, `useCreateSlots()`
  - `useRequestBooking()`, `useAcceptBooking()`, `useRejectBooking()`, `usePayBooking()`, `useReleaseAccess()`, `useCompleteBooking()`, `useOpenDispute()`, `useSubmitReview()`
  - `useAdminApproveListing()`, `useAdminRejectListing()`, `useAdminDelistListing()`, `useAdminResolveDispute()`

---

## Phase 7.6: Frontend — Marketplace UI Components

**Design System Alignment:** Linear/Vercel Dark Theme (`#08090C`, `#0D0F14`, `#161922`, slate/indigo/emerald accents).

**Directory:** `apps/web/src/components/marketplace/`

### Components to Build:
1. `ListingCard.tsx`:
   - Hardware: displays GPU/CPU badges (e.g. `RTX 4090 24GB VRAM`), RAM, OS, hourly/daily price, location, provider rating.
   - Dataset: displays domain, size badge (e.g. `14.2 GB CSV`), license, preview button, price badge or `FREE`.
   - Institutional badge & "Free for Students" pill if applicable.
2. `ListingFilterBar.tsx`:
   - Search bar, type toggle (All / Hardware / Datasets), GPU model filter, price range slider, institutional only toggle.
3. `HardwareSpecDrawer.tsx`:
   - Deep spec breakdown: GPU, CPU, VRAM, RAM, NVMe Storage, OS, Access Method (SSH/RDP), benchmark notes.
4. `DatasetPreviewModal.tsx`:
   - Displays dataset schema, license terms, sample rows/preview file, and download terms.
5. `AvailabilitySlotPicker.tsx`:
   - Interactive calendar/slot picker showing open time slots, duration, and calculated total price.
6. `BookingRequestModal.tsx`:
   - Slot selection, compute workload description, institutional ID verification (if student free listing), total cost breakdown.
7. `EscrowPaymentModal.tsx`:
   - Sandbox payment simulator with interactive mock cards (Success / Insufficient Funds / Decline test cards).
   - Clear escrow explainer: *"Funds are safely held in escrow and only released to the provider when access is verified."*
8. `AccessDetailsCard.tsx`:
   - Secure reveal box for SSH host, port, credentials, and dataset download signed links with 1-click copy.
   - Masked state before escrow payment with live status indicators.
9. `ListingInquiryChat.tsx`:
   - In-app direct conversation thread between prospective buyer and provider.
10. `ReviewModal.tsx`:
   - 5-star interactive rating, reliability score, and review commentary.
11. `DisputeDrawer.tsx`:
   - Dispute reason selector, evidence submission, and status tracker.

---

## Phase 7.7: Frontend — Marketplace Pages & Admin Moderation Center

**Files:**
- `apps/web/src/pages/dashboards/MarketplacePage.tsx` (Catalog & Browse)
- `apps/web/src/pages/dashboards/MarketplaceListingDetailPage.tsx` (Detailed listing view & booking checkout)
- `apps/web/src/pages/dashboards/MarketplaceManagePage.tsx` (Provider listings manager & Consumer bookings hub)
- `apps/web/src/pages/dashboards/AdminMarketplaceGovernancePage.tsx` (Admin queue, approvals, dispute resolver, financial ledger)

### Routing Integration (`apps/web/src/App.tsx` & `DashboardRouter.tsx`):
- `/marketplace` → Marketplace Catalog
- `/marketplace/listings/:id` → Listing Detail & Booking Page
- `/marketplace/manage` → Provider / Consumer Manage Hub
- `/admin/marketplace` → Admin Moderation & Ledger Center

---

## Phase 7.8: End-to-End Verification & Testing Matrix

### Backend Unit & Integration Tests:
**File:** `apps/api/src/tests/marketplace.test.ts`
- **T1: Listing Creation & RBAC**:
  - Researcher and Supervisor can create listings (`approvalStatus = 'Pending'`).
  - Admin attempt to create listing returns `403 Forbidden` (conflict of interest).
- **T2: Admin Moderation**:
  - Only Admin can approve, reject, or delist listings.
  - Unapproved listings do not appear in public catalog.
- **T3: Slot & Booking Collision**:
  - Requester can request an available slot.
  - Attempting to double-book the same slot returns `409 Conflict`.
  - Requester cannot book their own listing (`400 Bad Request`).
- **T4: Escrow & Sandbox Payment**:
  - Requester can initiate sandbox payment only when status is `Accepted`.
  - Transaction is created with `status = 'Held'`.
  - Access details are **hidden** before escrow and **revealed** after `AccessReleased`.
- **T5: State Transitions**:
  - State machine strictly blocks direct jump to `Completed` without escrow.
- **T6: Dispute Workflow**:
  - Participant can open dispute; status becomes `Disputed`.
  - Only Admin can resolve; refund updates transaction to `Refunded`.
- **T7: Reviews & Ratings**:
  - Review only permitted once after status is `Completed`.
- **T8: Isolated Inquiries**:
  - Inquiries scoped strictly to listing owner and sender.

### Frontend Component & Integration Tests:
**File:** `apps/web/src/tests/marketplace.test.tsx`
- Listing cards render hardware specs and dataset badges accurately.
- Filter bar updates active queries and filter state.
- Booking modal calculates hourly total and prevents submission without slot.
- Payment modal simulates sandbox gateway and shows escrow confirmation.
- Access details reveal card masks sensitive credentials when unpaid.

---

## 12. Acceptance Criteria Verification Checklist

- [ ] Researcher can create a hardware or dataset listing.
- [ ] Supervisor can create a hardware or dataset listing.
- [ ] A new listing starts as `Pending` and is not publicly bookable until approved.
- [ ] Only Admin can change listing approval state or delist a listing.
- [ ] Listing owner can create availability slots only for their own listing.
- [ ] Booking can be requested only for an approved, available listing/slot.
- [ ] Two bookings cannot successfully reserve the same slot (no double bookings).
- [ ] Listing owner can accept/reject their own booking requests.
- [ ] Requester can initiate sandbox payment only for their own accepted booking.
- [ ] Transaction secrets/gateway configuration never reach the frontend.
- [ ] Access details are not released before the required payment/escrow state.
- [ ] Booking state transitions are server-side validated; clients cannot jump directly to `Completed`.
- [ ] Provider and requester see only transactions relevant to them; Admin can see the full ledger.
- [ ] A rating can be created only after booking completion and only once per booking.
- [ ] A dispute can be opened by an eligible booking participant.
- [ ] Only Admin resolves a dispute and can trigger the corresponding refund/release outcome.
- [ ] Admin cannot create a consumer/provider booking for themselves through marketplace endpoints.
- [ ] Listing inquiries remain scoped to listing participants.
- [ ] Institutional/free-for-students flags cannot bypass Admin approval.
