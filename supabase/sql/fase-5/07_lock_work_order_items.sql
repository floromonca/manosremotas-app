-- =========================================
-- Lock work_order_items when invoice is not draft
-- =========================================

create or replace function public.trg_block_items_if_invoiced()
returns trigger
language plpgsql
as $$
declare
    v_invoice_id uuid;
    v_invoice_status text;
begin
    -- Obtener invoice_id desde work_orders
    select invoice_id
    into v_invoice_id
    from public.work_orders
    where work_order_id = coalesce(new.work_order_id, old.work_order_id);

    -- Si no hay invoice, permitir
    if v_invoice_id is null then
        return new;
    end if;

    -- Obtener estado de la invoice
    select status
    into v_invoice_status
    from public.invoices
    where invoice_id = v_invoice_id;

    -- Si está en draft, permitir
    if v_invoice_status = 'draft' then
        return new;
    end if;

    -- Si NO está en draft, bloquear
    raise exception 'This work order is already invoiced and items are read-only.';
end;
$$;

-- =========================================
-- Trigger
-- =========================================

drop trigger if exists trg_block_work_order_items on public.work_order_items;

create trigger trg_block_work_order_items
before insert or update or delete
on public.work_order_items
for each row
execute function public.trg_block_items_if_invoiced();
