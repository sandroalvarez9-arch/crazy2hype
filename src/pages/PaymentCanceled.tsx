import { useEffect } from 'react';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PaymentCanceled = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Payment Canceled | Tournament Payments';
  }, []);

  return (
    <main className="container mx-auto px-4 py-12">
      <section className="max-w-lg mx-auto text-center space-y-6">
        <XCircle className="h-16 w-16 text-destructive mx-auto" aria-hidden="true" />
        <h1 className="text-3xl font-bold">Payment Canceled</h1>
        <p className="text-muted-foreground">
          Your payment was canceled. You can try again anytime from the tournament page.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate('/tournaments')}>Back to Tournaments</Button>
          <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </section>
    </main>
  );
};

export default PaymentCanceled;
