// Se carga antes que la app, desde un archivo (y no como <script> en línea) para que la
// Content-Security-Policy pueda prohibir todo script en línea (ver vercel.json).

// Identidad de la app local al agregarla al inicio desde localhost o la red privada.
(function () {
  var host = window.location.hostname.toLowerCase();
  var parts = host.split('.').map(Number);
  var ipv4 = parts.length === 4 && parts.every(function (part) {
    return Number.isInteger(part) && part >= 0 && part <= 255;
  });
  var privateNetwork = ipv4 && (
    parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
  );
  var local = privateNetwork || host === 'localhost' || host === '[::1]' ||
    host.endsWith('.localhost') || host.endsWith('.local');
  if (!local) return;

  document.title = 'FoodTrack Local';
  document.querySelector('link[rel="manifest"]').setAttribute('href', '/manifest-local.json');
  document.querySelector('link[rel="apple-touch-icon"]').setAttribute('href', '/icons/local/apple-touch-icon.png');
  document.querySelector('meta[name="apple-mobile-web-app-title"]').setAttribute('content', 'FoodTrack Local');
})();

// Aplica el tema guardado antes del primer render (evita el destello claro/oscuro).
(function () {
  var pref = 'system';
  try {
    pref = localStorage.getItem('foodtrack-theme') || 'system';
  } catch (e) {}
  var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#14110F' : '#FFF7EE');
})();
