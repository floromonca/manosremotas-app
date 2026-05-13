-- Payroll v1 weekly work schedules.
-- This is payroll configuration data: owner/admin only for now.

create table if not exists public.member_work_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  user_id uuid not null,

  -- 0 = Sunday, 1 = Monday, ... 6 = Saturday.
  day_of_week int not null check (day_of_week between 0 and 6),
  is_working_day boolean not null default true,
  start_time time null,
  end_time time null,
  unpaid_break_minutes int not null default 0 check (unpaid_break_minutes >= 0),
  timezone text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint member_work_schedules_unique_day
    unique (company_id, user_id, day_of_week),

  constraint member_work_schedules_working_day_times_required
    check (
      is_working_day = false
      or (start_time is not null and end_time is not null)
    ),

  constraint member_work_schedules_time_order
    check (
      start_time is null
      or end_time is null
      or end_time > start_time
    )
);

create index if not exists member_work_schedules_company_user_idx
on public.member_work_schedules(company_id, user_id);

alter table public.member_work_schedules enable row level security;

drop policy if exists member_work_schedules_admin_only
on public.member_work_schedules;

create policy member_work_schedules_admin_only
on public.member_work_schedules
for all
to authenticated
using (
  public.app_is_company_role(company_id, array['owner', 'admin'])
)
with check (
  public.app_is_company_role(company_id, array['owner', 'admin'])
);
