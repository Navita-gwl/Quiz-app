import { useState, useEffect, useRef } from 'react';
import type { QuizData } from './types';
import { PremiumFormStep } from './PremiumFormStep';
import { PremiumQuestionCard } from './PremiumQuestionCard';
import { getImageCardSizeValue } from '../../utils/quizImageOptions';
import { PremiumProgressBar } from './PremiumProgressBar';
import { PremiumNavigation } from './PremiumNavigation';
import { PremiumResultsStep } from './PremiumResultsStep';
import { twMerge } from 'tailwind-merge';
import { ensureGoogleFontsLoaded } from '../../utils/quizFonts';
import { buildScopedQuizCss } from '../../utils/customScripts';
import { readJsonErrorMessage, toUserFacingError, GENERIC_ERROR_MESSAGE } from '../../utils/userFacingErrors';

interface QuizProps {
  initialData: QuizData;
  submitUrl: string;
  shop: string;
  checkEmailUrl: string;
  storefrontOrigin?: string;
  quizId?: string;
  /** Base URL of the quiz app — loads /quiz.css for storefront-parity styling (Option B headless) */
  assetsBaseUrl?: string;
}

export function Quiz({ initialData, submitUrl, shop, checkEmailUrl, storefrontOrigin, quizId, assetsBaseUrl }: QuizProps) {
  const { questions, settings } = initialData;
  const [step, setStep] = useState<'form' | 'questions' | 'results'>('form');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settings.customJs) return;

    try {
      const container = containerRef.current;
      if (!container) return;

      const existingScript = container.querySelector("#gwl-quiz-custom-js");
      if (existingScript) existingScript.remove();

      setTimeout(() => {
        const script = document.createElement("script");
        script.id = "gwl-quiz-custom-js";
        script.textContent = settings.customJs || "";
        container.appendChild(script);
      }, 50);
    } catch (error) {
      console.error("Custom JS Error:", error);
    }
  }, [settings.customJs, step, currentStepIndex]);

  useEffect(() => {
    ensureGoogleFontsLoaded(settings.formFontFamily, settings.quizFontFamily);
  }, [settings.formFontFamily, settings.quizFontFamily]);

  const [slideKey, setSlideKey] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');
  const [slideVisible, setSlideVisible] = useState(true);

  const animateSlide = (direction: 'left' | 'right', nextIndex: number) => {
    setSlideDir(direction);
    setSlideVisible(false);
    setTimeout(() => {
      setCurrentStepIndex(nextIndex);
      setSlideKey((k) => k + 1);
      setSlideVisible(true);
    }, 180);
  };

  const handleStart = (info: { name: string; email: string }) => {
    setCustomerInfo(info);
    setStep('questions');
  };

  const displayMode = settings.quizDisplayMode || 'step';
  let questionsPerPage = 1;
  if (displayMode === 'all') {
    questionsPerPage = Math.max(1, questions.length);
  } else if (displayMode === '2') {
    questionsPerPage = 2;
  } else if (displayMode === '3') {
    questionsPerPage = 3;
  }

  const totalPages = Math.max(1, Math.ceil(questions.length / questionsPerPage));

  const validateCurrentStep = () => {
    const pageStart = currentStepIndex * questionsPerPage;
    const pageEnd = Math.min(pageStart + questionsPerPage, questions.length);
    const currentQuestions = questions.slice(pageStart, pageEnd);

    for (const q of currentQuestions) {
      const ans = answers[q.id]?.answer;
      if (!ans || (Array.isArray(ans) && ans.length === 0)) {
        return false;
      }
    }
    return true;
  };

  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { questionId, answer: val } }));

    const isSingleQuestionMode = questionsPerPage === 1;

    if (isSingleQuestionMode) {
      const currentQ = questions.find(q => q.id === questionId);
      const canAutoAdvance = settings.autoAdvanceOnRadio !== false && currentQ && currentQ.type === 'RADIO';
      if (canAutoAdvance) {
        if (currentStepIndex < totalPages - 1) {
          setTimeout(() => {
            animateSlide('right', currentStepIndex + 1);
          }, 400);
        }
      }
    } else if (settings.autoScrollToNext && displayMode !== 'all') {
      const qIndex = questions.findIndex(q => q.id === questionId);
      const currentQ = questions[qIndex];
      const canAutoAdvance = settings.autoAdvanceOnRadio !== false && currentQ && currentQ.type === 'RADIO';

      if (canAutoAdvance) {
        const isLastOnPage = (qIndex + 1) % questionsPerPage === 0 || qIndex === questions.length - 1;

        if (isLastOnPage && currentStepIndex < totalPages - 1) {
          const pageStart = currentStepIndex * questionsPerPage;
          const pageEnd = Math.min(pageStart + questionsPerPage, questions.length);
          const currentQuestions = questions.slice(pageStart, pageEnd);

          let allAnswered = true;
          for (const q of currentQuestions) {
            const ans = q.id === questionId ? val : answers[q.id]?.answer;
            const isAns = ans && (Array.isArray(ans) ? ans.length > 0 : true);
            if (!isAns) {
              allAnswered = false;
              break;
            }
          }

          if (allAnswered) {
            setTimeout(() => handleNext(), 400);
          }
        }
      }
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      setError('Please answer all questions on this page before proceeding.');
      return;
    }
    setError('');
    if (currentStepIndex < totalPages - 1) {
      animateSlide('right', currentStepIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    const isSingleQuestionMode = questionsPerPage === 1;
    if (isSingleQuestionMode && currentStepIndex === 0) {
      return;
    }
    if (currentStepIndex > 0) {
      animateSlide('left', currentStepIndex - 1);
    } else {
      setStep('form');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    const payload = {
      ...customerInfo,
      shop,
      answers: Object.values(answers),
    };

    try {
      const res = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await readJsonErrorMessage(
          res,
          "We couldn't submit your quiz answers. Please try again."
        );
        throw new Error(message);
      }

      const data = (await res.json()) as { success: boolean; message?: string; recommendations?: any[] };
      if (data.success) {
        setRecommendations(data.recommendations ?? []);
        setStep('results');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(
          toUserFacingError(data.message, "We couldn't submit your quiz answers. Please try again.")
        );
      }
    } catch (err: any) {
      setError(toUserFacingError(err, GENERIC_ERROR_MESSAGE));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setAnswers({});
    setCustomerInfo({ name: '', email: '' });
    setRecommendations([]);
    setCurrentStepIndex(0);
    setError('');
    setStep(settings.enableLeadForm !== false && settings.registrationFormPosition !== 'after_quiz' ? 'form' : 'questions');
  };

  const answeredCount = questions.filter(q => {
    const ans = answers[q.id]?.answer;
    return ans && (Array.isArray(ans) ? ans.length > 0 : true);
  }).length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const pageStart = currentStepIndex * questionsPerPage;
  const pageEnd = Math.min(pageStart + questionsPerPage, questions.length);
  const currentQuestions = questions.slice(pageStart, pageEnd);

  const isLastPage = currentStepIndex === totalPages - 1;

  const navBtnSizing = {
    small: { height: '40px', minWidth: '120px', padding: '0 20px', fontSize: '14px' },
    medium: { height: '48px', minWidth: '140px', padding: '0 24px', fontSize: '16px' },
    large: { height: '56px', minWidth: '160px', padding: '0 28px', fontSize: '18px' }
  };
  const navSizeKey = settings.navigationButtonSize || 'small';
  const navSizing = navBtnSizing[navSizeKey as keyof typeof navBtnSizing] || navBtnSizing.small;

  const isFirstStep = currentStepIndex === 0;

  const getWidthValue = (w: string | undefined) => {
    if (w === 'contained') return '800px';
    if (w === 'compact') return '600px';
    return '100%';
  };

  const formBg = settings.formBackgroundColor || '#ffffff';
  const formText = settings.formTextColor || '#111111';
  const quizBg = settings.quizBackgroundColor || '#ffffff';
  const quizText = settings.quizTextColor || '#111111';

  const stepCardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: getWidthValue(settings.quizWidth),
    margin: "0 auto",
    backgroundColor: quizBg,
    color: quizText,
    borderRadius: settings.quizBorderRadius || '10px',
    border: "1px solid #e1e1e1",
    padding: "40px 32px",
    boxSizing: "border-box",
    textAlign: (settings.quizContentAlignment as any) || 'left',
    fontFamily: settings.quizFontFamily || 'inherit',
    fontSize: settings.quizFontSize || 'inherit',
    fontWeight: settings.quizFontWeight || 'normal',
  };
  const scopedCss = settings.customCss
    ? buildScopedQuizCss(settings.customCss, containerId)
    : "";

  const thankYouAlign = settings.thankYouContentAlignment || settings.quizContentAlignment || 'left';
  const thankYouBg = settings.thankYouBackgroundColor || quizBg;
  const thankYouText = settings.thankYouTextColor || quizText;

  const containerStyle = {
    '--quiz-nav-btn-height': navSizing.height,
    '--quiz-nav-btn-min-width': navSizing.minWidth,
    '--quiz-nav-btn-padding': navSizing.padding,
    '--quiz-nav-btn-font-size': navSizing.fontSize,
    '--form-bg-color': formBg,
    '--form-text-color': formText,
    '--quiz-bg-color': quizBg,
    '--quiz-text-color': quizText,
    '--quiz-primary-color': settings.quizPrimaryColor || '#111827',
    '--quiz-btn-text-color': settings.buttonTextColor || '#ffffff',
    '--quiz-border-radius': settings.quizBorderRadius || '12px',
    '--quiz-image-card-size': getImageCardSizeValue(settings.imageCardSize),
    '--thank-you-bg-color': thankYouBg,
    '--thank-you-text-color': thankYouText,
    ...(step === 'results' ? { '--quiz-container-align': thankYouAlign } : {}),
    backgroundColor: step === 'form' ? formBg : step === 'results' ? '#ffffff' : quizBg,
    color: step === 'form' ? formText : step === 'results' ? thankYouText : quizText,
  } as React.CSSProperties;

  return (
    <div
      id={containerId}
      ref={containerRef}
      className={twMerge(
        "gwl-quiz-container gwl-quiz-theme-premium w-full mx-auto px-4 py-8 relative",
        settings.optionInputStyle === 'native' && "gwl-quiz-native-inputs",
        step === 'results' && recommendations.length > 0 && "gwl-quiz-showing-recommendations"
      )}
      style={containerStyle}
    >
      {scopedCss && (
        <style id="gwl-quiz-custom-css" dangerouslySetInnerHTML={{ __html: scopedCss }} />
      )}
      {assetsBaseUrl && (
        <link rel="stylesheet" href={`${assetsBaseUrl}/quiz.css`} />
      )}

      {step === 'form' && (
        <div className="flex justify-center">
          <PremiumFormStep settings={settings} onStart={handleStart} checkEmailUrl={checkEmailUrl} shop={shop} />
        </div>
      )}

      {step === 'results' && (
        <PremiumResultsStep
          settings={settings}
          products={recommendations}
          shop={shop}
          storefrontOrigin={storefrontOrigin}
          onStartOver={handleStartOver}
        />
      )}

      {step === 'questions' && (
        <div
          key={slideKey}
          className={twMerge(
            'gwl-quiz-sliding-container transition-all duration-200 ease-out flex flex-col gap-6',
            slideVisible
              ? 'opacity-100 translate-x-0'
              : slideDir === 'right'
                ? 'opacity-0 translate-x-6'
                : 'opacity-0 -translate-x-6'
          )}
        >
          <div style={stepCardStyle}>
            {settings.showProgressBar && (
              <PremiumProgressBar settings={settings} answeredCount={answeredCount} totalQuestions={questions.length} progress={progress} />
            )}
            {currentQuestions.map((q, idx) => {
              const qIndex = pageStart + idx;
              const ans = answers[q.id]?.answer || (q.type === 'CHECKBOX' || q.type === 'DROPDOWN_MULTI' ? [] : null);

              return (
                <PremiumQuestionCard
                  key={q.id}
                  question={q}
                  settings={settings}
                  value={ans}
                  onChange={(val) => handleAnswerChange(q.id, val)}
                  questionNumber={qIndex + 1}
                  totalQuestions={questions.length}
                />
              );
            })}

            {error && (
              <p className="gwl-quiz-inline-error gwl-quiz-submit-error" role="alert">
                {error}
              </p>
            )}

            <PremiumNavigation
              settings={settings}
              handlePrev={handlePrev}
              handleNext={handleNext}
              isFirstStep={isFirstStep}
              isLastPage={isLastPage}
              isSubmitting={isSubmitting}
              questionsPerPage={questionsPerPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
