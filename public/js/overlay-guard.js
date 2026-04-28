(function () {
  'use strict';

  if (window.__overlayGuardLoaded) return;
  window.__overlayGuardLoaded = true;

  function isProbablyStuckOverlay(element) {
    if (!(element instanceof HTMLElement)) return false;

    var style = window.getComputedStyle(element);
    if (!style) return false;

    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (style.position !== 'fixed') return false;
    if (style.pointerEvents === 'none') return false;

    var zIndex = Number(style.zIndex || 0);
    if (!Number.isFinite(zIndex) || zIndex < 900) return false;

    var rect = element.getBoundingClientRect();
    var viewportW = window.innerWidth || document.documentElement.clientWidth || 1;
    var viewportH = window.innerHeight || document.documentElement.clientHeight || 1;
    var coversMostViewport = rect.width >= viewportW * 0.9 && rect.height >= viewportH * 0.9;
    if (!coversMostViewport) return false;

    var className = String(element.className || '').toLowerCase();
    var likelyOverlayClass = /overlay|backdrop|lightbox|modal/.test(className);

    var hasDarkBackground = false;
    var bg = String(style.backgroundColor || '').toLowerCase();
    if (bg.startsWith('rgba(')) {
      var alphaPart = bg.replace('rgba(', '').replace(')', '').split(',')[3];
      var alpha = Number(alphaPart);
      hasDarkBackground = Number.isFinite(alpha) ? alpha >= 0.15 : false;
    } else if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      hasDarkBackground = true;
    }

    return likelyOverlayClass || hasDarkBackground;
  }

  function forceCloseOverlay(element) {
    element.classList.remove('is-open', 'open', 'active', 'show', 'visible');
    element.setAttribute('aria-hidden', 'true');
    element.style.display = 'none';
    element.style.pointerEvents = 'none';
    element.style.opacity = '0';
  }

  function recoverIfBlocked() {
    var overlays = Array.from(document.body.querySelectorAll('*')).filter(isProbablyStuckOverlay);
    overlays.forEach(forceCloseOverlay);

    document.documentElement.style.pointerEvents = '';
    document.body.style.pointerEvents = '';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  function scheduleRecover() {
    setTimeout(recoverIfBlocked, 0);
    setTimeout(recoverIfBlocked, 120);
    setTimeout(recoverIfBlocked, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleRecover);
  } else {
    scheduleRecover();
  }

  window.addEventListener('pageshow', scheduleRecover);
  window.addEventListener('focus', scheduleRecover);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) scheduleRecover();
  });
})();
