-- Include job details in period billing preview work orders.
-- This helps admins identify invoiceable work by job name, not only WO number.

begin;

drop function if exists public.get_eligible_work_orders_for_period(uuid, uuid, date, date);

create function public.get_eligible_work_orders_for_period(
    p_company_id uuid,
    p_customer_id uuid,
    p_period_start date,
    p_period_end date
)
returns table(
    work_order_id uuid,
    work_order_number text,
    job_type text,
    description text,
    service_address text,
    created_at timestamp with time zone,
    subtotal numeric
)
language sql
as $function$
    select
        wo.work_order_id,
        wo.work_order_number,
        wo.job_type,
        wo.description,
        wo.service_address,
        wo.created_at,
        coalesce(
            sum(
                coalesce(woi.qty_done, woi.qty_planned, woi.quantity, 0)
                * coalesce(woi.unit_price, 0)
            ),
            0
        ) as subtotal
    from public.work_orders wo
    left join public.work_order_items woi
        on woi.work_order_id = wo.work_order_id
    where
        wo.company_id = p_company_id
        and wo.customer_id = p_customer_id
        and wo.created_at >= p_period_start
        and wo.created_at < p_period_end + interval '1 day'
        and not exists (
            select 1
            from public.invoice_work_orders iwo
            where iwo.work_order_id = wo.work_order_id
        )
    group by
        wo.work_order_id,
        wo.work_order_number,
        wo.job_type,
        wo.description,
        wo.service_address,
        wo.created_at
    order by wo.created_at desc;
$function$;

commit;
