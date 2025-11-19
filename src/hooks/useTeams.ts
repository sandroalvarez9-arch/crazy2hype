import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Team {
  id: string;
  name: string;
  captain_id: string;
  tournament_id: string;
  players_count: number;
  is_registered: boolean;
  is_backup: boolean;
  check_in_status: string;
  check_in_time: string | null;
  payment_status: string;
  payment_date: string | null;
  payment_method: string | null;
  payment_notes: string | null;
  seed_number: number | null;
  skill_level: string | null;
  division: string | null;
  category: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  captain?: {
    username: string;
    first_name: string;
    last_name: string;
  };
}

export function useTeams(tournamentId: string | undefined) {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: teamsData, error: fetchError } = await supabase
        .from('teams')
        .select(`
          *,
          captain:profiles!teams_captain_id_fkey(username, first_name, last_name)
        `)
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Fetch player counts for each team
      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { count } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          return {
            ...team,
            players_count: count || 0,
          };
        })
      );

      setTeams(teamsWithCounts);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch teams');
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
    return fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return { teams, loading, error, refetch, setTeams };
}
