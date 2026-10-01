import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { QuizSettings } from './types';

interface NavigationProps {
  settings: QuizSettings;
  handlePrev: () => void;
  handleNext: () => void;
  isFirstStep: boolean;
  isLastPage: boolean;
  isSubmitting: boolean;
  questionsPerPage: number;
}

export function Navigation({
  settings,
  handlePrev,
  handleNext,
  isFirstStep,
  isLastPage,
  isSubmitting,
  questionsPerPage,
}: NavigationProps) {
  const navBtnSizing = {
    small: { height: '40px', minWidth: '120px', padding: '0 20px', fontSize: '14px' },
    medium: { height: '48px', minWidth: '140px', padding: '0 24px', fontSize: '16px' },
    large: { height: '56px', minWidth: '160px', padding: '0 28px', fontSize: '18px' }
  };
  
  const navSizeKey = settings.navigationButtonSize || 'small';
  const navSizing = navBtnSizing[navSizeKey as keyof typeof navBtnSizing] || navBtnSizing.small;

  const btnStyle = {
    backgroundColor: settings.quizPrimaryColor || '#111827',
    color: settings.buttonTextColor || '#ffffff',
    borderRadius: settings.quizBorderRadius || '10px',
    padding: navSizing.padding,
    height: navSizing.height,
    minWidth: navSizing.minWidth,
    fontSize: navSizing.fontSize,
  };

  const prevBtnStyle = {
    backgroundColor: 'transparent',
    color: settings.quizPrimaryColor || '#111827',
    border: `2px solid ${settings.quizPrimaryColor || '#111827'}`,
    borderRadius: settings.quizBorderRadius || '10px',
    padding: navSizing.padding,
    height: navSizing.height,
    minWidth: navSizing.minWidth,
    fontSize: navSizing.fontSize,
  };

  return (
    <div className="gwl-quiz-nav flex justify-between mx-auto mt-6 w-full gap-4">
      <button
        type="button"
        onClick={handlePrev}
        disabled={isFirstStep}
        className={clsx(
          'gwl-quiz-button gwl-quiz-prev-btn justify-center flex items-center text-center gap-2 font-bold transition-all duration-200',
          isFirstStep ? 'opacity-60 cursor-not-allowed' : 'active:scale-95 hover:brightness-105'
        )}
        style={prevBtnStyle}
      >
        <ArrowLeft size={18} />
        {questionsPerPage === 1 ? 'Previous' : 'Back'}
      </button>

      <button
        type="button"
        onClick={handleNext}
        disabled={isSubmitting}
        className="gwl-quiz-button gwl-quiz-next-btn justify-center flex items-center text-center gap-2 font-bold transition-all duration-200 active:scale-95 hover:brightness-105 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        style={btnStyle}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            {isLastPage ? (settings.submitButtonText || 'Submit Answers') : 'Next'}
            {!isLastPage && <ArrowRight size={18} />}
          </>
        )}
      </button>
    </div>
  );
}
