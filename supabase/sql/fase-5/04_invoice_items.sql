-- =========================================================
-- Fase 5 - 04 Invoice Items (Líneas de factura)
-- =========================================================

create table if not exists public.invoice_items (
  item_id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(company_id) on delete cascade,

  invoice_id uuid not null
    references public.invoices(invoice_id) on delete cascade,

  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  line_total numeric not null default 0,

  taxable boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_invoice_items_company
  on public.invoice_items(company_id);

create index if not exists idx_invoice_items_invoice
  on public.invoice_items(invoice_id);

-- Trigger: calcula line_total automáticamente
create or replace function public.invoice_item_calculate_line_total()
returns trigger as $$
begin
  new.line_total = new.quantity * new.unit_price;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_invoice_item_line_total on public.invoice_items;

create trigger trg_invoice_item_line_total
before insert or update
on public.invoice_items
for each row
execute function public.invoice_item_calculate_line_total();