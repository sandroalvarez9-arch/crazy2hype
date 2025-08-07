export type SkillLevel = 'open' | 'a' | 'bb' | 'b' | 'c';

export const skillLevelLabels: Record<SkillLevel, string> = {
  'open': 'Open',
  'a': 'A',
  'bb': 'BB', 
  'b': 'B',
  'c': 'C'
};

export const skillLevelDescriptions: Record<SkillLevel, string> = {
  'open': 'Elite/Competitive',
  'a': 'Advanced',
  'bb': 'Intermediate',
  'b': 'Beginner-Intermediate', 
  'c': 'Recreational/Beginner'
};

export const getSkillLevelBadgeVariant = (skillLevel: SkillLevel): "default" | "secondary" | "outline" | "destructive" => {
  switch (skillLevel) {
    case 'open':
      return 'default';
    case 'a':
      return 'secondary';
    case 'bb':
      return 'outline';
    case 'b':
      return 'outline';
    case 'c':
      return 'outline';
    default:
      return 'outline';
  }
};

export const formatSkillLevel = (skillLevel: SkillLevel): string => {
  return skillLevelLabels[skillLevel] || skillLevel.toUpperCase();
};