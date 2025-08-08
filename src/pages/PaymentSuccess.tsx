import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Payment Success | Tournament Payments';
  }, []);

  return (
    <main className="container mx-auto px-4 py-12">
      <section className="max-w-lg mx-auto text-center space-y-6">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto" aria-hidden="true" />
        <h1 className="text-3xl font-bold">Payment Successful</h1>
        <p className="text-muted-foreground">
          Thanks for your payment. Your tournament entry fee has been processed. You can return to the tournament page anytime.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate('/tournaments')}>Browse Tournaments</Button>
          <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </section>
    </main>
  );
};

export default PaymentSuccess;
