import type { QuizSettings } from './types';

interface ProgressBarProps {
  settings: QuizSettings;
  answeredCount: number;
  totalQuestions: number;
  progress: number;
}

export function ProgressBar({ settings, answeredCount, totalQuestions, progress }: ProgressBarProps) {
  const primaryColor = settings.quizPrimaryColor || '#000000';

  return (
    <div className="gwl-quiz-progress-container mb-8 mx-auto" style={{ borderRadius: settings.quizBorderRadius || '10px' }}>
      <div className="gwl-quiz-progress-text flex justify-between text-sm mb-2 font-semibold opacity-60" style={{ color: settings.quizTextColor || '#111111', fontFamily: settings.quizFontFamily || 'inherit' }}>
        <span>{answeredCount} of {totalQuestions} answered</span>
        <span>{progress}%</span>
      </div>
      <div className="gwl-quiz-progress-bg h-2 w-full bg-gray-200 rounded-full overflow-hidden" style={{ borderRadius: settings.quizBorderRadius || '10px' }}>
        <div
          className="gwl-quiz-progress-bar h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: primaryColor,
            borderRadius: settings.quizBorderRadius || '10px',
          }}
        />
      </div>
    </div>
  );
}
