import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { celebrateSuccess } from '@/utils/animations';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { StepIndicator } from '@/components/TeamRegistrationWizard/StepIndicator';
import { Step1BasicInfo } from './Step1BasicInfo';
import { Step2FormatAndRules } from './Step2FormatAndRules';
import { Step3Logistics } from './Step3Logistics';
import { Step4PaymentSetup } from './Step4PaymentSetup';

const DRAFT_KEY = 'create_tournament_draft';
const STRIPE_CONNECTED_KEY = 'stripe_connected';

const formSchema = z.object({
  title: z.string().min(3, 'Tournament title must be at least 3 characters'),
  description: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  start_date: z.date({ required_error: 'Start date is required' }),
  end_date: z.date({ required_error: 'End date is required' }),
  registration_deadline: z.date({ required_error: 'Registration deadline is required' }),
  first_game_time: z.string().min(1, 'First game time is required'),
  tournament_format: z.enum(['pool_play', 'single_elimination', 'double_elimination', 'round_robin']),
  divisions: z.array(z.enum(['men', 'women', 'coed'])).default([]),
  skill_levels: z.array(z.enum(['open', 'aa', 'a', 'bb', 'b', 'c'])).default([]),
  skill_levels_by_division: z.record(z.array(z.enum(['open', 'aa', 'a', 'bb', 'b', 'c']))).default({}),
  estimated_game_duration: z.number().min(15).max(180),
  warm_up_duration: z.number().min(3).max(10),
  number_of_courts: z.number().min(1).max(20).optional(),
  max_teams_per_skill_level: z.record(z.number().min(4).max(64)).default({}),
  max_teams_per_division_skill: z.record(z.record(z.number().min(4).max(64))).default({}),
  players_per_team: z.number().min(1).max(20),
  entry_fee: z.number().min(0),
  venmo_username: z.string().optional(),
  paypal_email: z.string().optional(),
  cashapp_info: z.string().optional(),
  bank_details: z.string().optional(),
  other_payment_methods: z.string().optional(),
  payment_instructions: z.string().optional(),
  allow_backup_teams: z.boolean().default(true),
}).refine((data) => {
  // If no divisions selected, require skill_levels
  if (data.divisions.length === 0) {
    return data.skill_levels.length > 0;
  }
  // If divisions selected, require skill_levels_by_division for each division
  return data.divisions.every(div => 
    data.skill_levels_by_division[div]?.length > 0
  );
}, {
  message: 'Please select skill levels for your tournament',
  path: ['skill_levels'],
});

type FormValues = z.infer<typeof formSchema>;

const steps = ['Basic Info', 'Format & Rules', 'Logistics', 'Payment Setup'];

