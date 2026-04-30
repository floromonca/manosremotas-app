create table if not exists public.service_catalog_items (
  service_catalog_item_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,

  name text not null,
  description text null,
  uom text not null default 'each',
  unit_price numeric(12,2) null,
  taxable boolean not null default true,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint service_catalog_items_name_not_empty
    check (length(trim(name)) > 0),

  constraint service_catalog_items_uom_not_empty
    check (length(trim(uom)) > 0),

  constraint service_catalog_items_unit_price_non_negative
    check (unit_price is null or unit_price >= 0)
);

create index if not exists service_catalog_items_company_active_name_idx
on public.service_catalog_items(company_id, active, name);

alter table public.service_catalog_items enable row level security;

drop policy if exists service_catalog_items_select_company
on public.service_catalog_items;

create policy service_catalog_items_select_company
on public.service_catalog_items
for select
to authenticated
using (
  is_company_member(company_id)
);

drop policy if exists service_catalog_items_insert_admin
on public.service_catalog_items;

create policy service_catalog_items_insert_admin
on public.service_catalog_items
for insert
to authenticated
with check (
  is_company_role(company_id, array['owner', 'admin', 'office_staff'])
);

drop policy if exists service_catalog_items_update_admin
on public.service_catalog_items;

create policy service_catalog_items_update_admin
on public.service_catalog_items
for update
to authenticated
using (
  is_company_role(company_id, array['owner', 'admin', 'office_staff'])
)
with check (
  is_company_role(company_id, array['owner', 'admin', 'office_staff'])
);