import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';
import type { Question, QuizSettings } from './types';
import {
  getImageOptionValue,
  getImageOptionLabel,
  getImageOptionDisplayText,
  getImageLabelLayoutClass,
  getImageLabelLayoutMode,
  isImageSourceValue,
} from '../../utils/quizImageOptions';

interface QuestionCardProps {
  question: Question;
  settings: QuizSettings;
  value: string | string[] | null;
  onChange: (val: string | string[]) => void;
  questionNumber?: number;
  totalQuestions?: number;
}

const getSafeImageSrc = (value: string | string[] | null | undefined): string => {
  if (!value) return '';
  const actualValue = Array.isArray(value) ? value[0] : value;
  if (!actualValue || typeof actualValue !== 'string') return '';
  if (isImageSourceValue(actualValue) || actualValue.startsWith('data:')) return actualValue;
  return `data:image/png;base64,${actualValue}`;
};

function PremiumMultiSelectDropdown({
  options,
  rawOptions,
  isImageOption,
  value,
  onToggle,
  primaryColor,
  borderRadius,
  maxSelections,
}: {
  options: string[];
  rawOptions: unknown[];
  isImageOption: boolean;
  value: string[];
  onToggle: (optValue: string) => void;
  primaryColor: string;
  borderRadius: string;
  maxSelections?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const atLimit = maxSelections != null && maxSelections > 0 && value.length >= maxSelections;

  return (
    <div ref={dropdownRef} className="gwl-quiz-select-multi relative w-full">
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={clsx('gwl-quiz-select-display cursor-pointer min-w-0 w-full', isOpen && 'active', value.length > 0 && 'has-values')}
        style={{ borderRadius: value.length === 0 ? borderRadius : undefined }}
      >
        {value.length === 0 ? (
          <span className="gwl-quiz-select-display-placeholder">Select options...</span>
        ) : isImageOption ? (
          <span>{value.length} image{value.length === 1 ? '' : 's'} selected</span>
        ) : (
          value.map((val) => (
            <span key={val} className="gwl-quiz-select-chip">
              <span className="gwl-quiz-select-chip-label">{val}</span>
              <span
                className="gwl-quiz-chip-remove"
                role="button"
                aria-label={`Remove ${val}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(val);
                }}
              >
                ✕
              </span>
            </span>
          ))
        )}
      </div>

      {isOpen && (
        <div
          className="gwl-quiz-select-dropdown overflow-x-hidden"
          style={{ display: 'block', borderRadius: `0 0 ${borderRadius} ${borderRadius}` }}
          role="listbox"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="gwl-quiz-select-dropdown-hint">Tap each option to select or deselect</div>
          {options.map((optValue, idx) => {
            const checked = value.includes(optValue);
            const disabled = !checked && atLimit;
            const displayText = isImageOption
              ? getImageOptionDisplayText(rawOptions[idx], idx)
              : optValue;
            return (
              <label
                key={idx}
                className={clsx(
                  'gwl-quiz-multi-option cursor-pointer items-start',
                  checked && 'selected',
                  disabled && 'gwl-quiz-multi-option--disabled opacity-45'
                )}
                role="option"
                aria-selected={checked}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(optValue)}
                />
                <span className="flex-1 min-w-0 break-words" style={{ overflowWrap: 'anywhere' }}>{displayText}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PremiumQuestionCard({ question, settings, value, onChange, questionNumber, totalQuestions }: QuestionCardProps) {
  const isSelected = (optValue: string) => {
    if (Array.isArray(value)) return value.includes(optValue);
    return value === optValue;
  };

  const handleSelect = (optValue: string) => {
    if (question.type === 'CHECKBOX' || question.type === 'DROPDOWN_MULTI') {
      const current = Array.isArray(value) ? value : [];
      if (current.includes(optValue)) {
        onChange(current.filter((v) => v !== optValue));
      } else {
        if (settings.maxSelections > 0 && current.length >= settings.maxSelections) return;
        onChange([...current, optValue]);
      }
    } else {
      onChange(optValue);
    }
  };

  const primaryColor = settings.quizPrimaryColor || '#111827';
  const borderRadius = settings.quizBorderRadius || '12px';
  const fontFam = settings.quizFontFamily || 'inherit';

  const containerStyle = {
    backgroundColor: settings.quizBackgroundColor || '#ffffff',
    color: settings.quizTextColor || '#111827',
    fontFamily: fontFam,
    borderRadius: borderRadius,
  };

  const rawOptions = Array.isArray(question.options) ? question.options : [];
  const options: string[] = rawOptions.map((opt: any) => {
    if (typeof opt === 'string') return opt;
    if (question.optionType === 'image') return getImageOptionValue(opt);
    return opt.label ?? opt.imageSrc ?? '';
  });

  const optionsPerRowSetting = settings.optionsPerRow || '1';
  const isImageOption = question.optionType === 'image';
  const imageLabelLayout = settings.imageLabelLayout;
  const imageShape = settings.imageShape || 'square';
  const layoutClass = getImageLabelLayoutClass(imageLabelLayout);
  const layoutMode = getImageLabelLayoutMode(imageLabelLayout);

  let cols = 1;
  if (optionsPerRowSetting === 'auto') {
    cols = isImageOption ? 3 : 2;
  } else {
    cols = parseInt(optionsPerRowSetting, 10) || 1;
  }

  const isDropdown = question.type === 'DROPDOWN' || question.type === 'DROPDOWN_MULTI';
  const uniqueGridId = `premium-grid-${question.id}`;
  const isFitWidth = optionsPerRowSetting === 'auto';
  const useInlineLayout =
    isImageOption &&
    (layoutMode === 'inline-left' || layoutMode === 'inline-right');
  const useInlineColumnAlign = useInlineLayout && cols === 1 && !isFitWidth;
  const useInlineFitWidth = useInlineLayout && isFitWidth;
  const useGridLayout = !isDropdown && !useInlineColumnAlign && !useInlineFitWidth;
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!useInlineColumnAlign || !optionsRef.current) return;

    const syncLabelColumnWidth = () => {
      const container = optionsRef.current;
      if (!container) return;
      const labels = container.querySelectorAll(
        '.gwl-quiz-option-label:not(.gwl-quiz-image-label-placeholder)'
      );
      let maxWidth = 0;
      labels.forEach((label) => {
        const width = Math.ceil(label.getBoundingClientRect().width);
        if (width > maxWidth) maxWidth = width;
      });
      if (maxWidth > 0) {
        container.style.setProperty('--quiz-image-label-col-width', `${maxWidth}px`);
      } else {
        container.style.removeProperty('--quiz-image-label-col-width');
      }
    };

    const frame = requestAnimationFrame(syncLabelColumnWidth);
    window.addEventListener('resize', syncLabelColumnWidth);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', syncLabelColumnWidth);
    };
  }, [useInlineColumnAlign, question.id, question.options, layoutMode]);

  const styleTag = useGridLayout ? (
    <style dangerouslySetInnerHTML={{
      __html: `
      #${uniqueGridId} {
        grid-template-columns: repeat(${cols}, minmax(0, 1fr)) !important;
      }
    `}} />
  ) : null;

  return (
    <div
      className={twMerge(
        'gwl-premium-question-card w-full mx-auto p-6 md:p-10 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50',
        settings.quizWidth === 'narrow' ? 'max-w-3xl' : ''
      )}
      style={containerStyle}
    >
      {/* Header Area */}
      <div
        className={clsx(
          'gwl-premium-header mb-8 flex flex-col',
          settings.quizContentAlignment === 'center' ? 'items-center text-center' : settings.quizContentAlignment === 'right' ? 'items-end text-right' : 'items-start text-left'
        )}
      >
        <div className="flex justify-between items-center w-full mb-5">
          {settings.showQuestionNumbers && questionNumber && totalQuestions && (
            <div
              className="inline-flex items-center text-[11px] font-bold uppercase tracking-widest px-3 py-1 bg-gray-100/80 text-gray-600"
              style={{ borderRadius: '999px' }}
            >
              Step {questionNumber} of {totalQuestions}
            </div>
          )}
        </div>

        <h2 className="text-[26px] md:text-[32px] font-extrabold tracking-tight text-gray-900 leading-[1.2] break-words min-w-0 w-full" style={{ overflowWrap: 'anywhere', color: settings.quizTextColor || '#111827', fontFamily: fontFam }}>
          {question.text}
        </h2>
      </div>

      {styleTag}

      {/* Options Grid */}
      <div
        ref={optionsRef}
        id={uniqueGridId}
        className={clsx(
          'gwl-quiz-options',
          useGridLayout && 'grid gap-4',
          useGridLayout && cols === 1 && isImageOption && 'gwl-quiz-options--single-col',
          useInlineColumnAlign && layoutMode === 'inline-left' && 'gwl-quiz-options--image-inline-left gwl-quiz-options--image-one-per-row',
          useInlineColumnAlign && layoutMode === 'inline-right' && 'gwl-quiz-options--image-inline-right gwl-quiz-options--image-one-per-row',
          useInlineFitWidth && 'gwl-quiz-options--fit-width gwl-quiz-options--image-fit-width',
          useInlineFitWidth && layoutMode === 'inline-left' && 'gwl-quiz-options--image-inline-left',
          useInlineFitWidth && layoutMode === 'inline-right' && 'gwl-quiz-options--image-inline-right',
        )}
        role="group"
        aria-labelledby={`premium-grid-${question.id}-label`}
      >
        <span id={`premium-grid-${question.id}-label`} className="sr-only">{question.text}</span>

        {options.map((optValue, index) => {
          if (question.type === 'DROPDOWN' || question.type === 'DROPDOWN_MULTI') return null;

          const key = optValue + index;
          const selected = isSelected(optValue);
          const isImage = question.optionType === 'image';
          const originalOpt = rawOptions[index];
          const labelText = isImage
            ? getImageOptionLabel(originalOpt)
            : typeof originalOpt === 'object' && originalOpt !== null
              ? String((originalOpt as any).label || optValue).trim()
              : optValue;
          const imageSrc = isImage ? getImageOptionValue(originalOpt) : '';

          if (isImage) {
            const imageWrap = (
              <div className={`gwl-quiz-image-wrap gwl-quiz-premium-image-wrap shape-${imageShape}`}>
                <img
                  src={getSafeImageSrc(imageSrc)}
                  alt={labelText || `Option ${index + 1}`}
                />
              </div>
            );
            const labelSpan =
              layoutMode === 'inline-left' || layoutMode === 'inline-right' ? (
                <span
                  className={clsx(
                    'gwl-quiz-option-label',
                    !labelText && 'gwl-quiz-image-label-placeholder',
                  )}
                >
                  {labelText || ''}
                </span>
              ) : labelText ? (
                <span className="gwl-quiz-option-label">{labelText}</span>
              ) : null;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(optValue)}
                className={clsx(
                  'gwl-quiz-option gwl-quiz-option-premium-image',
                  layoutClass,
                  !labelText && 'gwl-quiz-image-no-label',
                  selected && 'selected',
                )}
                aria-pressed={selected}
              >
                {layoutMode === 'inline-left' ? (
                  <>
                    {labelSpan}
                    {imageWrap}
                  </>
                ) : (
                  <>
                    {imageWrap}
                    {labelSpan}
                  </>
                )}
              </button>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(optValue)}
              className={clsx(
                'gwl-premium-option relative flex text-left transition-all duration-200 outline-none',
                'border-2 focus-visible:ring-2 focus-visible:ring-offset-2',
                'items-start justify-start text-left px-5 py-3.5 min-h-[52px]',
                selected
                  ? 'shadow-[0_4px_14px_rgba(0,0,0,0.15)]'
                  : 'bg-white hover:border-gray-300 hover:bg-gray-50/30'
              )}
              style={{
                borderRadius: borderRadius,
                borderColor: selected ? primaryColor : '#e5e7eb',
                backgroundColor: selected ? primaryColor : '#ffffff',
                color: selected ? '#ffffff' : 'inherit',
                transform: selected ? 'translateY(-1px)' : 'none'
              }}
              aria-pressed={selected}
            >
              <div className="flex-1 min-w-0 px-2 text-left">
                <div className={clsx(
                  "text-[16px] min-w-0 break-words transition-colors duration-200",
                  selected ? "font-bold text-white" : "font-medium text-gray-700"
                )} style={{ overflowWrap: 'anywhere' }}>
                  {optValue}
                </div>
              </div>
            </button>
          );
        })}
    </div>

      {
    isDropdown && (
      <div className="mt-2 w-full max-w-lg">
        {question.type === 'DROPDOWN' ? (
          <div className="relative">
            <select
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 bg-white text-[16px] font-medium text-gray-900 appearance-none outline-none transition-colors duration-200 hover:border-gray-300 focus:border-gray-900 focus:ring-0 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              style={{ borderRadius: borderRadius }}
              aria-label={question.text}
            >
              <option value="" disabled>Select an option...</option>
              {options.map((optValue, index) => (
                <option key={optValue + index} value={optValue}>
                  {isImageOption
                    ? getImageOptionDisplayText(rawOptions[index], index)
                    : optValue}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
            />
          </div>
        ) : (
          <PremiumMultiSelectDropdown
            options={options}
            rawOptions={rawOptions}
            isImageOption={isImageOption}
            value={Array.isArray(value) ? value : []}
            onToggle={handleSelect}
            primaryColor={primaryColor}
            borderRadius={borderRadius as string}
            maxSelections={settings.maxSelections}
          />
        )}
      </div>
    )
  }
    </div >
  );
}
