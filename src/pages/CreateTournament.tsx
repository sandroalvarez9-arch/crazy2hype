import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Trophy, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkillLevelMultiSelect } from '@/components/SkillLevelMultiSelect';
import { SkillLevel, formatSkillLevel, getSkillLevelBadgeVariant } from '@/utils/skillLevels';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { LocationAutocompleteInput } from '@/components/LocationAutocompleteInput';
type Division = 'men' | 'women' | 'coed';
const DRAFT_KEY = 'create_tournament_draft';
const STRIPE_CONNECTED_KEY = 'stripe_connected';
const formSchema = z.object({
  title: z.string().min(3, 'Tournament title must be at least 3 characters'),
  description: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  start_date: z.date({
    required_error: 'Start date is required',
  }),
  end_date: z.date({
    required_error: 'End date is required',
  }),
  registration_deadline: z.date({
    required_error: 'Registration deadline is required',
  }),
  first_game_time: z.string().min(1, 'First game time is required'),
  tournament_format: z.enum(['pool_play', 'single_elimination', 'double_elimination', 'round_robin']),
  divisions: z.array(z.enum(['men','women','coed'])).default([]),
  skill_levels: z.array(z.enum(['open', 'aa', 'a', 'bb', 'b', 'c'])).min(1, 'At least one skill level is required'),
  skill_levels_by_division: z.record(z.array(z.enum(['open', 'aa', 'a', 'bb', 'b', 'c']))).default({}),
  estimated_game_duration: z.number().min(15, 'Minimum 15 minutes per game').max(180, 'Maximum 3 hours per game'),
  warm_up_duration: z.number().min(3, 'Minimum 3 minutes warm-up').max(10, 'Maximum 10 minutes warm-up'),
  number_of_courts: z.number().min(1, 'Minimum 1 court required').max(20, 'Maximum 20 courts').optional(),
  max_teams_per_skill_level: z.record(z.number().min(4, 'Minimum 4 teams per skill level').max(64, 'Maximum 64 teams per skill level')),
  max_teams_per_division_skill: z.record(z.record(z.number().min(4).max(64))).default({}),
  players_per_team: z.number().min(1, 'Minimum 1 player per team').max(20, 'Maximum 20 players per team'),
  entry_fee: z.number().min(0, 'Entry fee cannot be negative'),
}).refine((data) => data.end_date >= data.start_date, {
  message: "End date must be after start date",
  path: ["end_date"],
}).refine((data) => data.registration_deadline <= data.start_date, {
  message: "Registration deadline must be before start date",
  path: ["registration_deadline"],
});

type FormValues = z.infer<typeof formSchema>;

