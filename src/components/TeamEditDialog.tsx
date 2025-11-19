import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

interface TeamEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  team: {
    id: string;
    name: string;
    contact_email: string;
    contact_phone: string;
    players_count: number;
  };
  onSuccess: () => void;
  checkInDeadline?: string | null;
}

const TeamEditDialog = ({ 
  isOpen, 
  onOpenChange, 
  team,
  checkInDeadline,
  onSuccess 
}: TeamEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [formData, setFormData] = useState({
    teamName: team.name,
    contactEmail: team.contact_email,
    contactPhone: team.contact_phone,
  });

  useEffect(() => {
    // Check if team can still be edited (before check-in deadline)
    if (checkInDeadline) {
      const now = new Date();
      const deadline = new Date(checkInDeadline);
      setCanEdit(now < deadline);
    }
  }, [checkInDeadline]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.teamName.trim()) {
      toast({
        title: "Validation Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: formData.teamName.trim(),
          contact_email: formData.contactEmail.trim() || null,
          contact_phone: formData.contactPhone.trim() || null,
        })
        .eq('id', team.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Team details updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update team details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Edit Team</DialogTitle>
            <DialogDescription>
              The check-in deadline has passed. Teams can no longer be edited.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Team Details</DialogTitle>
            <DialogDescription>
              Update your team information before the check-in deadline
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name *</Label>
              <Input
                id="teamName"
                value={formData.teamName}
                onChange={(e) => handleInputChange('teamName', e.target.value)}
                placeholder="Enter team name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="team@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Players: {team.players_count}</p>
              <p className="mt-1">To edit player roster, contact the tournament organizer.</p>
            </div>
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamEditDialog;
