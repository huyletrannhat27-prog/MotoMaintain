-- MotoMaintain: schema + repeatable upgrade for the original schema.
-- Run in Supabase SQL Editor. Does not delete existing vehicles or history.
begin;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, email text not null, full_name text, phone text,
 role text not null default 'user' check(role in ('user','admin')), avatar_url text,
 created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists public.vehicles (
 id uuid primary key default gen_random_uuid(), name text not null, model text not null,
 type text not null check(type in ('scooter','semi-auto')), brand text not null default 'Honda', image_url text,
 engine_cc integer not null, oil_capacity_liters numeric(4,2) not null, description text, is_active boolean default true,
 created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists public.maintenance_items (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid references public.vehicles(id) on delete cascade,
 name text not null, description text, interval_km integer not null, interval_months integer not null,
 estimated_cost_min integer not null default 0, estimated_cost_max integer not null default 0,
 is_critical boolean default false, category text not null default 'other' check(category in ('engine','brake','filter','electrical','tires','body','other')),
 created_at timestamptz default now(), updated_at timestamptz default now());
alter table public.maintenance_items add column if not exists source_url text;
alter table public.maintenance_items add column if not exists verified boolean not null default false;
alter table public.maintenance_items add column if not exists first_service_km integer;
alter table public.maintenance_items add column if not exists odometer_based boolean not null default false;
create table if not exists public.parts_suggestions (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid references public.vehicles(id) on delete cascade,
 maintenance_item_id uuid references public.maintenance_items(id) on delete cascade, part_name text not null,
 part_number text, brand text, estimated_price_min integer not null default 0, estimated_price_max integer not null default 0,
 replace_interval_km integer not null, replace_interval_months integer, notes text, created_at timestamptz default now());
create table if not exists public.user_vehicles (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
 vehicle_id uuid references public.vehicles(id), nickname text, license_plate text, purchase_date date,
 current_km integer not null default 0, color text, year integer, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists public.maintenance_records (
 id uuid primary key default gen_random_uuid(), user_vehicle_id uuid references public.user_vehicles(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade, date date not null, km_at_maintenance integer not null,
 items_maintained uuid[] default '{}', notes text, cost integer, shop_name text,
 next_maintenance_km integer, next_maintenance_date date, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists public.honda_stores (
 id uuid primary key default gen_random_uuid(), name text not null, address text not null, phone text,
 lat numeric(10,8) not null, lng numeric(11,8) not null, city text not null, district text,
 opening_hours text default '7:30 - 17:30', services text[] default '{}', rating numeric(2,1),
 is_active boolean default true, created_at timestamptz default now());

-- Replace recursive legacy policies. Role checks execute as the owner with a fixed search path.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
do $$ declare t text; p record; begin
 foreach t in array array['profiles','vehicles','maintenance_items','parts_suggestions','user_vehicles','maintenance_records','honda_stores'] loop
  execute format('alter table public.%I enable row level security',t);
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
   execute format('drop policy %I on public.%I',p.policyname,t);
  end loop;
 end loop;
end $$;
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_admin());
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy vehicle_read on public.vehicles for select to authenticated using(true);
create policy vehicle_admin on public.vehicles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy item_read on public.maintenance_items for select to authenticated using(true);
create policy item_admin on public.maintenance_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy part_read on public.parts_suggestions for select to authenticated using(true);
create policy part_admin on public.parts_suggestions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy store_read on public.honda_stores for select to authenticated using(is_active or public.is_admin());
create policy store_admin on public.honda_stores for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy own_vehicles on public.user_vehicles for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_records on public.maintenance_records for all to authenticated
 using(user_id=(select auth.uid()) and exists(select 1 from public.user_vehicles v where v.id=user_vehicle_id and v.user_id=(select auth.uid())))
 with check(user_id=(select auth.uid()) and exists(select 1 from public.user_vehicles v where v.id=user_vehicle_id and v.user_id=(select auth.uid())));
revoke all on public.profiles,public.vehicles,public.maintenance_items,public.parts_suggestions,public.user_vehicles,public.maintenance_records,public.honda_stores from anon;
grant select on public.profiles to authenticated;
revoke insert,update,delete on public.profiles from authenticated;
grant update(full_name,phone,avatar_url) on public.profiles to authenticated;
grant select,insert,update,delete on public.vehicles,public.maintenance_items,public.parts_suggestions,public.user_vehicles,public.maintenance_records,public.honda_stores to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,email,full_name) values(new.id,coalesce(new.email,''),left(new.raw_user_meta_data->>'full_name',100)) on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Repair missing profiles for accounts created before the trigger was installed.
insert into public.profiles(id,email,full_name) select id,coalesce(email,''),left(raw_user_meta_data->>'full_name',100) from auth.users on conflict(id) do nothing;
create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['profiles','vehicles','user_vehicles','maintenance_records','maintenance_items'] loop
  execute format('drop trigger if exists %I on public.%I','update_'||t||'_updated_at',t);
  execute format('create trigger %I before update on public.%I for each row execute function public.update_updated_at_column()','update_'||t||'_updated_at',t);
 end loop;
end $$;
create or replace function public.check_user_vehicle() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.user_id is null or new.vehicle_id is null or new.current_km<0 then raise exception 'Thông tin xe không hợp lệ.'; end if;
 if new.purchase_date>(now() at time zone 'Asia/Ho_Chi_Minh')::date or (new.year is not null and (new.year<1950 or new.year>extract(year from now())+1)) then raise exception 'Ngày mua hoặc năm sản xuất không hợp lệ.'; end if;
 if tg_op='UPDATE' then
  if old.user_id<>new.user_id then raise exception 'Không được chuyển chủ xe.'; end if;
  if old.vehicle_id<>new.vehicle_id and exists(select 1 from public.maintenance_records where user_vehicle_id=new.id) then raise exception 'Xe có lịch sử không thể đổi mẫu xe.'; end if;
 end if;
 if new.current_km < coalesce((select max(km_at_maintenance) from public.maintenance_records where user_vehicle_id=new.id),0) then raise exception 'Số km thấp hơn lịch sử bảo dưỡng.'; end if;
 return new;
end $$;
drop trigger if exists check_user_vehicle on public.user_vehicles;
create trigger check_user_vehicle before insert or update on public.user_vehicles for each row execute function public.check_user_vehicle();
create or replace function public.check_maintenance_record() returns trigger language plpgsql set search_path = '' as $$
declare v public.user_vehicles; item_count integer;
begin
 select * into v from public.user_vehicles where id=new.user_vehicle_id for update;
 if v.id is null or new.user_id is null or new.user_id<>v.user_id then raise exception 'Xe không thuộc tài khoản này.'; end if;
 if tg_op='UPDATE' and (old.user_id<>new.user_id or old.user_vehicle_id<>new.user_vehicle_id) then raise exception 'Không được chuyển bản ghi sang xe khác.'; end if;
 if new.date>(now() at time zone 'Asia/Ho_Chi_Minh')::date or new.km_at_maintenance<0 or new.cost<0 then raise exception 'Ngày, số km hoặc chi phí không hợp lệ.'; end if;
 select count(distinct id) into item_count from public.maintenance_items where vehicle_id=v.vehicle_id and id=any(new.items_maintained);
 if coalesce(cardinality(new.items_maintained),0)=0 or item_count<>cardinality(new.items_maintained) then raise exception 'Chọn hạng mục hợp lệ của mẫu xe.'; end if;
 if exists(select 1 from public.maintenance_records r where r.user_vehicle_id=v.id and r.id<>new.id and ((r.date<new.date and r.km_at_maintenance>new.km_at_maintenance) or (r.date>new.date and r.km_at_maintenance<new.km_at_maintenance))) then raise exception 'Số km không khớp thứ tự ngày trong lịch sử.'; end if;
 -- Legacy aggregate due fields are intentionally unused: due dates are per item.
 new.next_maintenance_km=null; new.next_maintenance_date=null;
 return new;
end $$;
drop trigger if exists check_maintenance_record on public.maintenance_records;
create trigger check_maintenance_record before insert or update on public.maintenance_records for each row execute function public.check_maintenance_record();
create or replace function public.sync_vehicle_odometer() returns trigger language plpgsql set search_path = '' as $$ begin
 update public.user_vehicles set current_km=greatest(current_km,new.km_at_maintenance) where id=new.user_vehicle_id;
 return new;
end $$;
drop trigger if exists sync_vehicle_odometer on public.maintenance_records;
create trigger sync_vehicle_odometer after insert or update on public.maintenance_records for each row execute function public.sync_vehicle_odometer();
create or replace function public.check_maintenance_item() returns trigger language plpgsql security definer set search_path = '' as $$ begin
 if tg_op='DELETE' then
  if exists(select 1 from public.maintenance_records where old.id=any(items_maintained)) then raise exception 'Hạng mục đã có lịch sử, không thể xóa.'; end if; return old;
 end if;
 if new.vehicle_id is null or new.interval_km<0 or new.interval_months<0 or (new.interval_km=0 and new.interval_months=0) or new.estimated_cost_min<0 or new.estimated_cost_max<new.estimated_cost_min or (new.first_service_km is not null and (new.first_service_km<=0 or new.first_service_km>=new.interval_km or not new.odometer_based)) or (new.odometer_based and new.interval_km=0) then raise exception 'Chu kỳ hoặc giá không hợp lệ.'; end if;
 if new.verified and coalesce(new.source_url,'') !~ '^https://' then raise exception 'Cần nguồn HTTPS khi đánh dấu đã xác minh.'; end if;
 if tg_op='UPDATE' and old.vehicle_id<>new.vehicle_id and (exists(select 1 from public.maintenance_records where old.id=any(items_maintained)) or exists(select 1 from public.parts_suggestions where maintenance_item_id=old.id)) then raise exception 'Không thể chuyển hạng mục đã có lịch sử hoặc phụ tùng liên kết.'; end if;
 return new;
end $$;
drop trigger if exists check_maintenance_item on public.maintenance_items;
create trigger check_maintenance_item before insert or update or delete on public.maintenance_items for each row execute function public.check_maintenance_item();
create or replace function public.check_part() returns trigger language plpgsql set search_path = '' as $$ begin
 if not exists(select 1 from public.maintenance_items where id=new.maintenance_item_id and vehicle_id=new.vehicle_id) or new.estimated_price_min<0 or new.estimated_price_max<new.estimated_price_min or new.replace_interval_km<=0 then raise exception 'Phụ tùng phải khớp hạng mục, mẫu xe và giá hợp lệ.'; end if;
 return new;
end $$;
drop trigger if exists check_part on public.parts_suggestions;
create trigger check_part before insert or update on public.parts_suggestions for each row execute function public.check_part();
create or replace function public.save_maintenance_record(p_id uuid,p_vehicle uuid,p_date date,p_km integer,p_items uuid[],p_cost integer,p_shop text,p_notes text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result_id uuid;
begin
 if auth.uid() is null then raise exception 'Cần đăng nhập.'; end if;
 if p_id is null then
  insert into public.maintenance_records(user_vehicle_id,user_id,date,km_at_maintenance,items_maintained,cost,shop_name,notes)
  values(p_vehicle,auth.uid(),p_date,p_km,p_items,p_cost,p_shop,p_notes) returning id into result_id;
 else
  update public.maintenance_records set date=p_date,km_at_maintenance=p_km,items_maintained=p_items,cost=p_cost,shop_name=p_shop,notes=p_notes
  where id=p_id and user_id=auth.uid() and user_vehicle_id=p_vehicle returning id into result_id;
  if result_id is null then raise exception 'Không tìm thấy bản ghi của bạn.'; end if;
 end if;
 return result_id;
end $$;
revoke all on function public.save_maintenance_record(uuid,uuid,date,integer,uuid[],integer,text,text) from public;
grant execute on function public.save_maintenance_record(uuid,uuid,date,integer,uuid[],integer,text,text) to authenticated;
create index if not exists user_vehicles_owner_idx on public.user_vehicles(user_id);
create index if not exists records_vehicle_date_idx on public.maintenance_records(user_vehicle_id,date desc);
create index if not exists records_owner_idx on public.maintenance_records(user_id);
create index if not exists items_vehicle_idx on public.maintenance_items(vehicle_id);
create index if not exists records_owner_cursor_idx on public.maintenance_records(user_id,id);
create index if not exists vehicles_owner_cursor_idx on public.user_vehicles(user_id,id);
create index if not exists parts_item_idx on public.parts_suggestions(maintenance_item_id);
-- Correct only the known mislabeled legacy seed, leaving other catalog entries untouched.
update public.vehicles set name='Yamaha Sirius',brand='Yamaha',model='Sirius 110' where name='Honda Sirus' and model='SIRUS';
update public.vehicles set name='Honda Air Blade',model='Air Blade (cần xác minh đời xe)' where name='Honda AB' and model='LEAD 110 (AB)';
-- Hide only exact fictitious legacy shop fixtures. Admin can review and reactivate.
update public.honda_stores set is_active=false where (name,address,phone) in (
 ('Honda HEAD Hoàng Minh','123 Nguyễn Văn Linh, Q.7','028-1234567'),
 ('Honda HEAD Bình Thạnh','456 Đinh Bộ Lĩnh, Q.Bình Thạnh','028-2345678'),
 ('Honda HEAD Gò Vấp','789 Nguyễn Kiệm, Q.Gò Vấp','028-3456789'),
 ('Honda HEAD Hà Nội Hoàng Mai','321 Giải Phóng, Q.Hoàng Mai','024-4567890'),
 ('Honda HEAD Đà Nẵng','654 Nguyễn Văn Linh, Q.Thanh Khê','0236-5678901')
);
commit;
