-- =====================================================================
-- Migration: 20261002000000_marketplace.sql
-- Module 07: Academic Marketplace & Compute Resource Sharing (Spec 07)
-- =====================================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE listing_type AS ENUM ('Hardware', 'Dataset');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hardware_access_method AS ENUM ('SSH', 'RemoteDesktop');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_approval_status AS ENUM ('Pending', 'Approved', 'Rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'Requested',
    'Accepted',
    'Rejected',
    'PaymentEscrowed',
    'AccessReleased',
    'Completed',
    'Cancelled',
    'Disputed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('Held', 'Released', 'Refunded', 'Failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM ('Open', 'UnderReview', 'Resolved', 'Rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dispute_resolution_action AS ENUM ('RefundRequester', 'ReleaseToProvider', 'DismissDispute');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Extend Notification Types for Spec 07 if not existing
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BookingRequest';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BookingAccepted';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BookingRejected';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'PaymentEscrowed';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'AccessReleased';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BookingCompleted';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'DisputeRaised';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'DisputeResolved';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ListingApproved';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ListingRejected';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'InquiryReceived';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Tables

-- 2.1 Listings
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type listing_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  -- Hardware specific specifications
  gpu_cpu_model TEXT,
  vram TEXT,
  ram TEXT,
  storage TEXT,
  os TEXT,
  location TEXT,
  access_method hardware_access_method,
  hourly_price NUMERIC(10, 2) CHECK (hourly_price IS NULL OR hourly_price >= 0),
  daily_price NUMERIC(10, 2) CHECK (daily_price IS NULL OR daily_price >= 0),
  -- Dataset specific specifications
  domain TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  format TEXT,
  license TEXT,
  sample_preview_file_id UUID REFERENCES file_assets(id) ON DELETE SET NULL,
  dataset_file_id UUID REFERENCES file_assets(id) ON DELETE SET NULL,
  online_price NUMERIC(10, 2) CHECK (online_price IS NULL OR online_price >= 0),
  -- Common flags
  is_free BOOLEAN NOT NULL DEFAULT false,
  is_institutional BOOLEAN NOT NULL DEFAULT false,
  free_for_institution_students BOOLEAN NOT NULL DEFAULT false,
  institution_name TEXT,
  approval_status listing_approval_status NOT NULL DEFAULT 'Pending',
  rejection_reason TEXT,
  is_delisted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Availability Slots (for Hardware listings)
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_slot_duration CHECK (end_time > start_time)
);

-- 2.3 Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES availability_slots(id) ON DELETE SET NULL,
  status booking_status NOT NULL DEFAULT 'Requested',
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
  access_details TEXT,
  requester_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (commission_amount >= 0),
  gateway_ref TEXT NOT NULL,
  status transaction_status NOT NULL DEFAULT 'Held',
  invoice_file_id UUID REFERENCES file_assets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 Listing Reviews
CREATE TABLE IF NOT EXISTS listing_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'Open',
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_note TEXT,
  resolution_action dispute_resolution_action,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 Listing Inquiries (isolated from Direct Messages and Project Messages)
CREATE TABLE IF NOT EXISTS listing_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for Performance & Search
CREATE INDEX IF NOT EXISTS idx_listings_approved_type ON listings(approval_status, type, is_delisted);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_listing ON availability_slots(listing_id, is_booked);
CREATE INDEX IF NOT EXISTS idx_bookings_requester ON bookings(requester_id);
CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_listing_reviews_listing ON listing_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_disputes_booking ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_listing ON listing_inquiries(listing_id, sender_id);

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_marketplace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS trg_disputes_updated_at ON disputes;
CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

-- 5. Row Level Security (RLS) Policies (Defense-in-Depth)

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_inquiries ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'Admin' AND status = 'Active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.1 Listings Policies
DROP POLICY IF EXISTS "Public can view approved, non-delisted listings" ON listings;
CREATE POLICY "Public can view approved, non-delisted listings"
  ON listings FOR SELECT
  USING (
    (approval_status = 'Approved' AND is_delisted = false)
    OR owner_id = auth.uid()
    OR is_admin_user()
  );

DROP POLICY IF EXISTS "Owners can insert own listings" ON listings;
CREATE POLICY "Owners can insert own listings"
  ON listings FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update own listings" ON listings;
CREATE POLICY "Owners can update own listings"
  ON listings FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin_user());

