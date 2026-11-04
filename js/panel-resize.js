(() => {
  'use strict';
  const workspace = document.querySelector('.workspace');
  const panels = { left: workspace.querySelector('.catalog-panel'), right: workspace.querySelector('.inspector') };
  const handles = [...workspace.querySelectorAll('.panel-resizer')];
  const desktop = matchMedia('(min-width: 761px)');
  const minimum = { left: 160, right: 220 };
  const editorMinimum = 320;
  let drag = null;

  function width(side) { return panels[side].getBoundingClientRect().width; }
  function maximum(side) {
    const other = side === 'left' ? 'right' : 'left';
    return Math.max(minimum[side], Math.min(480, workspace.clientWidth - width(other) - editorMinimum));
  }
  function updateAria() {
    for (const handle of handles) {
      const side = handle.dataset.panel;
      handle.setAttribute('aria-valuemin', minimum[side]);
      handle.setAttribute('aria-valuemax', Math.round(maximum(side)));
      handle.setAttribute('aria-valuenow', Math.round(width(side)));
    }
  }
  function resize(side, value) {
    workspace.style.setProperty(`--${side}-width`, `${Math.max(minimum[side], Math.min(maximum(side), value))}px`);
    updateAria();
  }
  function finish(cancel = false) {
    if (!drag) return;
    const previous = drag;
    drag = null;
    if (cancel) resize(previous.side, previous.width);
    previous.handle.classList.remove('is-resizing');
    document.body.classList.remove('panel-resizing');
    if (previous.handle.hasPointerCapture(previous.id)) previous.handle.releasePointerCapture(previous.id);
  }
  for (const handle of handles) {
    const side = handle.dataset.panel;
    handle.addEventListener('pointerdown', event => {
      if (!desktop.matches || event.button !== 0 || drag) return;
      event.preventDefault();
      handle.focus();
      drag = { handle, side, id: event.pointerId, x: event.clientX, width: width(side) };
      handle.setPointerCapture(event.pointerId);
      handle.classList.add('is-resizing');
      document.body.classList.add('panel-resizing');
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      resize(side, drag.width + (event.clientX - drag.x) * (side === 'left' ? 1 : -1));
    });
    handle.addEventListener('pointerup', event => { if (drag?.id === event.pointerId) finish(); });
    handle.addEventListener('pointercancel', () => finish(true));
    handle.addEventListener('lostpointercapture', () => finish(true));
    handle.addEventListener('dblclick', () => {
      resize(side, parseFloat(getComputedStyle(workspace).getPropertyValue(`--${side}-default`)));
    });
    handle.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drag) { event.preventDefault(); event.stopPropagation(); finish(true); }
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const delta = (event.key === 'ArrowRight' ? 10 : -10) * (side === 'left' ? 1 : -1);
      resize(side, event.key === 'Home' ? minimum[side] : event.key === 'End' ? maximum(side) : width(side) + delta);
    });
  }
  window.addEventListener('blur', () => finish());
  new ResizeObserver(() => {
    if (!desktop.matches) { finish(); return; }
    // Keep enough canvas space when the browser window becomes narrower.
    resize('left', width('left'));
    resize('right', width('right'));
  }).observe(workspace);
})();
