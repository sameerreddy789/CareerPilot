/**
 * TypewriterVaporize
 * - Typing phase: real <span> inheriting all CSS (gradient, font, size)
 * - Vaporize phase: inline-block canvas swapped in at exact same size
 *   No absolute positioning — canvas sits exactly where the text was.
 */
(function () {
    'use strict';

    const PHRASES = [
        "Start Getting Hired.",
        "Start Mastering Skills.",
        "Start Crushing Interviews.",
        "Start Building Your Future."
    ];

    const TYPE_SPEED        = 85;   // ms per char
    const HOLD_DURATION     = 2400; // ms hold before vaporize
    const VAPORIZE_DURATION = 1125; // ms for wave (1500 * 0.75)
    const SPREAD            = 3.5;
    const DENSITY           = 0.70;

    let host, textSpan, cursorSpan, canvas, ctx;
    let particles = [];
    let textW = 0; // logical width of text in canvas coords
    let phraseIndex = 0;
    let charIndex   = 0;
    let vaporizeProgress = 0;
    let lastTime = null;
    let rafId    = null;
    let typeTimer = null;
    let cursorBlink = null;
    let cursorVisible = true;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        host = document.getElementById('hero-typewriter');
        if (!host) return;

        host.innerHTML = '';
        // Keep host inline so it flows inside the h1 naturally
        host.style.cssText = 'display:inline; position:static;';

        // Text span — inherits .hero-title span gradient + font from CSS
        textSpan = document.createElement('span');
        textSpan.style.cssText = 'display:inline-block; vertical-align:top;';
        host.appendChild(textSpan);

        // No cursor
        cursorSpan = document.createElement('span');
        cursorSpan.style.display = 'none';
        host.appendChild(cursorSpan);

        // Canvas — hidden until vaporize, same vertical-align as textSpan
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'display:none; vertical-align:top; pointer-events:none;';
        host.appendChild(canvas);
        ctx = canvas.getContext('2d');

        startCursorBlink();
        charIndex = 0;
        typeStep();
    }

    function startCursorBlink() {}
    function stopCursor() {}

    // ── Typing ─────────────────────────────────────────────────────────────────
    function typeStep() {
        clearTimeout(typeTimer);
        const phrase = PHRASES[phraseIndex];
        if (charIndex > phrase.length) charIndex = phrase.length;
        textSpan.textContent = phrase.slice(0, charIndex);

        if (charIndex < phrase.length) {
            charIndex++;
            typeTimer = setTimeout(typeStep, TYPE_SPEED);
        } else {
            stopCursor(true);
            setTimeout(startVaporize, HOLD_DURATION);
        }
    }

    // ── Vaporize ───────────────────────────────────────────────────────────────
    function startVaporize() {
        stopCursor(false);

        // Measure the text span BEFORE hiding it
        const cs       = window.getComputedStyle(textSpan);
        const fontSize = parseFloat(cs.fontSize);
        const fontWeight = cs.fontWeight;
        const fontFamily = cs.fontFamily;
        const spanRect = textSpan.getBoundingClientRect();

        // Measure actual rendered text width on a scratch canvas (avoids wrap clipping)
        const tmpC = document.createElement('canvas').getContext('2d');
        tmpC.font  = `${fontWeight} ${fontSize}px ${fontFamily}`;
        const measuredW = Math.ceil(tmpC.measureText(textSpan.textContent).width) + 4;

        const cssW = Math.max(measuredW, Math.ceil(spanRect.width) || 10);
        const cssH = Math.ceil(spanRect.height) || Math.ceil(fontSize * 1.3);

        // Size canvas to exactly match the span's rendered box
        canvas.width  = cssW * dpr;
        canvas.height = cssH * dpr;
        canvas.style.width  = cssW + 'px';
        canvas.style.height = cssH + 'px';

        // Draw text onto canvas matching exact visual appearance
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.font         = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';

        const grad = ctx.createLinearGradient(0, 0, cssW, 0);
        grad.addColorStop(0.00, '#ffffff');
        grad.addColorStop(0.25, '#e0e7ff');
        grad.addColorStop(0.45, '#a78bfa');
        grad.addColorStop(0.50, '#c4b5fd');
        grad.addColorStop(0.65, '#f472b6');
        grad.addColorStop(0.85, '#818cf8');
        grad.addColorStop(1.00, '#ffffff');
        ctx.fillStyle = grad;

        // Place baseline so glyphs sit at same vertical position as the CSS span.
        // actualBoundingBoxAscent = distance from baseline to top of glyph.
        // We want the top of the glyph to be at y=0 (top of canvas = top of span).
        const metrics  = ctx.measureText(textSpan.textContent);
        const ascent   = metrics.actualBoundingBoxAscent;
        ctx.fillText(textSpan.textContent, 0, ascent);
        ctx.restore();

        // Sample pixels → particles (in CSS px coords)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data    = imgData.data;
        const step    = Math.max(1, Math.round(dpr));
        particles     = [];
        textW         = measuredW;

        for (let y = 0; y < canvas.height; y += step) {
            for (let x = 0; x < canvas.width; x += step) {
                const i = (y * canvas.width + x) * 4;
                if (data[i + 3] > 20) {
                    const px = x / dpr;
                    const py = y / dpr;
                    particles.push({
                        x: px, y: py, ox: px, oy: py,
                        r: data[i], g: data[i+1], b: data[i+2],
                        opacity: data[i+3] / 255,
                        oa: data[i+3] / 255,
                        vx: 0, vy: 0, speed: 0,
                        quickFade: Math.random() > DENSITY
                    });
                }
            }
        }

        // Swap: hide text span, show canvas in its place
        textSpan.style.display = 'none';
        cursorSpan.style.display = 'none';
        canvas.style.display = 'inline-block';

        vaporizeProgress = 0;
        lastTime = performance.now();
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(loop);
    }

    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        vaporizeProgress += (dt * 1000 / VAPORIZE_DURATION) * 100;
        const progress = Math.min(100, vaporizeProgress);
        const waveX    = textW * (progress / 100);
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
        canvas.style.display = 'none';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles = [];

        textSpan.style.display  = 'inline-block';
        textSpan.textContent    = '';
        cursorSpan.style.display = 'inline';

        phraseIndex = (phraseIndex + 1) % PHRASES.length;
        charIndex   = 0;
        startCursorBlink();
        typeStep();
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    function renderParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            if (p.opacity <= 0.01) continue;
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
            ctx.fillRect(p.x * dpr, p.y * dpr, 1.5 * dpr, 1.5 * dpr);
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
                p.speed = (Math.random() + 0.5) * spreadMult;
                p.vx    = Math.cos(angle) * p.speed;
                p.vy    = Math.sin(angle) * p.speed;
            }

            if (p.quickFade) {
                p.opacity = Math.max(0, p.opacity - dt * 2.8);
            } else {
                const dx   = p.ox - p.x, dy = p.oy - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const damp = Math.max(0.93, 1 - dist / (80 * spreadMult));
                p.vx = (p.vx + (Math.random()-0.5)*spreadMult*2.5 + dx*0.002) * damp;
                p.vy = (p.vy + (Math.random()-0.5)*spreadMult*2.5 + dy*0.002) * damp;
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

    function calcSpread(size) {
        const pts = [{s:20,v:0.3},{s:50,v:0.7},{s:100,v:2.0}];
        if (size <= pts[0].s) return pts[0].v;
        if (size >= pts[pts.length-1].s) return pts[pts.length-1].v;
        let i = 0;
        while (i < pts.length-1 && pts[i+1].s < size) i++;
        const a = pts[i], b = pts[i+1];
        return a.v + (size - a.s) * (b.v - a.v) / (b.s - a.s);
    }
})();
