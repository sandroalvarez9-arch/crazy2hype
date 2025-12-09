import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UseFormReturn } from 'react-hook-form';
import { AlertTriangle, CheckCircle, CreditCard, Code } from 'lucide-react';

interface Step4PaymentSetupProps {
  form: UseFormReturn<any>;
  stripeConnected: boolean;
  connectingStripe: boolean;
  onConnectStripe: () => void;
  skipStripe: boolean;
  onSkipStripeChange: (skip: boolean) => void;
}

export function Step4PaymentSetup({ 
  form, 
  stripeConnected, 
  connectingStripe, 
  onConnectStripe,
  skipStripe,
  onSkipStripeChange
}: Step4PaymentSetupProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment & Fees</h3>
        <p className="text-sm text-muted-foreground">
          Set up how teams will pay their entry fees
        </p>
      </div>

      <FormField
        control={form.control}
        name="entry_fee"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Entry Fee *</FormLabel>
            <FormControl>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  className="min-h-[44px] pl-7"
                />
              </div>
            </FormControl>
            <FormDescription>
              Enter 0 for free tournaments
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch('entry_fee') > 0 && (
        <>
          {stripeConnected ? (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Stripe Connected</AlertTitle>
              <AlertDescription>
                Teams can pay directly with credit cards. You'll receive payments in your Stripe account.
              </AlertDescription>
            </Alert>
          ) : skipStripe ? (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <Code className="h-4 w-4 text-yellow-600" />
              <AlertTitle>Dev Mode: Stripe Skipped</AlertTitle>
              <AlertDescription>
                Tournament will be created as "open" without Stripe. Teams will need to pay via alternative methods.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Connect Stripe to Accept Online Payments</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>Enable teams to pay with credit/debit cards securely.</p>
                <Button
                  type="button"
                  onClick={onConnectStripe}
                  disabled={connectingStripe}
                  className="min-h-[44px]"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {connectingStripe ? 'Connecting...' : 'Connect Stripe'}
                </Button>
                <p className="text-xs">
                  Without Stripe, your tournament will be saved as a draft. You can connect Stripe later.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Dev Mode Toggle */}
          {!stripeConnected && (
            <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
              <Switch
                id="skip-stripe"
                checked={skipStripe}
                onCheckedChange={onSkipStripeChange}
              />
              <Label htmlFor="skip-stripe" className="flex flex-col cursor-pointer">
                <span className="font-medium">Skip Stripe (Dev Mode)</span>
                <span className="text-xs text-muted-foreground">
                  Create tournament as "open" without requiring Stripe connection
                </span>
              </Label>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-medium">Alternative Payment Methods</h4>
            <p className="text-sm text-muted-foreground">
              Provide alternative ways for teams to pay (Venmo, PayPal, cash, etc.)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="venmo_username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venmo Username</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} className="min-h-[44px]" />
                    </FormControl>
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
                      <Input type="email" placeholder="you@example.com" {...field} className="min-h-[44px]" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cashapp_info"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash App</FormLabel>
                    <FormControl>
                      <Input placeholder="$CashTag" {...field} className="min-h-[44px]" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bank_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Transfer</FormLabel>
                    <FormControl>
                      <Input placeholder="Bank account info" {...field} className="min-h-[44px]" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="other_payment_methods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Other Payment Methods</FormLabel>
                  <FormControl>
                    <Input placeholder="Check, cash, etc." {...field} className="min-h-[44px]" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Include any special instructions for how teams should pay..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    These instructions will be shown to teams after registration
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}
