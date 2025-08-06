-- Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'host', 'admin'));