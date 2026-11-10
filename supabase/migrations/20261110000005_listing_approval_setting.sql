-- DöngüPazar: ilan onayı ayarı ve API rolleri için açık yetkiler
--
-- Admin paneli hazır olana kadar ilanlar doğrudan yayına girer
-- (require_listing_approval = false). Admin onayı istenirse bu ayar true yapılır;
-- o zaman kullanıcı ilanları 'pending' olarak bekler.

create table public.app_settings (
  id boolean primary key default true check (id),
  require_listing_approval boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create policy "app_settings_select_all" on public.app_settings
  for select to anon, authenticated
  using (true);

create policy "app_settings_update_admin" on public.app_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.protect_listing_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  approval_required boolean;
begin
  if not public.is_end_user_request() or public.is_admin() then
    return new;
  end if;

  select coalesce((select require_listing_approval from public.app_settings limit 1), true)
  into approval_required;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending', 'active') then
      new.status := 'pending';
    end if;
    if new.status = 'active' and approval_required then
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
      -- Onay gerekmiyorsa sahibi taslağı/bekleyen ilanı kendisi yayına alabilir.
      if not (new.status = 'active' and not approval_required) then
        raise exception 'listing must be approved before it can be %', new.status
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Supabase varsayılan yetkileri normalde bunları verir; migration farklı bir
-- rolle çalıştırılırsa diye açıkça tanımlanır. Erişimi asıl sınırlayan RLS'tir.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.owns_company(uuid) to anon, authenticated;
grant execute on function public.is_conversation_member(uuid) to anon, authenticated;
grant execute on function public.is_end_user_request() to anon, authenticated;
