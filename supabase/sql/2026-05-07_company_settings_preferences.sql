alter table public.company_settings
  add column if not exists require_work_order_notes boolean not null default false,
  add column if not exists show_customer_email_on_invoice boolean not null default true,
  add column if not exists show_customer_phone_on_invoice boolean not null default true,
  add column if not exists auto_open_pdf_after_generate boolean not null default false,
  add column if not exists compact_invoice_view boolean not null default false,
  add column if not exists enable_internal_reference_field boolean not null default true;

