import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                  index < currentStep
                    ? 'bg-green-500 text-white shadow-md'
                    : index === currentStep
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg scale-110'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5 stroke-[3]" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-2 text-center hidden sm:block transition-colors',
                  index < currentStep 
                    ? 'text-green-600 font-semibold' 
                    : index === currentStep 
                    ? 'text-foreground font-semibold' 
                    : 'text-muted-foreground'
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-1 flex-1 mx-2 rounded-full transition-all duration-300',
                  index < currentStep ? 'bg-green-500' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
