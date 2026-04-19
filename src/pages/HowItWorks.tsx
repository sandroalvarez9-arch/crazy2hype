import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, ClipboardCheck, Trophy, Smartphone } from 'lucide-react';

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-glow opacity-60 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-white/10 text-xs font-medium text-accent mb-6">
            <span className="size-2 rounded-full bg-accent" />
            How it works
          </div>
          <h1 className="font-display font-extrabold text-5xl md:text-7xl tracking-tighter leading-[0.95]">
            From browsing to playing — in three steps.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            Block Nation is built so first-time players never feel lost. Here is what the path looks
            like, whether you are joining a tournament or running one.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-12 grid gap-4 md:grid-cols-3">
        <Card
          n="01"
          icon={<Search className="h-5 w-5" />}
          title="Browse tournaments"
          body="Filter by city, date, and skill level. Open any event page without an account to see schedule, format, and venue."
        />
        <Card
          n="02"
          icon={<ClipboardCheck className="h-5 w-5" />}
          title="Register your team"
          body="A short wizard collects team basics, captain info, players, and payment. Most teams finish in under 5 minutes."
        />
        <Card
          n="03"
          icon={<Trophy className="h-5 w-5" />}
          title="Play & follow live"
          body="On tournament day, follow live brackets, scores, and court assignments — straight from your phone."
        />
      </section>

      <section className="max-w-5xl mx-auto px-4 md:px-6 py-12">
        <div className="bg-surface-raised border border-white/5 rounded-3xl p-6 md:p-10">
          <div className="flex items-center gap-3 mb-3">
            <Smartphone className="h-5 w-5 text-accent" />
            <span className="text-xs uppercase tracking-widest font-semibold text-accent">For hosts</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight">
            Hosting works the same — guided, fast, no spreadsheets.
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Walk through tournament basics, format and rules, logistics, and payments. We handle
            registrations, brackets, and live scoring so you can focus on the day.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => navigate('/host')}
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold uppercase tracking-wide rounded-full px-6"
            >
              Start hosting
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/tournaments')}
              className="rounded-full"
            >
              See live tournaments
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

const Card = ({ n, icon, title, body }: { n: string; icon: React.ReactNode; title: string; body: string }) => (
  <div className="bg-surface-raised border border-white/5 rounded-2xl p-6 hover:border-white/20 transition-colors">
    <div className="flex items-center justify-between mb-4">
      <div className="font-display font-extrabold text-2xl text-primary tabular-nums">{n}</div>
      <span className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </span>
    </div>
    <div className="font-display font-bold text-lg">{title}</div>
    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{body}</p>
  </div>
);

export default HowItWorks;
