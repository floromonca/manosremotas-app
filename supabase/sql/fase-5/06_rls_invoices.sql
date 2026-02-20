-- =========================================================
-- Fase 5 - 06 RLS Invoices + Invoice Items
-- Usa public.is_company_role(company_id, roles[])
-- =========================================================

-- ===============================
-- INVOICES
-- ===============================

alter table public.invoices enable row level security;

-- SELECT: miembros de la compañía
drop policy if exists "invoices_select_company_members" on public.invoices;
create policy "invoices_select_company_members"
on public.invoices
for select
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = invoices.company_id
      and cm.user_id = auth.uid()
  )
);

-- INSERT: owner/admin
drop policy if exists "invoices_insert_admin_owner" on public.invoices;
create policy "invoices_insert_admin_owner"
on public.invoices
for insert
with check (
  public.is_company_role(company_id, ARRAY['owner','admin'])
);

-- UPDATE: owner/admin
drop policy if exists "invoices_update_admin_owner" on public.invoices;
create policy "invoices_update_admin_owner"
on public.invoices
for update
using (
  public.is_company_role(company_id, ARRAY['owner','admin'])
)
with check (
  public.is_company_role(company_id, ARRAY['owner','admin'])
);

-- DELETE: owner/admin
drop policy if exists "invoices_delete_admin_owner" on public.invoices;
create policy "invoices_delete_admin_owner"
on public.invoices
for delete
using (
  public.is_company_role(company_id, ARRAY['owner','admin'])
);


-- ===============================
-- INVOICE_ITEMS
-- ===============================

alter table public.invoice_items enable row level security;

-- SELECT: miembros de la compañía
drop policy if exists "invoice_items_select_company_members" on public.invoice_items;
create policy "invoice_items_select_company_members"
on public.invoice_items
for select
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = invoice_items.company_id
      and cm.user_id = auth.uid()
  )
);

-- INSERT: owner/admin
drop policy if exists "invoice_items_insert_admin_owner" on public.invoice_items;
create policy "invoice_items_insert_admin_owner"
on public.invoice_items
for insert
with check (
  public.is_company_role(company_id, ARRAY['owner','admin'])
);

-- UPDATE: owner/admin
drop policy if exists "invoice_items_update_admin_owner" on public.invoice_items;
create policy "invoice_items_update_admin_owner"
on public.invoice_items
for update
using (
  public.is_company_role(company_id, ARRAY['owner','admin'])
)
with check (
  public.is_company_role(company_id, ARRAY['owner','admin'])
);

-- DELETE: owner/admin
drop policy if exists "invoice_items_delete_admin_owner" on public.invoice_items;
create policy "invoice_items_delete_admin_owner"
on public.invoice_items
for delete
using (
  public.is_company_role(company_id, ARRAY['owner','admin'])
);