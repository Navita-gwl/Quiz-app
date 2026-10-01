import { clsx } from 'clsx';
import type { QuizSettings } from './types';

interface ProgressBarProps {
  settings: QuizSettings;
  answeredCount: number;
  totalQuestions: number;
  progress: number;
}

export function PremiumProgressBar({ settings, answeredCount, totalQuestions, progress }: ProgressBarProps) {
  const primaryColor = settings.quizPrimaryColor || '#111827';
  const fontFam = settings.quizFontFamily || 'inherit';

  // Segmented progress design for SaaS look
  const segments = Array.from({ length: totalQuestions }, (_, i) => i);

  return (
    <div className="gwl-premium-progress-container mb-10 w-full mx-auto max-w-2xl px-2">
      <div className="flex justify-between items-center mb-3 text-[12px] font-bold tracking-widest uppercase text-gray-400" style={{ fontFamily: fontFam }}>
         <span>Progress</span>
         <span className="text-gray-900">{progress}%</span>
      </div>
      <div className="flex gap-1.5 w-full h-1.5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        {segments.map((stepIndex) => {
          const isCompleted = stepIndex < answeredCount;
          
          return (
            <div 
              key={stepIndex} 
              className="flex-1 overflow-hidden transition-all duration-500 bg-gray-100"
              style={{ borderRadius: settings.quizBorderRadius || '4px' }}
            >
              <div 
                className={clsx(
                  "h-full transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                  isCompleted ? "w-full opacity-100" : "w-0 opacity-0"
                )}
                style={{
                  backgroundColor: primaryColor,
                  borderRadius: settings.quizBorderRadius || '4px'
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
