import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, Settings } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import MobileNavigation from './MobileNavigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CleanLogoBackground from './CleanLogoBackground';
import blockNationLogo from '@/assets/block-nation-logo.png';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, profile, signOut } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Tournaments', path: '/tournaments' },
    { label: 'Create Tournament', path: '/create-tournament' },
    { label: 'My Tournaments', path: '/my-tournaments' },
  ];

  const MobileMenu = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Navigation</h2>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="min-h-screen bg-background relative">
      {/* Clean logo background */}
      <CleanLogoBackground />
      
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-elegant relative">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
            {isMobile && <MobileMenu />}
            <Link to="/" className="flex items-center space-x-2 md:space-x-4 hover-scale min-w-0">
              <img src={blockNationLogo} alt="Block Nation" className="h-10 w-10 md:h-16 md:w-16 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-lg md:text-3xl font-bold gradient-hero bg-clip-text text-transparent truncate">
                  Block Nation
                </span>
                <span className="text-xs md:text-sm text-muted-foreground font-medium hidden sm:block">
                  Elite Volleyball Platform
                </span>
              </div>
            </Link>
          </div>
          
          {user && !isMobile && (
            <nav className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
          
          <div className="flex items-center space-x-1 md:space-x-3 shrink-0">
            {user ? (
              <>
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <Bell className="h-4 w-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 px-1 md:px-2 min-w-0">
                      <Avatar className="h-7 w-7 md:h-8 md:w-8 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {!isMobile && (
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-sm font-medium truncate">{profile?.username || 'User'}</span>
                          <span className="text-xs text-muted-foreground capitalize truncate">{profile?.role || 'player'}</span>
                        </div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover border border-border">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut} className="text-destructive">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button size={isMobile ? "sm" : "default"} className="gradient-primary hover:opacity-90 transition-opacity text-xs md:text-sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      
      <main className={`relative z-10 ${isMobile ? 'pb-20' : ''}`}>
        {children}
      </main>
      
      <MobileNavigation />
    </div>
  );
};

export default Layout;