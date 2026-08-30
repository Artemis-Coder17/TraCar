-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Vehicles ──────────────────────────────────────────────────────────────────
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nickname text not null default 'MY CAR',
  owner_name text,
  make text,
  model text,
  year text,
  colour text,
  fuel_type text,
  photo_url text,
  created_at timestamptz default now()
);

alter table vehicles enable row level security;
create policy "Users manage own vehicles" on vehicles
  for all using (auth.uid() = user_id);

-- ── Compliance Reminders ───────────────────────────────────────────────────────
create table compliance_reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  doc_type text not null check (doc_type in ('NCT', 'INSURANCE', 'MOTOR_TAX')),
  expiry_date date not null,
  provider_name text,
  created_at timestamptz default now()
);

alter table compliance_reminders enable row level security;
create policy "Users manage own reminders" on compliance_reminders
  for all using (auth.uid() = user_id);

-- ── Logs ──────────────────────────────────────────────────────────────────────
create table logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  type text not null check (type in ('service', 'fuel')),
  label text not null,
  date date,
  odo integer,
  cost numeric(10,2),
  garage text,
  litres numeric(8,3),
  price_per_l numeric(8,4),
  service_types text[],
  reminder_interval text,
  distance_traveled integer,
  consumption_rate numeric(6,2),
  created_at timestamptz default now()
);

alter table logs enable row level security;
create policy "Users manage own logs" on logs
  for all using (auth.uid() = user_id);

-- ── Push Subscriptions (for FCM) ───────────────────────────────────────────────
create table push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  fcm_token text not null,
  created_at timestamptz default now(),
  unique(user_id, fcm_token)
);

alter table push_subscriptions enable row level security;
create policy "Users manage own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id);
