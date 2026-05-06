-- Include invoice item UOM in get_invoice_full payloads.
-- Used by invoice PDF, HTML preview, and email send endpoints.

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
      'address_line1', c.address_line1,
      'address_line2', c.address_line2,
      'city', c.city,
      'province', c.province,
      'postal_code', c.postal_code,
      'country', c.country,
      'phone', c.phone,
      'email', c.email,
      'website', c.website,
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
  where i.invoice_id = p_invoice_id;
$function$;
