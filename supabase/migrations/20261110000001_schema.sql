-- DöngüPazar: temel şema (CLAUDE.md Bölüm 7)
-- Uzantılar, enum'lar, tablolar ve indeksler. RLS politikaları bir sonraki migration'da.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enum tipleri
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('user', 'admin');
create type public.category_type as enum ('pallet', 'waste');
create type public.listing_type as enum ('offer', 'request');
create type public.listing_unit as enum ('adet', 'kg', 'ton', 'm3', 'torba', 'bigbag');
create type public.listing_frequency as enum ('once', 'weekly', 'monthly');
create type public.price_type as enum ('fixed', 'negotiable', 'free');
create type public.delivery_type as enum ('pickup', 'delivery', 'negotiable');
create type public.listing_status as enum
  ('draft', 'pending', 'active', 'reserved', 'completed', 'removed');
create type public.offer_status as enum
  ('pending', 'accepted', 'rejected', 'countered', 'withdrawn');
create type public.report_target as enum ('listing', 'company');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- ---------------------------------------------------------------------------
-- profiles: auth.users ile 1-1
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique,
  name text not null check (char_length(name) between 2 and 160),
  tax_number text check (tax_number ~ '^[0-9]{10,11}$'),
  sector text,
  description text,
  logo_url text,
  phone text,
  city text not null,
  district text,
  address text,
  location extensions.geography (Point, 4326),
  is_verified boolean not null default false,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_owner_id_idx on public.companies (owner_id);
create index companies_city_idx on public.companies (city);
create index companies_location_idx on public.companies using gist (location);
create unique index companies_tax_number_key on public.companies (tax_number)
  where tax_number is not null;

-- ---------------------------------------------------------------------------
-- categories (iki seviye: üst kategori → alt kategori)
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  slug text not null unique,
  name_tr text not null,
  name_en text,
  type public.category_type not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index categories_parent_id_idx on public.categories (parent_id);
create index categories_type_idx on public.categories (type);

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  slug text not null unique,
  listing_type public.listing_type not null,
  title text not null check (char_length(title) between 5 and 140),
  description text,
  quantity numeric(14, 2) check (quantity > 0),
  unit public.listing_unit not null,
  frequency public.listing_frequency not null default 'once',
  price numeric(14, 2) check (price >= 0),
  price_type public.price_type not null,
  delivery public.delivery_type not null default 'negotiable',
  -- palet: {pallet_type, condition, ispm15, dimensions}; atık: {material, purity, ...}
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  city text not null,
  district text,
  location extensions.geography (Point, 4326),
  status public.listing_status not null default 'draft',
  -- Kullanıcının "tehlikeli atık değildir" beyanı; işaretlenmeden ilan yayına gönderilemez.
  is_hazardous_declared_false boolean not null default false,
  views integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('turkish', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  constraint listings_free_has_no_price check (price_type <> 'free' or price is null),
  constraint listings_hazard_declaration check (
    status = 'draft' or is_hazardous_declared_false
  )
);

create index listings_company_id_idx on public.listings (company_id);
create index listings_category_id_idx on public.listings (category_id);
create index listings_status_created_idx on public.listings (status, created_at desc);
create index listings_city_district_idx on public.listings (city, district);
create index listings_type_idx on public.listings (listing_type);
create index listings_location_idx on public.listings using gist (location);
create index listings_attributes_idx on public.listings using gin (attributes jsonb_path_ops);
create index listings_search_idx on public.listings using gin (search_vector);
create index listings_title_trgm_idx on public.listings
  using gin (title extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- listing_images (ilan başına en fazla 8)
-- ---------------------------------------------------------------------------
create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index listing_images_listing_id_idx on public.listing_images (listing_id, sort_order);

-- ---------------------------------------------------------------------------
-- offers (karşı teklifler parent_offer_id ile zincirlenir)
-- ---------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  from_company_id uuid not null references public.companies (id) on delete cascade,
  -- Teklifin muhatabı. İlk teklifte ilan sahibi, karşı teklifte ilk teklifi veren firma.
  to_company_id uuid not null references public.companies (id) on delete cascade,
  quantity numeric(14, 2) not null check (quantity > 0),
  price numeric(14, 2) check (price >= 0),
  note text check (char_length(note) <= 1000),
  status public.offer_status not null default 'pending',
  parent_offer_id uuid references public.offers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_distinct_companies check (from_company_id <> to_company_id)
);

create index offers_listing_id_idx on public.offers (listing_id);
create index offers_from_company_id_idx on public.offers (from_company_id);
create index offers_to_company_id_idx on public.offers (to_company_id);
create index offers_parent_offer_id_idx on public.offers (parent_offer_id);

-- ---------------------------------------------------------------------------
-- conversations & messages
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  company_a_id uuid not null references public.companies (id) on delete cascade,
  company_b_id uuid not null references public.companies (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  -- Aynı çift için tek kayıt: küçük id her zaman company_a_id.
  constraint conversations_ordered_pair check (company_a_id < company_b_id)
);

create unique index conversations_pair_listing_key
  on public.conversations (company_a_id, company_b_id, listing_id) nulls not distinct;
create index conversations_company_b_id_idx on public.conversations (company_b_id);
create index conversations_last_message_idx on public.conversations (last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text check (char_length(body) <= 4000),
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_has_content check (
    nullif(btrim(body), '') is not null or attachment_url is not null
  )
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  from_company_id uuid not null references public.companies (id) on delete cascade,
  to_company_id uuid not null references public.companies (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  constraint reviews_distinct_companies check (from_company_id <> to_company_id),
  constraint reviews_one_per_listing unique (from_company_id, to_company_id, listing_id)
);

create index reviews_to_company_id_idx on public.reviews (to_company_id);

-- ---------------------------------------------------------------------------
-- favorites, saved_searches, notifications, reports
-- ---------------------------------------------------------------------------
create table public.favorites (
  company_id uuid not null references public.companies (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, listing_id)
);

create index favorites_listing_id_idx on public.favorites (listing_id);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text,
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  notify_email boolean not null default true,
  created_at timestamptz not null default now()
);

create index saved_searches_company_id_idx on public.saved_searches (company_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 5 and 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);
