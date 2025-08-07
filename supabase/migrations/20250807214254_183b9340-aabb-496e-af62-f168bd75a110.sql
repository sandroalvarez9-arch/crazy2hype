-- Rename check_address column to cashapp_info for better clarity
ALTER TABLE public.tournaments RENAME COLUMN check_address TO cashapp_info;