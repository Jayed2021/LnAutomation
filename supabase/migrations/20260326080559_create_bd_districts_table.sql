/*
  # Create Bangladesh Districts Lookup Table

  ## Summary
  Creates a reference table containing all 64 official districts of Bangladesh,
  organised by their 8 administrative divisions.

  ## New Tables
  - `bd_districts`
    - `id` (serial, primary key)
    - `name` (text, unique, not null) — official English name of the district
    - `division` (text, not null) — the division the district belongs to
    - `sort_order` (integer) — for consistent ordering in dropdowns

  ## Security
  - RLS enabled on `bd_districts`
  - Public read-only SELECT policy (district names are not sensitive data)
  - No insert/update/delete policies — data is managed via migrations only

  ## Notes
  1. All 64 districts across 8 divisions are seeded in this migration.
  2. The table is intentionally read-only from the application layer.
  3. Spelling follows the Bangladesh Election Commission / official government convention.
*/

CREATE TABLE IF NOT EXISTS bd_districts (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  division text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE bd_districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read districts"
  ON bd_districts
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO bd_districts (name, division, sort_order) VALUES
  ('Dhaka', 'Dhaka', 1),
  ('Faridpur', 'Dhaka', 2),
  ('Gazipur', 'Dhaka', 3),
  ('Gopalganj', 'Dhaka', 4),
  ('Kishoreganj', 'Dhaka', 5),
  ('Madaripur', 'Dhaka', 6),
  ('Manikganj', 'Dhaka', 7),
  ('Munshiganj', 'Dhaka', 8),
  ('Narayanganj', 'Dhaka', 9),
  ('Narsingdi', 'Dhaka', 10),
  ('Rajbari', 'Dhaka', 11),
  ('Shariatpur', 'Dhaka', 12),
  ('Tangail', 'Dhaka', 13),
  ('Chattogram', 'Chattogram', 14),
  ('Bandarban', 'Chattogram', 15),
  ('Brahmanbaria', 'Chattogram', 16),
  ('Chandpur', 'Chattogram', 17),
  ('Cumilla', 'Chattogram', 18),
  ('Cox''s Bazar', 'Chattogram', 19),
  ('Feni', 'Chattogram', 20),
  ('Khagrachhari', 'Chattogram', 21),
  ('Lakshmipur', 'Chattogram', 22),
  ('Noakhali', 'Chattogram', 23),
  ('Rangamati', 'Chattogram', 24),
  ('Rajshahi', 'Rajshahi', 25),
  ('Bogura', 'Rajshahi', 26),
  ('Chapainawabganj', 'Rajshahi', 27),
  ('Joypurhat', 'Rajshahi', 28),
  ('Naogaon', 'Rajshahi', 29),
  ('Natore', 'Rajshahi', 30),
  ('Pabna', 'Rajshahi', 31),
  ('Sirajganj', 'Rajshahi', 32),
  ('Khulna', 'Khulna', 33),
  ('Bagerhat', 'Khulna', 34),
  ('Chuadanga', 'Khulna', 35),
  ('Jessore', 'Khulna', 36),
  ('Jhenaidah', 'Khulna', 37),
  ('Kushtia', 'Khulna', 38),
  ('Magura', 'Khulna', 39),
  ('Meherpur', 'Khulna', 40),
  ('Narail', 'Khulna', 41),
  ('Satkhira', 'Khulna', 42),
  ('Barishal', 'Barishal', 43),
  ('Barguna', 'Barishal', 44),
  ('Bhola', 'Barishal', 45),
  ('Jhalokati', 'Barishal', 46),
  ('Patuakhali', 'Barishal', 47),
  ('Pirojpur', 'Barishal', 48),
  ('Sylhet', 'Sylhet', 49),
  ('Habiganj', 'Sylhet', 50),
  ('Moulvibazar', 'Sylhet', 51),
  ('Sunamganj', 'Sylhet', 52),
  ('Rangpur', 'Rangpur', 53),
  ('Dinajpur', 'Rangpur', 54),
  ('Gaibandha', 'Rangpur', 55),
  ('Kurigram', 'Rangpur', 56),
  ('Lalmonirhat', 'Rangpur', 57),
  ('Nilphamari', 'Rangpur', 58),
  ('Panchagarh', 'Rangpur', 59),
  ('Thakurgaon', 'Rangpur', 60),
  ('Mymensingh', 'Mymensingh', 61),
  ('Jamalpur', 'Mymensingh', 62),
  ('Netrokona', 'Mymensingh', 63),
  ('Sherpur', 'Mymensingh', 64)
ON CONFLICT (name) DO NOTHING;
