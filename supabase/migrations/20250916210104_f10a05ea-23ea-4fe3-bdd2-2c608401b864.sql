-- Update existing teams that are clearly test data to be marked properly
UPDATE teams 
SET is_test_data = true 
WHERE tournament_id = '66bfa037-1d88-4116-9ace-d4ebce787a07' 
  AND (
    name LIKE '%(OPEN)%' OR 
    name LIKE '%(ADVANCED)%' OR 
    name LIKE '%(INTERMEDIATE)%' OR 
    name LIKE '%(BEGINNER)%' OR
    name IN (
      'Thunder Spikes', 'Court Kings', 'Spike Masters', 'Storm Chasers',
      'Net Ninjas', 'Learning Legends', 'New Nets', 'Starter Squad',
      'Volleyball Vipers', 'Rookie Rockets'
    )
  );