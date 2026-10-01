import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import type { QuizSettings } from './types';
import { Loader2, ArrowRight } from 'lucide-react';

interface FormStepProps {
  settings: QuizSettings;
  onStart: (data: { name: string; email: string }) => void;
  checkEmailUrl: string;
  shop: string;
}

export function PremiumFormStep({ settings, onStart, checkEmailUrl, shop }: FormStepProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 2000);
    return () => clearTimeout(t);
  }, [error]);

  const nameOk = !settings.showNameField || name.trim().length > 0;
  const emailOk = !settings.showEmailField || email.trim().length > 0;
  const canSubmit = nameOk && emailOk && !isChecking;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (settings.showNameField && !name.trim()) {
      setError('Name is required');
      return;
    }
    if (settings.showEmailField && !email.trim()) {
      setError('Email is required');
      return;
    }

    onStart({ name, email });
  };

  const primaryColor = settings.quizPrimaryColor || '#111827';
  const borderRadius = settings.quizBorderRadius || '12px';
  const fontFam = settings.quizFontFamily || 'inherit';
  
  const navBtnSizing = {
    small: { height: '44px', minWidth: '120px', padding: '0 20px', fontSize: '14px' },
    medium: { height: '52px', minWidth: '140px', padding: '0 28px', fontSize: '15px' },
    large: { height: '60px', minWidth: '160px', padding: '0 32px', fontSize: '16px' }
  };
  const navSizeKey = settings.navigationButtonSize || 'medium';
  const navSizing = navBtnSizing[navSizeKey as keyof typeof navBtnSizing] || navBtnSizing.medium;

  const formBtnText = settings.registrationFormPosition === 'after_quiz'
    ? (settings.submitButtonText || 'Submit Answers')
    : (settings.startButtonText || 'Start Quiz');

  return (
    <div 
      className="gwl-premium-registration-form w-full mx-auto p-8 md:p-12 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50"
      style={{
        backgroundColor: settings.formBackgroundColor || '#ffffff',
        fontFamily: fontFam,
        borderRadius: borderRadius,
        maxWidth: '32rem', // strict max-w-lg for beautiful form
      }}
    >
      <div 
        className={clsx(
          "gwl-premium-header mb-10 flex flex-col gap-3",
          settings.formContentAlignment === 'center' ? 'items-center text-center' : settings.formContentAlignment === 'right' ? 'items-end text-right' : 'items-start text-left'
        )}
      >
        <h2 
          className="text-[28px] md:text-[36px] font-extrabold tracking-tight text-gray-900 leading-tight m-0"
          style={{ color: settings.formTextColor || '#111827' }}
        >
          {settings.formHeading}
        </h2>
        {settings.formSubheading && (
          <h4 className="text-[16px] font-medium text-gray-500 m-0 leading-relaxed max-w-sm">
            {settings.formSubheading}
          </h4>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
        {settings.showNameField && (
          <div className="flex flex-col gap-2 relative">
            <label
              htmlFor="name"
              className="text-[12px] uppercase tracking-widest font-bold text-gray-400 absolute -top-2.5 left-3 bg-white px-1 z-10"
              style={{ backgroundColor: settings.formBackgroundColor || '#ffffff' }}
            >
              First Name
            </label>
            <input
              type="text"
              id="name"
              className="w-full px-5 py-4 border-2 border-gray-200 bg-transparent text-[16px] font-medium text-gray-900 transition-all duration-200 outline-none focus:border-gray-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                borderRadius: borderRadius,
                borderColor: settings.inputBorderColor || undefined, // fallback to standard focus if not forced
              }}
              placeholder="e.g. Jane Doe"
              autoComplete="name"
            />
          </div>
        )}

        {settings.showEmailField && (
          <div className="flex flex-col gap-2 relative">
            <label
              htmlFor="email"
              className="text-[12px] uppercase tracking-widest font-bold text-gray-400 absolute -top-2.5 left-3 bg-white px-1 z-10"
              style={{ backgroundColor: settings.formBackgroundColor || '#ffffff' }}
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-5 py-4 border-2 border-gray-200 bg-transparent text-[16px] font-medium text-gray-900 transition-all duration-200 outline-none focus:border-gray-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                borderRadius: borderRadius,
                borderColor: settings.inputBorderColor || undefined,
              }}
              placeholder="jane@example.com"
              autoComplete="email"
            />
          </div>
        )}

        {error && (
          <p className="gwl-quiz-inline-error gwl-quiz-form-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={clsx(
             "mt-4 w-full justify-center flex items-center text-center gap-3 font-bold transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 disabled:opacity-70 disabled:cursor-not-allowed",
             canSubmit ? "shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5" : ""
          )}
          style={{
            backgroundColor: primaryColor,
            color: settings.buttonTextColor || '#ffffff',
            borderRadius: borderRadius,
            height: navSizing.height,
            padding: navSizing.padding,
            fontSize: navSizing.fontSize,
          }}
        >
          {isChecking ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Checking…
            </>
          ) : (
             <>
               {formBtnText}
               <ArrowRight size={18} strokeWidth={2.5} />
             </>
          )}
        </button>
      </form>
    </div>
  );
}
