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

export function PremiumNavigation({
  settings,
  handlePrev,
  handleNext,
  isFirstStep,
  isLastPage,
  isSubmitting,
  questionsPerPage,
}: NavigationProps) {
  const fontFam = settings.quizFontFamily || 'inherit';

  // Significantly distinct from normal navigation: thicker heights, robust padding.
  const navBtnSizing = {
    small: { height: '44px', minWidth: '120px', padding: '0 20px', fontSize: '14px' },
    medium: { height: '52px', minWidth: '140px', padding: '0 28px', fontSize: '15px' },
    large: { height: '60px', minWidth: '160px', padding: '0 32px', fontSize: '16px' }
  };
  
  const navSizeKey = settings.navigationButtonSize || 'medium';
  const navSizing = navBtnSizing[navSizeKey as keyof typeof navBtnSizing] || navBtnSizing.medium;
  const borderRadius = settings.quizBorderRadius || '12px';
  const primaryColor = settings.quizPrimaryColor || '#111827';
  const buttonTextColor = settings.buttonTextColor || '#ffffff';

  const btnStyle = {
    backgroundColor: primaryColor,
    color: buttonTextColor,
    borderRadius: borderRadius,
    padding: navSizing.padding,
    height: navSizing.height,
    minWidth: navSizing.minWidth,
    fontSize: navSizing.fontSize,
    fontFamily: fontFam,
  };

  return (
    <div className="gwl-premium-nav flex justify-between items-center mx-auto mt-2 w-full gap-4 pb-4">
      <button
        type="button"
        onClick={handlePrev}
        disabled={isFirstStep}
        className={clsx(
          'justify-center flex items-center text-center gap-2 font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 bg-transparent border-0',
          isFirstStep 
            ? 'opacity-0 pointer-events-none' 
            : 'text-gray-400 hover:text-gray-900 hover:-translate-x-1'
        )}
        style={{
          height: navSizing.height,
          padding: '0 12px',
          fontSize: navSizing.fontSize,
          fontFamily: fontFam,
        }}
        aria-hidden={isFirstStep}
      >
        <ArrowLeft size={18} strokeWidth={2.5} />
        {questionsPerPage === 1 ? 'Previous' : 'Back'}
      </button>

      <button
        type="button"
        onClick={handleNext}
        disabled={isSubmitting}
        className="justify-center flex items-center text-center gap-2.5 font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        style={btnStyle}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            {isLastPage ? (settings.submitButtonText || 'Submit Answers') : 'Continue'}
            {!isLastPage && <ArrowRight size={18} strokeWidth={2.5} />}
          </>
        )}
      </button>
    </div>
  );
}
