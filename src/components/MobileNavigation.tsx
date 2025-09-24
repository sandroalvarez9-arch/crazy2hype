import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Plus, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import blockNationLogo from '@/assets/block-nation-logo.png';

const MobileNavigation = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  if (!user || !isMobile) return null;

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Trophy, label: 'Tournaments', path: '/tournaments' },
    { icon: Plus, label: 'Create', path: '/create-tournament' },
    { icon: Calendar, label: 'My Events', path: '/my-tournaments' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 border-t border-border shadow-elegant">
      <div className="flex justify-center py-1">
        <img src={blockNationLogo} alt="Block Nation" className="h-6 w-6 opacity-50" />
      </div>
      <nav className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNavigation;