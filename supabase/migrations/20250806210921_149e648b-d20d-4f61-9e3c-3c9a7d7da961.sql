-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  location TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  max_teams INTEGER NOT NULL DEFAULT 16,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'registration_closed', 'in_progress', 'completed', 'cancelled')),
  brackets_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  captain_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  contact_email TEXT,
  contact_phone TEXT,
  players_count INTEGER DEFAULT 1,
  seed_number INTEGER,
  is_registered BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, name)
);

-- Create matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team1_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  team2_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  bracket_position TEXT,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'forfeited')),
  scheduled_time TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team statistics table
CREATE TABLE public.team_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  points_for INTEGER DEFAULT 0,
  points_against INTEGER DEFAULT 0,
  win_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, tournament_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for tournaments
CREATE POLICY "Tournaments are viewable by everyone" 
ON public.tournaments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tournaments" 
ON public.tournaments 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their tournaments" 
ON public.tournaments 
FOR UPDATE 
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their tournaments" 
ON public.tournaments 
FOR DELETE 
USING (auth.uid() = organizer_id);

-- Create RLS policies for teams
CREATE POLICY "Teams are viewable by everyone" 
ON public.teams 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can register teams" 
ON public.teams 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Team captains can update their teams" 
ON public.teams 
FOR UPDATE 
USING (auth.uid() = captain_id);

CREATE POLICY "Team captains can delete their teams" 
ON public.teams 
FOR DELETE 
USING (auth.uid() = captain_id);

-- Create RLS policies for matches
CREATE POLICY "Matches are viewable by everyone" 
ON public.matches 
FOR SELECT 
USING (true);

CREATE POLICY "Tournament organizers can manage matches" 
ON public.matches 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.tournaments 
  WHERE tournaments.id = matches.tournament_id 
  AND tournaments.organizer_id = auth.uid()
));

-- Create RLS policies for team stats
CREATE POLICY "Team stats are viewable by everyone" 
ON public.team_stats 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage team stats" 
ON public.team_stats 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_stats_updated_at
  BEFORE UPDATE ON public.team_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, email, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();