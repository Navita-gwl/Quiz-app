import { useState, useEffect } from 'react';
import type { QuizSettings } from './types';

interface FormStepProps {
  settings: QuizSettings;
  onStart: (data: { name: string; email: string }) => void;
  checkEmailUrl: string;
  shop: string;
}

export function FormStep({ settings, onStart, checkEmailUrl, shop }: FormStepProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // Auto-hide error after 3 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 2000);
    return () => clearTimeout(t);
  }, [error]);

  // Derived: disable button when required fields are empty
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
  const unifiedBorderRadius = settings.quizBorderRadius || '10px';

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '90%',
    backgroundColor: settings.formBackgroundColor || '#ffffff',
    color: settings.formTextColor || '#111111',
    borderRadius: unifiedBorderRadius,
    border: '1px solid #e1e1e1',
    padding: '40px 32px',
    boxSizing: 'border-box' as const,
    fontFamily: settings.formFontFamily || 'inherit',
    fontSize: settings.formFontSize || 'inherit',
    fontWeight: settings.formFontWeight || 'normal',
    textAlign: (settings.formContentAlignment as any) || 'left',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${settings.inputBorderColor || '#dcdcdc'}`,
    borderRadius: unifiedBorderRadius,
    fontSize: '16px',
    boxSizing: 'border-box' as const,
    outline: 'none',
    backgroundColor: settings.formBackgroundColor || '#ffffff',
    color: settings.formTextColor || '#111111',
    fontFamily: settings.formFontFamily || 'inherit',
  };

  const navBtnSizing = {
    small: { height: '40px', minWidth: '140px', padding: '0 20px', fontSize: '14px' },
    medium: { height: '48px', minWidth: '160px', padding: '0 24px', fontSize: '16px' },
    large: { height: '56px', minWidth: '180px', padding: '0 28px', fontSize: '18px' }
  };

  const navSizeKey = settings.navigationButtonSize || 'medium';
  const navSizing = navBtnSizing[navSizeKey as keyof typeof navBtnSizing] || navBtnSizing.medium;
  const buttonStyle: React.CSSProperties = {
    display: 'block',
    width: 'fit-content',
    margin: '16px auto 0',
    backgroundColor: primaryColor,
    color: '#ffffff',
    border: 'none',
    borderRadius: unifiedBorderRadius,
    fontWeight: 600,
    cursor: canSubmit ? 'pointer' : 'not-allowed',
    fontFamily: settings.formFontFamily || 'inherit',
    height: navSizing.height,
    minWidth: navSizing.minWidth,
    padding: navSizing.padding,
    fontSize: navSizing.fontSize,
    boxSizing: 'border-box' as const,
  };

  const formBtnText = isChecking
    ? 'Checking…'
    : (settings.registrationFormPosition === 'after_quiz'
        ? (settings.submitButtonText || 'Submit Answers')
        : (settings.startButtonText || 'Start Quiz'));

  return (
    <div className="gwl-quiz-registration-form" style={cardStyle}>
      <div className="gwl-quiz-header" style={{ textAlign: (settings.formContentAlignment as any) || 'left', marginBottom: '28px' }}>
        <h2 className="gwl-quiz-heading" style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700, color: settings.formTextColor || '#111111', fontFamily: settings.formFontFamily || 'inherit' }}>
          {settings.formHeading}
        </h2>
        <h4 className="gwl-quiz-subheading" style={{ margin: 2, fontSize: '15px', fontWeight: 600, color: settings.formTextColor || '#111111', fontFamily: settings.formFontFamily || 'inherit' }}>
          {settings.formSubheading}
        </h4>
      </div>

      <form onSubmit={handleSubmit}>
        {settings.showNameField && (
          <div className="gwl-quiz-form-group" style={{ marginBottom: '18px' }}>
            <label
              htmlFor="name"
              style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: settings.formTextColor || '#111111', fontFamily: settings.formFontFamily || 'inherit' }}
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              className="gwl-quiz-input gwl-quiz-input-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
        )}

        {settings.showEmailField && (
          <div className="gwl-quiz-form-group" style={{ marginBottom: '18px' }}>
            <label
              htmlFor="email"
              style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: settings.formTextColor || '#111111', fontFamily: settings.formFontFamily || 'inherit' }}
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              className="gwl-quiz-input gwl-quiz-input-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="your@email.com"
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
          className="gwl-quiz-submit-btn gwl-quiz-start-btn"
          style={buttonStyle}
        >
          {formBtnText}
        </button>
      </form>
    </div>
  );
}
