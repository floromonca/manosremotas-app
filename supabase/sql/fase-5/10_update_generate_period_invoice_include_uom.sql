CREATE OR REPLACE FUNCTION public.generate_period_invoice_from_selection(
    p_company_id uuid,
    p_customer_id uuid,
    p_work_order_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
declare
    v_invoice_id uuid;
    v_invoice_number text;
    v_customer_name text;
    v_customer_phone text;
    v_customer_email text;
    v_billing_address text;
    v_currency_code text;
    v_payment_terms_days integer;
    v_default_tax_rate numeric;
begin
    if array_length(p_work_order_ids, 1) is null then
        raise exception 'No work orders selected';
    end if;

    select
        c.name,
        c.phone,
        c.email,
        c.billing_address
    into
        v_customer_name,
        v_customer_phone,
        v_customer_email,
        v_billing_address
    from public.customers c
    where c.customer_id = p_customer_id
      and c.company_id = p_company_id;

    if v_customer_name is null then
        raise exception 'Customer not found for customer_id % and company_id %', p_customer_id, p_company_id;
    end if;

    select
        coalesce(nullif(trim(co.currency_code), ''), 'CAD'),
        coalesce(co.payment_terms_days, 30),
        coalesce(co.tax_rate_default, 0.13)
    into
        v_currency_code,
        v_payment_terms_days,
        v_default_tax_rate
    from public.companies co
    where co.company_id = p_company_id;

    if v_currency_code is null then
        v_currency_code := 'CAD';
    end if;

    if v_payment_terms_days is null then
        v_payment_terms_days := 30;
    end if;

    if v_default_tax_rate is null then
        v_default_tax_rate := 0.13;
    end if;

    if not exists (
        select 1
        from public.work_order_items woi
        where woi.work_order_id = any(p_work_order_ids)
          and coalesce(woi.pending_pricing, false) = false
          and coalesce(woi.pricing_status, '') <> 'pending_pricing'
    ) then
        raise exception 'Selected work orders do not contain invoiceable items';
    end if;

    select public.allocate_next_invoice_number(p_company_id)
    into v_invoice_number;

    if v_invoice_number is null or trim(v_invoice_number) = '' then
        raise exception 'Could not allocate invoice number';
    end if;

    insert into public.invoices (
        invoice_id,
        company_id,
        invoice_number,
        status,
        currency_code,
        invoice_date,
        due_date,
        customer_name,
        customer_phone,
        customer_email,
        billing_address,
        tax_rate,
        subtotal,
        tax_total,
        total,
        balance_due,
        created_at,
        invoice_type
    )
    values (
        gen_random_uuid(),
        p_company_id,
        v_invoice_number,
        'draft',
        upper(v_currency_code),
        now()::date,
        (now()::date + v_payment_terms_days),
        v_customer_name,
        v_customer_phone,
        v_customer_email,
        v_billing_address,
        v_default_tax_rate,
        0,
        0,
        0,
        0,
        now(),
        'period'
    )
    returning invoice_id into v_invoice_id;

    insert into public.invoice_work_orders (
        company_id,
        invoice_id,
        work_order_id,
        work_order_number_snapshot,
        service_address_snapshot,
        customer_name_snapshot,
        subtotal_snapshot,
        tax_snapshot,
        total_snapshot
    )
    select
        p_company_id,
        v_invoice_id,
        wo.work_order_id,
        wo.work_order_number,
        wo.service_address,
        wo.customer_name,
        coalesce(sum(
            coalesce(woi.qty_done, woi.qty_planned, woi.quantity, 0)
            * coalesce(woi.unit_price, 0)
        ), 0) as subtotal_snapshot,
        coalesce(sum(
            case
                when coalesce(woi.taxable, true)
                    then coalesce(woi.qty_done, woi.qty_planned, woi.quantity, 0)
                         * coalesce(woi.unit_price, 0)
                         * v_default_tax_rate
                else 0
            end
        ), 0) as tax_snapshot,
        coalesce(sum(
            case
                when coalesce(woi.taxable, true)
                    then (
                        coalesce(woi.qty_done, woi.qty_planned, woi.quantity, 0)
                        * coalesce(woi.unit_price, 0)
                    ) * (1 + v_default_tax_rate)
                else
                    coalesce(woi.qty_done, woi.qty_planned, woi.quantity, 0)
                    * coalesce(woi.unit_price, 0)
            end
        ), 0) as total_snapshot
    from public.work_orders wo
    left join public.work_order_items woi
        on woi.work_order_id = wo.work_order_id
       and coalesce(woi.pending_pricing, false) = false
       and coalesce(woi.pricing_status, '') <> 'pending_pricing'
    where wo.work_order_id = any(p_work_order_ids)
      and wo.company_id = p_company_id
    group by
        wo.work_order_id,
        wo.work_order_number,
        wo.service_address,
        wo.customer_name;

    insert into public.invoice_items (
        company_id,
        invoice_id,
        work_order_id,
        description,
        qty,
        uom,
        unit_price,
        tax_rate,
        synced_from_wo,
        created_at
    )
    select
        p_company_id,
        v_invoice_id,
        woi.work_order_id,
        case
            when woi.qty_planned is null then coalesce(nullif(trim(woi.description), ''), 'Item') || ' (Extra)'
            else coalesce(nullif(trim(woi.description), ''), 'Item')
        end,
        coalesce(woi.qty_done, woi.qty_planned, woi.quantity, 1),
        nullif(trim(woi.uom), ''),
        coalesce(woi.unit_price, 0),
        case
            when coalesce(woi.taxable, true) then v_default_tax_rate
            else 0
        end,
        true,
        now()
    from public.work_order_items woi
    where woi.work_order_id = any(p_work_order_ids)
      and coalesce(woi.pending_pricing, false) = false
      and coalesce(woi.pricing_status, '') <> 'pending_pricing';

    update public.work_orders wo
    set
        invoice_id = v_invoice_id,
        invoiced_at = now()
    where wo.work_order_id = any(p_work_order_ids)
      and wo.company_id = p_company_id;

    return v_invoice_id;
end;
$function$;
