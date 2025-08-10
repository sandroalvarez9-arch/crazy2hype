import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SkillLevel, skillLevelLabels, skillLevelDescriptions } from '@/utils/skillLevels';

interface SkillLevelMultiSelectProps {
  selectedLevels: SkillLevel[];
  onLevelsChange: (levels: SkillLevel[]) => void;
  className?: string;
}

const allSkillLevels: SkillLevel[] = ['open', 'aa', 'a', 'bb', 'b', 'c'];

export function SkillLevelMultiSelect({ selectedLevels, onLevelsChange, className }: SkillLevelMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleLevel = (level: SkillLevel) => {
    if (selectedLevels.includes(level)) {
      onLevelsChange(selectedLevels.filter(l => l !== level));
    } else {
      onLevelsChange([...selectedLevels, level]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedLevels.length === 0 ? (
            "Select skill levels..."
          ) : selectedLevels.length === 1 ? (
            skillLevelLabels[selectedLevels[0]]
          ) : (
            `${selectedLevels.length} levels selected`
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandEmpty>No skill levels found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {allSkillLevels.map((level) => (
                <CommandItem
                  key={level}
                  value={level}
                  onSelect={() => toggleLevel(level)}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{skillLevelLabels[level]}</span>
                    <span className="text-xs text-muted-foreground">
                      {skillLevelDescriptions[level]}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedLevels.includes(level) ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface SkillLevelDisplayProps {
  levels: SkillLevel[];
  className?: string;
}

export function SkillLevelDisplay({ levels, className }: SkillLevelDisplayProps) {
  if (levels.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {levels.map((level) => (
        <Badge key={level} variant="outline" className="text-xs">
          {skillLevelLabels[level]}
        </Badge>
      ))}
    </div>
  );
}