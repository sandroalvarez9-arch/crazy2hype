import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

interface UseAsyncReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
  retry: () => Promise<T | null>;
}

export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T> {
  const { toast } = useToast();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastArgs, setLastArgs] = useState<any[]>([]);

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true);
      setError(null);
      setLastArgs(args);

      try {
        const result = await asyncFunction(...args);
        setData(result);
        
        if (options.successMessage) {
          toast({
            title: "Success",
            description: options.successMessage,
          });
        }
        
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred');
        setError(error);
        
        toast({
          title: "Error",
          description: options.errorMessage || error.message,
          variant: "destructive",
        });
        
        options.onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction, options, toast]
  );

  const retry = useCallback(() => {
    return execute(...lastArgs);
  }, [execute, lastArgs]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset, retry };
}
