import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import blockNationLogo from '@/assets/block-nation-logo.png';

interface LoadingSkeletonProps {
  count?: number;
  type?: 'tournament' | 'card' | 'list';
  className?: string;
}

const LoadingSkeleton = ({ count = 3, type = 'tournament', className = '' }: LoadingSkeletonProps) => {
  if (type === 'tournament') {
    return (
      <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {[...Array(count)].map((_, i) => (
          <Card key={i} className="animate-pulse shadow-card">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-9 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border animate-pulse">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="animate-pulse shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

export const EmptyState = ({ title, description, actionLabel, actionHref, icon }: EmptyStateProps) => (
  <Card className="shadow-card border-dashed">
    <CardContent className="py-16 text-center">
      <div className="flex justify-center mb-4">
        <div className="relative">
          {icon ? (
            <div className="bg-muted rounded-full p-6 animate-fade-in">
              {icon}
            </div>
          ) : (
            <img 
              src={blockNationLogo} 
              alt="Block Nation" 
              className="h-20 w-20 opacity-30" 
            />
          )}
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-8 max-w-sm mx-auto">{description}</p>
      {actionLabel && actionHref && (
        <Link to={actionHref}>
          <Button size="lg" className="gradient-primary hover:opacity-90">
            {actionLabel}
          </Button>
        </Link>
      )}
    </CardContent>
  </Card>
);

export default LoadingSkeleton;