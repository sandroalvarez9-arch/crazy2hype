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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Trophy, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkillLevelMultiSelect } from '@/components/SkillLevelMultiSelect';
import { SkillLevel, formatSkillLevel, getSkillLevelBadgeVariant } from '@/utils/skillLevels';
import { Badge } from '@/components/ui/badge';

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
  skill_levels: z.array(z.enum(['open', 'a', 'bb', 'b', 'c'])).min(1, 'At least one skill level is required'),
  estimated_game_duration: z.number().min(15, 'Minimum 15 minutes per game').max(180, 'Maximum 3 hours per game'),
  warm_up_duration: z.number().min(3, 'Minimum 3 minutes warm-up').max(10, 'Maximum 10 minutes warm-up'),
  number_of_courts: z.number().min(1, 'Minimum 1 court required').max(20, 'Maximum 20 courts').optional(),
  max_teams_per_skill_level: z.record(z.number().min(4, 'Minimum 4 teams per skill level').max(64, 'Maximum 64 teams per skill level')),
  players_per_team: z.number().min(1, 'Minimum 1 player per team').max(20, 'Maximum 20 players per team'),
  entry_fee: z.number().min(0, 'Entry fee cannot be negative'),
  payment_instructions: z.string().optional(),
  venmo_username: z.string().optional(),
  paypal_email: z.string().optional(),
  bank_details: z.string().optional(),
  check_address: z.string().optional(),
  other_payment_methods: z.string().optional(),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      tournament_format: 'pool_play' as const,
      skill_levels: ['open'] as SkillLevel[],
      estimated_game_duration: 30,
      warm_up_duration: 7,
      max_teams_per_skill_level: { open: 16 },
      players_per_team: 6,
      entry_fee: 0,
      payment_instructions: '',
      venmo_username: '',
      paypal_email: '',
      bank_details: '',
      check_address: '',
      other_payment_methods: '',
    },
  });

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

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
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
          skill_levels: values.skill_levels,
          estimated_game_duration: values.estimated_game_duration,
          warm_up_duration: values.warm_up_duration,
          number_of_courts: values.number_of_courts,
          max_teams_per_skill_level: values.max_teams_per_skill_level,
          max_teams: Object.values(values.max_teams_per_skill_level).reduce((sum, count) => sum + count, 0),
          players_per_team: values.players_per_team,
          entry_fee: values.entry_fee,
          payment_instructions: values.payment_instructions || null,
          venmo_username: values.venmo_username || null,
          paypal_email: values.paypal_email || null,
          bank_details: values.bank_details || null,
          check_address: values.check_address || null,
          other_payment_methods: values.other_payment_methods || null,
          organizer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Tournament created successfully!",
        description: "Your tournament has been created and is now open for registrations.",
      });

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
                        <Input placeholder="Beach Park, Miami" {...field} />
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

                <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
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
                        Fee per team (leave 0 for free tournaments)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                 />
                </div>
                </div>

                {/* Payment Information Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Information (Optional)</CardTitle>
                    <CardDescription>
                      Provide payment instructions for teams if you're charging an entry fee
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="payment_instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>General Payment Instructions</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="e.g., Payment is due within 24 hours of registration. Send to..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
                      <FormField
                        control={form.control}
                        name="venmo_username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Venmo Username</FormLabel>
                            <FormControl>
                              <Input placeholder="@your-venmo-username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="paypal_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PayPal Email</FormLabel>
                            <FormControl>
                              <Input placeholder="payments@yourorg.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="bank_details"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Transfer Details</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Account Name, Number, Routing, etc."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="check_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check Mailing Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Name and address for check payments"
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="other_payment_methods"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Payment Methods</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Cash at event, Apple Pay, Zelle, etc."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

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
                  {isSubmitting ? 'Creating...' : 'Create Tournament'}
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