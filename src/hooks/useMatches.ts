import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Match {
  id: string;
  tournament_id: string;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  round_number: number;
  match_number: number;
  team1_score: number;
  team2_score: number;
  scheduled_time: string | null;
  completed_at: string | null;
  status: string;
  court_number: number;
  pool_name: string | null;
  tournament_phase: string;
  division: string | null;
  skill_level: string | null;
  bracket_position: string | null;
  set_scores: any;
  sets_won_team1: number;
  sets_won_team2: number;
  current_set: number;
  referee_team_id: string | null;
  team1?: {
    id: string;
    name: string;
    skill_level: string | null;
  };
  team2?: {
    id: string;
    name: string;
    skill_level: string | null;
  };
}

export function useMatches(tournamentId: string | undefined) {
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(id, name, skill_level),
          team2:teams!matches_team2_id_fkey(id, name, skill_level)
        `)
        .eq('tournament_id', tournamentId)
        .order('scheduled_time', { ascending: true });

      if (fetchError) throw fetchError;

      setMatches(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch matches');
      setError(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tournamentId, toast]);

  const refetch = useCallback(() => {
    return fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return { matches, loading, error, refetch, setMatches };
}
