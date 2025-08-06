import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">
            VolleyTournament
          </Link>
          
          {user && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/tournaments" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/tournaments' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Tournaments
              </Link>
              <Link 
                to="/create-tournament" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/create-tournament' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Create Tournament
              </Link>
              <Link 
                to="/my-tournaments" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/my-tournaments' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                My Tournaments
              </Link>
            </nav>
          )}
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.email}
                </span>
                <Button variant="outline" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      
      <main>{children}</main>
    </div>
  );
};

export default Layout;