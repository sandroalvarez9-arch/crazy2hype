export interface PublicTournamentLike {
  title?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
}

const TEST_TOURNAMENT_PATTERNS = [
  /\bqa\b/i,
  /\be2e\b/i,
  /\btest(?:ing)?\b/i,
  /vegapunk/i,
  /automated/i,
  /local flow/i,
  /robust/i,
];

export function isLikelyTestTournament(tournament: PublicTournamentLike): boolean {
  const haystack = `${tournament.title || ''} ${tournament.description || ''}`.trim();
  return TEST_TOURNAMENT_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function isUpcomingOrInProgressTournament(tournament: PublicTournamentLike, now = new Date()): boolean {
  if (!tournament.end_date) return true;

  const endDate = new Date(tournament.end_date);
  if (Number.isNaN(endDate.getTime())) return true;

  return endDate >= now;
}

export function shouldShowOnPublicTournamentLists(tournament: PublicTournamentLike, now = new Date()): boolean {
  return !isLikelyTestTournament(tournament) && isUpcomingOrInProgressTournament(tournament, now);
}
