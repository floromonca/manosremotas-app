-- =========================================================
-- Fase 5 - 05 Triggers: Totales de invoice (subtotal/tax/total)
-- =========================================================

-- Recalcula totales de una invoice específica
create or replace function public.recalc_invoice_totals(p_invoice_id uuid)
returns void
language plpgsql
as $$
declare
  v_subtotal numeric;
  v_tax_rate numeric;
begin
  -- subtotal = suma de line_total (solo items taxable o todos? -> subtotal siempre suma todos)
  select coalesce(sum(ii.line_total), 0)
  into v_subtotal
  from public.invoice_items ii
  where ii.invoice_id = p_invoice_id;

  -- tax_rate desde invoices
  select i.tax_rate
  into v_tax_rate
  from public.invoices i
  where i.invoice_id = p_invoice_id;

  update public.invoices i
  set
    subtotal = v_subtotal,
    tax_amount = round(v_subtotal * coalesce(v_tax_rate, 0), 2),
    total = round(v_subtotal + (v_subtotal * coalesce(v_tax_rate, 0)), 2)
  where i.invoice_id = p_invoice_id;
end;
$$;


-- Trigger function: se dispara cuando cambian invoice_items
create or replace function public.trg_invoice_items_recalc_invoice()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recalc_invoice_totals(old.invoice_id);
    return old;
  else
    perform public.recalc_invoice_totals(new.invoice_id);
    return new;
  end if;
end;
$$;

drop trigger if exists trg_invoice_items_recalc on public.invoice_items;

create trigger trg_invoice_items_recalc
after insert or update or delete
on public.invoice_items
for each row
execute function public.trg_invoice_items_recalc_invoice();


-- Trigger: si cambia tax_rate en invoices, recalcular totales
create or replace function public.trg_invoices_taxrate_recalc()
returns trigger
language plpgsql
as $$
begin
  if new.tax_rate is distinct from old.tax_rate then
    perform public.recalc_invoice_totals(new.invoice_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_taxrate_recalc on public.invoices;

create trigger trg_invoices_taxrate_recalc
after update of tax_rate
on public.invoices
for each row
execute function public.trg_invoices_taxrate_recalc();