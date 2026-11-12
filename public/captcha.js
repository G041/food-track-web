// Verificación de Turnstile para la app nativa (ver captcha.html). Devuelve el resultado al WebView.
(function () {
  function send(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  var siteKey = new URLSearchParams(window.location.search).get('k');
  if (!siteKey || !window.turnstile) return send({ type: 'error' });

  try {
    window.turnstile.render(document.getElementById('widget'), {
      sitekey: siteKey,
      appearance: 'interaction-only',
      callback: function (token) {
        send({ type: 'token', token: token });
      },
      'error-callback': function () {
        send({ type: 'error' });
      },
      'timeout-callback': function () {
        send({ type: 'error' });
      },
      'before-interactive-callback': function () {
        send({ type: 'interactive', on: true });
      },
      'after-interactive-callback': function () {
        send({ type: 'interactive', on: false });
      },
    });
  } catch (e) {
    send({ type: 'error' });
  }
})();
