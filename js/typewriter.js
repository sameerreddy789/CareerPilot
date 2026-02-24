(function () {
    'use strict';

    const PHRASES = [
        'Start Getting Hired.',
        'Start Mastering Skills.',
        'Start Crushing Interviews.',
        'Start Building Your Future.'
    ];

    const TYPE_SPEED   = 85;   // ms per character
    const HOLD         = 2400; // ms to hold full text
    const FADE_OUT     = 400;  // ms to fade out

    let span;
    let phraseIndex = 0;
    let charIndex   = 0;
    let typeTimer   = null;

    document.addEventListener('DOMContentLoaded', () => {
        span = document.getElementById('hero-typewriter');
        if (!span) return;
        span.textContent = '';
        span.style.transition = `opacity ${FADE_OUT}ms ease`;
        span.style.opacity = '1';
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(typeStep);
    });

    function typeStep() {
        clearTimeout(typeTimer);
        const phrase = PHRASES[phraseIndex];
        charIndex = Math.min(charIndex, phrase.length);
        span.textContent = phrase.slice(0, charIndex);

        if (charIndex < phrase.length) {
            charIndex++;
            typeTimer = setTimeout(typeStep, TYPE_SPEED);
        } else {
            typeTimer = setTimeout(fadeOut, HOLD);
        }
    }

    function fadeOut() {
        span.style.opacity = '0';
        setTimeout(() => {
            phraseIndex = (phraseIndex + 1) % PHRASES.length;
            charIndex   = 0;
            span.textContent = '';
            span.style.opacity = '1';
            typeStep();
        }, FADE_OUT);
    }
})();
