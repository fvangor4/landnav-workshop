// Shared page behavior. Loaded as a plain script in <head> on every page, so
// the projector view is applied before the page first paints.

(function () {
  'use strict';

  var VIEW_KEY = 'landnav.view';
  var root = document.documentElement;

  // localStorage can be unavailable (private windows, blocked site data).
  function savedView() {
    try {
      return localStorage.getItem(VIEW_KEY);
    } catch (error) {
      return null;
    }
  }

  function saveView(view) {
    try {
      if (view) localStorage.setItem(VIEW_KEY, view);
      else localStorage.removeItem(VIEW_KEY);
    } catch (error) {
      /* the view still applies to this page */
    }
  }

  function projectorOn() {
    return root.getAttribute('data-view') === 'projector';
  }

  if (savedView() === 'projector') root.setAttribute('data-view', 'projector');

  function refresh() {
    var on = projectorOn();

    document.querySelectorAll('[data-action="projector-toggle"]').forEach(function (button) {
      button.textContent = on ? 'Turn projector view off' : 'Turn projector view on';
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.querySelectorAll('[data-projector-state]').forEach(function (el) {
      el.textContent = on ? 'Projector view is on.' : 'Projector view is off.';
    });

    // A bar on every page so the instructor can leave projector view anywhere.
    var bar = document.getElementById('projector-bar');
    if (on && !bar) {
      bar = document.createElement('div');
      bar.id = 'projector-bar';
      bar.className = 'projector-bar no-print';
      var label = document.createElement('span');
      label.textContent = 'Projector view';
      var exit = document.createElement('button');
      exit.type = 'button';
      exit.textContent = 'Exit';
      exit.addEventListener('click', function () {
        setProjector(false);
      });
      bar.appendChild(label);
      bar.appendChild(exit);
      document.body.insertBefore(bar, document.body.firstChild);
    } else if (!on && bar) {
      bar.remove();
    }
  }

  function setProjector(on) {
    if (on) root.setAttribute('data-view', 'projector');
    else root.removeAttribute('data-view');
    saveView(on ? 'projector' : null);
    refresh();
  }

  // Offline support. The Instructor page shows the outcome, so a failure to
  // save the offline copy is visible to someone rather than silent.
  var offlineState = 'Checking whether this device has an offline copy.';

  function showOfflineState(text) {
    offlineState = text;
    document.querySelectorAll('[data-offline-state]').forEach(function (el) {
      el.textContent = text;
    });
  }

  function offlineFailed(error) {
    console.warn('Land Nav Workshop: offline copy not saved.', error);
    showOfflineState('This device could not save an offline copy. It needs a signal to open the site.');
  }

  function watchWorker(registration) {
    if (registration.active) {
      showOfflineState('This device has an offline copy.');
      return;
    }
    var worker = registration.installing || registration.waiting;
    if (!worker) return;
    worker.addEventListener('statechange', function () {
      if (worker.state === 'activated') showOfflineState('This device has an offline copy.');
      // 'redundant' here means the install failed, for example a missing file.
      if (worker.state === 'redundant') offlineFailed(new Error('service worker install failed'));
    });
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(watchWorker, offlineFailed);
    });
  } else {
    offlineState = 'This browser cannot save an offline copy. It needs a signal to open the site.';
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-action="print"]').forEach(function (button) {
      button.addEventListener('click', function () {
        window.print();
      });
    });
    document.querySelectorAll('[data-action="projector-toggle"]').forEach(function (button) {
      button.addEventListener('click', function () {
        setProjector(!projectorOn());
      });
    });
    refresh();
    showOfflineState(offlineState);
  });
})();
