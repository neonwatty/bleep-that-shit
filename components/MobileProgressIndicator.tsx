'use client';

interface MobileProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    title: string;
    completed: boolean;
    active: boolean;
  }>;
}

export function MobileProgressIndicator({
  currentStep,
  totalSteps,
  steps,
}: MobileProgressIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="sticky top-14 z-40 border-b bg-white/95 backdrop-blur-sm md:hidden">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step Indicator */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-500">Step {currentStep}</span>
            <span className="text-xs text-gray-400">of {totalSteps}</span>
          </div>
          <div className="text-xs font-bold text-gray-900">
            {steps[currentStep - 1]?.title || ''}
          </div>
        </div>

        {/* Mobile Step Dots */}
        <div className="mt-2 flex items-center justify-center space-x-1">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-all ${
                step.completed
                  ? 'w-2 bg-green-500'
                  : step.active
                    ? 'w-6 bg-blue-500'
                    : 'w-2 bg-gray-300'
              }`}
              title={step.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Floating Action Button for primary action
export function FloatingActionButton({
  onClick,
  disabled,
  children,
  variant = 'primary',
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const variantStyles = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg',
    secondary: 'bg-white text-gray-900 shadow-md border border-gray-200',
  };

  return (
    <div className="fixed right-4 bottom-20 z-50 md:hidden">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`rounded-full px-6 py-3 font-bold ${variantStyles[variant]} flex transform items-center space-x-2 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {children}
      </button>
    </div>
  );
}
