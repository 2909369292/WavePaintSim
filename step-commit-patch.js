// Step/Sub-step commit-on-blur patch
// The original app re-renders the waveform on every 'input' keystroke,
// which makes the waveform flicker/disappear while typing (e.g. editing
// 20 -> 40 first turns into 2). This patch suppresses the per-keystroke
// update and only commits the final value on blur (change) or Enter.
(function () {
    'use strict';
    var TARGET_IDS = ['sample-spin', 'substep-spin'];
    var suppress = true;

    function isTarget(el) {
        return el && TARGET_IDS.indexOf(el.id) !== -1;
    }

    // Capture-phase: block the app's per-keystroke 'input' handler.
    document.addEventListener('input', function (e) {
        if (suppress && isTarget(e.target)) {
            e.stopImmediatePropagation();
        }
    }, true);

    // On blur ('change'), commit the final value by re-dispatching 'input'
    // once so the app reads the completed number and updates the waveform.
    document.addEventListener('change', function (e) {
        if (isTarget(e.target)) {
            suppress = false;
            try {
                e.target.dispatchEvent(new Event('input', { bubbles: true }));
            } finally {
                suppress = true;
            }
        }
    }, true);

    // Pressing Enter while editing commits immediately.
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && isTarget(e.target)) {
            e.target.blur();
        }
    }, true);
})();
