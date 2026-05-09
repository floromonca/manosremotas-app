-- Invoice rendering polish:
-- - expose customer billing address when available
-- - return company settings fields used by Settings -> Company
-- - prefer company_settings currency/payment terms for new period invoices
--
-- This does not implement jurisdiction tax calculation.

CREATE OR REPLACE FUNCTION public.get_invoice_full(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $function$
  select jsonb_build_object(
    'invoice', jsonb_build_object(
      'invoice_id', i.invoice_id,
      'company_id', i.company_id,
      'work_order_id', i.work_order_id,
      'work_order_number', w.work_order_number,
      'invoice_number', i.invoice_number,
      'status', i.status,
      'currency_code', i.currency_code,
      'issue_date', i.issue_date,
      'invoice_date', i.invoice_date,
      'due_date', i.due_date,
      'customer_name', i.customer_name,
      'customer_phone', i.customer_phone,
      'customer_email', i.customer_email,
      'billing_address', i.billing_address,
      'customer_billing_address', cust.billing_address,
      'tax_profile_id', i.tax_profile_id,
      'tax_name', i.tax_name,
      'tax_rate', i.tax_rate,
      'subtotal', i.subtotal,
      'tax_total', i.tax_total,
      'total', i.total,
      'balance_due', i.balance_due,
      'deposit_required', i.deposit_required,
      'notes', i.notes,
      'created_at', i.created_at,
      'updated_at', i.updated_at,
      'invoice_type', i.invoice_type
    ),
    'company', jsonb_build_object(
      'company_id', c.company_id,
      'company_name', c.company_name,
      'legal_name', c.legal_name,
      'address_line1', c.address_line_1,
      'address_line2', c.address_line_2,
      'city', c.city,
      'province', c.state_province,
      'postal_code', c.postal_code,
      'country', c.country_code,
      'country_code', c.country_code,
      'phone', c.company_phone,
      'email', c.company_email,
      'website', c.company_website,
      'tax_registration', c.tax_registration,
      'logo_url', c.logo_url,
      'invoice_footer', c.invoice_footer
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'invoice_item_id', ii.invoice_item_id,
          'work_order_id', ii.work_order_id,
          'description', ii.description,
          'qty', ii.qty,
          'uom', ii.uom,
          'unit_price', ii.unit_price,
          'tax_rate', ii.tax_rate,
          'line_subtotal', ii.line_subtotal,
          'line_tax', ii.line_tax,
          'line_total', ii.line_total,
          'created_at', ii.created_at
        )
        order by ii.created_at
      )
      from public.invoice_items ii
      where ii.invoice_id = i.invoice_id
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'payment_id', ip.payment_id,
          'amount', ip.amount,
          'payment_method', ip.payment_method,
          'payment_date', ip.payment_date,
          'notes', ip.notes,
          'created_at', ip.created_at
        )
        order by ip.payment_date, ip.created_at
      )
      from public.invoice_payments ip
      where ip.invoice_id = i.invoice_id
    ), '[]'::jsonb),
    'invoice_work_orders', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'invoice_work_order_id', iwo.invoice_work_order_id,
          'work_order_id', iwo.work_order_id,
          'work_order_number_snapshot', iwo.work_order_number_snapshot,
          'live_work_order_number', wo_iwo.work_order_number,
          'service_address_snapshot', iwo.service_address_snapshot,
          'customer_name_snapshot', iwo.customer_name_snapshot,
          'subtotal_snapshot', iwo.subtotal_snapshot,
          'tax_snapshot', iwo.tax_snapshot,
          'total_snapshot', iwo.total_snapshot,
          'created_at', iwo.created_at
        )
        order by coalesce(iwo.work_order_number_snapshot, wo_iwo.work_order_number, ''), iwo.created_at
      )
      from public.invoice_work_orders iwo
      left join public.work_orders wo_iwo
        on wo_iwo.work_order_id = iwo.work_order_id
      where iwo.invoice_id = i.invoice_id
    ), '[]'::jsonb)
  )
  from public.invoices i
  left join public.companies c
    on c.company_id = i.company_id
  left join public.work_orders w
    on w.work_order_id = i.work_order_id
  left join public.customers cust
    on cust.customer_id = w.customer_id
   and cust.company_id = i.company_id
  where i.invoice_id = p_invoice_id;
$function$;

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
    v_company_tax_rate numeric;
    v_default_tax_rate numeric;
    v_tax_profile_id uuid;
    v_tax_name text;
    v_tax_profile_rate numeric;
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
        coalesce(nullif(trim(cs.currency_code), ''), nullif(trim(co.currency_code), ''), 'CAD'),
        coalesce(cs.payment_terms_days, co.payment_terms_days, 30),
        coalesce(co.tax_rate_default, 0.13)
    into
        v_currency_code,
        v_payment_terms_days,
        v_company_tax_rate
    from public.companies co
    left join public.company_settings cs
      on cs.company_id = co.company_id
    where co.company_id = p_company_id;

    select
        tp.tax_profile_id,
        tp.tax_name,
        case when tp.rate > 1 then tp.rate / 100 else tp.rate end
    into
        v_tax_profile_id,
        v_tax_name,
        v_tax_profile_rate
    from public.tax_profiles tp
    where tp.company_id = p_company_id
      and tp.is_default = true
    order by tp.created_at desc
    limit 1;

    if v_currency_code is null then
        v_currency_code := 'CAD';
    end if;

    if v_payment_terms_days is null then
        v_payment_terms_days := 30;
    end if;

    v_default_tax_rate := coalesce(v_tax_profile_rate, v_company_tax_rate, 0.13);

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
        tax_profile_id,
        tax_name,
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
        v_tax_profile_id,
        v_tax_name,
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
