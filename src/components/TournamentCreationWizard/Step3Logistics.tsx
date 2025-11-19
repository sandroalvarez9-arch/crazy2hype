import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { UseFormReturn } from 'react-hook-form';

interface Step3LogisticsProps {
  form: UseFormReturn<any>;
}

export function Step3Logistics({ form }: Step3LogisticsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Logistics</h3>
        <p className="text-sm text-muted-foreground">
          Set up the practical details for running your tournament
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="number_of_courts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Courts</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  placeholder="1"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="min-h-[44px]"
                />
              </FormControl>
              <FormDescription>
                Leave blank to calculate automatically
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="first_game_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Game Time *</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  {...field}
                  className="min-h-[44px]"
                />
              </FormControl>
              <FormDescription>
                When should the first match start?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="estimated_game_duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Game Duration (minutes) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={15}
                  max={180}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                  className="min-h-[44px]"
                />
              </FormControl>
              <FormDescription>
                Average time per match including breaks
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
              <FormLabel>Warm-up Duration (minutes) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={3}
                  max={10}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                  className="min-h-[44px]"
                />
              </FormControl>
              <FormDescription>
                Time teams get to warm up before matches
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="allow_backup_teams"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Allow Backup Teams</FormLabel>
              <FormDescription>
                Let teams register as backups if the tournament fills up. They'll be promoted if spots open.
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
