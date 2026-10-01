document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('.gwl-quiz-container');
  containers.forEach(container => {
    if (!container.dataset.initialized) {
      container.dataset.initialized = 'true';
      initQuiz(container);
    }
  });
});

// For situations where DOMContentLoaded already fired or custom executions:
if (document.readyState !== 'loading') {
  const containers = document.querySelectorAll('.gwl-quiz-container');
  containers.forEach(container => {
    if (!container.dataset.initialized) {
      container.dataset.initialized = 'true';
      initQuiz(container);
    }
  });
}

function initQuiz(container) {
  const appConfig = window.quizAppConfig || {};
  const isEmbed =
    appConfig.isIframe === true ||
    container.getAttribute('data-gwl-quiz-embed') === 'true';

  if (isEmbed) {
    document.documentElement.classList.add('gwl-quiz-embed');
  }

  const loadingEl = container.querySelector('.gwl-quiz-loading');
  const errorEl = container.querySelector('.gwl-quiz-error');
  const leadFormEl = container.querySelector('.gwl-quiz-registration-form');
  const startBtn = container.querySelector('.gwl-quiz-start-btn');
  const formEl = container.querySelector('.gwl-quiz-form');
  const questionsEl = container.querySelector('.gwl-quiz-questions');
  const successEl = container.querySelector('.gwl-quiz-results');

  const config = {
    customerId: container.getAttribute('data-customer-id') || appConfig.customerId || null,
    shopDomain: container.getAttribute('data-shop-domain') || appConfig.shopDomain || '',
    appProxyUrl: container.getAttribute('data-app-proxy-url') || appConfig.appProxyUrl || '/apps/quizapp',
    quizId: container.getAttribute('data-quiz-id') || appConfig.quizId || '',
    storefrontOrigin: container.getAttribute('data-storefront-origin') || appConfig.storefrontOrigin || ''
  };

  let settings = {};
  let currentStep = 0;
  let totalSteps = 0;
  let totalQuestions = 0;
  let questionsPerPage = 1;
  let quizQuestions = [];
  let formChangeHandler = null;
  let checkArrowsHandler = null;
  let gridResizeObserver = null;

  let leadData = {
    name: '',
    email: ''
  };
  let showingPostQuizForm = false;

  const T_FALLBACK = {
    'navigation.previous': 'Previous',
    'navigation.back': 'Back',
    'navigation.next': 'Next',
    'navigation.start': 'Start Quiz',
    'navigation.submit': 'Submit Answers',
    'navigation.submitting': 'Submitting...',
    'navigation.startOver': 'Start Over',
    'form.validation.nameRequired': 'Please enter your name.',
    'form.validation.emailRequired': 'Please enter your email address.',
    'form.validation.emailInvalid': 'Please enter a valid email address.',
    'validation.selectOption': 'Please select an option to continue.',
    'validation.selectAtLeastOne': 'Please select at least one option to continue.',
    'validation.maxSelectionsHint': 'You can select up to {max} options.',
    'validation.selectionLimit': 'You can only select up to {max} option(s).',
    'progress.questionOf': 'Question {current} of {total}',
    'progress.percentCompleted': '{percent}% Completed',
    'loading.missingQuizId': 'Add your 8-character Quiz ID in the Theme Editor Quiz block settings.',
    'loading.noQuestions': 'No questions available at the moment.',
    'errors.loadFailed': 'Unable to load quiz. Please try again later.',
    'errors.submitFailed': 'Unable to submit your answers. Please try again.',
    'results.recommendationHeading': 'Recommended for you',
    'results.addToCart': 'Add to cart',
    'results.adding': 'Adding...',
    'results.added': 'Added! ✓',
    'results.addError': 'Error!',
    'results.viewProduct': 'View Product',
    'results.noImage': 'No image',
    'dropdown.selectOption': 'Select an option...',
    'dropdown.selectOptions': 'Select options...',
    'dropdown.selectMultipleHint': 'Tap each option to select or deselect',
    'dropdown.optionsSelected': '{count} selected',
    'dropdown.imagesSelected': '{count} image(s) selected',
  };

  const T_LEGACY = {
    'navigation.previous': 'prevButtonText',
    'navigation.back': 'prevButtonText',
    'navigation.next': 'nextButtonText',
    'navigation.start': 'startButtonText',
    'navigation.submit': 'submitButtonText',
    'form.heading': 'formHeading',
    'form.subheading': 'formSubheading',
    'form.nameLabel': 'nameFieldLabel',
    'form.emailLabel': 'emailFieldLabel',
    'form.namePlaceholder': 'namePlaceholder',
    'form.emailPlaceholder': 'emailPlaceholder',
    'results.thankYouHeading': 'thankYouHeading',
    'results.thankYouBody': 'thankYouBody',
    'results.recommendationHeading': 'recommendationHeading',
    'results.recommendationSubheading': 'recommendationSubheading',
    'results.addToCart': 'addToCartButtonText',
  };

  function t(key, vars) {
    let str = (settings.translations && settings.translations[key]) || '';
    if (!str && T_LEGACY[key] && settings[T_LEGACY[key]]) {
      str = settings[T_LEGACY[key]];
    }
    if (!str) str = T_FALLBACK[key] || '';
    if (vars) {
      Object.keys(vars).forEach((name) => {
        str = str.split('{' + name + '}').join(String(vars[name]));
      });
    }
    return str;
  }

  function hasLeadFormEnabled() {
    if (settings.enableLeadForm === false) return false;
    return settings.showNameField !== false || settings.showEmailField !== false;
  }

  function isFormAfterQuiz() {
    return hasLeadFormEnabled() && settings.registrationFormPosition === 'after_quiz';
  }

  function getSubmitIdentity() {
    if (hasLeadFormEnabled()) {
      return {
        name: leadData.name || 'Anonymous',
        email: leadData.email || 'anonymous@example.com',
      };
    }
    return { name: 'Anonymous', email: 'anonymous@example.com' };
  }

  function ensureLeadFormFieldAccessibility() {
    if (!leadFormEl) return;

    const containerId = container.id || 'gwl-quiz';
    const fields = [
      { selector: '.gwl-quiz-input-name', suffix: 'lead-name' },
      { selector: '.gwl-quiz-input-email', suffix: 'lead-email' },
    ];

    fields.forEach(({ selector, suffix }) => {
      const input = leadFormEl.querySelector(selector);
      if (!input) return;

      if (!input.id) {
        input.id = `${containerId}-${suffix}`;
      }

      const label = input.closest('.gwl-quiz-form-group')?.querySelector('label');
      if (label) {
        label.setAttribute('for', input.id);
      }
    });
  }

  function showPostQuizLeadForm() {
    if (!validateCurrentStep()) return;
    showingPostQuizForm = true;
    if (formEl) formEl.style.display = 'none';
    if (leadFormEl) {
      leadFormEl.classList.add('gwl-quiz-showing-post-form');
      leadFormEl.style.display = 'block';
      applySettings(settings, 'form');
      ensurePostQuizFormNav();
    }
    updateNavButtons();
  }

  function restoreLeadFormStartBtnLayout() {
    if (!startBtn) return;
    startBtn.classList.remove('gwl-quiz-next-btn');
    startBtn.style.removeProperty('display');
    startBtn.style.removeProperty('margin-top');
    startBtn.style.removeProperty('margin-left');
    startBtn.style.removeProperty('margin-right');
    if (leadFormEl) {
      leadFormEl.classList.remove('gwl-quiz-showing-post-form');
    }
    if (leadFormEl && startBtn.parentElement?.classList?.contains('gwl-quiz-post-form-nav')) {
      leadFormEl.appendChild(startBtn);
    }
  }

  function hidePostQuizLeadForm() {
    showingPostQuizForm = false;
    restoreLeadFormStartBtnLayout();
    if (leadFormEl) {
      leadFormEl.style.display = 'none';
      const postNav = leadFormEl.querySelector('.gwl-quiz-post-form-nav');
      if (postNav) postNav.style.display = 'none';
    }
    if (formEl) formEl.style.display = 'block';
    applySettings(settings, 'quiz');
    goToStep(totalSteps - 1);
    updateNavButtons();
  }

  function ensurePostQuizFormNav() {
    if (!leadFormEl || !startBtn) return;
    let nav = leadFormEl.querySelector('.gwl-quiz-post-form-nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'gwl-quiz-post-form-nav gwl-quiz-nav-buttons';
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'gwl-quiz-prev-btn';
      prevBtn.textContent = t('navigation.previous');
      prevBtn.style.backgroundColor = settings.quizPrimaryColor || '#111827';
      prevBtn.style.borderColor = settings.quizPrimaryColor || '#111827';
      prevBtn.style.color = settings.buttonTextColor || '#ffffff';
      if (settings.quizBorderRadius) {
        prevBtn.style.borderRadius = settings.quizBorderRadius;
      }
      prevBtn.addEventListener('click', hidePostQuizLeadForm);
      nav.appendChild(prevBtn);
      leadFormEl.appendChild(nav);
    }
    if (startBtn.parentElement !== nav) {
      nav.appendChild(startBtn);
    }
    startBtn.classList.add('gwl-quiz-next-btn');
    startBtn.style.removeProperty('display');
    startBtn.style.removeProperty('margin-top');
    startBtn.style.setProperty('margin-left', 'auto');
    startBtn.style.setProperty('margin-right', '0');
    startBtn.textContent = t('navigation.submit');
    nav.style.display = 'flex';
  }

  // Fetch Questions
  async function fetchQuestions() {
    try {
      if (!config.quizId || config.quizId === 'general') {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
          errorEl.textContent = t('loading.missingQuizId');
          errorEl.style.display = 'block';
        }
        return;
      }

      if (window.quizInitialData) {
        settings = window.quizInitialData.settings || {};
        quizQuestions = window.quizInitialData.questions || [];

        // Check if there is a completed state in localStorage
        const storageKey = `gwl_quiz_state_${config.quizId || 'general'}`;
        try {
          const savedStateRaw = localStorage.getItem(storageKey);
          if (savedStateRaw) {
            const savedState = JSON.parse(savedStateRaw);
            if (savedState && savedState.completed) {
              const currentSig = getQuestionsSignature(quizQuestions);
              if (savedState.questionsSignature === currentSig) {
                console.log('[Quiz] Restoring completed state (preloaded)');
                restoreCompletedState(savedState);
                return;
              } else {
                console.log('[Quiz] Questions changed, clearing completed state');
                localStorage.removeItem(storageKey);
              }
            }
          }
        } catch (e) {
          console.error('[Quiz] Error restoring completed state:', e);
        }

        applyCustomCss(settings.customCss);
        applyCustomJs(settings.customJs);

        renderQuestions(quizQuestions);
        if (loadingEl) loadingEl.style.display = 'none';

        const hasLeadForm = hasLeadFormEnabled();
        if (!hasLeadForm) {
          if (formEl) formEl.style.display = 'block';
          applySettings(settings, 'quiz');
        } else if (settings.registrationFormPosition === 'after_quiz') {
          if (formEl) formEl.style.display = 'block';
          applySettings(settings, 'quiz');
        } else {
          applySettings(settings, 'form');
          if (leadFormEl) leadFormEl.style.display = 'block';
        }
        return;
      }

      const quizParam = config.quizId ? `?quizId=${encodeURIComponent(config.quizId)}` : '';
      // Fetch from App Proxy
      const response = await fetch(`${config.appProxyUrl}/api/quiz${quizParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const serverMessage =
          typeof errData.error === "string" ? errData.error : null;
        if (response.status === 404) {
          throw new Error(serverMessage || "Quiz not found for the supplied Quiz ID");
        }
        if (serverMessage) {
          throw new Error(serverMessage);
        }
        throw new Error(`Failed to load questions (${response.status})`);
      }

      const data = await response.json();

      if (!data.questions || data.questions.length === 0) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
          errorEl.textContent = t('loading.noQuestions');
          errorEl.style.display = 'block';
        }
        return;
      }

      settings = data.settings || {};
      quizQuestions = data.questions || [];

      // Check if there is a completed state in localStorage
      const storageKey = `gwl_quiz_state_${config.quizId || 'general'}`;
      try {
        const savedStateRaw = localStorage.getItem(storageKey);
        if (savedStateRaw) {
          const savedState = JSON.parse(savedStateRaw);
          if (savedState && savedState.completed) {
            const currentSig = getQuestionsSignature(quizQuestions);
            if (savedState.questionsSignature === currentSig) {
              console.log('[Quiz] Restoring completed state (fetched)');
              restoreCompletedState(savedState);
              return;
            } else {
              console.log('[Quiz] Questions changed, clearing completed state');
              localStorage.removeItem(storageKey);
            }
          }
        }
      } catch (e) {
        console.error('[Quiz] Error restoring completed state:', e);
      }

      applyCustomCss(settings.customCss);
      applyCustomJs(settings.customJs);

      renderQuestions(quizQuestions);
      if (loadingEl) loadingEl.style.display = 'none';

      const hasLeadForm = hasLeadFormEnabled();
      if (!hasLeadForm) {
        if (formEl) formEl.style.display = 'block';
        applySettings(settings, 'quiz');
      } else if (settings.registrationFormPosition === 'after_quiz') {
        if (formEl) formEl.style.display = 'block';
        applySettings(settings, 'quiz');
      } else {
        applySettings(settings, 'form');
        if (leadFormEl) leadFormEl.style.display = 'block';
      }

    } catch (error) {
      console.error('Error loading quiz:', error);
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl) {
        errorEl.textContent = error.message || t('errors.loadFailed');
        errorEl.style.display = 'block';
      }
    }
  }

  // Handle Start Quiz / Final Submit button
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      if (!hasLeadFormEnabled()) return;

      const nameInput = container.querySelector('.gwl-quiz-input-name');
      const emailInput = container.querySelector('.gwl-quiz-input-email');

      const nameRequired = settings.showNameField !== false;
      const emailRequired = settings.showEmailField !== false;

      clearLeadFormErrors();

      if (nameRequired && nameInput && !nameInput.value.trim()) {
        showFieldError(nameInput, t('form.validation.nameRequired'));
        nameInput.focus();
        return;
      }

      if (emailRequired && emailInput && !emailInput.value.trim()) {
        showFieldError(emailInput, t('form.validation.emailRequired'));
        emailInput.focus();
        return;
      }

      if (emailRequired && emailInput && !emailInput.checkValidity()) {
        showFieldError(emailInput, t('form.validation.emailInvalid'));
        emailInput.focus();
        return;
      }

      clearSubmitError();

      leadData.name = (nameRequired && nameInput) ? nameInput.value : 'Anonymous';
      leadData.email = (emailRequired && emailInput) ? emailInput.value : 'anonymous@example.com';

      if (settings.registrationFormPosition === 'after_quiz') {
        submitQuizFinal();
      } else {
        if (leadFormEl) leadFormEl.style.display = 'none';
        if (formEl) formEl.style.display = 'block';
        applySettings(settings, 'quiz');
      }
    });
  }

  setupLeadFormValidation();

  // Handle Submit Final
  async function submitQuizFinal() {
    const btn = startBtn;
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('navigation.submitting');
    }

    clearSubmitError();

    const formData = new FormData(formEl);
    const grouped = new Map();

    for (const [questionId, answer] of formData.entries()) {
      if (!grouped.has(questionId)) grouped.set(questionId, []);
      grouped.get(questionId).push(answer);
    }

    try {
      const answers = [];
      for (const [questionId, answerValues] of grouped.entries()) {
        const answer = answerValues.length > 1 ? answerValues : answerValues[0];
        answers.push({ questionId, answer });
      }

      const payload = {
        ...getSubmitIdentity(),
        customerId: config.customerId || null,
        shop: config.shopDomain,
        quizId: config.quizId || '',
        answers
      };

      const submitEndpoint = (window.quizAppConfig && window.quizAppConfig.submitUrl)
        ? window.quizAppConfig.submitUrl
        : `${config.appProxyUrl}/api/quiz/submit`;
      console.log('[Quiz] Using submit endpoint:', submitEndpoint);

      const response = await fetch(submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Submission failed');

      const result = await response.json();

      if (formEl) formEl.style.display = 'none';
      if (leadFormEl) leadFormEl.style.display = 'none';
      showingPostQuizForm = false;
      if (successEl) successEl.style.display = 'block';
      applySettings(settings, 'thanks');

      // Render recommended products if any were returned
      const recommendations = result.recommendations || [];
      if (recommendations.length > 0) {
        renderRecommendations(recommendations);
      }

      saveQuizCompletionState(recommendations, payload.answers);
      addStartOverButton();

    } catch (error) {
      console.error('Error submitting quiz:', error);
      showSubmitError(t('errors.submitFailed'));
      if (btn) {
        btn.disabled = false;
        btn.textContent = t('navigation.submit');
      }
    }
  }

  function normalizeQuizCssSelectors(css) {
    if (!css) return '';
    var normalized = css.replace(/(^|[\s,{])(gwl-quiz-[a-zA-Z0-9_-]+)/g, function (match, prefix, className, offset) {
      var charBefore = offset > 0 ? css[offset - 1] : '';
      if (charBefore === '.') return match;
      return prefix + '.' + className;
    });
    return normalized.replace(
      /\.gwl-quiz-container\s+\.gwl-quiz-theme-premium/g,
      '.gwl-quiz-container.gwl-quiz-theme-premium'
    );
  }

  function ensureCssOverridesWin(css) {
    if (!css) return '';
    return css.replace(/(^|\n)(\s*)([a-zA-Z-]+)\s*:\s*([^;]+);/g, function (match, prefix, indent, prop, value) {
      if (value.includes('!important')) return match;
      return prefix + indent + prop + ': ' + value.trim() + ' !important;';
    });
  }

  function applyCustomCss(css) {
    const styleId = 'gwl-quiz-custom-css-' + container.id;
    const existingStyle = document.getElementById(styleId);
    if (!css) {
      if (existingStyle) existingStyle.remove();
      return;
    }

    const containerSelector = '#' + container.id + '.gwl-quiz-container';
    let scopedCss = normalizeQuizCssSelectors(css).replace(/\.gwl-quiz-container(?![a-zA-Z0-9_-])/g, containerSelector);
    scopedCss = ensureCssOverridesWin(scopedCss);

    let style = existingStyle;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = scopedCss;
  }

  function applyCustomJs(js) {
    if (!js) return;

    try {
      // Remove any existing custom script
      const existingScript = container.querySelector("#gwl-quiz-custom-js");
      if (existingScript) existingScript.remove();

      const script = document.createElement("script");
      script.id = "gwl-quiz-custom-js";
      script.textContent = js;

      container.appendChild(script);
    } catch (e) {
      console.error("Custom JS Error:", e);
    }
  }

  function parseGoogleFontName(fontFamily) {
    if (!fontFamily || fontFamily === 'inherit' || fontFamily.includes('system-ui')) {
      return null;
    }
    var primary = fontFamily.split(',')[0];
    if (!primary) return null;
    return primary.trim().replace(/^['"]|['"]$/g, '');
  }

  function getGoogleFontSpec(fontFamily) {
    if (!fontFamily) return null;
    var name = parseGoogleFontName(fontFamily);
    if (!name) return null;
    return 'family=' + encodeURIComponent(name).replace(/%20/g, '+') + ':wght@300;400;500;700';
  }

  function ensureGoogleFontsLoaded(...fontFamilies) {
    const specs = [...new Set(fontFamilies.map(getGoogleFontSpec).filter(Boolean))];
    const linkId = 'gwl-quiz-google-fonts';
    const existing = document.getElementById(linkId);

    if (specs.length === 0) {
      if (existing) existing.remove();
      return;
    }

    const url = 'https://fonts.googleapis.com/css2?' + specs.join('&') + '&display=swap';
    if (existing) {
      if (existing.href !== url) existing.href = url;
      return;
    }

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }

  function applySettings(s, view) {
    ensureGoogleFontsLoaded(s.formFontFamily, s.quizFontFamily);
    const formBg = s.formBackgroundColor || '#ffffff';
    const formText = s.formTextColor || '#111111';
    const quizBg = s.quizBackgroundColor || '#ffffff';
    const quizText = s.quizTextColor || '#111111';
    const thankYouBg = s.thankYouBackgroundColor || s.quizBackgroundColor || '#ffffff';
    const thankYouText = s.thankYouTextColor || s.quizTextColor || '#111111';
    // Helpers
    const getWidthValue = (w) => {
      if (w === 'contained') return '800px';
      if (w === 'compact') return '600px';
      return '100%';
    };

    const getRadiusValue = (r) => {
      if (!r) return '8px';
      if (r === 'small') return '4px';
      if (r === 'large') return '16px';
      if (r === 'medium') return '8px';
      if (typeof r === 'string' && (r.includes('px') || r.includes('rem') || r.includes('%'))) return r;
      if (!isNaN(r)) return r + 'px';
      return r;
    };

    // Determine current view
    const currentView = view || (leadFormEl && leadFormEl.style.display !== 'none' ? 'form' : 'quiz');

    // Premium layout is always on; merchants can optionally use native answer controls.
    container.classList.add('gwl-quiz-theme-premium');
    if (s.optionInputStyle === 'native') {
      container.classList.add('gwl-quiz-native-inputs');
    } else {
      container.classList.remove('gwl-quiz-native-inputs');
    }

    // Apply View-Specific Shared Variables to the main container
    if (currentView === 'form') {
      container.style.setProperty('--quiz-container-width', getWidthValue(s.formWidth));
      container.style.setProperty('--quiz-container-radius', getRadiusValue(s.formOuterBorderRadius));
      container.style.setProperty('--quiz-container-align', s.formContentAlignment || 'left');
      container.style.backgroundColor = formBg;
      container.style.color = formText;
      container.style.fontSize = s.formFontSize || 'inherit';
      container.style.fontFamily = s.formFontFamily || 'inherit';
      container.style.fontWeight = s.formFontWeight || 'normal';
      container.style.fontStyle = 'normal';

      // Always center the start button to match Hydrogen and storefront design preference
      if (showingPostQuizForm) {
        container.style.setProperty('--quiz-start-btn-margin-left', 'auto');
        container.style.setProperty('--quiz-start-btn-margin-right', '0');
      } else {
        container.style.setProperty('--quiz-start-btn-margin-left', 'auto');
        container.style.setProperty('--quiz-start-btn-margin-right', 'auto');
      }
    } else if (currentView === 'thanks') {
      container.style.setProperty('--quiz-container-width', getWidthValue(s.quizWidth));
      container.style.setProperty('--quiz-container-radius', getRadiusValue(s.quizOuterBorderRadius));
      container.style.setProperty('--quiz-container-align', s.thankYouContentAlignment || s.quizContentAlignment || 'left');
      container.style.backgroundColor = '#ffffff';
      container.style.color = thankYouText;
      container.style.fontSize = s.quizFontSize || 'inherit';
      container.style.fontFamily = s.quizFontFamily || 'inherit';
      container.style.fontWeight = s.quizFontWeight || 'normal';
      container.style.fontStyle = 'normal';
    } else {
      container.style.setProperty('--quiz-container-width', getWidthValue(s.quizWidth));
      container.style.setProperty('--quiz-container-radius', getRadiusValue(s.quizOuterBorderRadius));
      container.style.setProperty('--quiz-container-align', s.quizContentAlignment || 'left');
      container.style.backgroundColor = quizBg;
      container.style.color = quizText;
      container.style.fontSize = s.quizFontSize || 'inherit';
      container.style.fontFamily = s.quizFontFamily || 'inherit';
      container.style.fontWeight = s.quizFontWeight || 'normal';
      container.style.fontStyle = 'normal';

      const align = s.quizContentAlignment || 'left';
      if (align === 'center') {
        container.style.setProperty('--quiz-option-justify', 'center');
        container.style.setProperty('--quiz-option-span-flex', 'initial');
      } else if (align === 'right') {
        container.style.setProperty('--quiz-option-justify', 'flex-end');
        container.style.setProperty('--quiz-option-span-flex', 'initial');
      } else {
        container.style.setProperty('--quiz-option-justify', 'flex-start');
        container.style.setProperty('--quiz-option-span-flex', '1');
      }
    }

    // Set other variables for internal elements - scoped to the container!
    if (s.quizPrimaryColor) container.style.setProperty('--quiz-primary-color', s.quizPrimaryColor);
    if (s.buttonTextColor) container.style.setProperty('--quiz-btn-text-color', s.buttonTextColor);
    if (s.quizBorderRadius) {
      const radiusVal = getRadiusValue(s.quizBorderRadius);
      container.style.setProperty('--quiz-border-radius', radiusVal);
    }

    const navBtnSizing = {
      small: { height: '40px', minWidth: '140px', padding: '0 20px', fontSize: '14px' },
      medium: { height: '48px', minWidth: '160px', padding: '0 24px', fontSize: '16px' },
      large: { height: '56px', minWidth: '180px', padding: '0 28px', fontSize: '18px' }
    };

    const navSizeKey = s.navigationButtonSize || 'medium';
    const navSizing = navBtnSizing[navSizeKey] || navBtnSizing.medium;

    container.style.setProperty('--quiz-nav-btn-height', navSizing.height);
    container.style.setProperty('--quiz-nav-btn-min-width', navSizing.minWidth);
    container.style.setProperty('--quiz-nav-btn-padding', navSizing.padding);
    container.style.setProperty('--quiz-nav-btn-font-size', navSizing.fontSize);

    container.style.setProperty('--form-bg-color', formBg);
    container.style.setProperty('--form-text-color', formText);
    container.style.setProperty('--form-font-family', s.formFontFamily || 'inherit');
    container.style.setProperty('--form-font-size', s.formFontSize || 'inherit');
    container.style.setProperty('--form-font-weight', s.formFontWeight || 'normal');

    container.style.setProperty('--quiz-bg-color', quizBg);
    container.style.setProperty('--quiz-text-color', quizText);
    container.style.setProperty('--quiz-font-family', s.quizFontFamily || 'inherit');
    container.style.setProperty('--quiz-font-size', s.quizFontSize || 'inherit');
    container.style.setProperty('--quiz-font-weight', s.quizFontWeight || 'normal');

    container.style.setProperty('--thank-you-bg-color', thankYouBg);
    container.style.setProperty('--thank-you-text-color', thankYouText);

    if (currentView === 'form') {
      container.style.setProperty('--quiz-text-color', formText);
      container.style.setProperty('--quiz-bg-color', formBg);
    } else if (currentView === 'thanks') {
      container.style.setProperty('--quiz-text-color', thankYouText);
      container.style.setProperty('--quiz-bg-color', thankYouBg);
    }
    
    // Custom fill color for selected options (always active in premium)
    if (s.optionSelectionBgColor) {
      container.style.setProperty('--quiz-option-selection-bg-color', s.optionSelectionBgColor);
    }

    container.style.setProperty('--quiz-image-card-size', getImageCardSizeValue(s.imageCardSize || s.imageSize));

    // Legacy product-image slider dimensions (non–visual-card contexts)
    if (s.imageSize) {
      let width = '200px', height = '150px', minGridWidth = '150px';

      if (s.imageSize === 'extra-small') {
        width = '100px'; height = '80px'; minGridWidth = '80px';
      } else if (s.imageSize === 'small') {
        width = '150px'; height = '120px'; minGridWidth = '120px';
      } else if (s.imageSize === 'medium') {
        width = '200px'; height = '150px'; minGridWidth = '150px';
      } else if (s.imageSize === 'large') {
        width = '300px'; height = '225px'; minGridWidth = '200px';
      } else if (s.imageSize === 'extra-large') {
        width = '450px'; height = '340px'; minGridWidth = '300px';
      }

      container.style.setProperty('--quiz-image-width', width);
      container.style.setProperty('--quiz-image-height', height);
      container.style.setProperty('--quiz-grid-item-min-width', minGridWidth);
    }

    // Question Card Settings
    if (currentView === 'quiz') {
      if (quizBg && quizBg !== '#ffffff') {
        container.style.setProperty('--question-card-bg', 'rgba(255,255,255,0.05)');
      } else {
        container.style.setProperty('--question-card-bg', 'white');
      }
    }

    // Form specific updates
    if (leadFormEl) {
      if (s.enableLeadForm === false) {
        leadFormEl.style.display = 'none';
      }

      const heading = container.querySelector('.gwl-quiz-heading');
      if (heading && (s.formHeading || t('form.heading'))) heading.textContent = s.formHeading || t('form.heading');

      const subheading = leadFormEl.querySelector('.gwl-quiz-subheading');
      if (subheading && (s.formSubheading || t('form.subheading'))) subheading.textContent = s.formSubheading || t('form.subheading');

      // Start Button / Lead Form Button
      if (startBtn) {
        if (s.registrationFormPosition === 'after_quiz') {
          startBtn.textContent = t('navigation.submit');
        } else {
          startBtn.textContent = t('navigation.start');
        }
        container.style.setProperty('--start-btn-bg', s.quizPrimaryColor || '#111827');
        if (s.startButtonTextColor) container.style.setProperty('--start-btn-text', s.startButtonTextColor);
      }

      // Fields Visibility
      const nameGroup = container.querySelector('.gwl-quiz-input-name')?.closest('.gwl-quiz-form-group');
      const emailGroup = container.querySelector('.gwl-quiz-input-email')?.closest('.gwl-quiz-form-group');
      if (nameGroup) nameGroup.style.display = s.showNameField === false ? 'none' : 'block';
      if (emailGroup) emailGroup.style.display = s.showEmailField === false ? 'none' : 'block';

      // Fields Labels and Placeholders
      const nameLabel = nameGroup ? nameGroup.querySelector('label') : null;
      if (nameLabel) nameLabel.textContent = s.nameFieldLabel || t('form.nameLabel');

      const emailLabel = emailGroup ? emailGroup.querySelector('label') : null;
      if (emailLabel) emailLabel.textContent = s.emailFieldLabel || t('form.emailLabel');

      const nameInput = container.querySelector('.gwl-quiz-input-name');
      if (nameInput) {
        if (s.namePlaceholder || t('form.namePlaceholder')) nameInput.placeholder = s.namePlaceholder || t('form.namePlaceholder');
      }

      const emailInput = container.querySelector('.gwl-quiz-input-email');
      if (emailInput) {
        if (s.emailPlaceholder || t('form.emailPlaceholder')) emailInput.placeholder = s.emailPlaceholder || t('form.emailPlaceholder');
      }

      ensureLeadFormFieldAccessibility();

      const resultsHeading = successEl ? successEl.querySelector('.gwl-quiz-heading') : null;
      const resultsBody = successEl ? successEl.querySelector('.gwl-quiz-subheading') : null;
      if (resultsHeading && (s.thankYouHeading || t('results.thankYouHeading'))) {
        resultsHeading.textContent = s.thankYouHeading || t('results.thankYouHeading');
      }
      if (resultsHeading) {
        resultsHeading.style.color = thankYouText;
      }
      if (resultsBody && (s.thankYouBody || t('results.thankYouBody'))) {
        resultsBody.textContent = s.thankYouBody || t('results.thankYouBody');
      }
      if (resultsBody) {
        resultsBody.style.color = thankYouText;
      }
    }

    applyButtonStyles(s);
    applyCustomCss(settings.customCss);
  }

  function applyButtonStyles(s) {
    const btnVariants = ['gwl-quiz-btn--solid', 'gwl-quiz-btn--outline', 'gwl-quiz-btn--gradient'];
    const formBtnStyle = s.formButtonStyle || 'solid';
    const quizBtnStyle = s.buttonStyle || 'solid';

    if (startBtn) {
      startBtn.classList.remove(...btnVariants);
      startBtn.classList.add(`gwl-quiz-btn--${formBtnStyle}`);
    }

    container.querySelectorAll('.gwl-quiz-submit-btn, .gwl-quiz-next-btn, .gwl-quiz-prev-btn').forEach((btn) => {
      btn.classList.remove(...btnVariants);
      btn.classList.add(`gwl-quiz-btn--${quizBtnStyle}`);
    });

    container.querySelectorAll('.gwl-quiz-start-over-btn').forEach((btn) => {
      btn.classList.remove(...btnVariants);
      btn.classList.add(`gwl-quiz-btn--${formBtnStyle}`);
    });
  }

  function updateProgress() {
    if (!settings.showProgressBar) return;

    const style = settings.progressStyle || 'line';
    const answeredCount = formEl.querySelectorAll('.gwl-quiz-question-card:has(input:checked), .gwl-quiz-question-card:has(select:not([value=""]))').length;

    // Premium segmented progress
    {
      const progressWrapper = container.querySelector('.gwl-quiz-premium-progress-wrapper');
      const progressTextEl = progressWrapper?.querySelector('.gwl-quiz-progress-text');
      const progressTrackEl = progressWrapper?.querySelector('.gwl-quiz-progress-track');
      const progressBarEl = progressWrapper?.querySelector('.gwl-quiz-progress-bar-premium');
      
      const currentQuestionNum = Math.min(currentStep * questionsPerPage + 1, totalQuestions);
      const progressPercent = totalSteps > 1 ? Math.round((currentStep / (totalSteps - 1)) * 100) : 100;
      const progressScale = Math.max(0, Math.min(1, progressPercent / 100));
      const progressColor =
        settings.quizPrimaryColor ||
        getComputedStyle(container).getPropertyValue('--quiz-primary-color').trim() ||
        '#111827';
      
      if (progressTextEl) {
        progressTextEl.innerHTML = `<span>${t('progress.questionOf', { current: currentQuestionNum, total: totalQuestions })}</span><span>${progressPercent}%</span>`;
      }
      
      if (progressTrackEl) {
        progressTrackEl.style.setProperty('--quiz-progress-scale', String(progressScale));
      }

      if (progressBarEl) {
        progressBarEl.style.setProperty('background-color', progressColor, 'important');
        progressBarEl.style.setProperty('--quiz-progress-scale', String(progressScale));
        progressBarEl.setAttribute('aria-valuenow', String(progressPercent));
      }
    }

    // Percentage style
    const percentageEl = container.querySelector('.gwl-quiz-progress-percentage');
    if (percentageEl && style === 'percentage') {
      const percentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
      percentageEl.textContent = t('progress.percentCompleted', { percent: percentage });
    }

    // Dots style
    const dotsContainer = container.querySelector('.gwl-quiz-progress-dots');
    if (dotsContainer && style === 'dots') {
      const dots = dotsContainer.querySelectorAll('.gwl-quiz-progress-dot');
      dots.forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i === currentStep) dot.classList.add('active');
        else if (i < currentStep) dot.classList.add('completed');
      });
    }
  }

  function getQuestionValidationMessage(q) {
    if (q.type === 'CHECKBOX' || q.type === 'DROPDOWN_MULTI') {
      return t('validation.selectAtLeastOne');
    }
    return t('validation.selectOption');
  }

  function createInlineError(message, extraClass) {
    const err = document.createElement('p');
    err.className = extraClass
      ? `gwl-quiz-inline-error ${extraClass}`
      : 'gwl-quiz-inline-error';
    err.setAttribute('role', 'alert');
    err.textContent = message;
    return err;
  }

  function showFieldError(fieldEl, message) {
    if (!fieldEl) return;
    const group = fieldEl.closest('.gwl-quiz-form-group') || fieldEl.parentElement;
    if (!group) return;

    fieldEl.classList.add('gwl-quiz-input--invalid');
    fieldEl.setAttribute('aria-invalid', 'true');

    let err = group.querySelector('.gwl-quiz-field-error');
    if (!err) {
      err = createInlineError(message, 'gwl-quiz-field-error');
      group.appendChild(err);
    } else {
      err.textContent = message;
    }

    if (!err.id) {
      err.id = `gwl-field-error-${Math.random().toString(36).slice(2, 9)}`;
    }
    fieldEl.setAttribute('aria-describedby', err.id);
  }

  function clearFieldError(fieldEl) {
    if (!fieldEl) return;
    const group = fieldEl.closest('.gwl-quiz-form-group') || fieldEl.parentElement;
    fieldEl.classList.remove('gwl-quiz-input--invalid');
    fieldEl.removeAttribute('aria-invalid');
    fieldEl.removeAttribute('aria-describedby');
    group?.querySelector('.gwl-quiz-field-error')?.remove();
  }

  function clearLeadFormErrors() {
    if (!leadFormEl) return;
    leadFormEl.querySelectorAll('.gwl-quiz-field-error, .gwl-quiz-form-error').forEach((el) => el.remove());
    leadFormEl.querySelectorAll('.gwl-quiz-input--invalid').forEach((input) => {
      input.classList.remove('gwl-quiz-input--invalid');
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    });
  }

  function setupLeadFormValidation() {
    if (!leadFormEl) return;
    leadFormEl.querySelectorAll('.gwl-quiz-input-name, .gwl-quiz-input-email').forEach((input) => {
      input.addEventListener('input', () => clearFieldError(input));
    });
  }

  function showSubmitError(message) {
    clearSubmitError();
    const err = createInlineError(message, 'gwl-quiz-submit-error');
    const nav = container.querySelector('.gwl-quiz-nav-buttons');

    if (leadFormEl && leadFormEl.style.display !== 'none') {
      const startButton = leadFormEl.querySelector('.gwl-quiz-start-btn');
      if (startButton) {
        startButton.insertAdjacentElement('beforebegin', err);
        return;
      }
      leadFormEl.appendChild(err);
      return;
    }

    if (nav && nav.style.display !== 'none') {
      nav.insertAdjacentElement('beforebegin', err);
      return;
    }

    if (formEl && formEl.style.display !== 'none') {
      formEl.insertBefore(err, formEl.firstChild);
      return;
    }

    container.insertBefore(err, container.firstChild);
  }

  function clearSubmitError() {
    container.querySelectorAll('.gwl-quiz-submit-error').forEach((el) => el.remove());
  }

  function showLimitError(card, limit) {
    if (!card) return;
    clearLimitError(card);
    const optionsDiv = card.querySelector('.gwl-quiz-options');
    const err = createInlineError(
      t('validation.selectionLimit', { max: limit }),
      'gwl-quiz-limit-error',
    );
    if (optionsDiv) {
      optionsDiv.insertAdjacentElement('afterend', err);
    } else {
      card.appendChild(err);
    }
  }

  function clearLimitError(card) {
    card?.querySelector('.gwl-quiz-limit-error')?.remove();
  }

  function showProductError(actionPanel, message) {
    if (!actionPanel) return;
    let err = actionPanel.querySelector('.gwl-quiz-product-error');
    if (!err) {
      err = createInlineError(message, 'gwl-quiz-product-error');
      actionPanel.insertBefore(err, actionPanel.firstChild);
    } else {
      err.textContent = message;
    }
  }

  function clearQuestionValidationError(card) {
    if (!card) return;
    card.classList.remove('gwl-quiz-question-card--invalid');
    card.querySelector('.gwl-quiz-question-error')?.remove();
  }

  function clearQuestionError(card) {
    if (!card) return;
    clearQuestionValidationError(card);
    clearLimitError(card);
  }

  function clearAllQuestionErrors() {
    if (!questionsEl) return;
    questionsEl.querySelectorAll('.gwl-quiz-question-card').forEach(clearQuestionError);
  }

  function showQuestionError(card, message) {
    if (!card) return;
    card.classList.add('gwl-quiz-question-card--invalid');
    let err = card.querySelector('.gwl-quiz-question-error');
    if (!err) {
      err = createInlineError(message, 'gwl-quiz-question-error');
      const optionsDiv = card.querySelector('.gwl-quiz-options');
      if (optionsDiv) {
        optionsDiv.insertAdjacentElement('afterend', err);
      } else {
        card.appendChild(err);
      }
    }
    err.textContent = message;
  }

  function validateCurrentStep() {
    clearAllQuestionErrors();

    const formData = new FormData(formEl);
    const grouped = new Map();

    for (const [questionId, answer] of formData.entries()) {
      if (answer !== "") {
        if (!grouped.has(questionId)) grouped.set(questionId, []);
        grouped.get(questionId).push(answer);
      }
    }

    const startIndex = currentStep * questionsPerPage;
    const endIndex = Math.min(startIndex + questionsPerPage, totalQuestions);
    let firstInvalidCard = null;
    let isValid = true;

    for (let i = startIndex; i < endIndex; i++) {
      const q = quizQuestions[i];
      if (!q) continue;

      const hasAnswer = grouped.has(q.id) && grouped.get(q.id).length > 0;
      if (!hasAnswer) {
        isValid = false;
        const card = questionsEl.querySelector(`[data-question-id="${q.id}"]`);
        showQuestionError(card, getQuestionValidationMessage(q));
        if (!firstInvalidCard && card) {
          firstInvalidCard = card;
        }
      }
    }

    if (!isValid && firstInvalidCard) {
      firstInvalidCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    return true;
  }

  function goToStep(stepIndex) {
    const questions = questionsEl.querySelectorAll('.gwl-quiz-question-card');
    if (stepIndex < 0 || stepIndex >= totalSteps) return;

    // Validate current step before moving forward
    if (stepIndex > currentStep) {
      if (!validateCurrentStep()) return;
    } else {
      clearAllQuestionErrors();
    }

    const isNext = stepIndex > currentStep;
    const animationClass = isNext ? 'slide-left' : 'slide-right';

    // Update visibility
    questions.forEach((q, i) => {
      q.classList.add('hidden');
      q.classList.remove('fade-in', 'slide-left', 'slide-right');
      const qStep = Math.floor(i / questionsPerPage);
      if (qStep === stepIndex) {
        q.classList.remove('hidden');
        q.classList.add(animationClass);
      }
    });

    currentStep = stepIndex;
    updateProgress();
    updateNavButtons();
  }

  function updateNavButtons() {
    const navButtons = container.querySelector('.gwl-quiz-nav-buttons');
    if (!navButtons) return;

    const backBtn = navButtons.querySelector('.gwl-quiz-prev-btn');
    const nextBtn = navButtons.querySelector('.gwl-quiz-next-btn');
    const submitBtn = navButtons.querySelector('button[type="submit"]') || formEl.querySelector('button[type="submit"]');

    const isSingleQuestionMode = (questionsPerPage === 1);

    if (backBtn) {
      backBtn.textContent = isSingleQuestionMode ? t('navigation.previous') : t('navigation.back');
      backBtn.style.display = 'block';
      backBtn.disabled = (currentStep === 0);
      if (currentStep === 0) {
        backBtn.classList.add('disabled');
      } else {
        backBtn.classList.remove('disabled');
      }
    }

    if (nextBtn) {
      const formAfterQuiz = isFormAfterQuiz();

      if (showingPostQuizForm) {
        nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'none';
      } else if (currentStep === totalSteps - 1 && formAfterQuiz) {
        nextBtn.style.display = 'block';
        nextBtn.textContent = t('navigation.next');
        if (submitBtn) submitBtn.style.display = 'none';
      } else if (currentStep === totalSteps - 1) {
        nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'block';
      } else {
        nextBtn.style.display = 'block';
        if (submitBtn) submitBtn.style.display = 'none';
      }
    }
  }

  function renderQuestions(questions) {
    totalQuestions = questions.length;
    const displayMode = settings.quizDisplayMode || 'step';

    if (displayMode === 'all') {
      questionsPerPage = totalQuestions;
    } else if (displayMode === '2') {
      questionsPerPage = 2;
    } else if (displayMode === '3') {
      questionsPerPage = 3;
    } else {
      questionsPerPage = 1; // 'step'
    }

    totalSteps = Math.ceil(totalQuestions / questionsPerPage);

    // Safely move submit button back to formEl if it exists to avoid it being cleared
    const existingSubmitBtn = questionsEl.querySelector('button[type="submit"]');
    if (existingSubmitBtn && formEl) {
      formEl.appendChild(existingSubmitBtn);
    }

    questionsEl.innerHTML = ''; // Clear existing

    // Progress Indicators
    if (settings.showProgressBar) {
      const style = settings.progressStyle || 'line';

      const wrapper = document.createElement('div');
      wrapper.className = 'gwl-quiz-premium-progress-wrapper';
      
      const progressText = document.createElement('div');
      progressText.className = 'gwl-quiz-progress-text';
      progressText.innerHTML = `<span>Question 1 of ${totalQuestions}</span><span>0%</span>`;
      wrapper.appendChild(progressText);

      const progressContainer = document.createElement('div');
      progressContainer.className = 'gwl-quiz-progress-container';

      const progressTrack = document.createElement('div');
      progressTrack.className = 'gwl-quiz-progress-track';

      const progressBar = document.createElement('div');
      progressBar.className = 'gwl-quiz-progress-bar gwl-quiz-progress-bar-premium';
      progressBar.setAttribute('role', 'progressbar');
      progressBar.setAttribute('aria-valuemin', '0');
      progressBar.setAttribute('aria-valuemax', '100');
      progressBar.setAttribute('aria-valuenow', '0');
      progressBar.style.setProperty('--quiz-progress-scale', '0');

      progressTrack.appendChild(progressBar);
      progressContainer.appendChild(progressTrack);

      wrapper.appendChild(progressContainer);
      questionsEl.appendChild(wrapper);
    }

    questions.forEach((q, index) => {
      const qDiv = document.createElement('div');
      qDiv.className = `gwl-quiz-question-card gwl-quiz-question-card--${settings.questionCardStyle || 'shadow'}`;
      qDiv.setAttribute('data-question-id', q.id);
      qDiv.setAttribute('data-question-index', index);

      const qStep = Math.floor(index / questionsPerPage);
      if (displayMode !== 'all' && qStep !== 0) {
        qDiv.classList.add('hidden');
      }

      if (settings.showQuestionNumbers) {
        const qNum = document.createElement('div');
        qNum.className = 'gwl-quiz-question-number';
        qNum.textContent = t('progress.questionOf', { current: index + 1, total: totalQuestions });
        qDiv.appendChild(qNum);
      }

      const title = document.createElement('h3');
      title.textContent = q.text;
      qDiv.appendChild(title);

      const optionsDiv = document.createElement('div');
      const rawOpts = Array.isArray(q.options) ? q.options : [];
      const optionType = q.optionType || 'text';
      const isImage = optionType === 'image';
      const displayStyle = settings.optionDisplayStyle || 'default';
      const layoutDir = settings.layoutDirection || 'vertical';
      const isDropdown = q.type === 'DROPDOWN' || q.type === 'DROPDOWN_MULTI';
      const useNativeInputs = settings.optionInputStyle === 'native' && optionType !== 'image';

      if (useNativeInputs && !isDropdown) {
        optionsDiv.className = 'gwl-quiz-options gwl-quiz-options--native';
      } else {
        optionsDiv.className = `gwl-quiz-options gwl-quiz-options--${displayStyle} gwl-quiz-options--${layoutDir}`;
      }

      const optionsPerRowSetting = normalizeOptionsPerRowSetting(settings.optionsPerRow);
      const fitWidthLayout = isFitWidthOptionsPerRow(optionsPerRowSetting);
      let desktopCols = 1;
      if (!fitWidthLayout) {
        desktopCols = parseInt(optionsPerRowSetting, 10) || 1;
      }
      const tabletCols = Math.min(2, desktopCols);
      const mobileCols = 1;

      if (isDropdown) {
        optionsDiv.style.setProperty('grid-template-columns', 'repeat(1, minmax(0, 1fr))', 'important');
      } else if (useNativeInputs) {
        optionsDiv.style.setProperty('grid-template-columns', 'repeat(1, minmax(0, 1fr))', 'important');
        optionsDiv.style.setProperty('display', 'flex', 'important');
        optionsDiv.style.setProperty('flex-direction', 'column', 'important');
      } else if (isImage) {
        optionsDiv.classList.remove('gwl-quiz-options--single-col');
        optionsDiv.style.removeProperty('grid-template-columns');
        const imageLayoutMode = getImageLabelLayoutMode();
        if (imageLayoutMode === 'inline-left') {
          optionsDiv.classList.add('gwl-quiz-options--image-inline-left');
        } else if (imageLayoutMode === 'inline-right') {
          optionsDiv.classList.add('gwl-quiz-options--image-inline-right');
        }
        if (fitWidthLayout) {
          optionsDiv.classList.add('gwl-quiz-options--fit-width', 'gwl-quiz-options--image-fit-width');
          optionsDiv.style.setProperty('--quiz-option-fit-min', getImageOptionBasis());
          optionsDiv.style.setProperty('--quiz-image-option-basis', getImageOptionBasis());
        } else {
          optionsDiv.classList.add('gwl-quiz-options--image-one-per-row', 'gwl-quiz-options--single-col');
          const useInlineColumnGrid =
            imageLayoutMode === 'inline-left' || imageLayoutMode === 'inline-right';
          if (!useInlineColumnGrid) {
            optionsDiv.style.setProperty('display', 'flex', 'important');
            optionsDiv.style.setProperty('flex-direction', 'column', 'important');
            optionsDiv.style.setProperty('flex-wrap', 'nowrap', 'important');
            optionsDiv.style.setProperty('align-items', 'var(--quiz-option-justify, flex-start)', 'important');
          } else {
            optionsDiv.style.removeProperty('display');
            optionsDiv.style.removeProperty('flex-direction');
            optionsDiv.style.removeProperty('flex-wrap');
            optionsDiv.style.removeProperty('align-items');
          }
        }
      } else if (fitWidthLayout) {
        optionsDiv.classList.add('gwl-quiz-options--fit-width');
        optionsDiv.classList.remove('gwl-quiz-options--single-col');
        optionsDiv.style.removeProperty('grid-template-columns');
        optionsDiv.style.setProperty('--quiz-option-fit-min', '160px');
        if (isImage) {
          optionsDiv.style.setProperty('--quiz-image-option-basis', getImageOptionBasis());
        }
      } else if (layoutDir === 'horizontal') {
        optionsDiv.style.setProperty('--quiz-options-columns-desktop', String(desktopCols));
        optionsDiv.style.setProperty('--quiz-options-columns-tablet', String(tabletCols));
        optionsDiv.style.setProperty('--quiz-options-columns-mobile', String(mobileCols));
        if (desktopCols === 1) {
          optionsDiv.classList.add('gwl-quiz-options--single-col');
        } else {
          optionsDiv.classList.remove('gwl-quiz-options--single-col');
        }
      } else {
        optionsDiv.style.setProperty('grid-template-columns', `repeat(${desktopCols}, minmax(0, 1fr))`, 'important');
        optionsDiv.style.setProperty('--quiz-options-columns-desktop', String(desktopCols));
        optionsDiv.style.setProperty('--quiz-options-columns-tablet', String(tabletCols));
        optionsDiv.style.setProperty('--quiz-options-columns-mobile', String(mobileCols));
        if (desktopCols === 1) {
          optionsDiv.classList.add('gwl-quiz-options--single-col');
        } else {
          optionsDiv.classList.remove('gwl-quiz-options--single-col');
        }
      }

      const opts = rawOpts.map((opt) => {
        if (typeof opt === 'string') return opt;
        if (optionType === 'image') return resolveImageOptionValue(opt);
        return opt.label || opt.value || opt.imageSrc || '';
      });

      const effect = settings.selectedOptionEffect || 'border';

      if (q.type === 'RADIO') {
        rawOpts.forEach((opt, idx) => {
          const val = opts[idx];
          const labelText = getOptionLabelText(opt, val, optionType);
          optionsDiv.appendChild(createRadioOption(q.id, val, optionType, effect, labelText));
        });
      } else if (q.type === 'CHECKBOX') {
        rawOpts.forEach((opt, idx) => {
          const val = opts[idx];
          const labelText = getOptionLabelText(opt, val, optionType);
          optionsDiv.appendChild(createCheckboxOption(q.id, val, optionType, effect, labelText));
        });
      } else if (q.type === 'DROPDOWN') {
        if (settings.optionInputStyle === 'native' && optionType !== 'image') {
          optionsDiv.appendChild(createNativeSelect(q.id, opts, false));
        } else {
          optionsDiv.appendChild(createSelect(q.id, opts, false, optionType, effect));
        }
      } else if (q.type === 'DROPDOWN_MULTI') {
        optionsDiv.appendChild(createSelect(q.id, opts, true, optionType, effect));
      }

      if (
        isImage &&
        (getImageLabelLayoutMode() === 'inline-left' || getImageLabelLayoutMode() === 'inline-right')
      ) {
        requestAnimationFrame(() => {
          syncInlineImageLabelColumnWidth(optionsDiv);
        });
      }

      qDiv.appendChild(optionsDiv);

      // Max Selection Hint for Checkbox & multi dropdown
      if ((q.type === 'CHECKBOX' || q.type === 'DROPDOWN_MULTI') && settings.maxSelections > 0) {
        const hint = document.createElement('div');
        hint.className = 'gwl-quiz-max-selection-msg';
        hint.textContent = t('validation.maxSelectionsHint', { max: settings.maxSelections });
        qDiv.appendChild(hint);
      }

      questionsEl.appendChild(qDiv);
    });

    // Navigation Buttons for Step Mode
    if (displayMode !== 'all') {
      const navContainer = document.createElement('div');
      navContainer.className = 'gwl-quiz-nav-buttons';

      const getRadiusValue = (r) => {
        if (!r) return '8px';
        if (r === 'small') return '4px';
        if (r === 'large') return '16px';
        if (r === 'medium') return '8px';
        if (typeof r === 'string' && (r.includes('px') || r.includes('rem') || r.includes('%'))) return r;
        if (!isNaN(r)) return r + 'px';
        return r;
      };

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'gwl-quiz-prev-btn';
      backBtn.textContent = questionsPerPage === 1 ? t('navigation.previous') : t('navigation.back');
      backBtn.style.backgroundColor = settings.quizPrimaryColor || '#111827';
      backBtn.style.borderColor = settings.quizPrimaryColor || '#111827';
      backBtn.style.color = settings.buttonTextColor || '#ffffff';
      if (settings.quizBorderRadius) {
        backBtn.style.borderRadius = getRadiusValue(settings.quizBorderRadius);
      }

      backBtn.style.display = 'block';
      backBtn.disabled = (currentStep === 0);
      if (currentStep === 0) {
        backBtn.classList.add('disabled');
      }
      backBtn.addEventListener('click', () => goToStep(currentStep - 1));
      navContainer.appendChild(backBtn);

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'gwl-quiz-submit-btn gwl-quiz-next-btn';
      nextBtn.textContent = t('navigation.next');
      nextBtn.style.backgroundColor = settings.quizPrimaryColor || '#111827';
      nextBtn.style.borderColor = settings.quizPrimaryColor || '#111827';
      if (settings.quizBorderRadius) {
        nextBtn.style.borderRadius = getRadiusValue(settings.quizBorderRadius);
      }
      nextBtn.addEventListener('click', () => {
        if (isFormAfterQuiz() && currentStep === totalSteps - 1 && !showingPostQuizForm) {
          showPostQuizLeadForm();
        } else {
          goToStep(currentStep + 1);
        }
      });

      navContainer.appendChild(nextBtn);

      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) {
        navContainer.appendChild(submitBtn);
        submitBtn.style.display = 'none';
        if (settings.quizPrimaryColor) {
          submitBtn.style.backgroundColor = settings.quizPrimaryColor;
          submitBtn.style.borderColor = settings.quizPrimaryColor;
        }
        if (settings.quizBorderRadius) {
          submitBtn.style.borderRadius = getRadiusValue(settings.quizBorderRadius);
        }
        submitBtn.textContent = t('navigation.submit');
      }

      questionsEl.appendChild(navContainer);
      updateNavButtons();
    } else {
      // Update submit button text
      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = t('navigation.submit');
      }
    }

    // Add change listeners
    if (formChangeHandler) {
      formEl.removeEventListener('change', formChangeHandler);
    }
    formChangeHandler = (e) => {
      updateProgress();

      const isSingleQuestionMode = (questionsPerPage === 1);
      const target = e.target;
      const qDiv = target.closest('.gwl-quiz-question-card');
      if (!qDiv) return;

      clearQuestionValidationError(qDiv);

      const qIndex = parseInt(qDiv.getAttribute('data-question-index'), 10);
      const qDef = quizQuestions[qIndex];
      if (!qDef) return;

      const canAutoAdvance = settings.autoAdvanceOnRadio !== false && qDef.type === 'RADIO';

      if (isSingleQuestionMode) {
        if (canAutoAdvance && target.type === 'radio') {
          if (currentStep < totalSteps - 1) {
            setTimeout(() => {
              goToStep(currentStep + 1);
            }, 400);
          }
        }
      } else {
        if (settings.autoScrollToNext && displayMode !== 'all') {
          if (target.type === 'radio') {
            const allVisibleIds = Array.from(container.querySelectorAll('.gwl-quiz-question-card:not(.hidden)'));
            const isLastVisible = allVisibleIds[allVisibleIds.length - 1] === qDiv;

            if (isLastVisible) {
              if (canAutoAdvance) {
                const nextBtn = container.querySelector('.gwl-quiz-next-btn');
                if (nextBtn && nextBtn.style.display !== 'none') {
                  setTimeout(() => {
                    goToStep(currentStep + 1);
                  }, 400);
                }
              }
            } else {
              const nextQ = qDiv.nextElementSibling;
              if (nextQ && nextQ.classList.contains('gwl-quiz-question-card')) {
                setTimeout(() => {
                  nextQ.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 400);
              }
            }
          }
        }
      }
    };
    formEl.addEventListener('change', formChangeHandler);

    updateProgress();
  }

  function normalizeOptionsPerRowSetting(value) {
    if (!value || value === '1') return '1';
    if (value === 'auto') return 'auto';
    return 'auto';
  }

  function normalizeImageCardSize(value) {
    if (value === 'small' || value === 'medium' || value === 'large') return value;
    if (value === 'extra-small') return 'small';
    if (value === 'extra-large') return 'large';
    return 'large';
  }

  function getImageCardSizeValue(value) {
    const size = normalizeImageCardSize(value);
    const sizes = { small: '100px', medium: '132px', large: '168px' };
    return sizes[size] || sizes.large;
  }

  function isFitWidthOptionsPerRow(setting) {
    return setting === 'auto';
  }

  function getImageOptionBasis() {
    return 'var(--quiz-image-card-size, 168px)';
  }

  function getPremiumImageWrapClass() {
    return `gwl-quiz-image-wrap gwl-quiz-premium-image-wrap shape-${settings.imageShape || 'square'}`;
  }

  function getImageLabelLayoutMode() {
    const layout = settings.imageLabelLayout || 'inline-right';
    if (layout === 'stack') return 'stack';
    if (layout === 'inline-left') return 'inline-left';
    if (layout === 'inline' || layout === 'inline-right') return 'inline-right';
    return 'inline-right';
  }

  function syncInlineImageLabelColumnWidth(optionsDiv) {
    if (!optionsDiv) return;
    const labels = optionsDiv.querySelectorAll(
      '.gwl-quiz-option-label:not(.gwl-quiz-image-label-placeholder)'
    );
    let maxWidth = 0;
    labels.forEach((label) => {
      const width = Math.ceil(label.getBoundingClientRect().width);
      if (width > maxWidth) maxWidth = width;
    });
    if (maxWidth > 0) {
      optionsDiv.style.setProperty('--quiz-image-label-col-width', `${maxWidth}px`);
    } else {
      optionsDiv.style.removeProperty('--quiz-image-label-col-width');
    }
  }

  function resolveImageOptionValue(opt) {
    if (typeof opt === 'string') return isImageSourceValue(opt) ? opt.trim() : '';
    if (!opt || typeof opt !== 'object') return '';
    const imageSrc = typeof opt.imageSrc === 'string' ? opt.imageSrc.trim() : '';
    if (imageSrc) return imageSrc;
    const label = typeof opt.label === 'string' ? opt.label.trim() : '';
    if (isImageSourceValue(label)) return label;
    return '';
  }

  function applyPremiumImageLayout(label, input, labelText, imgWrap) {
    const layoutMode = getImageLabelLayoutMode();
    const layoutClass = {
      stack: 'gwl-quiz-image-label-stack',
      'inline-left': 'gwl-quiz-image-label-inline-left',
      'inline-right': 'gwl-quiz-image-label-inline-right',
    }[layoutMode];

    label.classList.add(layoutClass);
    if (!labelText) {
      label.classList.add('gwl-quiz-image-no-label');
    }

    input.classList.add('gwl-quiz-image-input');
    label.appendChild(input);

    let labelSpan = null;
    if (layoutMode === 'inline-left' || layoutMode === 'inline-right') {
      labelSpan = document.createElement('span');
      labelSpan.className = labelText
        ? 'gwl-quiz-option-label'
        : 'gwl-quiz-option-label gwl-quiz-image-label-placeholder';
      if (labelText) {
        labelSpan.textContent = labelText;
      }
    } else if (labelText) {
      labelSpan = document.createElement('span');
      labelSpan.className = 'gwl-quiz-option-label';
      labelSpan.textContent = labelText;
    }

    if (layoutMode === 'inline-left') {
      if (labelSpan) label.appendChild(labelSpan);
      label.appendChild(imgWrap);
    } else if (layoutMode === 'stack') {
      label.appendChild(imgWrap);
      if (labelSpan) label.appendChild(labelSpan);
    } else {
      label.appendChild(imgWrap);
      if (labelSpan) label.appendChild(labelSpan);
    }
  }

  function isImageSourceValue(value) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/')
    );
  }

  function getOptionLabelText(opt, fallbackValue, optionType) {
    if (typeof opt === 'string') {
      if (optionType === 'image' && isImageSourceValue(opt)) return '';
      return opt;
    }
    if (typeof opt === 'object' && opt !== null) {
      const label = typeof opt.label === 'string' ? opt.label.trim() : '';
      if (label && !(optionType === 'image' && isImageSourceValue(label))) {
        return label;
      }
      if (optionType === 'image') return '';
      return opt.value || (isImageSourceValue(fallbackValue) ? '' : fallbackValue) || '';
    }
    if (optionType === 'image' && isImageSourceValue(fallbackValue)) return '';
    return fallbackValue || '';
  }

  function createRadioOption(name, value, optionType, effect, labelText) {
    const label = document.createElement('label');
    label.className = `gwl-quiz-option gwl-quiz-option--${effect}`;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.required = true;

    input.addEventListener('change', () => {
      const optsDiv = label.closest('.gwl-quiz-options');
      if (optsDiv) {
        optsDiv.querySelectorAll('.gwl-quiz-option').forEach(l => l.classList.remove('selected'));
      }
      label.classList.add('selected');
    });

    if (optionType === 'image') {
      label.className = `gwl-quiz-option gwl-quiz-option--${effect} gwl-quiz-option-premium-image`;
      if (settings.selectionBackground === 'disable') {
        label.classList.add('selection-bg-disabled');
      }

      const imgWrap = createImageWrapper(value);
      imgWrap.className = getPremiumImageWrapClass();
      applyPremiumImageLayout(label, input, labelText, imgWrap);
    } else if (settings.optionInputStyle === 'native') {
      label.classList.add('gwl-quiz-answer-option', 'gwl-quiz-native-option');

      const control = document.createElement('span');
      control.className = 'gwl-quiz-native-control';
      control.appendChild(input);

      const span = document.createElement('span');
      span.className = 'gwl-quiz-native-option-label';
      span.textContent = labelText || (optionType === 'image' ? '' : value) || '';

      label.appendChild(control);
      label.appendChild(span);
    } else {
      label.classList.add('gwl-quiz-answer-option');
      label.appendChild(input);
      const span = document.createElement('span');
      span.textContent = labelText || (optionType === 'image' ? '' : value) || '';
      label.appendChild(span);
    }

    return label;
  }

  function createCheckboxOption(name, value, optionType, effect, labelText) {
    const label = document.createElement('label');
    label.className = `gwl-quiz-option gwl-quiz-option--${effect}`;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.value = value;

    input.addEventListener('change', () => {
      const optsDiv = label.closest('.gwl-quiz-options');
      const checkedInputs = optsDiv.querySelectorAll('input:checked');

      if (settings.maxSelections > 0 && checkedInputs.length > settings.maxSelections) {
        input.checked = false;
        const card = label.closest('.gwl-quiz-question-card');
        queueMicrotask(() => showLimitError(card, settings.maxSelections));
        return;
      }

      clearLimitError(label.closest('.gwl-quiz-question-card'));

      label.classList.toggle('selected', input.checked);

      if (settings.maxSelections > 0) {
        const unchecked = optsDiv.querySelectorAll('input:not(:checked)');
        const reached = checkedInputs.length >= settings.maxSelections;
        unchecked.forEach(i => i.disabled = reached);
      }
    });

    if (optionType === 'image') {
      label.className = `gwl-quiz-option gwl-quiz-option--${effect} gwl-quiz-option-premium-image`;
      if (settings.selectionBackground === 'disable') {
        label.classList.add('selection-bg-disabled');
      }

      const imgWrap = createImageWrapper(value);
      imgWrap.className = getPremiumImageWrapClass();
      applyPremiumImageLayout(label, input, labelText, imgWrap);
    } else if (settings.optionInputStyle === 'native') {
      label.classList.add('gwl-quiz-answer-option', 'gwl-quiz-native-option');

      const control = document.createElement('span');
      control.className = 'gwl-quiz-native-control';
      control.appendChild(input);

      const span = document.createElement('span');
      span.className = 'gwl-quiz-native-option-label';
      span.textContent = labelText || (optionType === 'image' ? '' : value) || '';

      label.appendChild(control);
      label.appendChild(span);
    } else {
      label.classList.add('gwl-quiz-answer-option');
      label.appendChild(input);
      const span = document.createElement('span');
      span.textContent = labelText || (optionType === 'image' ? '' : value) || '';
      label.appendChild(span);
    }

    return label;
  }

  function createNativeSelect(name, options, isMultiple) {
    const select = document.createElement('select');
    select.name = name;
    select.className = 'gwl-quiz-native-select';
    if (isMultiple) {
      select.multiple = true;
    } else {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = t('dropdown.selectOption');
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);
      select.required = true;
    }

    options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });

    if (isMultiple) {
      select.addEventListener('change', () => {
        const card = select.closest('.gwl-quiz-question-card');
        const selectedCount = select.selectedOptions.length;

        if (settings.maxSelections > 0 && selectedCount > settings.maxSelections) {
          select.selectedOptions[selectedCount - 1].selected = false;
          queueMicrotask(() => showLimitError(card, settings.maxSelections));
          return;
        }

        clearLimitError(card);
      });

      const wrap = document.createElement('div');
      wrap.className = 'gwl-quiz-native-select-wrap gwl-quiz-native-select-wrap--multiple';
      wrap.appendChild(select);
      return wrap;
    }

    return select;
  }

  function createSelect(name, options, isMultiple, optionType, effect) {
    if (isMultiple) {
      return createMultiSelect(name, options, optionType, effect);
    }
    return createSingleSelect(name, options, optionType, effect);
  }

  function createSingleSelect(name, options, optionType, effect) {
    const selectContainer = document.createElement('div');
    selectContainer.className = 'gwl-quiz-select-single';

    const display = document.createElement('div');
    display.className = 'gwl-quiz-select-display';
    display.textContent = t('dropdown.selectOption');

    const dropdown = document.createElement('div');
    dropdown.className = 'gwl-quiz-select-dropdown';
    dropdown.style.display = 'none';

    const updateDisplay = () => {
      const checked = dropdown.querySelector('input:checked');

      if (!checked) {
        display.textContent = t('dropdown.selectOption');
        display.classList.remove('has-values');
        return;
      }

      if (optionType === 'image') {
        display.innerHTML = '';
        display.appendChild(createImageWrapper(checked.value));
      } else {
        display.textContent = checked.value;
      }
      display.classList.add('has-values');
    };

    const clearSelectedClasses = () => {
      dropdown.querySelectorAll('.gwl-quiz-single-option.selected').forEach((el) => {
        el.classList.remove('selected');
      });
    };

    options.forEach((opt, idx) => {
      const label = document.createElement('label');
      label.className = `gwl-quiz-multi-option gwl-quiz-single-option gwl-quiz-option--${effect}`;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = opt;
      if (idx === 0) input.required = true;

      input.addEventListener('change', () => {
        clearSelectedClasses();
        label.classList.add('selected');
        updateDisplay();
        dropdown.style.display = 'none';
        display.classList.remove('active');
      });

      label.appendChild(input);

      if (optionType === 'image') {
        label.appendChild(createImageWrapper(opt));
      } else {
        const span = document.createElement('span');
        span.textContent = opt;
        label.appendChild(span);
      }

      dropdown.appendChild(label);
    });

    display.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'block';

      container.querySelectorAll('.gwl-quiz-select-dropdown').forEach((d) => {
        d.style.display = 'none';
      });
      container.querySelectorAll('.gwl-quiz-select-display').forEach((d) => {
        d.classList.remove('active');
      });

      dropdown.style.display = isOpen ? 'none' : 'block';
      display.classList.toggle('active', !isOpen);
    });

    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
      display.classList.remove('active');
    });

    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    selectContainer.appendChild(display);
    selectContainer.appendChild(dropdown);

    updateDisplay();
    return selectContainer;
  }

  function createMultiSelect(name, options, optionType, effect) {
    const selectContainer = document.createElement('div');
    selectContainer.className = 'gwl-quiz-select-multi';
    if (settings.optionInputStyle === 'native') {
      selectContainer.classList.add('gwl-quiz-select-multi--native');
    }

    const display = document.createElement('div');
    display.className = 'gwl-quiz-select-display';
    display.setAttribute('role', 'button');
    display.setAttribute('tabindex', '0');
    display.setAttribute('aria-haspopup', 'listbox');
    display.setAttribute('aria-expanded', 'false');

    const dropdown = document.createElement('div');
    dropdown.className = 'gwl-quiz-select-dropdown';
    dropdown.style.display = 'none';
    dropdown.setAttribute('role', 'listbox');

    const hint = document.createElement('div');
    hint.className = 'gwl-quiz-select-dropdown-hint';
    hint.textContent = t('dropdown.selectMultipleHint');
    dropdown.appendChild(hint);

    const renderChips = (displayEl, selected, dropdownEl) => {
      displayEl.innerHTML = '';
      selected.forEach((val) => {
        const chip = document.createElement('span');
        chip.className = 'gwl-quiz-select-chip';

        const chipLabel = document.createElement('span');
        chipLabel.className = 'gwl-quiz-select-chip-label';
        chipLabel.textContent = val;
        chip.appendChild(chipLabel);

        const removeBtn = document.createElement('span');
        removeBtn.className = 'gwl-quiz-chip-remove';
        removeBtn.setAttribute('data-value', val);
        removeBtn.setAttribute('role', 'button');
        removeBtn.setAttribute('aria-label', 'Remove');
        removeBtn.textContent = '✕';
        chip.appendChild(removeBtn);

        displayEl.appendChild(chip);
      });

      displayEl.querySelectorAll('.gwl-quiz-chip-remove').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = e.target.getAttribute('data-value');
          const input = Array.from(dropdownEl.querySelectorAll('input[type="checkbox"]')).find((i) => i.value === val);
          if (input) {
            input.checked = false;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      });
    };

    const updateDisplay = () => {
      const selected = Array.from(dropdown.querySelectorAll('input:checked'))
        .map((input) => input.value);

      display.setAttribute('aria-expanded', dropdown.style.display === 'block' ? 'true' : 'false');

      if (selected.length === 0) {
        display.innerHTML = `<span class="gwl-quiz-select-display-placeholder">${t('dropdown.selectOptions')}</span>`;
        display.classList.remove('has-values');
        return;
      }

      display.classList.add('has-values');

      if (optionType === 'image') {
        display.innerHTML = '';
        display.textContent = t('dropdown.imagesSelected', { count: selected.length });
        return;
      }

      renderChips(display, selected, dropdown);
    };

    const closeAllDropdowns = () => {
      container.querySelectorAll('.gwl-quiz-select-dropdown').forEach((d) => {
        d.style.display = 'none';
      });
      container.querySelectorAll('.gwl-quiz-select-display').forEach((d) => {
        d.classList.remove('active');
        d.setAttribute('aria-expanded', 'false');
      });
    };

    const toggleDropdown = () => {
      const isOpen = dropdown.style.display === 'block';
      closeAllDropdowns();
      dropdown.style.display = isOpen ? 'none' : 'block';
      display.classList.toggle('active', !isOpen);
      display.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    };

    options.forEach((opt) => {
      const label = document.createElement('label');
      label.className = `gwl-quiz-multi-option gwl-quiz-option--${effect}`;
      label.setAttribute('role', 'option');

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = name;
      input.value = opt;

      input.addEventListener('change', () => {
        const checkedInputs = dropdown.querySelectorAll('input:checked');

        if (settings.maxSelections > 0 && checkedInputs.length > settings.maxSelections) {
          input.checked = false;
          const card = dropdown.closest('.gwl-quiz-question-card');
          queueMicrotask(() => showLimitError(card, settings.maxSelections));
          return;
        }

        clearLimitError(dropdown.closest('.gwl-quiz-question-card'));

        label.classList.toggle('selected', input.checked);
        label.setAttribute('aria-selected', input.checked ? 'true' : 'false');

        if (settings.maxSelections > 0) {
          const unchecked = dropdown.querySelectorAll('input:not(:checked)');
          const reached = checkedInputs.length >= settings.maxSelections;
          unchecked.forEach((i) => { i.disabled = reached; });
          label.classList.toggle('gwl-quiz-multi-option--disabled', !input.checked && reached);
        }

        updateDisplay();
      });

      label.appendChild(input);

      if (optionType === 'image') {
        label.appendChild(createImageWrapper(opt));
      } else {
        const span = document.createElement('span');
        span.className = 'gwl-quiz-option-label-text';
        span.textContent = opt;
        label.appendChild(span);
      }

      dropdown.appendChild(label);
    });

    display.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    display.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDropdown();
      }
      if (e.key === 'Escape') {
        closeAllDropdowns();
      }
    });

    document.addEventListener('click', closeAllDropdowns);

    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    selectContainer.appendChild(display);
    selectContainer.appendChild(dropdown);

    updateDisplay();
    return selectContainer;
  }

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    const hasLeadForm = hasLeadFormEnabled();

    if (settings.registrationFormPosition === 'after_quiz' && hasLeadForm && !showingPostQuizForm) {
      showPostQuizLeadForm();
      return;
    }

    const btn = formEl.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('navigation.submitting');
    }

    clearSubmitError();

    const formData = new FormData(formEl);
    const grouped = new Map();

    for (const [questionId, answer] of formData.entries()) {
      if (!grouped.has(questionId)) grouped.set(questionId, []);
      grouped.get(questionId).push(answer);
    }

    try {
      const answers = [];
      for (const [questionId, answerValues] of grouped.entries()) {
        const answer = answerValues.length > 1 ? answerValues : answerValues[0];
        answers.push({ questionId, answer });
      }

      const payload = {
        ...getSubmitIdentity(),
        customerId: config.customerId || null,
        shop: config.shopDomain,
        quizId: config.quizId || '',
        answers
      };

      const submitEndpoint = (window.quizAppConfig && window.quizAppConfig.submitUrl)
        ? window.quizAppConfig.submitUrl
        : `${config.appProxyUrl}/api/quiz/submit`;
      console.log('[Quiz] Using submit endpoint:', submitEndpoint);

      const response = await fetch(submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Submission failed');

      const result = await response.json();

      formEl.style.display = 'none';
      if (leadFormEl) leadFormEl.style.display = 'none';
      showingPostQuizForm = false;
      if (successEl) successEl.style.display = 'block';
      applySettings(settings, 'thanks');

      // Render recommended products if any were returned
      const recommendations = result.recommendations || [];
      if (recommendations.length > 0) {
        renderRecommendations(recommendations);
      }

      saveQuizCompletionState(recommendations, payload.answers);
      addStartOverButton();

    } catch (error) {
      console.error('Error submitting quiz:', error);
      showSubmitError(t('errors.submitFailed'));
      if (btn) {
        btn.disabled = false;
        btn.textContent = t('navigation.submit');
      }
    }
  });

  /**
   * Render recommended product cards inside .gwl-quiz-recommendations.
   * Each product: { id, handle, title, featuredImage, price, currencyCode }
   */
  function renderRecommendations(products) {
    const recEl = container.querySelector('.gwl-quiz-recommendations');
    if (!recEl) return;

    recEl.innerHTML = '';

    const getRadiusValue = (r) => {
      if (!r) return '8px';
      if (r === 'small') return '4px';
      if (r === 'large') return '16px';
      if (r === 'medium') return '8px';
      if (typeof r === 'string' && (r.includes('px') || r.includes('rem') || r.includes('%'))) return r;
      if (!isNaN(r)) return r + 'px';
      return r;
    };

    // Heading
    const heading = document.createElement('h3');
    heading.className = 'gwl-quiz-heading gwl-quiz-recommendations-heading';
    heading.textContent = t('results.recommendationHeading');
    heading.style.cssText = `margin: 24px 0 16px; font-size: 1.4rem; font-weight: 700; text-align: center; color: ${settings.thankYouTextColor || settings.quizTextColor || '#111111'};`;
    recEl.appendChild(heading);

    // Subheading
    if (settings.recommendationSubheading) {
      const subheading = document.createElement('p');
      subheading.className = 'gwl-quiz-recommendations-subheading';
      subheading.textContent = settings.recommendationSubheading;
      subheading.style.color = settings.thankYouTextColor || settings.quizTextColor || '#111111';
      recEl.appendChild(subheading);
    }

    // Slider Wrapper
    const sliderWrapper = document.createElement('div');
    sliderWrapper.style.cssText = 'position: relative; width: 100%; padding: 0 40px; box-sizing: border-box;';
    recEl.appendChild(sliderWrapper);

    // Left Scroll Button
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.style.cssText = [
      'position: absolute',
      'left: 0',
      'top: 50%',
      'transform: translateY(-50%)',
      'z-index: 10',
      'width: 36px',
      'height: 36px',
      'border-radius: 50%',
      'background: #ffffff',
      'border: 1px solid rgba(0,0,0,0.1)',
      'box-shadow: 0 2px 8px rgba(0,0,0,0.12)',
      'display: none',
      'align-items: center',
      'justify-content: center',
      'cursor: pointer',
      `color: ${settings.thankYouTextColor || settings.quizTextColor || '#111111'}`
    ].join(';');
    prevBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
    sliderWrapper.appendChild(prevBtn);

    // Right Scroll Button
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.style.cssText = [
      'position: absolute',
      'right: 0',
      'top: 50%',
      'transform: translateY(-50%)',
      'z-index: 10',
      'width: 36px',
      'height: 36px',
      'border-radius: 50%',
      'background: #ffffff',
      'border: 1px solid rgba(0,0,0,0.1)',
      'box-shadow: 0 2px 8px rgba(0,0,0,0.12)',
      'display: none',
      'align-items: center',
      'justify-content: center',
      'cursor: pointer',
      `color: ${settings.thankYouTextColor || settings.quizTextColor || '#111111'}`
    ].join(';');
    nextBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    sliderWrapper.appendChild(nextBtn);

    // Slider container (flex row)
    const grid = document.createElement('div');
    grid.className = 'gwl-quiz-recommendations-grid';
    sliderWrapper.appendChild(grid);

    // Scroll handlers
    prevBtn.addEventListener('click', () => {
      grid.scrollBy({ left: -300, behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
      grid.scrollBy({ left: 300, behavior: 'smooth' });
    });

    products.forEach((product) => {
      const slide = document.createElement('div');
      slide.style.cssText = 'flex: 0 0 220px; width: 220px;';

      const card = document.createElement('div');
      card.className = 'gwl-quiz-product-card';

      const storeOrigin = config.storefrontOrigin || `https://${config.shopDomain}`;

      // Clickable Link Wrapper for details
      const linkWrap = document.createElement('a');
      linkWrap.className = 'gwl-quiz-product-card-link';
      linkWrap.href = `${storeOrigin}/products/${product.handle}`;
      linkWrap.target = '_top';
      card.appendChild(linkWrap);

      // Image
      const imgWrap = document.createElement('div');
      imgWrap.className = 'gwl-quiz-product-card-image';
      if (product.featuredImage && product.featuredImage.url) {
        const img = document.createElement('img');
        img.src = product.featuredImage.url;
        img.alt = product.featuredImage.altText || product.title;
        imgWrap.appendChild(img);
      } else {
        imgWrap.style.display = 'flex';
        imgWrap.style.alignItems = 'center';
        imgWrap.style.justifyContent = 'center';
        imgWrap.style.color = '#ccc';
        imgWrap.style.fontSize = '13px';
        imgWrap.textContent = t('results.noImage');
      }
      linkWrap.appendChild(imgWrap);

      // Info
      const info = document.createElement('div');
      info.className = 'gwl-quiz-product-card-info';

      const title = document.createElement('div');
      title.className = 'gwl-quiz-product-card-title';
      title.textContent = product.title;
      info.appendChild(title);

      const price = document.createElement('div');
      price.className = 'gwl-quiz-product-card-price';
      const priceNum = parseFloat(product.price || '0').toFixed(2);
      price.textContent = `${product.currencyCode} ${priceNum}`;
      info.appendChild(price);

      linkWrap.appendChild(info);

      // Add to Cart panel
      const actionPanel = document.createElement('div');
      actionPanel.className = 'gwl-quiz-product-card-actions';

      /* Commented out Add to Cart implementation
      let qty = 1;

      const pillBtn = document.createElement('div');
      const btnBg = settings.quizPrimaryColor || '#111827';
      const btnRadius = getRadiusValue(settings.quizBorderRadius);
      pillBtn.style.cssText = [
        'display: flex',
        'align-items: center',
        'justify-content: space-between',
        `background: ${btnBg}`,
        'color: #fff',
        `border-radius: ${btnRadius}`,
        'overflow: hidden',
        'height: 38px',
        'font-family: inherit',
        'font-size: 14px',
        'font-weight: 600',
      ].join(';');

      const minusBtn = document.createElement('button');
      minusBtn.textContent = '−';
      minusBtn.style.cssText = [
        'border: none',
        'background: none',
        'color: #fff',
        'width: 38px',
        'height: 100%',
        'cursor: pointer',
        'font-size: 16px',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'user-select: none',
      ].join(';');

      const centerBtn = document.createElement('button');
      centerBtn.textContent = t('results.addToCart');
      centerBtn.style.cssText = [
        'border: none',
        'background: none',
        'color: #fff',
        'flex: 1',
        'height: 100%',
        'cursor: pointer',
        'font-size: 14px',
        'font-weight: 600',
        'text-align: center',
        'padding: 0',
      ].join(';');

      const plusBtn = document.createElement('button');
      plusBtn.textContent = '+';
      plusBtn.style.cssText = [
        'border: none',
        'background: none',
        'color: #fff',
        'width: 38px',
        'height: 100%',
        'cursor: pointer',
        'font-size: 16px',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'user-select: none',
      ].join(';');

      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (qty > 1) {
          qty--;
          updateDisplay();
        }
      });

      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        qty++;
        updateDisplay();
      });

      function updateDisplay() {
        const baseText = t('results.addToCart');
        centerBtn.textContent = qty > 1 ? `${baseText} (${qty})` : baseText;
      }

      centerBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!product.variantId) {
          showProductError(actionPanel, 'This product is unavailable. Please choose another recommendation.');
          return;
        }
        centerBtn.disabled = true;
        centerBtn.textContent = t('results.adding');

        try {
          const cartRes = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: [{ id: Number(product.variantId), quantity: qty }]
            })
          });

          if (!cartRes.ok) throw new Error('Add to cart failed');

          centerBtn.textContent = t('results.added');
          centerBtn.style.color = '#4caf50';
          setTimeout(() => {
            qty = 1;
            centerBtn.style.color = '#fff';
            updateDisplay();
            centerBtn.disabled = false;
            document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
            window.location.reload();
          }, 1500);

        } catch (err) {
          console.error(err);
          centerBtn.textContent = t('results.addError');
          centerBtn.style.color = '#f44336';
          setTimeout(() => {
            centerBtn.style.color = '#fff';
            updateDisplay();
            centerBtn.disabled = false;
          }, 1500);
        }
      });

      pillBtn.appendChild(minusBtn);
      pillBtn.appendChild(centerBtn);
      pillBtn.appendChild(plusBtn);
      actionPanel.appendChild(pillBtn);
      */

      // View Product — button avoids theme styles targeting product links
      const viewProductBtn = document.createElement('button');
      viewProductBtn.type = 'button';
      viewProductBtn.className = 'gwl-quiz-view-product-btn';
      viewProductBtn.innerHTML = `<span class="gwl-quiz-view-product-btn-label">${t('results.viewProduct')}</span>`;
      viewProductBtn.addEventListener('click', () => {
        const target = window.top || window;
        target.location.href = `${storeOrigin}/products/${product.handle}`;
      });
      actionPanel.appendChild(viewProductBtn);

      card.appendChild(actionPanel);

      slide.appendChild(card);
      grid.appendChild(slide);
    });

    // Arrow visibility: hide when no overflow; show per scroll position
    if (checkArrowsHandler) {
      window.removeEventListener('resize', checkArrowsHandler);
    }
    if (gridResizeObserver) {
      gridResizeObserver.disconnect();
    }

    function checkArrows() {
      const hasOverflow = grid.scrollWidth > grid.clientWidth + 2;
      if (!hasOverflow) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
      } else {
        const atStart = grid.scrollLeft <= 2;
        const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 2;
        prevBtn.style.display = atStart ? 'none' : 'flex';
        nextBtn.style.display = atEnd ? 'none' : 'flex';
      }
    }

    grid.addEventListener('scroll', checkArrows);
    window.addEventListener('resize', checkArrows);
    checkArrowsHandler = checkArrows;

    const resizeObserver = new ResizeObserver(() => {
      checkArrows();
    });
    resizeObserver.observe(grid);
    gridResizeObserver = resizeObserver;

    // Defer until layout is complete so scrollWidth is accurate
    requestAnimationFrame(checkArrows);

    recEl.style.display = 'block';
    container.classList.add('gwl-quiz-showing-recommendations');
  }

  function openLightbox(src) {
    let lightbox = document.getElementById('gwl-quiz-lightbox-modal');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'gwl-quiz-lightbox-modal';
      lightbox.className = 'gwl-quiz-lightbox';
      lightbox.innerHTML = `
        <div class="gwl-quiz-lightbox-content">
          <button class="gwl-quiz-lightbox-close" type="button">&times;</button>
          <img src="" alt="Zoomed view">
        </div>
      `;
      document.body.appendChild(lightbox);

      // Close handlers
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('gwl-quiz-lightbox-close')) {
          lightbox.classList.remove('active');
        }
      });
    }

    const img = lightbox.querySelector('img');
    img.src = src;
    lightbox.classList.add('active');
  }

  function createImageWrapper(src) {
    const wrapper = document.createElement('div');
    wrapper.className = 'gwl-quiz-image-wrap';

    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Option';
    wrapper.appendChild(img);

    return wrapper;
  }

  function getQuestionsSignature(questions) {
    return (questions || []).map(q => {
      const opts = Array.isArray(q.options) ? q.options.map(o => typeof o === 'string' ? o : (o.label || '')).join('|') : '';
      return `${q.id}:${q.text}:${opts}`;
    }).join('##');
  }

  function saveQuizCompletionState(recommendations, answers) {
    const storageKey = `gwl_quiz_state_${config.quizId || 'general'}`;
    const state = {
      completed: true,
      leadData: {
        name: leadData.name,
        email: leadData.email
      },
      answers: answers,
      recommendations: recommendations,
      settings: settings,
      questionsSignature: getQuestionsSignature(quizQuestions)
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      console.log('[Quiz] Saved completed state to localStorage:', storageKey);
    } catch (e) {
      console.error('[Quiz] Failed to save state to localStorage:', e);
    }
  }

  function ensureResultsHeader() {
    if (!successEl) return null;

    let header = successEl.querySelector('.gwl-quiz-results-header');
    if (header) return header;

    header = document.createElement('div');
    header.className = 'gwl-quiz-results-header';

    const textWrap = document.createElement('div');
    textWrap.className = 'gwl-quiz-results-text';

    const heading = successEl.querySelector('.gwl-quiz-heading');
    const subheading = successEl.querySelector('.gwl-quiz-subheading');
    if (heading) textWrap.appendChild(heading);
    if (subheading) textWrap.appendChild(subheading);

    header.appendChild(textWrap);

    const existingBtn = successEl.querySelector('.gwl-quiz-start-over-btn');
    if (existingBtn) header.appendChild(existingBtn);

    successEl.insertBefore(header, successEl.firstChild);
    return header;
  }

  function addStartOverButton() {
    if (!successEl) return;

    const header = ensureResultsHeader();

    let startOverBtn = successEl.querySelector('.gwl-quiz-start-over-btn');
    if (startOverBtn) return;

    startOverBtn = document.createElement('button');
    startOverBtn.type = 'button';
    startOverBtn.className = 'gwl-quiz-submit-btn gwl-quiz-start-over-btn';
    startOverBtn.textContent = t('navigation.startOver');

    startOverBtn.addEventListener('click', handleStartOver);
    header.appendChild(startOverBtn);
    applyButtonStyles(settings);
  }

  function handleStartOver() {
    const storageKey = `gwl_quiz_state_${config.quizId || 'general'}`;
    try {
      localStorage.removeItem(storageKey);
      console.log('[Quiz] Cleared state from localStorage:', storageKey);
    } catch (e) {
      console.error('[Quiz] Failed to clear state from localStorage:', e);
    }

    if (checkArrowsHandler) {
      window.removeEventListener('resize', checkArrowsHandler);
      checkArrowsHandler = null;
    }
    if (gridResizeObserver) {
      gridResizeObserver.disconnect();
      gridResizeObserver = null;
    }

    // Reset closure variables
    leadData.name = '';
    leadData.email = '';
    currentStep = 0;

    // Reset forms
    if (formEl) {
      formEl.reset();
      formEl.querySelectorAll('.gwl-quiz-option').forEach(el => el.classList.remove('selected'));
      formEl.querySelectorAll('input').forEach(el => {
        el.checked = false;
        el.disabled = false;
      });
      formEl.querySelectorAll('select').forEach(el => {
        el.value = '';
      });
      formEl.querySelectorAll('.gwl-quiz-select-display').forEach(el => {
        el.classList.remove('has-values', 'active');
        el.setAttribute('aria-expanded', 'false');
        if (el.closest('.gwl-quiz-select-multi')) {
          el.innerHTML = `<span class="gwl-quiz-select-display-placeholder">${t('dropdown.selectOptions')}</span>`;
        } else {
          el.textContent = t('dropdown.selectOption');
        }
      });
      formEl.querySelectorAll('.gwl-quiz-select-dropdown').forEach(el => {
        el.style.display = 'none';
      });

      const submitBtn = formEl.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t('navigation.submit');
      }
    }

    if (leadFormEl) {
      const nameInput = leadFormEl.querySelector('.gwl-quiz-input-name');
      const emailInput = leadFormEl.querySelector('.gwl-quiz-input-email');
      if (nameInput) nameInput.value = '';
      if (emailInput) emailInput.value = '';
    }

    const startBtn = container.querySelector('.gwl-quiz-start-btn');
    if (startBtn) {
      startBtn.disabled = false;
      if (settings.registrationFormPosition === 'after_quiz') {
        startBtn.textContent = t('navigation.submit');
      } else {
        startBtn.textContent = t('navigation.start');
      }
    }

    // Hide results & recommendations
    if (successEl) successEl.style.display = 'none';

    const recEl = container.querySelector('.gwl-quiz-recommendations');
    if (recEl) {
      recEl.innerHTML = '';
      recEl.style.display = 'none';
    }
    container.classList.remove('gwl-quiz-showing-recommendations');

    showingPostQuizForm = false;
    restoreLeadFormStartBtnLayout();

    // Restore initial screen exactly like a first-time visit
    const hasLeadForm = hasLeadFormEnabled();
    if (!hasLeadForm || settings.registrationFormPosition === 'after_quiz') {
      if (leadFormEl) leadFormEl.style.display = 'none';
      if (formEl) formEl.style.display = 'block';
      applySettings(settings, 'quiz');
    } else {
      if (leadFormEl) leadFormEl.style.display = 'block';
      if (formEl) formEl.style.display = 'none';
      applySettings(settings, 'form');
    }

    goToStep(0);
    updateProgress();

    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function restoreCompletedState(savedState) {
    // Render the questions so they are built in the DOM and ready to be displayed when starting over
    renderQuestions(quizQuestions);

    leadData = savedState.leadData || { name: '', email: '' };

    applyCustomCss(settings.customCss);
    applyCustomJs(settings.customJs);

    if (loadingEl) loadingEl.style.display = 'none';
    if (leadFormEl) leadFormEl.style.display = 'none';
    if (formEl) formEl.style.display = 'none';
    if (successEl) successEl.style.display = 'block';
    applySettings(settings, 'thanks');

    addStartOverButton();

    const recommendations = savedState.recommendations || [];
    if (recommendations.length > 0) {
      renderRecommendations(recommendations);
    }
  }

  fetchQuestions();
}
