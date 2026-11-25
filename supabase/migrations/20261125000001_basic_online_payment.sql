-- Basic (₹499) can now be paid online with Razorpay or recorded by the owner, like Pro.
-- Only widens the allowed plan values in subscription_payments. Safe to run twice.
alter table public.subscription_payments drop constraint if exists subscription_payments_plan_check;
alter table public.subscription_payments
  add constraint subscription_payments_plan_check check (plan in ('basic', 'pro', 'pro_max'));