DROP POLICY IF EXISTS "Owners can delete own listings" ON listings;
CREATE POLICY "Owners can delete own listings"
  ON listings FOR DELETE
  USING (owner_id = auth.uid() OR is_admin_user());

-- 5.2 Availability Slots Policies
DROP POLICY IF EXISTS "Anyone can view slots for visible listings" ON availability_slots;
CREATE POLICY "Anyone can view slots for visible listings"
  ON availability_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = availability_slots.listing_id
      AND ((l.approval_status = 'Approved' AND l.is_delisted = false) OR l.owner_id = auth.uid() OR is_admin_user())
    )
  );

DROP POLICY IF EXISTS "Listing owners can manage slots" ON availability_slots;
CREATE POLICY "Listing owners can manage slots"
  ON availability_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = availability_slots.listing_id
      AND (l.owner_id = auth.uid() OR is_admin_user())
    )
  );

-- 5.3 Bookings Policies
DROP POLICY IF EXISTS "Booking participants and Admin can view bookings" ON bookings;
CREATE POLICY "Booking participants and Admin can view bookings"
  ON bookings FOR SELECT
  USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = bookings.listing_id AND l.owner_id = auth.uid()
    )
    OR is_admin_user()
  );

DROP POLICY IF EXISTS "Requesters can insert bookings" ON bookings;
CREATE POLICY "Requesters can insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Participants can update bookings" ON bookings;
CREATE POLICY "Participants can update bookings"
  ON bookings FOR UPDATE
  USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = bookings.listing_id AND l.owner_id = auth.uid()
    )
    OR is_admin_user()
  );

-- 5.4 Transactions Policies
DROP POLICY IF EXISTS "Transaction participants and Admin can view transactions" ON transactions;
CREATE POLICY "Transaction participants and Admin can view transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN listings l ON l.id = b.listing_id
      WHERE b.id = transactions.booking_id
      AND (b.requester_id = auth.uid() OR l.owner_id = auth.uid())
    )
    OR is_admin_user()
  );

-- 5.5 Reviews Policies
DROP POLICY IF EXISTS "Anyone can view reviews for visible listings" ON listing_reviews;
CREATE POLICY "Anyone can view reviews for visible listings"
  ON listing_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Eligible rater can insert review" ON listing_reviews;
CREATE POLICY "Eligible rater can insert review"
  ON listing_reviews FOR INSERT
  WITH CHECK (rater_id = auth.uid());

-- 5.6 Disputes Policies
DROP POLICY IF EXISTS "Dispute participants and Admin can view disputes" ON disputes;
CREATE POLICY "Dispute participants and Admin can view disputes"
  ON disputes FOR SELECT
  USING (
    raised_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bookings b
      JOIN listings l ON l.id = b.listing_id
      WHERE b.id = disputes.booking_id
      AND (b.requester_id = auth.uid() OR l.owner_id = auth.uid())
    )
    OR is_admin_user()
  );

DROP POLICY IF EXISTS "Booking participants can raise dispute" ON disputes;
CREATE POLICY "Booking participants can raise dispute"
  ON disputes FOR INSERT
  WITH CHECK (raised_by = auth.uid());

DROP POLICY IF EXISTS "Admin can update disputes" ON disputes;
CREATE POLICY "Admin can update disputes"
  ON disputes FOR UPDATE
  USING (is_admin_user());

-- 5.7 Listing Inquiries Policies
DROP POLICY IF EXISTS "Inquiry participants can view inquiries" ON listing_inquiries;
CREATE POLICY "Inquiry participants can view inquiries"
  ON listing_inquiries FOR SELECT
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = listing_inquiries.listing_id
      AND l.owner_id = auth.uid()
    )
    OR is_admin_user()
  );

DROP POLICY IF EXISTS "Authenticated users can insert inquiries" ON listing_inquiries;
CREATE POLICY "Authenticated users can insert inquiries"
  ON listing_inquiries FOR INSERT
  WITH CHECK (sender_id = auth.uid());
