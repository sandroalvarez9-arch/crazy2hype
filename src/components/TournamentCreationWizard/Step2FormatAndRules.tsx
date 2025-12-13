import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UseFormReturn } from 'react-hook-form';
import { SkillLevelMultiSelect } from '@/components/SkillLevelMultiSelect';
import { SkillLevel, formatSkillLevel } from '@/utils/skillLevels';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Eye, Trophy, Users, Zap } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Step2FormatAndRulesProps {
  form: UseFormReturn<any>;
}

const divisions = [
  { id: 'men', label: "Men's" },
  { id: 'women', label: "Women's" },
  { id: 'coed', label: 'Co-Ed' },
];

const formatPresets = [
  {
    id: 'beach_standard',
    name: 'Beach Volleyball Standard',
    icon: Trophy,
    description: 'Pool play → Single elimination playoffs',
    format: 'pool_play',
    players: 2,
    skillLevels: ['aa', 'a', 'bb'],
  },
  {
    id: 'indoor_rec',
    name: 'Indoor Recreational',
    icon: Users,
    description: 'Round robin for maximum games',
    format: 'round_robin',
    players: 6,
    skillLevels: ['b', 'c'],
  },
  {
    id: 'competitive',
    name: 'Competitive Tournament',
    icon: Zap,
    description: 'Double elimination for intense competition',
    format: 'double_elimination',
    players: 2,
    skillLevels: ['open', 'aa'],
  },
];

export function Step2FormatAndRules({ form }: Step2FormatAndRulesProps) {
  const selectedDivisions = form.watch('divisions') || [];
  const selectedSkillLevels = form.watch('skill_levels') || [];
  const skillLevelsByDivision = form.watch('skill_levels_by_division') || {};
  const [showPreview, setShowPreview] = useState(false);
  const tournamentFormat = form.watch('tournament_format');
  const maxTeams = form.watch('max_teams_per_skill_level');

  const applyPreset = (preset: typeof formatPresets[0]) => {
    form.setValue('tournament_format', preset.format);
    form.setValue('players_per_team', preset.players);
    form.setValue('skill_levels', preset.skillLevels);
    // Set default max teams for each skill level
    const maxTeamsPerLevel: Record<string, number> = {};
    preset.skillLevels.forEach(level => {
      maxTeamsPerLevel[level] = 16;
    });
    form.setValue('max_teams_per_skill_level', maxTeamsPerLevel);
  };

  const getFormatDescription = () => {
    switch (tournamentFormat) {
      case 'pool_play':
        return 'Teams play in pools, top teams advance to single elimination playoffs.';
      case 'single_elimination':
        return 'Direct knockout - lose and you\'re out. Fast and decisive.';
      case 'double_elimination':
        return 'Teams get a second chance through losers bracket.';
      case 'round_robin':
        return 'Every team plays every other team. Most games guaranteed.';
      default:
        return '';
    }
  };

  const getTotalTeams = (): number => {
    const teams = maxTeams || {} as Record<string, number>;
    return Object.values(teams as Record<string, number>).reduce((sum, val) => sum + (Number(val) || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Format & Rules</h3>
        <p className="text-sm text-muted-foreground">
          Configure the tournament structure and competition settings
        </p>
      </div>

      {/* Quick Presets */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Quick Presets
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {formatPresets.map((preset) => (
            <Card 
              key={preset.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => applyPreset(preset)}
            >
              <CardContent className="p-4 text-center">
                <preset.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="font-medium text-sm">{preset.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Preview Bracket Button */}
      <Button 
        type="button" 
        variant="outline" 
        size="lg" 
        className="w-full min-h-[52px] border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5"
        onClick={() => setShowPreview(true)}
      >
        <Eye className="mr-2 h-5 w-5" />
        Preview Bracket Structure
      </Button>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bracket Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold capitalize mb-2">
                {tournamentFormat?.replace('_', ' ') || 'Pool Play + Playoffs'}
              </p>
              <p className="text-sm text-muted-foreground">{getFormatDescription()}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary">{getTotalTeams() || '—'}</p>
                <p className="text-xs text-muted-foreground">Total Teams</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary">{selectedSkillLevels.length || '—'}</p>
                <p className="text-xs text-muted-foreground">Skill Levels</p>
              </div>
            </div>

            {tournamentFormat === 'pool_play' && getTotalTeams() > 0 && (
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium mb-2">Estimated Structure:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Pool play: ~{Math.ceil(getTotalTeams() / 4)} pools of 4 teams</li>
                  <li>• Each team plays 3 pool games</li>
                  <li>• Top 2 from each pool advance to playoffs</li>
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
