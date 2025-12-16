import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Tournament {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  first_game_time: string | null;
  tournament_format: string;
  skill_levels: string[];
  divisions?: string[];
  skill_levels_by_division?: Record<string, string[]>;
  max_teams_per_division_skill?: Record<string, Record<string, number>>;
  max_teams_per_skill_level?: Record<string, number>;
  estimated_game_duration: number;
  warm_up_duration?: number;
  number_of_courts?: number;
  calculated_courts?: number;
  brackets_generated: boolean;
  max_teams: number;
  players_per_team: number;
  entry_fee: number;
  payment_instructions?: string | null;
  venmo_username?: string | null;
  paypal_email?: string | null;
  bank_details?: string | null;
  cashapp_info?: string | null;
  other_payment_methods?: string | null;
  status: string;
  published: boolean;
  organizer_id?: string;
  check_in_deadline?: string | null;
  bracket_version?: number;
  allow_backup_teams?: boolean;
  sets_per_game?: number;
  points_per_set?: number;
  must_win_by?: number;
  deciding_set_points?: number;
  game_format_locked?: boolean;
  organizer?: {
    username: string;
    first_name: string;
    last_name: string;
  };
}

export function useTournament(tournamentId: string | undefined) {
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTournament = useCallback(async () => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the secure RPC function to fetch tournament data
      const { data, error: fetchError } = await supabase
        .rpc('get_public_tournament', { tournament_id: tournamentId });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        throw new Error('Tournament not found');
      }

      // The function returns an array, get the first result
      const tournamentData = data[0];
      setTournament(tournamentData as Tournament);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch tournament');
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
    return fetchTournament();
  }, [fetchTournament]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  return { tournament, loading, error, refetch, setTournament };
}
