import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Question, QuizSettings } from './types';
import { Check, ChevronDown } from 'lucide-react';
import {
  getImageOptionValue,
  getImageOptionLabel,
  getImageOptionDisplayText,
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

// Helper for robust image source handling
const getSafeImageSrc = (value: string | string[] | null | undefined): string => {
  if (!value) return '';
  const actualValue = Array.isArray(value) ? value[0] : value;
  if (!actualValue || typeof actualValue !== 'string') return '';
  if (isImageSourceValue(actualValue) || actualValue.startsWith('data:')) return actualValue;
  return `data:image/png;base64,${actualValue}`;
};

// Custom multi-select dropdown component
function MultiSelectDropdown({
  options,
  value,
  onToggle,
  primaryColor,
  borderColor,
  borderRadius,
}: {
  options: string[];
  value: string[];
  onToggle: (optValue: string) => void;
  primaryColor: string;
  borderColor: string;
  borderRadius: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCount = value.length;
  const displayText =
    selectedCount === 0
      ? 'Select options…'
      : selectedCount === 1
        ? value[0]
        : `${selectedCount} options selected`;

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-4 border-2 text-base bg-white font-medium outline-none transition-all duration-200 cursor-pointer hover:border-gray-400 flex items-start justify-between min-w-0 gap-2"
        style={{
          borderColor: isOpen ? primaryColor : borderColor,
          borderRadius: borderRadius,
          color: selectedCount === 0 ? '#9ca3af' : undefined,
        }}
      >
        <span
          className={clsx(
            'min-w-0 flex-1 text-left break-words',
            selectedCount === 0 && 'text-gray-400'
          )}
          style={{ overflowWrap: 'anywhere' }}
        >
          {displayText}
        </span>
        <ChevronDown
          size={20}
          className={clsx(
            'shrink-0 ml-2 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          style={{ color: '#9ca3af' }}
        />
      </button>

      {/* Dropdown list */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border-2 shadow-lg overflow-y-auto overflow-x-hidden"
          style={{
            borderColor: primaryColor,
            borderRadius: borderRadius,
            maxHeight: '240px',
          }}
        >
          {options.map((optValue, idx) => {
            const checked = value.includes(optValue);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onToggle(optValue)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left text-base font-medium transition-colors duration-150 hover:bg-gray-50 min-w-0"
                style={{
                  backgroundColor: checked ? `${primaryColor}10` : undefined,
                }}
              >
                {/* Checkbox indicator */}
                <div
                  className="w-5 h-5 border-2 rounded flex items-center justify-center shrink-0 transition-all duration-150"
                  style={{
                    borderColor: checked ? primaryColor : '#d1d5db',
                    backgroundColor: checked ? primaryColor : 'transparent',
                  }}
                >
                  {checked && (
                    <Check size={13} className="text-white" strokeWidth={3.5} />
                  )}
                </div>
                <span className="flex-1 min-w-0 break-words text-left" style={{ overflowWrap: 'anywhere' }}>{optValue}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function QuestionCard({ question, settings, value, onChange, questionNumber, totalQuestions }: QuestionCardProps) {
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

  const containerStyle = {
    backgroundColor: settings.quizBackgroundColor || '#ffffff',
    color: settings.quizTextColor || '#111111',
    borderRadius: settings.quizBorderRadius || '10px',
    fontFamily: settings.quizFontFamily || 'inherit',
  };

  const primaryColor = settings.quizPrimaryColor || '#111827';

  const rawOptions = Array.isArray(question.options) ? question.options : [];
  const options: string[] = rawOptions.map((opt: any) => {
    if (typeof opt === 'string') return opt;
    if (question.optionType === 'image') return getImageOptionValue(opt);
    return opt.label ?? opt.imageSrc ?? '';
  });

  const optionsPerRowSetting = settings.optionsPerRow || '1';
  const isImageOption = question.optionType === 'image';
  
  let desktopCols = 1;
  if (optionsPerRowSetting === 'auto') {
    desktopCols = isImageOption ? 3 : 2;
  } else {
    desktopCols = parseInt(optionsPerRowSetting, 10) || 1;
  }
  const tabletCols = Math.min(2, desktopCols);
  const mobileCols = 1;

  const isDropdown = question.type === 'DROPDOWN' || question.type === 'DROPDOWN_MULTI';
  const uniqueGridId = `gwl-grid-${question.id}`;
  const styleTag = !isDropdown ? (
    <style dangerouslySetInnerHTML={{__html: `
      #${uniqueGridId} {
        grid-template-columns: repeat(${mobileCols}, minmax(0, 1fr)) !important;
      }
      @media (min-width: 640px) {
        #${uniqueGridId} {
          grid-template-columns: repeat(${tabletCols}, minmax(0, 1fr)) !important;
        }
      }
      @media (min-width: 1024px) {
        #${uniqueGridId} {
          grid-template-columns: repeat(${desktopCols}, minmax(0, 1fr)) !important;
        }
      }
    `}} />
  ) : null;

  return (
    <div
      className={twMerge(
        'gwl-quiz-question-card w-full mx-auto p-6 md:p-8 shadow-md mb-6 transition-all duration-300',
        settings.quizWidth === 'narrow' ? 'max-w-2xl' : ''
      )}
      style={containerStyle}
    >
      {/* Question text */}
      <div
        className={clsx(
          'gwl-quiz-header mb-6',
          settings.quizContentAlignment === 'center' ? 'text-center' : settings.quizContentAlignment === 'right' ? 'text-right' : 'text-left'
        )}
      >
        {/* ✅ Progress */}
        {settings.showQuestionNumbers && questionNumber && totalQuestions && (
          <div className="gwl-quiz-question-number" style={{ fontSize: '14px', opacity: 0.6, marginBottom: '6px', color: settings.quizTextColor || '#111111', fontFamily: settings.quizFontFamily || 'inherit' }}>
            Question {questionNumber} of {totalQuestions}
          </div>
        )}

        <h2 className="gwl-quiz-heading text-lg md:text-xl font-bold leading-snug break-words min-w-0" style={{ overflowWrap: 'anywhere', color: settings.quizTextColor || '#111111', fontFamily: settings.quizFontFamily || 'inherit' }}>
          {question.text}
        </h2>
      </div>

      {styleTag}
      {/* Options grid */}
      <div
        id={uniqueGridId}
        className="gwl-quiz-options grid gap-3"
      >
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

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(optValue)}
              className={twMerge(
                'gwl-quiz-option relative group flex items-center text-left outline-none min-w-0',
                'border-1 transition-all duration-200',
                isImage ? 'flex-col p-3' : 'p-4 md:p-4',
                !selected && !isImage ? 'hover:bg-gray-50' : '',
                selected && 'shadow-xs'
              )}
              style={{
                borderRadius: settings.quizBorderRadius || '10px',
                borderColor: selected ? primaryColor : (settings.inputBorderColor || '#e5e7eb'),
                backgroundColor: selected
                  ? isImage
                    ? 'transparent'
                    : `${primaryColor}12`
                  : 'transparent',
                boxShadow: selected
                  ? `0 0 0 1px ${primaryColor}60, 0 2px 8px 0 ${primaryColor}20`
                  : undefined,
              }}
            >
              {/* Image option */}
              {isImage && imageSrc && (
                <div
                  className={clsx(
                    'gwl-quiz-option-image-wrapper relative overflow-hidden mb-3 w-full rounded-lg bg-gray-100',
                    options.length > 4 ? 'h-36' : settings.imageSize === 'small' ? 'h-32' : 'h-48 lg:h-56'
                  )}
                >
                  <img
                    src={getSafeImageSrc(imageSrc)}
                    alt={labelText || `Option ${index + 1}`}
                    className="gwl-quiz-option-image w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Selected overlay for images */}
                  {selected && (
                    <div
                      className="gwl-quiz-option-selected-overlay absolute inset-0 flex items-center justify-center transition-all duration-200"
                      style={{ backgroundColor: `${primaryColor}25` }}
                    >
                      <div
                        className="rounded-full p-1.5 shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Check size={18} className="text-white" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Indicator + label row */}
              <div className="gwl-quiz-option-content flex items-start w-full gap-3 min-w-0">
                {/* Custom radio / checkbox */}
                <div
                  className={clsx(
                    'gwl-quiz-option-indicator w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-all duration-150',
                    question.type === 'CHECKBOX' ? 'rounded-md' : 'rounded-full'
                  )}
                  style={{
                    borderColor: selected ? primaryColor : '#d1d5db',
                    backgroundColor: selected ? primaryColor : 'transparent',
                  }}
                >
                  <span
                    className={clsx(
                      'transition-all duration-150',
                      selected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    )}
                  >
                    <Check size={14} className="text-white" strokeWidth={3.5} />
                  </span>
                </div>

                {/* Label */}
                {!isImage && (
                  <span className="gwl-quiz-option-label text-base font-medium leading-snug flex-1 min-w-0 break-words" style={{ overflowWrap: 'anywhere', color: settings.quizTextColor || '#111111', fontFamily: settings.quizFontFamily || 'inherit' }}>{optValue}</span>
                )}
                {isImage && labelText && (
                  <span className="gwl-quiz-option-label text-base font-semibold leading-snug flex-1 min-w-0 break-words" style={{ overflowWrap: 'anywhere', color: settings.quizTextColor || '#111111', fontFamily: settings.quizFontFamily || 'inherit' }}>
                    {labelText}
                  </span>
                )}
                {isImage && !labelText && (
                  <span
                    className="gwl-quiz-option-label text-sm font-medium opacity-70"
                    style={{ color: selected ? primaryColor : undefined }}
                  >
                    {selected ? 'Selected ✓' : 'Select'}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Single-select Dropdown */}
        {question.type === 'DROPDOWN' && (
          <select
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleSelect(e.target.value)}
            className="gwl-quiz-input w-full p-4 border-2 rounded-xl text-base appearance-none bg-white font-medium outline-none transition-all duration-200 cursor-pointer hover:border-gray-400"
            style={{
              borderColor: settings.inputBorderColor || '#e5e7eb',
              borderRadius: settings.quizBorderRadius || '10px',
              color: settings.quizTextColor || '#111111',
              fontFamily: settings.quizFontFamily || 'inherit',
            }}
          >
            <option value="" disabled>
              Select an option…
            </option>
            {options.map((optValue: string, idx: number) => (
              <option key={idx} value={optValue}>
                {question.optionType === 'image'
                  ? getImageOptionDisplayText(rawOptions[idx], idx)
                  : optValue}
              </option>
            ))}
          </select>
        )}

        {/* Multi-select Dropdown */}
        {question.type === 'DROPDOWN_MULTI' && (
          <MultiSelectDropdown
            options={options}
            value={Array.isArray(value) ? value : []}
            onToggle={handleSelect}
            primaryColor={primaryColor}
            borderColor={settings.inputBorderColor || '#e5e7eb'}
            borderRadius={settings.quizBorderRadius || '10px'}
          />
        )}
      </div>
    </div>
  );
}
