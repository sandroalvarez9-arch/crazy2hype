import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import MobileNavigation from './MobileNavigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, profile, signOut } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Public, player-first nav. "Host" routes vary based on auth state.
  const navItems = [
    { label: 'Tournaments', path: '/tournaments' },
    { label: 'How it works', path: '/how-it-works' },
    { label: 'Host', path: '/host' },
  ];

  const isActivePath = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <span className="logo-mark text-lg md:text-xl">
              <span>B</span>
            </span>
            <span className="font-display font-extrabold tracking-tight text-base md:text-xl uppercase">
              Block<span className="text-muted-foreground group-hover:text-primary transition-colors">Nation</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`transition-colors ${
                    isActivePath(item.path)
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right cluster */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Mobile menu trigger */}
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-surface-raised border-white/10 p-0">
                  <div className="p-6 border-b border-white/5">
                    <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                      <span className="logo-mark"><span>B</span></span>
                      <span className="font-display font-extrabold tracking-tight uppercase">
                        Block<span className="text-muted-foreground">Nation</span>
                      </span>
                    </Link>
                  </div>
                  <nav className="p-3">
                    {navItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                          isActivePath(item.path)
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            )}

            {user ? (
              <>
                {!isMobile && (
                  <Button variant="ghost" size="icon" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size={isMobile ? 'sm' : 'default'}
                  onClick={() => navigate('/create-tournament')}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold uppercase tracking-wide rounded-full px-4 md:px-5"
                >
                  Host
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full" aria-label="Profile menu">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-surface-raised border-white/10">
                    <div className="px-3 py-2">
                      <div className="text-sm font-medium truncate">{profile?.username || 'Player'}</div>
                      <div className="text-xs text-muted-foreground capitalize truncate">{profile?.role || 'player'}</div>
                    </div>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem asChild>
                      <Link to="/my-tournaments" className="flex items-center gap-2 cursor-pointer">
                        <UserIcon className="h-4 w-4" />
                        My tournaments
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" />
                        Profile settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/auth" className="hidden md:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </Link>
                <Button
                  size={isMobile ? 'sm' : 'default'}
                  onClick={() => navigate('/host')}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 font-display font-bold uppercase tracking-wide rounded-full px-4 md:px-5"
                >
                  Host
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 ${isMobile && user ? 'pb-20' : ''}`}>
        {children}
      </main>

      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-display font-extrabold tracking-tight uppercase text-sm">
              Block<span className="text-foreground/50">Nation</span>
            </span>
            <span className="text-xs">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-xs font-medium text-muted-foreground">
            <Link to="/tournaments" className="hover:text-foreground transition-colors">Tournaments</Link>
            <Link to="/how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
            <Link to="/host" className="hover:text-foreground transition-colors">Host</Link>
          </div>
        </div>
      </footer>

      <MobileNavigation />
    </div>
  );
};

export default Layout;
