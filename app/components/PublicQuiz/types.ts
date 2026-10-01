export interface Question {
  id: string;
  text: string;
  type: 'RADIO' | 'CHECKBOX' | 'DROPDOWN' | 'DROPDOWN_MULTI';
  optionType: 'text' | 'image';
  options: any; // Can be string[] or JSON
}

export interface QuizSettings {
  optionDisplayStyle: string;
  layoutDirection: 'vertical' | 'horizontal';
  imageSize: 'small' | 'medium' | 'large';
  borderRadius: string;
  primaryColor: string;
  showQuestionNumbers: boolean;
  showProgressBar: boolean;
  autoScrollToNext: boolean;
  submitButtonText: string;
  formHeading: string;
  formSubheading: string;
  showNameField: boolean;
  showEmailField: boolean;
  startButtonText: string;
  startButtonBgColor: string;
  startButtonTextColor: string;
  formLayoutStyle: 'centered' | 'left';
  formBackgroundStyle: string;
  inputFieldStyle: string;
  formBackgroundColor: string;
  formTextColor: string;
  inputBorderColor: string;
  inputFocusColor: string;
  formWidth: string;
  buttonStyle: string;
  quizDisplayMode: 'all' | 'step' | '2' | '3';
  progressStyle: 'line' | 'dots' | 'percentage';
  contentAlignment: 'left' | 'center' | 'right';
  maxSelections: number;
  formPrimaryColor: string;
  formBorderRadius: string;
  formButtonStyle: string;
  formContentAlignment: string;
  formOuterBorderRadius: string;
  quizBackgroundColor: string;
  quizTextColor: string;
  quizPrimaryColor: string;
  quizBorderRadius: string;
  quizContentAlignment: string;
  quizWidth: string;
  quizOuterBorderRadius: string;
  thankYouHeading: string;
  thankYouBody: string;
  thankYouColor: string;
  thankYouBackgroundColor?: string;
  thankYouTextColor?: string;
  thankYouContentAlignment?: string;
  submitButtonBgColor: string;
  customCss: string;
  customJs: string;
  autoAdvanceOnRadio?: boolean;
  navigationButtonSize?: string;
  formFontSize?: string;
  formFontFamily?: string;
  formFontWeight?: string;
  registrationFormPosition?: string;
  quizFontSize?: string;
  quizFontFamily?: string;
  quizFontWeight?: string;
  optionsPerRow?: string;
  optionInputStyle?: 'styled' | 'native';
  buttonTextColor?: string;
  recommendationHeading?: string;
  recommendationSubheading?: string;
  translations?: Record<string, string>;
  enableLeadForm?: boolean;
  imageShape?: string;
  imageCardSize?: string;
  imageLabelLayout?: "stack" | "inline-right" | "inline-left" | "inline";
}

export interface QuizData {
  questions: Question[];
  settings: QuizSettings;
}
