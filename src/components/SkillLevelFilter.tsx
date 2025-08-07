import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter } from 'lucide-react';
import { SkillLevel, skillLevelLabels, skillLevelDescriptions } from '@/utils/skillLevels';

interface SkillLevelFilterProps {
  selectedLevels: SkillLevel[];
  onLevelsChange: (levels: SkillLevel[]) => void;
}

const SkillLevelFilter = ({ selectedLevels, onLevelsChange }: SkillLevelFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleLevel = (level: SkillLevel) => {
    if (selectedLevels.includes(level)) {
      onLevelsChange(selectedLevels.filter(l => l !== level));
    } else {
      onLevelsChange([...selectedLevels, level]);
    }
  };

  const clearAll = () => {
    onLevelsChange([]);
  };

  const selectAll = () => {
    onLevelsChange(['open', 'a', 'bb', 'b', 'c']);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filter by Skill Level
          {selectedLevels.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedLevels.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-popover border border-border">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Filter by Skill Level</h4>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAll}
                disabled={selectedLevels.length === 0}
              >
                Clear
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={selectAll}
                disabled={selectedLevels.length === 5}
              >
                All
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            {(Object.keys(skillLevelLabels) as SkillLevel[]).map(level => (
              <div key={level} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={level}
                  checked={selectedLevels.includes(level)}
                  onChange={() => toggleLevel(level)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label 
                  htmlFor={level} 
                  className="flex-1 cursor-pointer text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {skillLevelLabels[level]}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {skillLevelDescriptions[level]}
                    </span>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SkillLevelFilter;