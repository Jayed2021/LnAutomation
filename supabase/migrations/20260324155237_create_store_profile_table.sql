/*
  # Create store_profile table

  ## Summary
  Creates the store_profile table to store company identity and branding information
  used on invoices and printed documents.

  ## New Tables
  - `store_profile`
    - `id` (uuid, primary key)
    - `store_name` (text) - Company/store name
    - `tagline` (text) - Optional slogan/tagline
    - `logo_url` (text) - Public URL of uploaded logo image
    - `address_line1` (text) - Street address
    - `address_line2` (text) - Area/neighbourhood
    - `city` (text) - City
    - `postal_code` (text) - Postal/ZIP code
    - `country` (text) - Country, defaults to Bangladesh
    - `phone_primary` (text) - Main contact phone
    - `phone_secondary` (text) - Secondary phone
    - `email` (text) - Contact email
    - `website` (text) - Website URL
    - `tax_number` (text) - TIN/BIN/Tax registration number
    - `invoice_footer` (text) - Footer note on printed invoices
    - `business_type` (text) - eyewear, fashion, general, cosmetics, custom
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated users can read store profile
  - Only admin role can update store profile (enforced in app layer; policy allows authenticated write)
*/

CREATE TABLE IF NOT EXISTS store_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT '',
  tagline text DEFAULT '',
  logo_url text DEFAULT '',
  address_line1 text DEFAULT '',
  address_line2 text DEFAULT '',
  city text DEFAULT '',
  postal_code text DEFAULT '',
  country text DEFAULT 'Bangladesh',
  phone_primary text DEFAULT '',
  phone_secondary text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  tax_number text DEFAULT '',
  invoice_footer text DEFAULT '',
  business_type text DEFAULT 'eyewear',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE store_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read store profile"
  ON store_profile FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert store profile"
  ON store_profile FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update store profile"
  ON store_profile FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO store_profile (store_name, country) VALUES ('', 'Bangladesh')
ON CONFLICT DO NOTHING;
