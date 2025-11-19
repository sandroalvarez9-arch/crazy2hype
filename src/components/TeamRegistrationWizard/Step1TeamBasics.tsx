import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatSkillLevel, getSkillLevelBadgeVariant, SkillLevel, skillLevelDescriptions } from '@/utils/skillLevels';
import { AlertCircle } from 'lucide-react';

interface Step1Props {
  formData: {
    teamName: string;
    skillLevel: string;
    category: string;
  };
  onChange: (field: string, value: string) => void;
  skillLevels?: SkillLevel[];
  skillLevelTeamCounts: Record<string, number>;
  maxTeamsPerSkillLevel?: Record<string, number>;
}

export function Step1TeamBasics({
  formData,
  onChange,
  skillLevels,
  skillLevelTeamCounts,
  maxTeamsPerSkillLevel,
}: Step1Props) {
  const isSkillLevelFull = (level: string) => {
    if (!maxTeamsPerSkillLevel) return false;
    const max = maxTeamsPerSkillLevel[level];
    const current = skillLevelTeamCounts[level] || 0;
    return max && current >= max;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Team Information</h3>
        <p className="text-sm text-muted-foreground">Let's start with the basics</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teamName">Team Name *</Label>
          <Input
            id="teamName"
            placeholder="Enter your team name"
            value={formData.teamName}
            onChange={(e) => onChange('teamName', e.target.value)}
            maxLength={100}
          />
        </div>

        {skillLevels && skillLevels.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="skillLevel">Skill Level *</Label>
            <Select value={formData.skillLevel} onValueChange={(value) => onChange('skillLevel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select skill level" />
              </SelectTrigger>
              <SelectContent>
                {skillLevels.map((level) => {
                  const isFull = isSkillLevelFull(level);
                  const currentCount = skillLevelTeamCounts[level] || 0;
                  const maxCount = maxTeamsPerSkillLevel?.[level];

                  return (
                    <SelectItem key={level} value={level} disabled={isFull}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSkillLevelBadgeVariant(level)}>
                            {formatSkillLevel(level)}
                          </Badge>
                          {isFull && <AlertCircle className="h-4 w-4 text-destructive" />}
                        </div>
                        {maxCount && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {currentCount}/{maxCount}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {formData.skillLevel && (
              <p className="text-xs text-muted-foreground">
                {skillLevelDescriptions[formData.skillLevel as SkillLevel]}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
