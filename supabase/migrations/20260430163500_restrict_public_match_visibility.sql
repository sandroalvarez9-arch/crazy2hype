-- Restrict public match visibility to published tournaments.
-- Organizers still retain access through the existing organizer management policy.

DROP POLICY IF EXISTS "Matches are viewable by everyone" ON public.matches;

CREATE POLICY "Public can view matches for published tournaments"
ON public.matches
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.tournaments
    WHERE tournaments.id = matches.tournament_id
      AND tournaments.published = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.tournaments
    WHERE tournaments.id = matches.tournament_id
      AND tournaments.organizer_id = auth.uid()
  )
);
