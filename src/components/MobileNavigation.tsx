import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Plus, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const MobileNavigation = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  if (!user || !isMobile) return null;

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Trophy, label: 'Browse', path: '/tournaments' },
    { icon: Plus, label: 'Host', path: '/create-tournament', highlight: true },
    { icon: Calendar, label: 'Mine', path: '/my-tournaments' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-white/5">
      <nav className="flex items-end justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
          if (item.highlight) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="-mt-6 flex flex-col items-center justify-center"
                aria-label={item.label}
              >
                <span className="size-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lime">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors min-h-[44px]',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5 mb-1', isActive && 'text-primary')} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNavigation;
