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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-elegant relative">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Background logo */}
          <div className="absolute top-2 right-4 opacity-5 pointer-events-none z-0">
            <img src={blockNationLogo} alt="" className="h-20 w-20 transform rotate-12" />
          </div>
          <div className="flex items-center space-x-4">
            {isMobile && <MobileMenu />}
            <Link to="/" className="flex items-center space-x-3 hover-scale">
              <img src={blockNationLogo} alt="Block Nation" className="h-10 w-10" />
              <span className="text-xl font-bold gradient-hero bg-clip-text text-transparent">
                Block Nation
              </span>
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
          
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <Bell className="h-4 w-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 px-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {!isMobile && (
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{profile?.username || 'User'}</span>
                          <span className="text-xs text-muted-foreground capitalize">{profile?.role || 'player'}</span>
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
                <Button className="gradient-primary hover:opacity-90 transition-opacity">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      
      <main className={`${isMobile ? 'pb-20' : ''}`}>
        {children}
      </main>
      
      <MobileNavigation />
    </div>
  );
};

export default Layout;