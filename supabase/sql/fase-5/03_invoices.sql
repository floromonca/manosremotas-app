-- =========================================================
-- Fase 5 - 03 Invoices (Cabecera)
-- =========================================================

create table if not exists public.invoices (
  invoice_id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(company_id) on delete cascade,

  work_order_id uuid
    references public.work_orders(work_order_id) on delete set null,

  invoice_number text,
  customer_name text not null,
  customer_email text,

  currency text not null default 'CAD',

  status text not null default 'draft',
  -- draft | sent | paid | cancelled

  tax_rate numeric not null default 0.13,

  subtotal numeric not null default 0,
  tax_amount numeric not null default 0,
  total numeric not null default 0,

  created_at timestamp with time zone not null default now()
);

create index if not exists idx_invoices_company
  on public.invoices(company_id);

create index if not exists idx_invoices_work_order
  on public.invoices(work_order_id);