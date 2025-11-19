import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SkillLevel } from '@/utils/skillLevels';
import { StepIndicator } from './StepIndicator';
import { Step1TeamBasics } from './Step1TeamBasics';
import { Step2CaptainInfo } from './Step2CaptainInfo';
import { Step3AddPlayers } from './Step3AddPlayers';
import { Step4Review } from './Step4Review';

interface TeamRegistrationWizardProps {
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

const STEPS = ['Team Basics', 'Captain Info', 'Add Players', 'Review'];

export function TeamRegistrationWizard(props: TeamRegistrationWizardProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skillLevelTeamCounts, setSkillLevelTeamCounts] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    teamName: '',
    contactEmail: profile?.email || '',
    contactPhone: '',
    skillLevel: '',
    category: '',
  });

  const initializePlayers = (count: number) => {
    return Array.from({ length: Math.max(1, count || 6) }, (_, i) => ({
      id: i,
      name: '',
      email: '',
      phone: '',
      position: '',
      jerseyNumber: '',
    }));
  };

  const [players, setPlayers] = useState(() => initializePlayers(props.playersPerTeam));

  useEffect(() => {
    if (props.isOpen && props.tournamentSkillLevels) {
      fetchTeamCounts();
    }
  }, [props.isOpen, props.tournamentId, props.tournamentSkillLevels]);

  useEffect(() => {
    if (props.isOpen && props.tournamentSkillLevels?.length === 1 && !formData.skillLevel) {
      handleInputChange('skillLevel', props.tournamentSkillLevels[0]);
    }
  }, [props.isOpen, props.tournamentSkillLevels, formData.skillLevel]);

  const fetchTeamCounts = async () => {
    if (!props.tournamentSkillLevels) return;

    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('skill_level')
        .eq('tournament_id', props.tournamentId)
        .eq('is_registered', true);

      if (error) throw error;

      const counts: Record<string, number> = {};
      props.tournamentSkillLevels.forEach((level) => {
        counts[level] = teams?.filter((team) => team.skill_level === level).length || 0;
      });

      setSkillLevelTeamCounts(counts);
    } catch (error) {
      console.error('Error fetching team counts:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlayerUpdate = (index: number, field: string, value: string) => {
    setPlayers((prev) =>
      prev.map((player, i) => (i === index ? { ...player, [field]: value } : player))
    );
  };

  const handleAddPlayer = () => {
    setPlayers((prev) => [
      ...prev,
      {
        id: prev.length,
        name: '',
        email: '',
        phone: '',
        position: '',
        jerseyNumber: '',
      },
    ]);
  };

  const handleRemovePlayer = (index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.teamName.trim().length >= 3 &&
          (!props.tournamentSkillLevels || props.tournamentSkillLevels.length === 1 || formData.skillLevel);
      case 1:
        return formData.contactEmail.trim().length > 0;
      case 2:
        return players.some((p) => p.name.trim().length > 0);
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          tournament_id: props.tournamentId,
          captain_id: user.id,
          name: formData.teamName.trim(),
          contact_email: formData.contactEmail.trim() || null,
          contact_phone: formData.contactPhone.trim() || null,
          skill_level: formData.skillLevel || null,
          category: formData.category || null,
          players_count: players.filter((p) => p.name.trim()).length,
          is_registered: true,
          payment_status: 'pending',
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Create players with contact info
      const playersWithNames = players.filter((p) => p.name.trim());
      if (playersWithNames.length > 0) {
        const { error: playersError } = await supabase.from('players').insert(
          playersWithNames.map((player) => ({
            team_id: team.id,
            name: player.name.trim(),
            email: player.email.trim() || null,
            phone: player.phone.trim() || null,
            position: player.position.trim() || null,
            jersey_number: player.jerseyNumber.trim() ? parseInt(player.jerseyNumber) : null,
          }))
        );

        if (playersError) throw playersError;
      }

      toast({
        title: 'Success!',
        description: 'Your team has been registered for the tournament.',
      });

      props.onSuccess();
      props.onOpenChange(false);
      
      // Reset form
      setCurrentStep(0);
      setFormData({
        teamName: '',
        contactEmail: profile?.email || '',
        contactPhone: '',
        skillLevel: '',
        category: '',
      });
      setPlayers(initializePlayers(props.playersPerTeam));
    } catch (error: any) {
      console.error('Error registering team:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to register team',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Register Your Team</DialogTitle>
        </DialogHeader>

        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <div className="flex-1 overflow-y-auto py-4">
          {currentStep === 0 && (
            <Step1TeamBasics
              formData={formData}
              onChange={handleInputChange}
              skillLevels={props.tournamentSkillLevels}
              skillLevelTeamCounts={skillLevelTeamCounts}
              maxTeamsPerSkillLevel={props.maxTeamsPerSkillLevel}
            />
          )}

          {currentStep === 1 && (
            <Step2CaptainInfo
              formData={formData}
              onChange={handleInputChange}
              captainName={profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username : undefined}
            />
          )}

          {currentStep === 2 && (
            <Step3AddPlayers
              players={players}
              onUpdatePlayer={handlePlayerUpdate}
              onAddPlayer={handleAddPlayer}
              onRemovePlayer={handleRemovePlayer}
              minPlayers={1}
            />
          )}

          {currentStep === 3 && (
            <Step4Review
              formData={formData}
              players={players}
              entryFee={props.entryFee}
              paymentInfo={{
                instructions: props.paymentInstructions,
                venmo: props.venmoUsername,
                paypal: props.paypalEmail,
                bank: props.bankDetails,
                cashapp: props.cashappInfo,
                other: props.otherPaymentMethods,
              }}
            />
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || loading}
            className="min-h-[44px]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed() || loading}
              className="min-h-[44px]"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Complete Registration'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
