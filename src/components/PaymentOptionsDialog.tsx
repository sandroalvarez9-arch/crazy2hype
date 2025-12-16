import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Clock, DollarSign, Mail, Building2, Smartphone, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentOptionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  entryFee: number;
  paymentInfo?: {
    instructions?: string | null;
    venmo?: string | null;
    paypal?: string | null;
    bank?: string | null;
    cashapp?: string | null;
    other?: string | null;
  };
  onComplete: () => void;
}

export function PaymentOptionsDialog({
  isOpen,
  onOpenChange,
  tournamentId,
  entryFee,
  paymentInfo,
  onComplete,
}: PaymentOptionsDialogProps) {
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);
  const [showPayLater, setShowPayLater] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const hasAlternativePaymentMethods = 
    paymentInfo?.venmo || 
    paymentInfo?.paypal || 
    paymentInfo?.bank || 
    paymentInfo?.cashapp || 
    paymentInfo?.other ||
    paymentInfo?.instructions;

  const handlePayNow = async () => {
    try {
      setPaying(true);
      setStripeError(null);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { tournamentId },
      });

      if (error) {
        throw error;
      }

      const response = data as { url?: string; error?: string; code?: string };

      if (response?.error) {
        // Handle specific error codes
        if (response.code === 'ORGANIZER_NO_STRIPE') {
          setStripeError('The tournament organizer has not set up online payments yet.');
          setShowPayLater(true);
          return;
        }
        throw new Error(response.error);
      }

      if (response?.url) {
        window.open(response.url, '_blank');
        onComplete();
        onOpenChange(false);
      } else {
        throw new Error('No payment URL received');
      }
    } catch (e: any) {
      console.error('Payment error:', e);
      const errorMessage = e?.message || 'Failed to initiate payment';
      
      // Check for common Stripe Connect errors
      if (errorMessage.includes('Stripe') || errorMessage.includes('organizer')) {
        setStripeError(errorMessage);
        setShowPayLater(true);
      } else {
        toast({
          title: 'Payment Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setPaying(false);
    }
  };

  const handlePayLater = () => {
    toast({
      title: 'Registration Complete',
      description: 'Remember to complete your payment using the alternative methods below.',
    });
    onComplete();
    onOpenChange(false);
  };

  if (showPayLater || stripeError) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Online Payment Unavailable
            </DialogTitle>
            <DialogDescription>
              {stripeError || 'Online payment is not available for this tournament.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Your team has been registered! Please use one of the alternative payment methods below.
              </AlertDescription>
            </Alert>

            {hasAlternativePaymentMethods ? (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Alternative Payment Methods:</h4>
                
                {paymentInfo?.instructions && (
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{paymentInfo.instructions}</p>
                  </div>
                )}
                
                {paymentInfo?.venmo && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      <strong>Venmo:</strong> {paymentInfo.venmo}
                    </span>
                  </div>
                )}
                
                {paymentInfo?.paypal && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      <strong>PayPal:</strong> {paymentInfo.paypal}
                    </span>
                  </div>
                )}
                
                {paymentInfo?.bank && (
                  <div className="p-2 bg-muted rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <strong className="text-sm">Bank Transfer:</strong>
                    </div>
                    <p className="text-sm whitespace-pre-wrap pl-6">{paymentInfo.bank}</p>
                  </div>
                )}
                
                {paymentInfo?.cashapp && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      <strong>CashApp:</strong> {paymentInfo.cashapp}
                    </span>
                  </div>
                )}
                
                {paymentInfo?.other && (
                  <div className="p-2 bg-muted rounded">
                    <strong className="text-sm">Other:</strong>
                    <p className="text-sm whitespace-pre-wrap mt-1">{paymentInfo.other}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Contact the tournament organizer for payment instructions.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handlePayLater} className="w-full min-h-[44px]">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Complete Your Payment
          </DialogTitle>
          <DialogDescription>
            Your team has been registered! Choose how you'd like to pay.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center mb-6">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Entry Fee: ${entryFee}
            </Badge>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handlePayNow}
              disabled={paying}
              className="w-full min-h-[48px] gradient-primary hover:opacity-90"
            >
              {paying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Now with Card
                </>
              )}
            </Button>

            {hasAlternativePaymentMethods && (
              <Button
                onClick={() => setShowPayLater(true)}
                variant="outline"
                className="w-full min-h-[48px]"
              >
                <Clock className="mr-2 h-4 w-4" />
                Pay Later (View Payment Options)
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2">
          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Stripe. You'll be redirected to complete payment.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
