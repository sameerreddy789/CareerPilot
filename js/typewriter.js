/**
 * TypewriterVaporize
 * Phase 1 — TYPING:  real <span> text so CSS gradient + font size are pixel-perfect
 * Phase 2 — HOLD:    text stays visible
 * Phase 3 — VAPORIZE: snapshot span → canvas → particle dissolve
 * Phase 4 — repeat
 */
(function () {
    'use strict';

    const PHRASES = [
        "Start Getting Hired.",
        "Start Mastering Skills.",
        "Start Crushing Interviews.",
        "Start Building Your Future."
    ];

    const TYPE_SPEED        = 85;   // ms per character (slow, deliberate)
    const HOLD_DURATION     = 2400; // ms to hold full text
    const VAPORIZE_DURATION = 1500; // ms for wave to cross text
    const SPREAD            = 3.5;
    const DENSITY           = 0.70;

    // ── State ──────────────────────────────────────────────────────────────────
    let host, textSpan, cursorSpan, canvas, ctx;
    let particles = [];
    let textBoundaries = null;
    let phraseIndex = 0;
    let charIndex   = 0;
    let state       = 'typing';
    let vaporizeProgress = 0;
    let lastTime = null;
    let rafId    = null;
    let typeTimer = null;
    let holdTimer = null;
    let cursorBlink = null;
    let cursorVisible = true;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // ── Boot ───────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        host = document.getElementById('hero-typewriter');
        if (!host) return;

        // Build DOM: [textSpan][cursorSpan][canvas(hidden)]
        host.innerHTML = '';
        host.style.cssText = 'display:inline; position:relative;';

        // Text span — inherits all CSS from .hero-title span (gradient, font, etc.)
        textSpan = document.createElement('span');
        textSpan.style.cssText = 'display:inline;';
        host.appendChild(textSpan);

        // Cursor — styled to match the gradient text
        cursorSpan = document.createElement('span');
        cursorSpan.textContent = '|';
        cursorSpan.style.cssText = [
            'display:inline-block',
            'margin-left:2px',
            'font-weight:300',
            'opacity:1',
            'color:transparent',
            'background:linear-gradient(105deg,#a78bfa,#f472b6)',
            '-webkit-background-clip:text',
            'background-clip:text',
            '-webkit-text-fill-color:transparent',
            'transition:opacity 0.1s'
        ].join(';');
        host.appendChild(cursorSpan);

        // Canvas — hidden during typing, shown during vaporize
        canvas = document.createElement('canvas');
        canvas.style.cssText = [
            'display:none',
            'position:absolute',
            'top:0',
            'left:0',
            'pointer-events:none'
        ].join(';');
        host.appendChild(canvas);
        ctx = canvas.getContext('2d');

        startCursorBlink();
        charIndex = 0;
        typeStep();
    }

    // ── Cursor blink ───────────────────────────────────────────────────────────
    function startCursorBlink() {
        clearInterval(cursorBlink);
        cursorVisible = true;
        cursorSpan.style.opacity = '1';
        cursorBlink = setInterval(() => {
            cursorVisible = !cursorVisible;
            cursorSpan.style.opacity = cursorVisible ? '1' : '0';
        }, 530);
    }

    function stopCursorBlink(visible) {
        clearInterval(cursorBlink);
        cursorSpan.style.opacity = visible ? '1' : '0';
    }

    // ── Typing phase ───────────────────────────────────────────────────────────
    function typeStep() {
        clearTimeout(typeTimer);
        const phrase = PHRASES[phraseIndex];
        if (charIndex > phrase.length) charIndex = phrase.length;

        textSpan.textContent = phrase.slice(0, charIndex);

        if (charIndex < phrase.length) {
            charIndex++;
            typeTimer = setTimeout(typeStep, TYPE_SPEED);
        } else {
            // Fully typed — solid cursor, then hold
            stopCursorBlink(true);
            holdTimer = setTimeout(startVaporize, HOLD_DURATION);
        }
    }

    // ── Vaporize phase ─────────────────────────────────────────────────────────
    function startVaporize() {
        stopCursorBlink(false);

        // Snapshot the text span into canvas
        snapshotToCanvas();

        // Hide text span + cursor, show canvas
        textSpan.style.visibility = 'hidden';
        cursorSpan.style.display = 'none';
        canvas.style.display = 'block';

        state = 'vaporizing';
        vaporizeProgress = 0;
        lastTime = performance.now();
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(loop);
    }

    function snapshotToCanvas() {
        // Get the bounding rect of the text span relative to host
        const hostRect = host.getBoundingClientRect();
        const spanRect = textSpan.getBoundingClientRect();

        const cssW = Math.ceil(spanRect.width)  + 4;
        const cssH = Math.ceil(hostRect.height) + 4;

        canvas.width  = cssW * dpr;
        canvas.height = cssH * dpr;
        canvas.style.width  = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.style.top    = '0px';
        canvas.style.left   = '0px';

        ctx.scale(dpr, dpr);

        // Replicate the exact font from computed style
        const cs = window.getComputedStyle(textSpan);
        const fontSize   = parseFloat(cs.fontSize);
        const fontWeight = cs.fontWeight;
        const fontFamily = cs.fontFamily;

        ctx.clearRect(0, 0, cssW, cssH);
        ctx.font         = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';

        // Match the CSS gradient exactly
        const grad = ctx.createLinearGradient(0, 0, cssW, 0);
        grad.addColorStop(0.00, '#ffffff');
        grad.addColorStop(0.25, '#e0e7ff');
        grad.addColorStop(0.45, '#a78bfa');
        grad.addColorStop(0.50, '#c4b5fd');
        grad.addColorStop(0.65, '#f472b6');
        grad.addColorStop(0.85, '#818cf8');
        grad.addColorStop(1.00, '#ffffff');
        ctx.fillStyle = grad;

        // Vertical position: match where text baseline sits in the host element
        const baselineY = spanRect.bottom - hostRect.top - 2;
        ctx.fillText(textSpan.textContent, 0, baselineY);

        // Reset transform for particle sampling
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Sample pixels → particles
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data    = imgData.data;
        const step    = Math.max(1, Math.round(dpr));
        particles     = [];

        for (let y = 0; y < canvas.height; y += step) {
            for (let x = 0; x < canvas.width; x += step) {
                const i = (y * canvas.width + x) * 4;
                if (data[i + 3] > 20) {
                    const a = (data[i + 3] / 255);
                    particles.push({
                        x: x / dpr, y: y / dpr,
                        ox: x / dpr, oy: y / dpr,
                        r: data[i], g: data[i+1], b: data[i+2],
                        opacity: a, oa: a,
                        vx: 0, vy: 0, speed: 0,
                        quickFade: Math.random() > DENSITY
                    });
                }
            }
        }

        textBoundaries = { left: 0, width: spanRect.width };

        // Clear canvas — particles will redraw
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // ── Animation loop ─────────────────────────────────────────────────────────
    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        vaporizeProgress += (dt * 1000 / VAPORIZE_DURATION) * 100;
        const progress = Math.min(100, vaporizeProgress);
        const waveX    = textBoundaries.left + textBoundaries.width * (progress / 100);
        const done     = stepVaporize(waveX, dt);
        renderParticles();

        if (vaporizeProgress >= 100 && done) {
            cancelAnimationFrame(rafId);
            rafId = null;
            nextPhrase();
            return;
        }

        rafId = requestAnimationFrame(loop);
    }

    function nextPhrase() {
        // Reset canvas
        canvas.style.display = 'none';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles = [];

        // Restore text span + cursor
        textSpan.style.visibility = 'visible';
        textSpan.textContent = '';
        cursorSpan.style.display = 'inline-block';

        phraseIndex = (phraseIndex + 1) % PHRASES.length;
        charIndex   = 0;
        state       = 'typing';

        startCursorBlink();
        typeStep();
    }

    // ── Render particles ───────────────────────────────────────────────────────
    function renderParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            if (p.opacity <= 0.01) continue;
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
            ctx.fillRect(p.x, p.y, 1.5, 1.5);
        }
    }

    // ── Vaporize step ──────────────────────────────────────────────────────────
    function stepVaporize(waveX, dt) {
        const fontSize   = parseFloat(window.getComputedStyle(host).fontSize) || 60;
        const spreadMult = calcSpread(fontSize) * SPREAD;
        let allDone = true;

        for (const p of particles) {
            if (p.ox > waveX) { allDone = false; continue; }

            if (p.speed === 0) {
                const angle = Math.random() * Math.PI * 2;
                p.speed = (Math.random() * 1 + 0.5) * spreadMult;
                p.vx    = Math.cos(angle) * p.speed;
                p.vy    = Math.sin(angle) * p.speed;
            }

            if (p.quickFade) {
                p.opacity = Math.max(0, p.opacity - dt * 2.8);
            } else {
                const dx   = p.ox - p.x, dy = p.oy - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const damp = Math.max(0.93, 1 - dist / (80 * spreadMult));
                const rand = spreadMult * 2.5;
                p.vx = (p.vx + (Math.random()-0.5)*rand + dx*0.002) * damp;
                p.vy = (p.vy + (Math.random()-0.5)*rand + dy*0.002) * damp;
                const maxV = spreadMult * 2;
                const cv   = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
                if (cv > maxV) { p.vx *= maxV/cv; p.vy *= maxV/cv; }
                p.x += p.vx * dt * 18;
                p.y += p.vy * dt * 9;
                p.opacity = Math.max(0, p.opacity - dt * 0.35);
            }

            if (p.opacity > 0.01) allDone = false;
        }
        return allDone;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    function calcSpread(size) {
        const pts = [{s:20,v:0.3},{s:50,v:0.7},{s:100,v:2.0}];
        if (size <= pts[0].s) return pts[0].v;
        if (size >= pts[pts.length-1].s) return pts[pts.length-1].v;
        let i = 0;
        while (i < pts.length-1 && pts[i+1].s < size) i++;
        const a = pts[i], b = pts[i+1];
        return a.v + (size - a.s) * (b.v - a.v) / (b.s - a.s);
    }

    function debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }
})();
