export type SkillLevel = 'open' | 'aa' | 'a' | 'bb' | 'b' | 'c';

export const skillLevelLabels: Record<SkillLevel, string> = {
  'open': 'Open',
  'aa': 'AA',
  'a': 'A',
  'bb': 'BB', 
  'b': 'B',
  'c': 'C'
};

export const skillLevelDescriptions: Record<SkillLevel, string> = {
  'open': 'Elite/Competitive',
  'aa': 'Expert/Semi-Pro',
  'a': 'Advanced',
  'bb': 'Intermediate',
  'b': 'Beginner-Intermediate', 
  'c': 'Recreational/Beginner'
};

export const getSkillLevelBadgeVariant = (skillLevel: SkillLevel): "default" | "secondary" | "outline" | "destructive" | "warning" | "info" | "purple" => {
  switch (skillLevel) {
    case 'open':
      return 'default';    // Green - Elite
    case 'aa':
      return 'purple';     // Purple - Expert/Semi-Pro
    case 'a':
      return 'destructive'; // Red - Advanced
    case 'bb':
      return 'warning';    // Orange - Intermediate
    case 'b':
      return 'info';       // Blue - Beginner-Intermediate
    case 'c':
      return 'secondary';  // Gray - Recreational/Beginner
    default:
      return 'outline';
  }
};

export const formatSkillLevel = (skillLevel: SkillLevel): string => {
  return skillLevelLabels[skillLevel] || skillLevel.toUpperCase();
};