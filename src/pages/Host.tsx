import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarRange, Users, CreditCard, Activity, ShieldCheck, Sparkles } from 'lucide-react';

const Host = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const startHosting = () => {
    if (user) navigate('/create-tournament');
    else navigate('/auth?redirect=/create-tournament');
  };

  return (
    <div className="bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-glow opacity-70 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-xs font-bold uppercase tracking-widest text-accent mb-6">
            <Sparkles className="h-3 w-3" />
            For tournament directors
          </div>
          <h1 className="font-display font-extrabold text-5xl md:text-7xl tracking-tighter leading-[0.95] max-w-4xl">
            Host a tournament without the headaches.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
            Create a polished event page, take registrations and payments online, generate brackets
            automatically, and run scoring in real time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={startHosting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold uppercase tracking-wide rounded-full px-7 py-6 text-base"
            >
              Start hosting
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/tournaments')}
              className="rounded-full px-7 py-6 text-base"
            >
              See examples
            </Button>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-12 grid gap-4 md:grid-cols-3">
        <Feature
          icon={<CalendarRange className="h-5 w-5" />}
          title="Guided setup"
          body="A four-step wizard walks you through basics, format, logistics, and payments. Save drafts and publish when ready."
        />
        <Feature
          icon={<Users className="h-5 w-5" />}
          title="Team registration"
          body="Players sign up themselves with a fast wizard. Captain info, roster, waivers — collected and organized."
        />
        <Feature
          icon={<CreditCard className="h-5 w-5" />}
          title="Online payments"
          body="Connect Stripe and accept entry fees online. Track manual payments and refunds in one place."
        />
        <Feature
          icon={<Activity className="h-5 w-5" />}
          title="Live brackets & scoring"
          body="Pool play and playoff brackets generate automatically. Update scores from any phone, courtside."
        />
        <Feature
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Public event page"
          body="Every tournament gets a polished public link players and spectators can follow without signing in."
        />
        <Feature
          icon={<Sparkles className="h-5 w-5" />}
          title="Built for the day-of"
          body="A dedicated dashboard surfaces what matters during the tournament — check-ins, courts, next matches."
        />
      </section>

      {/* CTA band */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="relative overflow-hidden rounded-3xl gradient-host p-8 md:p-14 text-center">
            <div className="absolute -right-20 -top-20 w-72 h-72 bg-accent/30 blur-3xl rounded-full pointer-events-none" />
            <h2 className="relative font-display font-extrabold text-3xl md:text-5xl tracking-tighter text-white uppercase max-w-2xl mx-auto">
              Ready to run your event?
            </h2>
            <p className="relative mt-4 text-white/85 max-w-xl mx-auto">
              Setup takes about 10 minutes. You can save a draft and publish when registration opens.
            </p>
            <Button
              size="lg"
              onClick={startHosting}
              className="relative mt-8 bg-background text-foreground hover:bg-background/90 font-display font-bold uppercase tracking-wide rounded-full px-7 py-6 text-base"
            >
              {user ? 'Create tournament' : 'Sign in to start'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

const Feature = ({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) => (
  <div className="bg-surface-raised border border-white/5 rounded-2xl p-6 hover:border-white/20 transition-colors">
    <span className="inline-flex size-10 rounded-xl bg-primary/10 text-primary items-center justify-center mb-4">
      {icon}
    </span>
    <div className="font-display font-bold text-lg">{title}</div>
    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{body}</p>
  </div>
);

export default Host;
