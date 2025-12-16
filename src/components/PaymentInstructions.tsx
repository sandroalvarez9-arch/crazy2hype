import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, DollarSign, Building2, Mail, Smartphone, AlertCircle } from 'lucide-react';

interface PaymentInstructionsProps {
  entryFee: number;
  paymentInstructions?: string | null;
  venmoUsername?: string | null;
  paypalEmail?: string | null;
  bankDetails?: string | null;
  cashappInfo?: string | null;
  otherPaymentMethods?: string | null;
  showOnlineUnavailable?: boolean;
}

const PaymentInstructions = ({
  entryFee,
  paymentInstructions,
  venmoUsername,
  paypalEmail,
  bankDetails,
  cashappInfo,
  otherPaymentMethods,
  showOnlineUnavailable = false
}: PaymentInstructionsProps) => {
  if (entryFee <= 0) return null;

  const hasPaymentMethods = venmoUsername || paypalEmail || bankDetails || cashappInfo || otherPaymentMethods;

  return (
    <Card className="border-accent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-primary" />
          Payment Information
        </CardTitle>
        <CardDescription>
          <Badge variant="secondary" className="font-semibold">
            Entry Fee: ${entryFee}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showOnlineUnavailable && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Online card payment is not available for this tournament. Please use one of the alternative payment methods below.
            </AlertDescription>
          </Alert>
        )}

        {paymentInstructions && (
          <div className="p-3 bg-accent rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{paymentInstructions}</p>
          </div>
        )}
        
        {hasPaymentMethods && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Payment Methods:</h4>
            
            {venmoUsername && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  <strong>Venmo:</strong> {venmoUsername}
                </span>
              </div>
            )}
            
            {paypalEmail && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  <strong>PayPal:</strong> {paypalEmail}
                </span>
              </div>
            )}
            
            {bankDetails && (
              <div className="p-2 bg-muted rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <strong className="text-sm">Bank Transfer:</strong>
                </div>
                <p className="text-sm whitespace-pre-wrap pl-6">{bankDetails}</p>
              </div>
            )}
            
            {cashappInfo && (
              <div className="p-2 bg-muted rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <strong className="text-sm">CashApp:</strong>
                </div>
                <p className="text-sm whitespace-pre-wrap pl-6">{cashappInfo}</p>
              </div>
            )}
            
            {otherPaymentMethods && (
              <div className="p-2 bg-muted rounded">
                <strong className="text-sm">Other Payment Options:</strong>
                <p className="text-sm whitespace-pre-wrap mt-1">{otherPaymentMethods}</p>
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground border-t pt-3">
          Please complete payment after registration. Your team's payment status will be updated by the organizer.
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentInstructions;