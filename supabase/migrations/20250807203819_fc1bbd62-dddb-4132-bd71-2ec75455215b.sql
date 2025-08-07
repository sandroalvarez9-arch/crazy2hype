-- Change first_game_time from timestamp with time zone to time
ALTER TABLE public.tournaments 
ALTER COLUMN first_game_time TYPE time USING first_game_time::time;