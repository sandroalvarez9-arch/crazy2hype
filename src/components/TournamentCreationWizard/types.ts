import * as z from 'zod';

export const tournamentCreationFormSchema = z.object({
  title: z.string().min(3, 'Tournament title must be at least 3 characters'),
  description: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  start_date: z.date({ required_error: 'Start date is required' }),
  end_date: z.date({ required_error: 'End date is required' }),
  registration_deadline: z.date({ required_error: 'Registration deadline is required' }),
  first_game_time: z.string().min(1, 'First game time is required'),
  tournament_format: z.enum(['pool_play', 'single_elimination', 'double_elimination', 'round_robin']),
  divisions: z.array(z.enum(['men', 'women', 'coed'])).default([]),
  skill_levels: z.array(z.enum(['open', 'aa', 'a', 'bb', 'b', 'c'])).default([]),
  skill_levels_by_division: z.record(z.array(z.enum(['open', 'aa', 'a', 'bb', 'b', 'c']))).default({}),
  estimated_game_duration: z.number().min(15).max(180),
  warm_up_duration: z.number().min(3).max(10),
  number_of_courts: z.number().min(1).max(20).optional(),
  max_teams_per_skill_level: z.record(z.number().min(4).max(64)).default({}),
  max_teams_per_division_skill: z.record(z.record(z.number().min(4).max(64))).default({}),
  players_per_team: z.number().min(1).max(20),
  entry_fee: z.number().min(0),
  venmo_username: z.string().optional(),
  paypal_email: z.string().optional(),
  cashapp_info: z.string().optional(),
  bank_details: z.string().optional(),
  other_payment_methods: z.string().optional(),
  payment_instructions: z.string().optional(),
  allow_backup_teams: z.boolean().default(true),
}).refine((data) => {
  if (data.divisions.length === 0) {
    return data.skill_levels.length > 0;
  }

  return data.divisions.every((division) => data.skill_levels_by_division[division]?.length > 0);
}, {
  message: 'Please select skill levels for your tournament',
  path: ['skill_levels'],
});

export type TournamentCreationFormValues = z.infer<typeof tournamentCreationFormSchema>;
