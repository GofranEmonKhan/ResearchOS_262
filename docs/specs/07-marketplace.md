# Spec 07 — Resource Sharing Marketplace

## Goal

Implement Module 7 of `feature-plan.md`: hardware and dataset listings, availability, provider/consumer behavior, booking workflow, sandbox payment and escrow state, transaction history, invoices, reviews, disputes, listing inquiries, provider verification, institutional resources, and Admin moderation. Marketplace permissions are intentionally flat: Researcher and Supervisor are both community members and may act as Provider or Consumer; Admin governs the marketplace but cannot buy/sell there.

**Depends on:** `00-foundation.md`, `01-auth-rbac.md`, shared `FileAsset`

**Agent mode:** Plan mode, Review-driven autonomy. Payment/escrow, transaction state, listing approval, and dispute logic must be reviewed before execution.

## Entities & relations

### Listing

```text
Listing {
  id                          uuid PK
  ownerId                     FK→User
  type                        enum(Hardware, Dataset)
  title                       string
  gpuCpuModel                 string?
  vram                        string?
  ram                         string?
  storage                     string?
  os                          string?
  location                    string?
  accessMethod                enum(SSH, RemoteDesktop)?
  hourlyPrice                decimal?
  dailyPrice                 decimal?
  domain                      string?
  sizeBytes                   bigint?
  format                      string?
  license                     string?
  samplePreviewFileId         FK→FileAsset?
  onlinePrice                 decimal?
  isFree                      bool default(false)
  isInstitutional             bool default(false)
  freeForInstitutionStudents  bool default(false)
  approvalStatus              enum(Pending, Approved, Rejected)
  isDelisted                  bool default(false)
  createdAt                   datetime
}
```

Admin controls `approvalStatus` / `isDelisted`.

### AvailabilitySlot

```text
AvailabilitySlot {
  id         uuid PK
  listingId  FK→Listing
  startTime  datetime
  endTime    datetime
  isBooked   bool default(false)
}
```

### Booking

```text
Booking {
  id            uuid PK
  listingId     FK→Listing
  requesterId   FK→User
  slotId        FK→AvailabilitySlot?
  status        enum(Requested, Accepted, Rejected, PaymentEscrowed,
                     AccessReleased, Completed, Cancelled, Disputed)
  accessDetails string?
  createdAt     datetime
}
```

### Transaction

```text
Transaction {
  id               uuid PK
  bookingId        FK→Booking
  amount           decimal
  commissionAmount decimal
  gatewayRef       string
  status           enum(Held, Released, Refunded, Failed)
  invoiceFileId    FK→FileAsset?
  createdAt        datetime
}
```

### ListingReview

```text
ListingReview {
  id        uuid PK
  bookingId FK→Booking unique
  raterId   FK→User
  rating    int
  comment   string?
  createdAt datetime
}
```

### Dispute

```text
Dispute {
  id             uuid PK
  bookingId      FK→Booking
  raisedBy       FK→User
  reason         string
  status         enum(Open, UnderReview, Resolved, Rejected)
  resolvedBy     FK→User?
  resolutionNote string?
  createdAt      datetime
}
```

Resolution is Admin-only.

### ListingInquiry

```text
ListingInquiry {
  id        uuid PK
  listingId FK→Listing
  senderId  FK→User
  body      string
  createdAt datetime
}
```

Access is limited to listing participants.

## Booking/payment workflow

```text
Requested
   ↓
Accepted
   ↓
PaymentEscrowed
   ↓
AccessReleased
   ↓
Completed
```

Alternative exits:

```text
Requested → Rejected
Requested/Accepted → Cancelled
Any supported state → Disputed
```

Funds:

```text
Held → Released
Held → Refunded
Payment failure → Failed
```

Do not release access details merely because a booking record exists.

## API endpoints

> Proposed contract. Gateway calls must remain server-side; no payment secret belongs in the frontend.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/marketplace/listings` | Authenticated | Search/filter approved listings |
| POST | `/marketplace/listings` | Researcher/Supervisor | Create listing |
| GET | `/marketplace/listings/:id` | Authenticated | Read listing |
| PATCH | `/marketplace/listings/:id` | Owner | Update own listing |
| POST | `/marketplace/listings/:id/availability` | Owner | Create availability slot |
| PATCH | `/marketplace/availability/:id` | Owner | Update slot |
| POST | `/marketplace/listings/:id/bookings` | Researcher/Supervisor | Request booking |
| POST | `/marketplace/bookings/:id/accept` | Listing owner | Accept booking |
| POST | `/marketplace/bookings/:id/reject` | Listing owner | Reject booking |
| POST | `/marketplace/bookings/:id/pay` | Requester | Begin sandbox payment |
| POST | `/marketplace/bookings/:id/release-access` | System/owner workflow | Release access only after escrow |
| POST | `/marketplace/bookings/:id/complete` | Requester/owner/system according to final workflow | Complete booking |
| POST | `/marketplace/bookings/:id/dispute` | Booking participant | Open dispute |
| POST | `/marketplace/listings/:id/inquiries` | Authenticated | Contact owner |
| POST | `/marketplace/bookings/:id/review` | Requester/eligible rater | Rate completed booking |
| GET | `/marketplace/transactions` | Parties; Admin all | Transaction history |
| GET | `/admin/marketplace/listings/pending` | Admin | Approval queue |
| POST | `/admin/marketplace/listings/:id/approve` | Admin | Approve listing |
| POST | `/admin/marketplace/listings/:id/reject` | Admin | Reject listing |
| POST | `/admin/marketplace/listings/:id/delist` | Admin | Delist violating listing |
| GET | `/admin/marketplace/disputes` | Admin | Dispute queue |
| POST | `/admin/marketplace/disputes/:id/resolve` | Admin | Resolve/refund/finalize dispute |
| GET | `/admin/marketplace/ledger` | Admin | Full transaction ledger |

### Create listing

```json
{
  "type": "Hardware",
  "title": "RTX GPU Remote Access",
  "gpuCpuModel": "RTX ...",
  "vram": "24GB",
  "ram": "64GB",
  "storage": "1TB SSD",
  "os": "Linux",
  "accessMethod": "SSH",
  "hourlyPrice": 100,
  "dailyPrice": 1500,
  "location": "Dhaka",
  "isFree": false
}
```

### Booking request

```json
{
  "slotId": "uuid"
}
```

### Dispute

```json
{
  "reason": "Access was not provided after payment."
}
```

## Role behavior

### Researcher & Supervisor

- Identical marketplace rights as Provider/Consumer.
- Can create and manage their own listings.
- Can accept/reject booking requests for owned listings.
- Can book others' approved listings.
- Can pay and access datasets/resources after the correct booking/payment state.
- Can rate providers after completion.
- Can open disputes.
- Supervisor may optionally post institution/lab-owned resources and mark them free for institution students.

### Admin

- Approves/rejects listings.
- Verifies providers where required.
- Sets platform commission.
- Handles disputes and refunds.
- Can freeze suspicious transactions.
- Delists violating items.
- Sees full transaction ledger.
- Cannot book or sell on the marketplace.

## Acceptance criteria

- [ ] Researcher can create a hardware or dataset listing.
- [ ] Supervisor can create a hardware or dataset listing.
- [ ] A new listing starts as `Pending` and is not publicly bookable until approved.
- [ ] Only Admin can change listing approval state or delist a listing.
- [ ] Listing owner can create availability slots only for their own listing.
- [ ] Booking can be requested only for an approved, available listing/slot.
- [ ] Two bookings cannot successfully reserve the same slot.
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
