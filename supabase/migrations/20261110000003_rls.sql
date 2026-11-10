-- DöngüPazar: Row Level Security politikaları
-- Kural: her tabloda RLS açık. Politikası olmayan işlem reddedilir.
-- service_role (yalnızca sunucu) RLS'i atlar; bildirim üretimi gibi işler oradan yapılır.

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.offers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: kişisel veri (telefon). Yalnızca sahibi ve admin görür.
-- Herkese açık bilgiler companies tablosundadır.
-- ---------------------------------------------------------------------------
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------------------
-- companies: herkese açık profil
-- ---------------------------------------------------------------------------
create policy "companies_select_all" on public.companies
  for select to anon, authenticated
  using (true);

create policy "companies_insert_own" on public.companies
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "companies_update_own_or_admin" on public.companies
  for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy "companies_delete_admin" on public.companies
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- categories: herkes okur, admin yönetir
-- ---------------------------------------------------------------------------
create policy "categories_select_all" on public.categories
  for select to anon, authenticated
  using (true);

create policy "categories_insert_admin" on public.categories
  for insert to authenticated
  with check (public.is_admin());

create policy "categories_update_admin" on public.categories
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_delete_admin" on public.categories
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- listings: yayındaki ilanlar herkese açık; taslak/bekleyen/kaldırılan
-- ilanları yalnızca sahibi ve admin görür.
-- ---------------------------------------------------------------------------
create policy "listings_select_public_or_own" on public.listings
  for select to anon, authenticated
  using (
    status in ('active', 'reserved', 'completed')
    or public.owns_company(company_id)
    or public.is_admin()
  );

create policy "listings_insert_own" on public.listings
  for insert to authenticated
  with check (public.owns_company(company_id));

create policy "listings_update_own_or_admin" on public.listings
  for update to authenticated
  using (public.owns_company(company_id) or public.is_admin())
  with check (public.owns_company(company_id) or public.is_admin());

create policy "listings_delete_own_or_admin" on public.listings
  for delete to authenticated
  using (public.owns_company(company_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- listing_images: görünürlük ilana bağlı (alt sorgu listings RLS'ine tabidir)
-- ---------------------------------------------------------------------------
create policy "listing_images_select_visible" on public.listing_images
  for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));

create policy "listing_images_insert_own" on public.listing_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and public.owns_company(l.company_id)
    )
  );

create policy "listing_images_update_own" on public.listing_images
  for update to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and public.owns_company(l.company_id)
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and public.owns_company(l.company_id)
    )
  );

create policy "listing_images_delete_own_or_admin" on public.listing_images
  for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and public.owns_company(l.company_id)
    )
  );

-- ---------------------------------------------------------------------------
-- offers: yalnızca teklifi veren ve muhatabı görür
-- ---------------------------------------------------------------------------
create policy "offers_select_parties" on public.offers
  for select to authenticated
  using (
    public.owns_company(from_company_id)
    or public.owns_company(to_company_id)
    or public.is_admin()
  );

-- Teklif yalnızca yayındaki ilana verilebilir ve taraflardan biri ilan sahibi olmalıdır.
create policy "offers_insert_from_own_company" on public.offers
  for insert to authenticated
  with check (
    public.owns_company(from_company_id)
    and status = 'pending'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.status = 'active'
        and l.company_id in (from_company_id, to_company_id)
    )
  );

-- Durum değişikliği: veren geri çekebilir, muhatap kabul/red/karşı teklif yapabilir.
-- Geçiş kuralları 7. adımda (teklif sistemi) sıkılaştırılacak.
create policy "offers_update_parties" on public.offers
  for update to authenticated
  using (public.owns_company(from_company_id) or public.owns_company(to_company_id))
  with check (public.owns_company(from_company_id) or public.owns_company(to_company_id));

-- ---------------------------------------------------------------------------
-- conversations & messages: yalnızca iki taraf
-- ---------------------------------------------------------------------------
create policy "conversations_select_members" on public.conversations
  for select to authenticated
  using (
    public.owns_company(company_a_id)
    or public.owns_company(company_b_id)
    or public.is_admin()
  );

create policy "conversations_insert_members" on public.conversations
  for insert to authenticated
  with check (public.owns_company(company_a_id) or public.owns_company(company_b_id));

create policy "messages_select_members" on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id) or public.is_admin());

create policy "messages_insert_members" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id)
  );

-- Okundu işareti: yalnızca karşı taraf (alanlar tetikleyiciyle korunur).
create policy "messages_update_recipient" on public.messages
  for update to authenticated
  using (
    sender_id <> (select auth.uid())
    and public.is_conversation_member(conversation_id)
  )
  with check (
    sender_id <> (select auth.uid())
    and public.is_conversation_member(conversation_id)
  );

-- ---------------------------------------------------------------------------
-- reviews: herkese açık; yalnızca tamamlanan ilanın tarafları yazabilir
-- ---------------------------------------------------------------------------
create policy "reviews_select_all" on public.reviews
  for select to anon, authenticated
  using (true);

create policy "reviews_insert_after_completed_deal" on public.reviews
  for insert to authenticated
  with check (
    public.owns_company(from_company_id)
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'completed'
    )
    and exists (
      select 1 from public.offers o
      where o.listing_id = reviews.listing_id
        and o.status = 'accepted'
        and (
          (o.from_company_id = reviews.from_company_id and o.to_company_id = reviews.to_company_id)
          or
          (o.from_company_id = reviews.to_company_id and o.to_company_id = reviews.from_company_id)
        )
    )
  );

create policy "reviews_delete_admin" on public.reviews
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- favorites & saved_searches: yalnızca sahibi
-- ---------------------------------------------------------------------------
create policy "favorites_select_own" on public.favorites
  for select to authenticated
  using (public.owns_company(company_id));

create policy "favorites_insert_own" on public.favorites
  for insert to authenticated
  with check (public.owns_company(company_id));

create policy "favorites_delete_own" on public.favorites
  for delete to authenticated
  using (public.owns_company(company_id));

create policy "saved_searches_select_own" on public.saved_searches
  for select to authenticated
  using (public.owns_company(company_id));

create policy "saved_searches_insert_own" on public.saved_searches
  for insert to authenticated
  with check (public.owns_company(company_id));

create policy "saved_searches_update_own" on public.saved_searches
  for update to authenticated
  using (public.owns_company(company_id))
  with check (public.owns_company(company_id));

create policy "saved_searches_delete_own" on public.saved_searches
  for delete to authenticated
  using (public.owns_company(company_id));

-- ---------------------------------------------------------------------------
-- notifications: kullanıcı kendi bildirimlerini okur/okundu işaretler.
-- Ekleme yalnızca sunucudan (service_role) yapılır; insert politikası bilerek yok.
-- ---------------------------------------------------------------------------
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- reports: kullanıcı şikâyet açar ve kendi şikâyetini görür; admin yönetir
-- ---------------------------------------------------------------------------
create policy "reports_select_own_or_admin" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());

create policy "reports_insert_own" on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');

create policy "reports_update_admin" on public.reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
