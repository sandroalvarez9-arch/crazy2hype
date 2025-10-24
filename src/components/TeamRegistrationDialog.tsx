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
import PaymentInstructions from './PaymentInstructions';

interface TeamRegistrationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  playersPerTeam: number;
  tournamentSkillLevels?: SkillLevel[];
  maxTeamsPerSkillLevel?: Record<string, number>;
  entryFee?: number;
  paymentInstructions?: string | null;
  venmoUsername?: string | null;
  paypalEmail?: string | null;
  bankDetails?: string | null;
  cashappInfo?: string | null;
  otherPaymentMethods?: string | null;
  onSuccess: () => void;
}

const TeamRegistrationDialog = ({ 
  isOpen, 
  onOpenChange, 
  tournamentId, 
  playersPerTeam, 
  tournamentSkillLevels, 
  maxTeamsPerSkillLevel, 
  entryFee = 0,
  paymentInstructions,
  venmoUsername,
  paypalEmail,
  bankDetails,
  cashappInfo,
  otherPaymentMethods,
  onSuccess 
}: TeamRegistrationDialogProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [skillLevelTeamCounts, setSkillLevelTeamCounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    teamName: '',
    contactEmail: profile?.email || '',
    contactPhone: '',
    notes: '',
    skillLevel: '',
    category: ''
  });

  // Fetch current team counts by skill level
  React.useEffect(() => {
    const fetchTeamCounts = async () => {
      if (!tournamentSkillLevels) return;
      
      try {
        const { data: teams, error } = await supabase
          .from('teams')
          .select('skill_level')
          .eq('tournament_id', tournamentId)
          .eq('is_registered', true);

        if (error) throw error;

        const counts: Record<string, number> = {};
        tournamentSkillLevels.forEach(level => {
          counts[level] = teams?.filter(team => team.skill_level === level).length || 0;
        });
        
        setSkillLevelTeamCounts(counts);
      } catch (error) {
        console.error('Error fetching team counts:', error);
      }
    };

    if (isOpen) {
      fetchTeamCounts();
    }
  }, [isOpen, tournamentId, tournamentSkillLevels]);

  // Auto-set skill level when there's only one option
  React.useEffect(() => {
    if (isOpen && tournamentSkillLevels && tournamentSkillLevels.length === 1 && !formData.skillLevel) {
      setFormData(prev => ({ ...prev, skillLevel: tournamentSkillLevels[0] }));
    }
  }, [isOpen, tournamentSkillLevels, formData.skillLevel]);
  
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

    // Check skill level capacity
    if (formData.skillLevel && maxTeamsPerSkillLevel) {
      const currentCount = skillLevelTeamCounts[formData.skillLevel] || 0;
      const maxCount = maxTeamsPerSkillLevel[formData.skillLevel] || 0;
      
      if (currentCount >= maxCount) {
        toast({
          title: "Skill level full",
          description: `The ${formatSkillLevel(formData.skillLevel as SkillLevel)} division is full. Please select a different skill level or contact the organizer.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Ensure all players provide name and email so everyone can be notified
    const allHaveNames = players.every((p) => p.name.trim());
    const allHaveEmails = players.every((p) => p.email.trim());
    if (!allHaveNames || !allHaveEmails) {
      toast({
        title: "Missing player info",
        description: "Please enter name and email for all players so everyone can be notified.",
        variant: "destructive",
      });
      return;
    }

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
          category: formData.category || null,
          is_registered: true,
          payment_status: 'pending'
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Then, insert all players (without contact info in main table)
      const playersData = players
        .filter(player => player.name.trim())
        .map(player => ({
          team_id: teamData.id,
          name: player.name.trim(),
          position: player.position.trim() || null,
          jersey_number: player.jerseyNumber ? parseInt(player.jerseyNumber) : null
        }));

      let insertedPlayers: any[] = [];
      if (playersData.length > 0) {
        const { data: playerRecords, error: playersError } = await supabase
          .from('players')
          .insert(playersData)
          .select();

        if (playersError) throw playersError;
        insertedPlayers = playerRecords || [];
      }

      // Insert player contact information into secure table
      const playerContactsData = players
        .filter((player, index) => player.name.trim() && insertedPlayers[index])
        .map((player, index) => ({
          player_id: insertedPlayers[index].id,
          email: player.email.trim() || null,
          phone: player.phone.trim() || null
        }))
        .filter(contact => contact.email || contact.phone); // Only insert if there's contact info

      if (playerContactsData.length > 0) {
        const { error: contactsError } = await supabase
          .from('player_contacts')
          .insert(playerContactsData);

        if (contactsError) throw contactsError;
      }

      toast({
        title: "Team registered successfully!",
        description: `${formData.teamName} has been registered for the tournament.`,
      });

      // If there's an entry fee, automatically initiate payment
      if (entryFee > 0) {
        try {
          const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', {
            body: { tournamentId }
          });

          if (paymentError) throw paymentError;

          if (paymentData?.url) {
            // Open Stripe checkout in a new tab
            window.open(paymentData.url, '_blank');
            toast({
              title: "Payment page opened",
              description: "Complete your payment in the new tab to secure your tournament spot.",
            });
          }
        } catch (paymentError) {
          console.error('Payment initiation error:', paymentError);
          toast({
            title: "Payment setup failed",
            description: "Team registered successfully, but automatic payment failed. Please use the payment instructions below.",
            variant: "destructive",
          });
        }
      }

      // Reset form
      setFormData({
        teamName: '',
        contactEmail: profile?.email || '',
        contactPhone: '',
        notes: '',
        skillLevel: '',
        category: ''
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
            {entryFee > 0 && (
              <div className="mt-2 p-3 bg-accent rounded-lg">
                <p className="text-sm font-medium">Entry Fee: ${entryFee}</p>
                <p className="text-xs text-muted-foreground">Payment confirmation required after registration</p>
              </div>
            )}
            {tournamentSkillLevels && tournamentSkillLevels.length > 0 && (
              <div className="mt-2">
                <span className="text-sm">Available Skill Levels: </span>
                 <div className="flex flex-wrap gap-1 mt-1">
                   {tournamentSkillLevels.map((level) => {
                     const currentCount = skillLevelTeamCounts[level] || 0;
                     const maxCount = maxTeamsPerSkillLevel?.[level] || 0;
                     const isFull = currentCount >= maxCount;
                     
                     return (
                       <div key={level} className="flex items-center gap-1">
                         <Badge 
                           variant={isFull ? 'secondary' : getSkillLevelBadgeVariant(level)} 
                           className={`text-xs ${isFull ? 'opacity-50' : ''}`}
                         >
                           {formatSkillLevel(level)}
                         </Badge>
                         <span className={`text-xs ${isFull ? 'text-destructive' : 'text-muted-foreground'}`}>
                           {currentCount}/{maxCount}
                         </span>
                       </div>
                     );
                   })}
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

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select team category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Men's A">Men's A</SelectItem>
                <SelectItem value="Men's B">Men's B</SelectItem>
                <SelectItem value="Women's A">Women's A</SelectItem>
                <SelectItem value="Women's B">Women's B</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tournamentSkillLevels && tournamentSkillLevels.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="skillLevel">Team Skill Level *</Label>
              <Select value={formData.skillLevel} onValueChange={(value) => handleInputChange('skillLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your team's skill level" />
                </SelectTrigger>
                <SelectContent>
                  {tournamentSkillLevels.map((level) => {
                    const currentCount = skillLevelTeamCounts[level] || 0;
                    const maxCount = maxTeamsPerSkillLevel?.[level] || 0;
                    const isFull = currentCount >= maxCount;
                    
                    return (
                      <SelectItem key={level} value={level} disabled={isFull}>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span>{skillLevelLabels[level]}</span>
                            <span className={`text-xs ${isFull ? 'text-destructive' : 'text-muted-foreground'}`}>
                              ({currentCount}/{maxCount})
                            </span>
                            {isFull && <span className="text-xs text-destructive font-medium">FULL</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {skillLevelDescriptions[level]}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
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
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`player-${index}-email`}>Email *</Label>
                      <Input
                        id={`player-${index}-email`}
                        type="email"
                        value={player.email}
                        onChange={(e) => handlePlayerChange(index, 'email', e.target.value)}
                        placeholder="player@email.com"
                        required
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

          {entryFee > 0 && (
            <PaymentInstructions
              entryFee={entryFee}
              paymentInstructions={paymentInstructions}
              venmoUsername={venmoUsername}
              paypalEmail={paypalEmail}
              bankDetails={bankDetails}
              cashappInfo={cashappInfo}
              otherPaymentMethods={otherPaymentMethods}
            />
          )}

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
                  (tournamentSkillLevels && tournamentSkillLevels.length > 0 && !formData.skillLevel) ||
                  !players.every(p => p.name.trim()) ||
                  !players.every(p => p.email.trim())
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