export function TournamentCreationWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      tournament_format: 'pool_play',
      divisions: [],
      skill_levels: [],
      skill_levels_by_division: {},
      estimated_game_duration: 30,
      warm_up_duration: 7,
      max_teams_per_skill_level: {},
      max_teams_per_division_skill: {},
      players_per_team: 2,
      entry_fee: 0,
      allow_backup_teams: true,
    },
  });

  // Load draft and Stripe status
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        Object.keys(parsedDraft).forEach((key) => {
          if (['start_date', 'end_date', 'registration_deadline'].includes(key)) {
            form.setValue(key as any, new Date(parsedDraft[key]));
          } else {
            form.setValue(key as any, parsedDraft[key]);
          }
        });
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }

    const storedStripeStatus = localStorage.getItem(STRIPE_CONNECTED_KEY);
    if (storedStripeStatus === 'true') {
      setStripeConnected(true);
    }

    checkStripeStatus();
  }, []);

  // Auto-save draft
  useEffect(() => {
    const subscription = form.watch((formValues) => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formValues));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const checkStripeStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('stripe_connected, stripe_charges_enabled')
        .eq('user_id', user.id)
        .single();

      if (data?.stripe_connected && data?.stripe_charges_enabled) {
        setStripeConnected(true);
        localStorage.setItem(STRIPE_CONNECTED_KEY, 'true');
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    }
  };

  const connectStripe = async () => {
    if (!user) return;

    setConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-oauth-url');

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect Stripe',
        variant: 'destructive',
      });
    } finally {
      setConnectingStripe(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 0:
        return ['title', 'location', 'start_date', 'end_date', 'registration_deadline'];
      case 1:
        return ['tournament_format', 'skill_levels', 'players_per_team'];
      case 2:
        return ['first_game_time', 'estimated_game_duration', 'warm_up_duration'];
      case 3:
        return ['entry_fee'];
      default:
        return [];
    }
  };

  const onSubmit = async (values: FormValues) => {
    console.log('Form submitted with values:', values);
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a tournament',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      let maxTeams = 0;
      const divisions = values.divisions || [];

      if (divisions.length === 0) {
        maxTeams = Object.values(values.max_teams_per_skill_level || {}).reduce((sum, val) => sum + val, 0);
      } else {
        const divisionSkillMaxTeams = values.max_teams_per_division_skill || {};
        for (const division of divisions) {
          const skillMaxTeams = divisionSkillMaxTeams[division] || {};
          maxTeams += Object.values(skillMaxTeams).reduce((sum, val) => sum + val, 0);
        }
      }

      const { data: tournament, error } = await supabase
        .from('tournaments')
        .insert([{
          title: values.title,
          description: values.description || null,
          location: values.location,
          start_date: values.start_date.toISOString(),
          end_date: values.end_date.toISOString(),
          registration_deadline: values.registration_deadline.toISOString(),
          first_game_time: values.first_game_time,
          tournament_format: values.tournament_format,
          divisions: values.divisions,
          skill_levels: values.skill_levels,
          skill_levels_by_division: values.skill_levels_by_division,
          estimated_game_duration: values.estimated_game_duration,
          warm_up_duration: values.warm_up_duration,
          number_of_courts: values.number_of_courts,
          max_teams_per_skill_level: values.max_teams_per_skill_level,
          max_teams_per_division_skill: values.max_teams_per_division_skill,
          players_per_team: values.players_per_team,
          entry_fee: values.entry_fee,
          venmo_username: values.venmo_username || null,
          paypal_email: values.paypal_email || null,
          cashapp_info: values.cashapp_info || null,
          bank_details: values.bank_details || null,
          other_payment_methods: values.other_payment_methods || null,
          payment_instructions: values.payment_instructions || null,
          allow_backup_teams: values.allow_backup_teams,
          organizer_id: user.id,
          max_teams: maxTeams,
          status: stripeConnected && values.entry_fee > 0 ? 'open' : 'draft',
        }])
        .select()
        .single();

      if (error) throw error;

      localStorage.removeItem(DRAFT_KEY);

      toast({
        title: 'Success!',
        description: stripeConnected ? 'Tournament created and published!' : 'Tournament saved as draft. Connect Stripe to publish.',
      });
      
      celebrateSuccess();
      
      // Delay navigation to show confetti
      setTimeout(() => {
        navigate(`/tournament/${tournament.id}/manage`);
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tournament',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <Step1BasicInfo form={form} />;
      case 1:
        return <Step2FormatAndRules form={form} />;
      case 2:
        return <Step3Logistics form={form} />;
      case 3:
        return (
          <Step4PaymentSetup
            form={form}
            stripeConnected={stripeConnected}
            connectingStripe={connectingStripe}
            onConnectStripe={connectStripe}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/tournaments')}
        className="mb-6 min-h-[44px]"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tournaments
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create Tournament</CardTitle>
          <StepIndicator steps={steps} currentStep={currentStep} />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {renderStep()}

              {/* Show validation errors if form is invalid */}
              {Object.keys(form.formState.errors).length > 0 && (
                <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                  <p className="font-semibold mb-2">Please fix the following errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(form.formState.errors).map(([field, error]) => (
                      <li key={field}>
                        {field}: {error?.message?.toString() || 'Invalid value'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="min-h-[44px]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                {currentStep < steps.length - 1 ? (
                  <Button type="button" onClick={nextStep} className="min-h-[44px]">
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    onClick={(e) => {
                      console.log('Submit button clicked');
                      console.log('Form is valid:', form.formState.isValid);
                      console.log('Form errors:', form.formState.errors);
                    }}
                    className="min-h-[44px]"
                  >
                    {submitting ? 'Creating...' : stripeConnected ? 'Create Tournament' : 'Save as Draft'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
