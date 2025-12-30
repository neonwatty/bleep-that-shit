'use client';

interface Step {
  id: string;
  label: string;
  shortLabel?: string;
  enabled: boolean;
  icon?: string;
}

interface MobileStepIndicatorProps {
  steps: Step[];
  activeStepId: string;
  onStepChange: (stepId: string) => void;
  completedStepIds?: string[];
}

export function MobileStepIndicator({
  steps,
  activeStepId,
  onStepChange,
  completedStepIds = [],
}: MobileStepIndicatorProps) {
  const activeIndex = steps.findIndex((s) => s.id === activeStepId);

  return (
    <div className="w-full px-2">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === activeStepId;
          const isCompleted = completedStepIds.includes(step.id);
          const isEnabled = step.enabled;
          const isPast = index < activeIndex;

          // Determine the visual state
          const showCheckmark = isCompleted || (isPast && isEnabled);

          return (
            <div key={step.id} className="flex flex-1 items-center">
              {/* Step circle and label */}
              <button
                type="button"
                onClick={() => isEnabled && onStepChange(step.id)}
                disabled={!isEnabled}
                className={`flex flex-col items-center ${
                  isEnabled ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.label}${!isEnabled ? ' (locked)' : ''}`}
              >
                {/* Circle */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-200'
                      : showCheckmark
                        ? 'border-green-500 bg-green-500 text-white'
                        : isEnabled
                          ? 'border-gray-300 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50'
                          : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                >
                  {showCheckmark && !isActive ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : !isEnabled ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Label */}
                <span
                  className={`mt-1.5 text-center text-xs font-medium leading-tight ${
                    isActive
                      ? 'text-indigo-700'
                      : showCheckmark
                        ? 'text-green-700'
                        : isEnabled
                          ? 'text-gray-600'
                          : 'text-gray-400'
                  }`}
                  style={{ maxWidth: '80px' }}
                >
                  {step.shortLabel || step.label}
                </span>
              </button>

              {/* Connector line (not after last step) */}
              {index < steps.length - 1 && (
                <div className="relative mx-1 h-0.5 flex-1">
                  {/* Background line */}
                  <div className="absolute inset-0 bg-gray-200" />
                  {/* Progress line */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                      index < activeIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    style={{ width: index < activeIndex ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
