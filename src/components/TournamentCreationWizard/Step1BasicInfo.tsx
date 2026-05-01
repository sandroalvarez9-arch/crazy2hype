import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { LocationAutocompleteInput } from '@/components/LocationAutocompleteInput';
import { TournamentCreationFormValues } from './types';

interface Step1BasicInfoProps {
  form: UseFormReturn<TournamentCreationFormValues>;
}

const formatDateForInput = (value?: Date) => {
  if (!value) return '';
  return format(value, 'yyyy-MM-dd');
};

export function Step1BasicInfo({ form }: Step1BasicInfoProps) {
  const startDate = form.watch('start_date');

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <p className="text-sm text-muted-foreground">
          Let's start with the essential details about your tournament
        </p>
      </div>

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tournament Title *</FormLabel>
            <FormControl>
              <Input placeholder="Summer Beach Volleyball Championship" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Tell players what makes your tournament special..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Optional: Add details about prizes, atmosphere, skill requirements, etc.
            </FormDescription>
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
                placeholder="Search for venue or address..."
              />
            </FormControl>
            <FormDescription>
              Start typing to search for a venue or address
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date *</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  className="min-h-[44px]"
                  value={formatDateForInput(field.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(event) => {
                    const nextValue = event.target.value ? new Date(`${event.target.value}T00:00:00`) : undefined;
                    field.onChange(nextValue);

                    const currentEndDate = form.getValues('end_date');
                    if (currentEndDate && nextValue && currentEndDate < nextValue) {
                      form.setValue('end_date', nextValue, { shouldValidate: true });
                    }

                    const currentDeadline = form.getValues('registration_deadline');
                    if (currentDeadline && nextValue && currentDeadline > nextValue) {
                      form.setValue('registration_deadline', nextValue, { shouldValidate: true });
                    }
                  }}
                />
              </FormControl>
              <FormDescription>Choose the first day of the tournament.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="end_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date *</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  className="min-h-[44px]"
                  value={formatDateForInput(field.value)}
                  min={formatDateForInput(startDate || new Date())}
                  onChange={(event) => {
                    const nextValue = event.target.value ? new Date(`${event.target.value}T00:00:00`) : undefined;
                    field.onChange(nextValue);
                  }}
                />
              </FormControl>
              <FormDescription>For one-day events, use the same date as the start date.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="registration_deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Deadline *</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  className="min-h-[44px]"
                  value={formatDateForInput(field.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  max={formatDateForInput(startDate)}
                  onChange={(event) => {
                    const nextValue = event.target.value ? new Date(`${event.target.value}T00:00:00`) : undefined;
                    field.onChange(nextValue);
                  }}
                />
              </FormControl>
              <FormDescription>Teams must finish registering by this date.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
