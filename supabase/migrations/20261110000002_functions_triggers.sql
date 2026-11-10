-- DöngüPazar: yardımcı fonksiyonlar ve tetikleyiciler

-- ---------------------------------------------------------------------------
-- Yetki yardımcıları (RLS politikalarında kullanılır)
-- security definer: profiles/companies üzerindeki RLS'e takılmadan kontrol eder.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.owns_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.companies
    where id = target_company_id and owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.companies co on co.id in (c.company_a_id, c.company_b_id)
    where c.id = target_conversation_id and co.owner_id = (select auth.uid())
  );
$$;

-- İstek son kullanıcıdan mı geliyor? (service_role, SQL editörü ve iç tetikleyiciler hariç)
create or replace function public.is_end_user_request()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.role()), '') in ('authenticated', 'anon');
$$;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger companies_set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create trigger offers_set_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Yeni auth kullanıcısı → profil
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Korumalı alanlar: kullanıcı kendi satırını güncelleyebilir ama
-- yetki/onay alanlarını değiştiremez. Güvenlik istemciye bırakılmaz.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_end_user_request() and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.role := 'user';
    else
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields before insert or update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.protect_company_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- pg_trigger_depth() > 1: başka bir tetikleyiciden (ör. puan ortalaması) gelen güncelleme.
  if public.is_end_user_request() and not public.is_admin() and pg_trigger_depth() = 1 then
    if tg_op = 'INSERT' then
      new.is_verified := false;
      new.rating_avg := 0;
      new.rating_count := 0;
    else
      new.owner_id := old.owner_id;
      new.is_verified := old.is_verified;
      new.rating_avg := old.rating_avg;
      new.rating_count := old.rating_count;
    end if;
  end if;
  return new;
end;
$$;

create trigger companies_protect_fields before insert or update on public.companies
  for each row execute function public.protect_company_fields();

-- İlan durumu: kullanıcı ilanı yalnızca taslak veya onay bekliyor olarak oluşturabilir;
-- 'active' durumuna ilk geçişi admin yapar (ilan onayı).
create or replace function public.protect_listing_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_end_user_request() or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending') then
      new.status := 'pending';
    end if;
    new.views := 0;
    return new;
  end if;

  new.company_id := old.company_id;
  new.views := old.views;

  if new.status is distinct from old.status then
    if old.status = 'removed' then
      raise exception 'removed listings cannot be changed' using errcode = '42501';
    end if;

    if new.status in ('active', 'reserved', 'completed')
       and old.status not in ('active', 'reserved') then
      raise exception 'listing must be approved before it can be %', new.status
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger listings_protect_fields before insert or update on public.listings
  for each row execute function public.protect_listing_fields();

-- ---------------------------------------------------------------------------
-- İlan başına en fazla 8 fotoğraf
-- ---------------------------------------------------------------------------
create or replace function public.enforce_listing_image_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.listing_images where listing_id = new.listing_id) >= 8 then
    raise exception 'a listing can have at most 8 images' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger listing_images_limit before insert on public.listing_images
  for each row execute function public.enforce_listing_image_limit();

-- ---------------------------------------------------------------------------
-- Mesaj → konuşmanın last_message_at alanı
-- ---------------------------------------------------------------------------
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();

-- Mesajda yalnızca read_at güncellenebilir.
create or replace function public.protect_message_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_end_user_request() then
    new.conversation_id := old.conversation_id;
    new.sender_id := old.sender_id;
    new.body := old.body;
    new.attachment_url := old.attachment_url;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger messages_protect_fields before update on public.messages
  for each row execute function public.protect_message_fields();

-- ---------------------------------------------------------------------------
-- Puan → firmanın rating_avg / rating_count alanları
-- ---------------------------------------------------------------------------
create or replace function public.refresh_company_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.to_company_id, old.to_company_id);
begin
  update public.companies c
  set rating_avg = coalesce(r.avg_rating, 0),
      rating_count = coalesce(r.total, 0)
  from (
    select round(avg(rating)::numeric, 2) as avg_rating, count(*) as total
    from public.reviews
    where to_company_id = target
  ) r
  where c.id = target;
  return null;
end;
$$;

create trigger reviews_refresh_company_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_company_rating();

-- ---------------------------------------------------------------------------
-- Görüntülenme sayacı (anonim ziyaretçi de çağırabilir)
-- ---------------------------------------------------------------------------
create or replace function public.increment_listing_views(target_listing_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.listings
  set views = views + 1
  where id = target_listing_id and status in ('active', 'reserved');
$$;

revoke execute on function public.increment_listing_views(uuid) from public;
grant execute on function public.increment_listing_views(uuid) to anon, authenticated;
