-- Security hardening for company-scoped data.
-- Rules:
-- - Technicians can only see their own payroll/time data.
-- - Invoice access is limited to owner/admin/office_staff/accountant.
-- - Company/team/pay-rate/settings administration is limited to owner/admin.

create or replace function public.app_is_company_role(
  p_company_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and coalesce(cm.active, true) = true
      and cm.role = any(p_roles)
  );
$$;

create or replace function public.app_is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and coalesce(cm.active, true) = true
  );
$$;

grant execute on function public.app_is_company_role(uuid, text[]) to authenticated;
grant execute on function public.app_is_company_member(uuid) to authenticated;

-- Company membership roster.
alter table if exists public.company_members enable row level security;

drop policy if exists company_members_select_secure on public.company_members;
create policy company_members_select_secure
on public.company_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.app_is_company_role(company_id, array['owner', 'admin'])
);

drop policy if exists company_members_insert_admin on public.company_members;
create policy company_members_insert_admin
on public.company_members
for insert
to authenticated
with check (
  public.app_is_company_role(company_id, array['owner', 'admin'])
);

drop policy if exists company_members_update_admin on public.company_members;
create policy company_members_update_admin
on public.company_members
for update
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin'])
)
with check (
  public.app_is_company_role(company_id, array['owner', 'admin'])
);

-- Company settings and tax profiles are administrative data.
alter table if exists public.company_settings enable row level security;

drop policy if exists company_settings_select_admin on public.company_settings;
create policy company_settings_select_admin
on public.company_settings
for select
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin', 'office_staff', 'accountant'])
);

drop policy if exists company_settings_write_admin on public.company_settings;
create policy company_settings_write_admin
on public.company_settings
for all
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin'])
)
with check (
  public.app_is_company_role(company_id, array['owner', 'admin'])
);

alter table if exists public.tax_profiles enable row level security;

drop policy if exists tax_profiles_select_invoice_admin on public.tax_profiles;
create policy tax_profiles_select_invoice_admin
on public.tax_profiles
for select
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin', 'office_staff', 'accountant'])
);

drop policy if exists tax_profiles_write_admin on public.tax_profiles;
create policy tax_profiles_write_admin
on public.tax_profiles
for all
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin'])
)
with check (
  public.app_is_company_role(company_id, array['owner', 'admin'])
);

-- Payroll rates are sensitive. Techs must never read rates/payroll config.
alter table if exists public.member_pay_rates enable row level security;

drop policy if exists member_pay_rates_admin_only on public.member_pay_rates;
create policy member_pay_rates_admin_only
on public.member_pay_rates
for all
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin'])
)
with check (
  public.app_is_company_role(company_id, array['owner', 'admin'])
);

-- Shift payroll time: tech sees own time only; owner/admin sees company time.
alter table if exists public.shifts enable row level security;

drop policy if exists shifts_select_secure on public.shifts;
create policy shifts_select_secure
on public.shifts
for select
to authenticated
using (
  user_id = auth.uid()
  or public.app_is_company_role(company_id, array['owner', 'admin'])
);

drop policy if exists shifts_insert_own_member on public.shifts;
create policy shifts_insert_own_member
on public.shifts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.app_is_company_member(company_id)
);

drop policy if exists shifts_update_own_or_admin on public.shifts;
create policy shifts_update_own_or_admin
on public.shifts
for update
to authenticated
using (
  user_id = auth.uid()
  or public.app_is_company_role(company_id, array['owner', 'admin'])
)
with check (
  user_id = auth.uid()
  or public.app_is_company_role(company_id, array['owner', 'admin'])
);

-- Work order check-in time: productivity visibility follows the same model.
alter table if exists public.work_order_check_ins enable row level security;

drop policy if exists work_order_check_ins_select_secure on public.work_order_check_ins;
create policy work_order_check_ins_select_secure
on public.work_order_check_ins
for select
to authenticated
using (
  user_id = auth.uid()
  or public.app_is_company_role(company_id, array['owner', 'admin'])
);

drop policy if exists work_order_check_ins_insert_own_member on public.work_order_check_ins;
create policy work_order_check_ins_insert_own_member
on public.work_order_check_ins
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.app_is_company_member(company_id)
);

drop policy if exists work_order_check_ins_update_own_or_admin on public.work_order_check_ins;
create policy work_order_check_ins_update_own_or_admin
on public.work_order_check_ins
for update
to authenticated
using (
  user_id = auth.uid()
  or public.app_is_company_role(company_id, array['owner', 'admin'])
)
with check (
  user_id = auth.uid()
  or public.app_is_company_role(company_id, array['owner', 'admin'])
);

-- Invoice data: not visible to technicians.
alter table if exists public.invoices enable row level security;

drop policy if exists invoices_select_company_members on public.invoices;
drop policy if exists invoices_select_invoice_admin on public.invoices;
create policy invoices_select_invoice_admin
on public.invoices
for select
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin', 'office_staff', 'accountant'])
);

drop policy if exists invoices_insert_admin_owner on public.invoices;
drop policy if exists invoices_write_invoice_admin on public.invoices;
create policy invoices_write_invoice_admin
on public.invoices
for all
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin', 'office_staff', 'accountant'])
)
with check (
  public.app_is_company_role(company_id, array['owner', 'admin', 'office_staff', 'accountant'])
);

alter table if exists public.invoice_items enable row level security;

drop policy if exists invoice_items_select_company_members on public.invoice_items;
drop policy if exists invoice_items_select_invoice_admin on public.invoice_items;
create policy invoice_items_select_invoice_admin
on public.invoice_items
for select
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin', 'office_staff', 'accountant'])
);

drop policy if exists invoice_items_insert_admin_owner on public.invoice_items;
drop policy if exists invoice_items_write_invoice_admin on public.invoice_items;
create policy invoice_items_write_invoice_admin
on public.invoice_items
for all
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin', 'office_staff', 'accountant'])
)
with check (
  public.app_is_company_role(company_id, array['owner', 'admin', 'office_staff', 'accountant'])
);

alter table if exists public.invoice_payments enable row level security;

drop policy if exists invoice_payments_invoice_admin on public.invoice_payments;
create policy invoice_payments_invoice_admin
on public.invoice_payments
for all
to authenticated
using (
  exists (
    select 1
    from public.invoices inv
    where inv.invoice_id = invoice_payments.invoice_id
      and public.app_is_company_role(inv.company_id, array['owner', 'admin', 'office_staff', 'accountant'])
  )
)
with check (
  exists (
    select 1
    from public.invoices inv
    where inv.invoice_id = invoice_payments.invoice_id
      and public.app_is_company_role(inv.company_id, array['owner', 'admin', 'office_staff', 'accountant'])
  )
);
