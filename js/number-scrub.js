(function (root) {
  'use strict';

  function install(scope) {
    let drag = null;
    const doc = scope.ownerDocument;
    const win = doc.defaultView;

    function finish(commit) {
      if (!drag) return;
      const current = drag;
      drag = null;
      delete doc.body.dataset.numberScrubbing;
      if (current.handle.hasPointerCapture(current.pointerId)) {
        current.handle.releasePointerCapture(current.pointerId);
      }
      if (!commit) {
        current.input.value = current.original;
      } else if (current.input.value !== current.original) {
        current.input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      current.input.dispatchEvent(new CustomEvent('number-scrub-end', { bubbles: true, detail: { commit } }));
    }

    scope.querySelectorAll('input[type="number"]').forEach(input => {
      if (input.parentElement.classList.contains('number-control')) return;
      const wrapper = doc.createElement('span');
      wrapper.className = 'number-control';
      input.before(wrapper);
      wrapper.appendChild(input);
      const handle = doc.createElement('span');
      handle.className = 'number-scrub';
      handle.dataset.numberScrub = input.name;
      handle.setAttribute('aria-hidden', 'true');
      handle.title = '좌우로 드래그하여 값 조정 · Esc로 취소';
      handle.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3 1 8l4 5M1 8h14M11 3l4 5-4 5"/></svg>';
      wrapper.appendChild(handle);

      handle.addEventListener('pointerdown', event => {
        if (event.button !== 0 || drag || input.disabled || input.readOnly) return;
        if (!Number.isFinite(input.valueAsNumber)) return;
        event.preventDefault();
        event.stopPropagation();
        input.focus({ preventScroll: true });
        input.dispatchEvent(new CustomEvent('number-scrub-start', { bubbles: true }));
        const start = input.valueAsNumber;
        const angle = input.name === 'rotation';
        drag = {
          input, handle, pointerId: event.pointerId, startX: event.clientX,
          start, original: input.value, step: angle ? 1 : 0.01,
          pixelsPerStep: angle ? 8 : 2,
          min: input.min === '' ? -Infinity : Number(input.min),
          max: input.max === '' ? Infinity : Number(input.max)
        };
        doc.body.dataset.numberScrubbing = 'true';
        handle.setPointerCapture(event.pointerId);
      });

      handle.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        event.preventDefault();
        const steps = Math.round((event.clientX - drag.startX) / drag.pixelsPerStep);
        const value = Math.max(drag.min, Math.min(drag.max,
          Number((drag.start + steps * drag.step).toFixed(6))));
        const text = steps === 0 ? drag.original : String(value);
        if (input.value === text) return;
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      handle.addEventListener('pointerup', event => {
        if (drag && event.pointerId === drag.pointerId) finish(true);
      });
      handle.addEventListener('pointercancel', event => {
        if (drag && event.pointerId === drag.pointerId) finish(false);
      });
      handle.addEventListener('lostpointercapture', () => {
        if (drag?.handle === handle) finish(false);
      });
      handle.addEventListener('click', event => event.preventDefault());
    });

    win.addEventListener('blur', () => finish(false));
    doc.addEventListener('keydown', event => {
      if (!drag || event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    }, true);
  }

  root.FEMSNumberScrub = { install };
})(window);
