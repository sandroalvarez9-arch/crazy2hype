import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';

interface TeamRegistrationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  onSuccess: () => void;
}

const TeamRegistrationDialog = ({ isOpen, onOpenChange, tournamentId, onSuccess }: TeamRegistrationDialogProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    teamName: '',
    playersCount: '1',
    contactEmail: profile?.email || '',
    contactPhone: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('teams')
        .insert({
          name: formData.teamName,
          tournament_id: tournamentId,
          captain_id: user.id,
          players_count: parseInt(formData.playersCount),
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone || null,
          is_registered: true
        });

      if (error) throw error;

      toast({
        title: "Team registered successfully!",
        description: `${formData.teamName} has been registered for the tournament.`,
      });

      // Reset form
      setFormData({
        teamName: '',
        playersCount: '1',
        contactEmail: profile?.email || '',
        contactPhone: '',
        notes: ''
      });

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Register Your Team
          </DialogTitle>
          <DialogDescription>
            Enter your team details to register for this tournament.
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
            <Label htmlFor="playersCount">Number of Players *</Label>
            <Input
              id="playersCount"
              type="number"
              min="1"
              max="20"
              value={formData.playersCount}
              onChange={(e) => handleInputChange('playersCount', e.target.value)}
              required
            />
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
              disabled={loading || !formData.teamName.trim()}
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