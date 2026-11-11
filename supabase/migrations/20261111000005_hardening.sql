-- ClinicEase v1 — fixes from the Supabase security advisor.
-- Fixed search_path on helper functions, and trigger-only functions cannot be called through the API.
alter function public.clinic_today() set search_path = public;
alter function public.clinic_now_time() set search_path = public;
alter function public.audit_log_immutable() set search_path = public;
alter function public.touch_updated_at() set search_path = public;
revoke all on function public.audit_changes() from public, anon, authenticated;
revoke all on function public.appointments_queue_trigger() from public, anon, authenticated;
revoke all on function public.audit_log_immutable() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
