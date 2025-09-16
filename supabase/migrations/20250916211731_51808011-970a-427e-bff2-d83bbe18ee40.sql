-- Fix test teams not being marked properly as test data
UPDATE teams 
SET is_test_data = true 
WHERE tournament_id = '66bfa037-1d88-4116-9ace-d4ebce787a07' 
  AND (
    -- Match test team names with skill level suffixes
    name LIKE '%(A)' OR 
    name LIKE '%(BB)' OR
    -- Match exact test team names from the generator
    name IN (
      'Thunder Spikes', 'Court Kings', 'Spike Masters', 'Storm Chasers',
      'Net Ninjas', 'Learning Legends', 'New Nets', 'Starter Squad',
      'Volleyball Vipers', 'Rookie Rockets', 'Lightning Bolts', 'Beach Bombers',
      'Sand Sharks', 'Power Hitters', 'Practice Players', 'First Timers'
    )
  );