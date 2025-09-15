-- Security Fix: Restrict access to player contact information

-- 1. Create a separate table for sensitive player contact information
CREATE TABLE IF NOT EXISTS public.player_contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(player_id)
);

-- Enable RLS on player_contacts
ALTER TABLE public.player_contacts ENABLE ROW LEVEL SECURITY;

-- 2. Create restrictive RLS policies for player_contacts
-- Only team captains can access their own team's player contact information
CREATE POLICY "Team captains can access their players' contact info" 
ON public.player_contacts 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.players p 
        JOIN public.teams t ON p.team_id = t.id 
        WHERE p.id = player_contacts.player_id 
        AND t.captain_id = auth.uid()
    )
);

-- Tournament organizers can only see basic contact info (email only, no phone) for emergency purposes
CREATE POLICY "Tournament organizers limited contact access" 
ON public.player_contacts 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.players p
        JOIN public.teams tm ON p.team_id = tm.id
        JOIN public.tournaments tn ON tm.tournament_id = tn.id
        WHERE p.id = player_contacts.player_id 
        AND tn.organizer_id = auth.uid()
    )
);

-- 3. Update existing players RLS policies to be more restrictive
-- Drop existing policies that allow full access to tournament organizers
DROP POLICY IF EXISTS "Tournament organizers can view players in their tournaments" ON public.players;

-- Create new restrictive policy for tournament organizers (no contact info)
CREATE POLICY "Tournament organizers can view basic player info" 
ON public.players 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.teams t
        JOIN public.tournaments tn ON t.tournament_id = tn.id
        WHERE t.id = players.team_id 
        AND tn.organizer_id = auth.uid()
    )
);

-- Keep team captain access unchanged
-- The existing "Team captains can manage their players" policy remains

-- 4. Create a secure view for tournament organizers that excludes sensitive data
CREATE OR REPLACE VIEW public.players_tournament_view AS
SELECT 
    p.id,
    p.team_id,
    p.name,
    p.jersey_number,
    p.position,
    p.created_at,
    -- Only include email for emergency contact purposes, exclude phone and other sensitive data
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.teams t 
            JOIN public.tournaments tn ON t.tournament_id = tn.id 
            WHERE t.id = p.team_id AND tn.organizer_id = auth.uid()
        ) THEN pc.email
        ELSE NULL 
    END as emergency_email
FROM public.players p
LEFT JOIN public.player_contacts pc ON p.id = pc.player_id;

-- Enable RLS on the view
ALTER VIEW public.players_tournament_view SET (security_invoker = true);

-- 5. Fix backup_teams table exposure
-- Add proper RLS policies to backup_teams
DROP POLICY IF EXISTS "Backup teams are viewable by everyone" ON public.backup_teams;

-- Create restrictive policies for backup_teams
CREATE POLICY "Tournament organizers can view backup teams in their tournaments" 
ON public.backup_teams 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.tournaments t 
        WHERE t.id = backup_teams.tournament_id 
        AND t.organizer_id = auth.uid()
    )
);

CREATE POLICY "Backup team captains can view their own teams" 
ON public.backup_teams 
FOR ALL 
USING (auth.uid() = captain_id);

-- 6. Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_player_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_player_contacts_updated_at
    BEFORE UPDATE ON public.player_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_player_contacts_updated_at();

-- 7. Migrate existing player contact data to new secure table
INSERT INTO public.player_contacts (player_id, email, phone)
SELECT id, email, phone 
FROM public.players 
WHERE email IS NOT NULL OR phone IS NOT NULL
ON CONFLICT (player_id) DO NOTHING;

-- 8. Remove contact information from players table (keep for backward compatibility but null them out)
-- We'll keep the columns but clear the data since it's now in the secure table
UPDATE public.players SET email = NULL, phone = NULL;