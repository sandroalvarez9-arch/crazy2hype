import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UseFormReturn } from 'react-hook-form';
import { SkillLevelMultiSelect } from '@/components/SkillLevelMultiSelect';
import { SkillLevel, formatSkillLevel } from '@/utils/skillLevels';
import { Label } from '@/components/ui/label';

interface Step2FormatAndRulesProps {
  form: UseFormReturn<any>;
}

const divisions = [
  { id: 'men', label: "Men's" },
  { id: 'women', label: "Women's" },
  { id: 'coed', label: 'Co-Ed' },
];

export function Step2FormatAndRules({ form }: Step2FormatAndRulesProps) {
  const selectedDivisions = form.watch('divisions') || [];
  const selectedSkillLevels = form.watch('skill_levels') || [];
  const skillLevelsByDivision = form.watch('skill_levels_by_division') || {};

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Format & Rules</h3>
        <p className="text-sm text-muted-foreground">
          Configure the tournament structure and competition settings
        </p>
      </div>

      <FormField
        control={form.control}
        name="tournament_format"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tournament Format *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="pool_play">Pool Play + Playoffs</SelectItem>
                <SelectItem value="single_elimination">Single Elimination</SelectItem>
                <SelectItem value="double_elimination">Double Elimination</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Pool play allows more games per team before elimination
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormItem>
        <FormLabel>Divisions</FormLabel>
        <div className="space-y-3">
          {divisions.map((division) => (
            <FormField
              key={division.id}
              control={form.control}
              name="divisions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value?.includes(division.id)}
                      onCheckedChange={(checked) => {
                        const updatedDivisions = checked
                          ? [...(field.value || []), division.id]
                          : field.value?.filter((value: string) => value !== division.id);
                        field.onChange(updatedDivisions);
                      }}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    {division.label}
                  </FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
        <FormDescription>
          Select all divisions that apply to your tournament
        </FormDescription>
      </FormItem>

      {selectedDivisions.length === 0 ? (
        <FormField
          control={form.control}
          name="skill_levels"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skill Levels *</FormLabel>
              <FormControl>
                <SkillLevelMultiSelect
                  selectedLevels={field.value || []}
                  onLevelsChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Select the skill levels for your tournament
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <div className="space-y-4">
          <Label>Skill Levels by Division *</Label>
          {selectedDivisions.map((division: string) => (
            <FormField
              key={division}
              control={form.control}
              name={`skill_levels_by_division.${division}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="capitalize">{division}</FormLabel>
                  <FormControl>
                    <SkillLevelMultiSelect
                      selectedLevels={field.value || []}
                      onLevelsChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedDivisions.length === 0 ? (
          selectedSkillLevels.map((level: SkillLevel) => (
            <FormField
              key={level}
              control={form.control}
              name={`max_teams_per_skill_level.${level}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Teams - {formatSkillLevel(level)}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={4}
                      max={64}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 4)}
                      className="min-h-[44px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))
        ) : (
          selectedDivisions.map((division: string) => {
            const divisionSkills = skillLevelsByDivision[division] || [];
            return divisionSkills.map((level: SkillLevel) => (
              <FormField
                key={`${division}-${level}`}
                control={form.control}
                name={`max_teams_per_division_skill.${division}.${level}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">
                      {division} {formatSkillLevel(level)}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={4}
                        max={64}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 4)}
                        className="min-h-[44px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ));
          })
        )}
      </div>

      <FormField
        control={form.control}
        name="players_per_team"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Players Per Team *</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                className="min-h-[44px]"
              />
            </FormControl>
            <FormDescription>
              Typical beach volleyball: 2 players, indoor: 6 players
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
