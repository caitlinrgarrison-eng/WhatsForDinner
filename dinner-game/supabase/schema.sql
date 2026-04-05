create table if not exists public.user_profiles (
  user_id uuid primary key,
  display_name text not null default 'Dinner Duo',
  default_protein text not null default 'any',
  default_cuisines text[] not null default '{}',
  min_rating numeric not null default 3.5,
  max_price_level int not null default 4,
  max_distance_miles numeric not null default 15,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mode text not null,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.choices (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  source text not null,
  choice_name text not null,
  rating numeric,
  price_level int,
  categories text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.rewards_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reason text not null,
  points int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  badge_name text not null,
  unlocked_at timestamptz not null default now()
);
