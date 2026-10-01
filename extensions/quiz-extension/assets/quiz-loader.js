(function () {
  'use strict';

  var container = document.querySelector('.gwl-quiz-container[data-app-proxy-url]');
  var proxyUrl = '/apps/quizapp';

  if (container) {
    proxyUrl = container.getAttribute('data-app-proxy-url') || proxyUrl;
  }

  var quizJsUrl = container && container.getAttribute('data-quiz-js-url');
  var quizCssUrl = container && container.getAttribute('data-quiz-css-url');
  var cacheBust = Date.now();

  if (!document.querySelector('link[data-gwl-quiz-styles]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = (quizCssUrl || proxyUrl + '/quiz.css') + '?v=' + cacheBust;
    link.setAttribute('data-gwl-quiz-styles', 'true');
    document.head.appendChild(link);
  }

  if (window.__gwlQuizScriptLoaded || window.__gwlQuizScriptLoading) {
    return;
  }

  window.__gwlQuizScriptLoading = true;

  var script = document.createElement('script');
  script.src = (quizJsUrl || proxyUrl + '/quiz.js') + '?v=' + cacheBust;
  script.async = true;
  script.onload = function () {
    window.__gwlQuizScriptLoaded = true;
    window.__gwlQuizScriptLoading = false;
  };
  script.onerror = function () {
    window.__gwlQuizScriptLoading = false;
    document.querySelectorAll('.gwl-quiz-container').forEach(function (el) {
      var loading = el.querySelector('.gwl-quiz-loading');
      var error = el.querySelector('.gwl-quiz-error');

      if (loading) loading.style.display = 'none';
      if (error) {
        error.textContent = 'Unable to load quiz. Please try again later.';
        error.style.display = 'block';
      }
    });
  };
  document.head.appendChild(script);
})();
