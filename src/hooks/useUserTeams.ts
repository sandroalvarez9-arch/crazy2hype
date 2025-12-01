import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface UserTeamWithTournament {
  id: string;
  name: string;
  skill_level: string | null;
  division: string | null;
  payment_status: string | null;
  check_in_status: string | null;
  players_count: number | null;
  tournament: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    location: string | null;
    status: string;
  };
}

export const useUserTeams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<UserTeamWithTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserTeams = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          skill_level,
          division,
          payment_status,
          check_in_status,
          players_count,
          tournament:tournaments (
            id,
            title,
            start_date,
            end_date,
            location,
            status
          )
        `)
        .eq("captain_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Transform the data to match our interface
      const transformedData: UserTeamWithTournament[] = (data || []).map((team: any) => ({
        id: team.id,
        name: team.name,
        skill_level: team.skill_level,
        division: team.division,
        payment_status: team.payment_status,
        check_in_status: team.check_in_status,
        players_count: team.players_count,
        tournament: Array.isArray(team.tournament) ? team.tournament[0] : team.tournament,
      }));

      setTeams(transformedData);
    } catch (err) {
      console.error("Error fetching user teams:", err);
      setError(err as Error);
      toast.error("Failed to load your teams");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserTeams();
  }, [fetchUserTeams]);

  const refetch = useCallback(() => {
    fetchUserTeams();
  }, [fetchUserTeams]);

  return { teams, loading, error, refetch };
};