const CreateTournament = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  defaultValues: {
    title: '',
    description: '',
    location: '',
    tournament_format: 'pool_play' as const,
    divisions: [],
    skill_levels: ['open'] as SkillLevel[],
    skill_levels_by_division: {},
    estimated_game_duration: 30,
    warm_up_duration: 7,
    max_teams_per_skill_level: { open: 16 },
    max_teams_per_division_skill: {},
    players_per_team: 6,
    entry_fee: 0,
  },
  });

  // Restore saved draft on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const toDate = (v: any) => (v ? new Date(v) : undefined);
      const draft: Partial<FormValues> = {
        ...saved,
        start_date: toDate(saved.start_date),
        end_date: toDate(saved.end_date),
        registration_deadline: toDate(saved.registration_deadline),
      };
      form.reset({ ...form.getValues(), ...draft });
    } catch (e) {
      console.warn('Failed to restore draft', e);
    }
  }, []);

  // Optimistically apply local stripe_connected flag on mount
  React.useEffect(() => {
    try {
      const flag = localStorage.getItem(STRIPE_CONNECTED_KEY);
      if (flag === 'true') {
        console.log('Found stripe_connected flag in localStorage; refreshing status');
        setStripeConnected(true);
        setTimeout(() => checkStripeStatus(), 500);
      }
    } catch {}
  }, []);

  // Auto-save draft on any change
  React.useEffect(() => {
    const subscription = form.watch((values) => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
      } catch (e) {
        console.warn('Failed to save draft', e);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Listen for Stripe connection signal from callback tab
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      console.log('localStorage event:', e.key, e.newValue);
      if (e.key === STRIPE_CONNECTED_KEY && e.newValue === 'true') {
        console.log('✅ Stripe connected signal received!');
        setStripeConnected(true);
        toast({ title: 'Stripe connected', description: 'You can now submit your tournament.' });
        // Re-check from database to be sure
        setTimeout(() => checkStripeStatus(), 1000);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [toast]);

  // Watch skill levels to update max_teams_per_skill_level
  const watchedSkillLevels = form.watch('skill_levels');
  const currentMaxTeams = form.watch('max_teams_per_skill_level');

  React.useEffect(() => {
    const newMaxTeams = { ...currentMaxTeams };
    
    // Add default limits for new skill levels
    watchedSkillLevels.forEach(level => {
      if (!(level in newMaxTeams)) {
        newMaxTeams[level] = 16;
      }
    });
    
    // Remove limits for removed skill levels
    Object.keys(newMaxTeams).forEach(level => {
      if (!watchedSkillLevels.includes(level as SkillLevel)) {
        delete newMaxTeams[level];
      }
    });
    
    form.setValue('max_teams_per_skill_level', newMaxTeams);
  }, [watchedSkillLevels, currentMaxTeams, form]);

  // Divisions-related watches
  const watchedDivisions: Division[] = (form.watch('divisions') || []) as Division[];
  const slByDiv = form.watch('skill_levels_by_division') || {};
  const maxByDiv = form.watch('max_teams_per_division_skill') || {};

  // Ensure division keys exist/remove when divisions change
  React.useEffect(() => {
    const updatedSL: Record<string, any> = { ...slByDiv };
    const updatedMax: Record<string, any> = { ...maxByDiv };
    watchedDivisions.forEach((div: Division) => {
      if (!updatedSL[div]) updatedSL[div] = [];
      if (!updatedMax[div]) updatedMax[div] = {};
    });
    Object.keys(updatedSL).forEach((div) => {
      if (!watchedDivisions.includes(div as Division)) delete updatedSL[div];
    });
    Object.keys(updatedMax).forEach((div) => {
      if (!watchedDivisions.includes(div as Division)) delete updatedMax[div];
    });
    form.setValue('skill_levels_by_division', updatedSL);
    form.setValue('max_teams_per_division_skill', updatedMax);
  }, [watchedDivisions]);

  // Keep legacy fields in sync for compatibility
  React.useEffect(() => {
    const union = Array.from(new Set(Object.values(slByDiv as Record<string, string[]>).flat()));
    if (union.length > 0) {
      form.setValue('skill_levels', union as SkillLevel[]);
    }
    const aggregated: Record<string, number> = {};
    watchedDivisions.forEach((div: string) => {
      const levels: string[] = (slByDiv as any)[div] || [];
      levels.forEach((lvl) => {
        const cap = (maxByDiv as any)[div]?.[lvl] ?? 0;
        aggregated[lvl] = (aggregated[lvl] || 0) + (typeof cap === 'number' ? cap : 0);
      });
    });
    if (Object.keys(aggregated).length > 0) {
      form.setValue('max_teams_per_skill_level', aggregated);
    }
  }, [slByDiv, maxByDiv, watchedDivisions, form]);

  const connectStripe = async () => {
    try {
      // Save current draft so nothing is lost during OAuth
      try {
        const values = form.getValues();
        localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
        localStorage.removeItem(STRIPE_CONNECTED_KEY);
        console.log('🚀 Draft saved, starting Stripe connect...');
      } catch {}

      const { data, error } = await supabase.functions.invoke('get-stripe-oauth-url');
      console.log('get-stripe-oauth-url response:', { data, error });
      
      if (error || !data?.url) {
        throw new Error(error?.message || 'Failed to create Stripe connect link');
      }
      
      // Check if we're in an iframe (like Lovable editor preview)
      const inIframe = window.self !== window.top;
      
      if (inIframe) {
        // In iframe: We can't redirect due to cross-origin restrictions
        // Show user-friendly message with instructions
        toast({
          title: '🚀 Open App in New Tab',
          description: 'To connect Stripe, please open your app in a new tab by clicking "Open in new tab" in the top right corner, then try connecting again.',
          duration: 8000,
        });
        // Still try to open in new window as backup
        window.open(data.url, '_blank', 'noopener');
        return;
      }
      
      // Not in iframe: try popup first, fallback to redirect
      const w = window.open(data.url, '_blank', 'noopener');
      if (!w) {
        console.log('Popup blocked, redirecting same tab');
        window.location.href = data.url;
      } else {
        console.log('Opened Stripe in new tab:', data.url);
        toast({
          title: 'Opening Stripe…',
          description: 'Complete the connection in the new tab, then return here.',
        });
      }
    } catch (e: any) {
      console.error('connectStripe error:', e);
      toast({
        title: 'Could not start Stripe connection',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const checkStripeStatus = async () => {
    if (!user) return;
    console.log('🔍 Checking Stripe status for user:', user.id);
    
    try {
      // Use the verification function to check and update Stripe status
      const { data, error } = await supabase.functions.invoke('check-stripe-connect');
      
      if (error) {
        console.error('Error checking Stripe connection:', error);
        setStripeConnected(false);
        return;
      }
      
      console.log('Stripe verification response:', data);
      const isConnected = Boolean(data?.connected && data?.charges_enabled);
      console.log('Setting stripeConnected to:', isConnected);
      setStripeConnected(isConnected);
      
      // Store in localStorage for persistence
      localStorage.setItem(STRIPE_CONNECTED_KEY, JSON.stringify(isConnected));
      
      // Show clear status feedback
      if (data?.connected && data?.charges_enabled) {
        toast({
          title: '✅ Stripe Connected & Ready',
          description: 'Your Stripe account is fully set up and ready to accept payments!',
        });
      } else if (data?.connected && !data?.charges_enabled) {
        toast({
          title: '⚠️ Stripe Setup Incomplete',
          description: 'Your Stripe account is connected but needs to complete onboarding. Click "Connect with Stripe" to finish setup.',
          variant: 'default',
        });
      } else {
        toast({
          title: '❌ Stripe Not Connected',
          description: 'Click "Connect with Stripe" to set up payment processing.',
          variant: 'default',
        });
      }
      
    } catch (err) {
      console.error('Failed to check Stripe status:', err);
      // Fallback to database check
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_connected, stripe_account_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const isConnected = Boolean(data?.stripe_connected && data?.stripe_account_id);
      console.log('Fallback - Setting stripeConnected to:', isConnected);
      setStripeConnected(isConnected);
    }
  };

  React.useEffect(() => {
    checkStripeStatus();
  }, [user]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Allow creation without Stripe, but save as draft if not connected
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          title: values.title,
          description: values.description,
          location: values.location,
          start_date: values.start_date.toISOString(),
          end_date: values.end_date.toISOString(),
          registration_deadline: values.registration_deadline.toISOString(),
          first_game_time: values.first_game_time,
          tournament_format: values.tournament_format,
          divisions: values.divisions || [],
          skill_levels: values.skill_levels,
          skill_levels_by_division: values.skill_levels_by_division || {},
          estimated_game_duration: values.estimated_game_duration,
          warm_up_duration: values.warm_up_duration,
          number_of_courts: values.number_of_courts,
          max_teams_per_skill_level: values.max_teams_per_skill_level,
          max_teams_per_division_skill: values.max_teams_per_division_skill || {},
          max_teams: Object.values(values.max_teams_per_skill_level).reduce((sum, count) => sum + count, 0),
          players_per_team: values.players_per_team,
          entry_fee: values.entry_fee,
          organizer_id: user.id,
          status: stripeConnected ? 'open' : 'draft',
          published: stripeConnected,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Tournament created successfully!",
        description: stripeConnected 
          ? "Your tournament has been published and is now open for registrations." 
          : "Tournament saved as draft. Connect Stripe to publish it.",
      });

      // Clear draft after successful creation
      try { localStorage.removeItem(DRAFT_KEY); } catch {}

      navigate(`/tournament/${data.id}`);
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error creating tournament",
        description: "There was an error creating your tournament. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`container mx-auto px-4 py-6 ${isMobile ? 'pb-4' : 'py-8'}`}>
      <div className="mb-6 animate-fade-in">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
          <Trophy className="h-6 w-6 md:h-8 w-8 text-primary" />
          Create Tournament
        </h1>
        <p className="text-muted-foreground">
          Set up your volleyball tournament with all the details
        </p>
      </div>

      {stripeConnected === true && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900">✅ Stripe Connected & Ready</AlertTitle>
          <AlertDescription className="text-green-800">
            Your Stripe account is fully connected and ready to accept payments. Your tournament will be published immediately after creation.
          </AlertDescription>
        </Alert>
      )}

      {stripeConnected === false && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Stripe Not Connected</AlertTitle>
          <AlertDescription className="text-amber-800">
            You can create your tournament now and save it as a draft. To publish it and accept payments, 
            you'll need to connect your Stripe account first.
            <br />
            <span className="text-sm text-muted-foreground mt-2 block">
              💡 Testing tip: Use "Skip this form" in Stripe's test mode, or create a separate Stripe account for testing.
            </span>
          </AlertDescription>
          <div className="mt-3 flex gap-3 flex-wrap">
            <Button onClick={connectStripe} className="bg-amber-600 hover:bg-amber-700 text-white">
              Connect with Stripe
            </Button>
            <Button variant="outline" onClick={checkStripeStatus}>
              Check Connection Status
            </Button>
          </div>
        </Alert>
      )}

      <Card className="shadow-card animate-scale-in">
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
          <CardDescription>
            Fill in the information below to create your tournament
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Summer Volleyball Championship" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location *</FormLabel>
                      <FormControl>
                        <LocationAutocompleteInput
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell participants about your tournament..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide details about the tournament format, rules, and any special requirements
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'} gap-6`}>
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registration_deadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Registration Deadline *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                 />
               </div>

               <FormField
                 control={form.control}
                 name="first_game_time"
                 render={({ field }) => (
                   <FormItem className="flex flex-col">
                     <FormLabel>First Game Time *</FormLabel>
                     <FormControl>
                        <Input
                          type="time"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full"
                        />
                     </FormControl>
                     <FormDescription>
                       What time the first match starts on the tournament start date
                     </FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />

                <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'} gap-6`}>
                  <FormField
                    control={form.control}
                    name="tournament_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tournament Format *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pool_play">Pool Play</SelectItem>
                            <SelectItem value="single_elimination">Single Elimination</SelectItem>
                            <SelectItem value="double_elimination">Double Elimination</SelectItem>
                            <SelectItem value="round_robin">Round Robin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Pool play includes automatic referee assignments
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="divisions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Divisions</FormLabel>
                        <div className="flex flex-wrap gap-4">
                          {(['men','women','coed'] as Division[]).map((div) => {
                            const selected = (field.value || []) as Division[];
                            const isChecked = selected.includes(div);
                            return (
                              <label key={div} className="flex items-center gap-2">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const checkedBool = Boolean(checked);
                                    const next = checkedBool
                                      ? ([...selected, div] as Division[])
                                      : (selected.filter((d) => d !== div) as Division[]);
                                    // Deduplicate just in case
                                    const deduped = Array.from(new Set(next)) as Division[];
                                    field.onChange(deduped);
                                  }}
                                />
                                <span className="capitalize">{div === 'coed' ? 'Coed' : div}</span>
                              </label>
                            );
                          })}
                        </div>
                        <FormDescription>
                          Choose one or more divisions (Men, Women, Coed).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedDivisions.length === 0 && (
                    <FormField
                      control={form.control}
                      name="skill_levels"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skill Levels *</FormLabel>
                          <FormControl>
                            <SkillLevelMultiSelect
                              selectedLevels={field.value}
                              onLevelsChange={field.onChange}
                            />
                          </FormControl>
                          <FormDescription>
                            Select all skill levels that can participate in this tournament
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'} gap-6`}>
                  <FormField
                    control={form.control}
                    name="estimated_game_duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Game Duration (minutes) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={15}
                            max={180}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Estimated time per game for scheduling
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warm_up_duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warm-up Time (minutes) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={3}
                            max={10}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Time for teams to warm up before each game
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 </div>

               <div className="space-y-6">
                {watchedDivisions.length === 0 ? (
                  <FormField
                    control={form.control}
                    name="max_teams_per_skill_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Limits per Skill Level *</FormLabel>
                        <div className="space-y-3">
                          {watchedSkillLevels.map((level) => (
                            <div key={level} className="flex items-center gap-3">
                              <div className="flex-1">
                                <Badge variant={getSkillLevelBadgeVariant(level)} className="mb-1">
                                  {formatSkillLevel(level)}
                                </Badge>
                              </div>
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  min={4}
                                  max={64}
                                  value={field.value[level] || 16}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 16;
                                    field.onChange({
                                      ...field.value,
                                      [level]: newValue
                                    });
                                  }}
                                  placeholder="16"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <FormDescription>
                          Set maximum teams for each skill level (4-64 per level).
                          Total: {Object.values(field.value).reduce((sum, count) => sum + count, 0)} teams
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="space-y-4">
                    {watchedDivisions.map((div) => {
                      const levels: string[] = (slByDiv as any)[div] || [];
                      return (
                        <div key={div} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium capitalize">{div === 'coed' ? 'Coed' : div}</h4>
                            <span className="text-sm text-muted-foreground">Team limits per level</span>
                          </div>
                          <div className="mb-3">
                            <SkillLevelMultiSelect
                              selectedLevels={levels as any}
                              onLevelsChange={(newLevels) => {
                                const updated = { ...(slByDiv as any), [div]: newLevels };
                                form.setValue('skill_levels_by_division', updated);
                                const maxCopy: Record<string, any> = { ...(maxByDiv as any), [div]: { ...(maxByDiv as any)[div] || {} } };
                                newLevels.forEach((lvl) => {
                                  if (maxCopy[div][lvl] == null) maxCopy[div][lvl] = 16;
                                });
                                Object.keys(maxCopy[div]).forEach((lvl) => {
                                  if (!newLevels.includes(lvl as SkillLevel)) delete maxCopy[div][lvl];
                                });
                                form.setValue('max_teams_per_division_skill', maxCopy);
                              }}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Select levels for this division</p>
                          </div>
                          <div className="space-y-3">
                            {levels.map((lvl) => (
                              <div key={lvl} className="flex items-center gap-3">
                                <div className="flex-1">
                                  <Badge variant={getSkillLevelBadgeVariant(lvl as SkillLevel)} className="mb-1">
                                    {formatSkillLevel(lvl as SkillLevel)}
                                  </Badge>
                                </div>
                                <div className="flex-1">
                                  <Input
                                    type="number"
                                    min={4}
                                    max={64}
                                    value={(maxByDiv as any)[div]?.[lvl] ?? 16}
                                    onChange={(e) => {
                                      const newVal = parseInt(e.target.value) || 16;
                                      const updated = { ...(maxByDiv as any), [div]: { ...(maxByDiv as any)[div], [lvl]: newVal } };
                                      form.setValue('max_teams_per_division_skill', updated);
                                    }}
                                    placeholder="16"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-sm text-muted-foreground">Totals update automatically across divisions.</p>
                  </div>
                  )}

               <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6`}>

                <FormField
                  control={form.control}
                  name="players_per_team"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Players per Team *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={1}
                          max={20}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of players each team must have (1-20)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entry_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Fee ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Stripe Checkout will collect this amount; set 0 for free tournaments.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                 />
                </div>
                </div>


                <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 gradient-primary hover:opacity-90 transition-opacity"
                >
                  {isSubmitting 
                    ? 'Creating...' 
                    : stripeConnected 
                      ? 'Create & Publish Tournament' 
                      : 'Save as Draft'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTournament;