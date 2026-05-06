-- Store invoice item unit of measure as a historical snapshot.
-- This preserves Work Order / Service Catalog UOM on generated invoices.

alter table public.invoice_items
add column if not exists uom text;
