import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatSkillLevel, getSkillLevelBadgeVariant, SkillLevel, skillLevelLabels, skillLevelDescriptions } from '@/utils/skillLevels';

interface TeamRegistrationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  playersPerTeam: number;
  tournamentSkillLevels?: SkillLevel[];
  onSuccess: () => void;
}

const TeamRegistrationDialog = ({ isOpen, onOpenChange, tournamentId, playersPerTeam, tournamentSkillLevels, onSuccess }: TeamRegistrationDialogProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    teamName: '',
    contactEmail: profile?.email || '',
    contactPhone: '',
    notes: '',
    skillLevel: ''
  });
  
  // Initialize players array with proper defensive checks
  const initializePlayers = (count: number) => {
    const validCount = Math.max(1, count || 6); // Ensure at least 1 player
    return Array.from({ length: validCount }, (_, i) => ({
      id: i,
      name: '',
      email: '',
      phone: '',
      position: '',
      jerseyNumber: ''
    }));
  };
  
  const [players, setPlayers] = useState(() => initializePlayers(playersPerTeam));

  // Update players array when playersPerTeam changes
  React.useEffect(() => {
    setPlayers(initializePlayers(playersPerTeam));
  }, [playersPerTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    try {
      // First, create the team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: formData.teamName,
          tournament_id: tournamentId,
          captain_id: user.id,
          players_count: playersPerTeam,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone || null,
          skill_level: formData.skillLevel,
          is_registered: true
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Then, insert all players
      const playersData = players
        .filter(player => player.name.trim())
        .map(player => ({
          team_id: teamData.id,
          name: player.name.trim(),
          email: player.email.trim() || null,
          phone: player.phone.trim() || null,
          position: player.position.trim() || null,
          jersey_number: player.jerseyNumber ? parseInt(player.jerseyNumber) : null
        }));

      if (playersData.length > 0) {
        const { error: playersError } = await supabase
          .from('players')
          .insert(playersData);

        if (playersError) throw playersError;
      }

      toast({
        title: "Team registered successfully!",
        description: `${formData.teamName} has been registered for the tournament.`,
      });

      // Reset form
      setFormData({
        teamName: '',
        contactEmail: profile?.email || '',
        contactPhone: '',
        notes: '',
        skillLevel: ''
      });
      
      setPlayers(initializePlayers(playersPerTeam));

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error registering team:', error);
      toast({
        title: "Registration failed",
        description: "There was an error registering your team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlayerChange = (index: number, field: string, value: string) => {
    setPlayers(prev => prev.map((player, i) => 
      i === index ? { ...player, [field]: value } : player
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Register Your Team
          </DialogTitle>
          <DialogDescription>
            Enter your team details and all player information to register for this tournament.
            {tournamentSkillLevels && tournamentSkillLevels.length > 0 && (
              <div className="mt-2">
                <span className="text-sm">Available Skill Levels: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {tournamentSkillLevels.map((level) => (
                    <Badge key={level} variant={getSkillLevelBadgeVariant(level)} className="text-xs">
                      {formatSkillLevel(level)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name *</Label>
            <Input
              id="teamName"
              value={formData.teamName}
              onChange={(e) => handleInputChange('teamName', e.target.value)}
              placeholder="Enter your team name"
              required
            />
          </div>

          {tournamentSkillLevels && tournamentSkillLevels.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="skillLevel">Team Skill Level *</Label>
              <Select value={formData.skillLevel} onValueChange={(value) => handleInputChange('skillLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your team's skill level" />
                </SelectTrigger>
                <SelectContent>
                  {tournamentSkillLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      <div className="flex flex-col">
                        <span>{skillLevelLabels[level]}</span>
                        <span className="text-xs text-muted-foreground">
                          {skillLevelDescriptions[level]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Players ({players.length} required)</h3>
            <div className="grid gap-4 max-h-64 overflow-y-auto">
              {players.map((player, index) => (
                <div key={player.id} className="p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Player {index + 1} {index === 0 && "(Captain)"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`player-${index}-name`}>Name *</Label>
                      <Input
                        id={`player-${index}-name`}
                        value={player.name}
                        onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                        placeholder="Player name"
                        required={index === 0}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`player-${index}-email`}>Email</Label>
                      <Input
                        id={`player-${index}-email`}
                        type="email"
                        value={player.email}
                        onChange={(e) => handlePlayerChange(index, 'email', e.target.value)}
                        placeholder="player@email.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`player-${index}-phone`}>Phone</Label>
                      <Input
                        id={`player-${index}-phone`}
                        type="tel"
                        value={player.phone}
                        onChange={(e) => handlePlayerChange(index, 'phone', e.target.value)}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`player-${index}-position`}>Position</Label>
                      <Input
                        id={`player-${index}-position`}
                        value={player.position}
                        onChange={(e) => handlePlayerChange(index, 'position', e.target.value)}
                        placeholder="e.g., Setter, Hitter"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor={`player-${index}-jersey`}>Jersey Number</Label>
                      <Input
                        id={`player-${index}-jersey`}
                        type="number"
                        min="1"
                        max="99"
                        value={player.jerseyNumber}
                        onChange={(e) => handlePlayerChange(index, 'jerseyNumber', e.target.value)}
                        placeholder="Jersey number"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleInputChange('contactEmail', e.target.value)}
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => handleInputChange('contactPhone', e.target.value)}
              placeholder="(optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional information (optional)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading || 
                !formData.teamName.trim() || 
                (players.length > 0 && !players[0]?.name?.trim()) ||
                (tournamentSkillLevels && tournamentSkillLevels.length > 1 && !formData.skillLevel)
              }
              className="gradient-primary hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register Team
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamRegistrationDialog;