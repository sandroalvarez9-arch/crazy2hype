import { useState } from 'react';
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
  first_game_time: z.date({
    required_error: 'First game time is required',
  }),
  tournament_format: z.enum(['pool_play', 'single_elimination', 'double_elimination', 'round_robin']),
  estimated_game_duration: z.number().min(15, 'Minimum 15 minutes per game').max(180, 'Maximum 3 hours per game'),
  number_of_courts: z.number().min(1, 'Minimum 1 court required').max(10, 'Maximum 10 courts'),
  max_teams: z.number().min(4, 'Minimum 4 teams required').max(64, 'Maximum 64 teams allowed'),
  players_per_team: z.number().min(1, 'Minimum 1 player per team').max(20, 'Maximum 20 players per team'),
  entry_fee: z.number().min(0, 'Entry fee cannot be negative'),
}).refine((data) => data.end_date >= data.start_date, {
  message: "End date must be after start date",
  path: ["end_date"],
}).refine((data) => data.registration_deadline <= data.start_date, {
  message: "Registration deadline must be before start date",
  path: ["registration_deadline"],
}).refine((data) => data.first_game_time >= data.start_date && data.first_game_time <= data.end_date, {
  message: "First game time must be between start and end dates",
  path: ["first_game_time"],
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
      estimated_game_duration: 30,
      number_of_courts: 1,
      max_teams: 16,
      players_per_team: 6,
      entry_fee: 0,
    },
  });

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
          first_game_time: values.first_game_time.toISOString(),
          tournament_format: values.tournament_format,
          estimated_game_duration: values.estimated_game_duration,
          number_of_courts: values.number_of_courts,
          max_teams: values.max_teams,
          players_per_team: values.players_per_team,
          entry_fee: values.entry_fee,
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
                               format(field.value, "PPP 'at' p")
                             ) : (
                               <span>Pick date and time</span>
                             )}
                             <Clock className="ml-auto h-4 w-4 opacity-50" />
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
                     <FormDescription>
                       When the first match of the tournament starts
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
               </div>

               <FormField
                 control={form.control}
                 name="number_of_courts"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Number of Courts *</FormLabel>
                     <FormControl>
                       <Input 
                         type="number"
                         min={1}
                         max={10}
                         {...field}
                         onChange={(e) => field.onChange(parseInt(e.target.value))}
                       />
                     </FormControl>
                     <FormDescription>
                       How many courts will be used for matches
                     </FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'} gap-6`}>
                <FormField
                  control={form.control}
                  name="max_teams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Teams *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={4}
                          max={64}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of teams that can participate (4-64)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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