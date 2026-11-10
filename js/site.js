// Shared page behavior. Loaded as a plain script in <head> on every page.

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-action="print"]').forEach(function (button) {
      button.addEventListener('click', function () {
        window.print();
      });
    });
  });
})();
