-- Fix security definer views by enabling security_invoker mode
-- This ensures views respect RLS policies of the querying user, not the view creator

ALTER VIEW public.players_public SET (security_invoker = on);
ALTER VIEW public.teams_public SET (security_invoker = on);
ALTER VIEW public.profiles_public SET (security_invoker = on);
ALTER VIEW public.players_tournament_view SET (security_invoker = on);