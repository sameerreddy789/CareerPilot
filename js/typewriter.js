/**
 * TypewriterVaporize — clean rewrite
 *
 * Architecture:
 *  #hero-typewriter-wrap  (inline-block, position:relative, fixed height)
 *    └─ #hero-typewriter  (inline span, inherits CSS gradient + font)
 *    └─ canvas            (position:absolute, overlaid only during vaporize)
 *
 * Flow: fonts.ready → type chars → hold → snapshot pixels → hide span →
 *       show canvas → particle vaporize → next phrase
 */
(function () {
    'use strict';

    const PHRASES = [
        'Start Getting Hired.',
        'Start Mastering Skills.',
        'Start Crushing Interviews.',
        'Start Building Your Future.'
    ];

    const TYPE_SPEED        = 85;    // ms per character
    const HOLD_DURATION     = 2400;  // ms to hold full text
    const VAPORIZE_DURATION = 1125;  // ms for wave to cross text
    const PARTICLE_STEP     = 2;     // sample every N physical pixels
    const SPREAD            = 3.2;
    const DENSITY           = 0.68;  // fraction that drift vs quick-fade

    // ── DOM refs ───────────────────────────────────────────────────────────────
    let wrap, span, canvas, ctx;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // ── Animation state ────────────────────────────────────────────────────────
    let particles      = [];
    let textW          = 0;   // CSS-px width of text used for wave
    let phraseIndex    = 0;
    let charIndex      = 0;
    let vaporProg      = 0;
    let lastTime       = null;
    let rafId          = null;
    let typeTimer      = null;
    let locked         = false; // block re-entry during vaporize

    // ── Boot: wait for fonts so metrics are accurate ───────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        wrap   = document.getElementById('hero-typewriter-wrap');
        span   = document.getElementById('hero-typewriter');
        if (!wrap || !span) return;

        // Clear any static HTML content
        span.textContent = '';

        // Build canvas once, keep it in DOM hidden
        canvas = document.createElement('canvas');
        canvas.style.cssText = [
            'position:absolute',
            'top:0',
            'left:0',
            'display:none',
            'pointer-events:none',
            'will-change:transform'
        ].join(';');
        wrap.appendChild(canvas);
        ctx = canvas.getContext('2d', { alpha: true });

        // Wait for fonts before first render
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(startTyping);
    });

    // ── Typing phase ───────────────────────────────────────────────────────────
    function startTyping() {
        locked    = false;
        charIndex = 0;
        typeStep();
    }

    function typeStep() {
        if (locked) return;
        clearTimeout(typeTimer);
        const phrase = PHRASES[phraseIndex];
        charIndex = Math.min(charIndex, phrase.length);
        span.textContent = phrase.slice(0, charIndex);

        if (charIndex < phrase.length) {
            charIndex++;
            typeTimer = setTimeout(typeStep, TYPE_SPEED);
        } else {
            // Fully typed — hold then vaporize
            typeTimer = setTimeout(beginVaporize, HOLD_DURATION);
        }
    }

    // ── Vaporize phase ─────────────────────────────────────────────────────────
    function beginVaporize() {
        locked = true;

        // ── 1. Capture font metrics from computed style ──────────────────────
        const cs         = window.getComputedStyle(span);
        const fontSize   = parseFloat(cs.fontSize);
        const fontWeight = cs.fontWeight;
        const fontFamily = cs.fontFamily;
        const fontStr    = `${fontWeight} ${fontSize}px ${fontFamily}`;

        // ── 2. Measure true text width on offscreen canvas ───────────────────
        const probe = document.createElement('canvas').getContext('2d');
        probe.font  = fontStr;
        const m0    = probe.measureText(span.textContent);
        // Use actualBoundingBox for tight fit
        const glyphW = Math.ceil(m0.actualBoundingBoxRight - m0.actualBoundingBoxLeft) + 2;
        const glyphH = Math.ceil(m0.actualBoundingBoxAscent + m0.actualBoundingBoxDescent) + 2;

        // ── 3. Get span position relative to wrap ────────────────────────────
        const wrapRect = wrap.getBoundingClientRect();
        const spanRect = span.getBoundingClientRect();
        const ox = Math.round(spanRect.left - wrapRect.left);
        const oy = Math.round(spanRect.top  - wrapRect.top);

        // ── 4. Size canvas to exact glyph bounding box ───────────────────────
        const cW = glyphW;
        const cH = glyphH;
        canvas.width        = cW * dpr;
        canvas.height       = cH * dpr;
        canvas.style.width  = cW + 'px';
        canvas.style.height = cH + 'px';
        canvas.style.left   = ox + 'px';
        canvas.style.top    = (oy + Math.round((spanRect.height - cH) / 2)) + 'px';

        // ── 5. Draw text at exact glyph origin ───────────────────────────────
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.font         = fontStr;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';

        const grad = ctx.createLinearGradient(0, 0, cW, 0);
        grad.addColorStop(0.00, '#ffffff');
        grad.addColorStop(0.25, '#e0e7ff');
        grad.addColorStop(0.45, '#a78bfa');
        grad.addColorStop(0.50, '#c4b5fd');
        grad.addColorStop(0.65, '#f472b6');
        grad.addColorStop(0.85, '#818cf8');
        grad.addColorStop(1.00, '#ffffff');
        ctx.fillStyle = grad;

        // Draw so top of glyph is at y=0 inside canvas
        const ascent = m0.actualBoundingBoxAscent;
        ctx.fillText(span.textContent, -m0.actualBoundingBoxLeft, ascent);
        ctx.restore();

        // ── 6. Sample pixels → particles ─────────────────────────────────────
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data    = imgData.data;
        particles     = [];
        textW         = cW;

        for (let py = 0; py < canvas.height; py += PARTICLE_STEP) {
            for (let px = 0; px < canvas.width; px += PARTICLE_STEP) {
                const i = (py * canvas.width + px) * 4;
                if (data[i + 3] > 30) {
                    const cx = px / dpr;
                    const cy = py / dpr;
                    particles.push({
                        x: cx, y: cy, ox: cx, oy: cy,
                        r: data[i], g: data[i+1], b: data[i+2],
                        a: data[i+3] / 255,
                        vx: 0, vy: 0, speed: 0,
                        quick: Math.random() > DENSITY
                    });
                }
            }
        }

        // ── 7. Swap: hide span text, show canvas ─────────────────────────────
        // visibility:hidden keeps layout space — no jump
        span.style.visibility = 'hidden';
        ctx.clearRect(0, 0, canvas.width, canvas.height); // clear draw, particles redraw
        canvas.style.display = 'block';

        // ── 8. Start loop ─────────────────────────────────────────────────────
        vaporProg = 0;
        lastTime  = performance.now();
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(vaporLoop);
    }

    function vaporLoop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        vaporProg += (dt * 1000 / VAPORIZE_DURATION) * 100;
        const waveX = textW * Math.min(vaporProg, 100) / 100;
        const done  = tickParticles(waveX, dt);
        drawParticles();

        if (vaporProg >= 100 && done) {
            cancelAnimationFrame(rafId);
            rafId = null;
            endVaporize();
            return;
        }
        rafId = requestAnimationFrame(vaporLoop);
    }

    function endVaporize() {
        canvas.style.display = 'none';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles = [];

        span.style.visibility = 'visible';
        span.textContent      = '';

        phraseIndex = (phraseIndex + 1) % PHRASES.length;
        startTyping();
    }

    // ── Particle rendering ─────────────────────────────────────────────────────
    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            if (p.a <= 0.01) continue;
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.a})`;
            ctx.fillRect(p.x * dpr, p.y * dpr, PARTICLE_STEP * dpr, PARTICLE_STEP * dpr);
        }
    }

    // ── Particle physics ───────────────────────────────────────────────────────
    function tickParticles(waveX, dt) {
        const fontSize   = parseFloat(window.getComputedStyle(span).fontSize) || 60;
        const spreadMult = calcSpread(fontSize) * SPREAD;
        let allDone = true;

        for (const p of particles) {
            if (p.ox > waveX) { allDone = false; continue; }

            // Init velocity on first touch by wave
            if (p.speed === 0) {
                const angle = Math.random() * Math.PI * 2;
                p.speed = (Math.random() + 0.4) * spreadMult;
                p.vx    = Math.cos(angle) * p.speed;
                p.vy    = Math.sin(angle) * p.speed;
            }

            if (p.quick) {
                p.a = Math.max(0, p.a - dt * 3.0);
            } else {
                const dx   = p.ox - p.x;
                const dy   = p.oy - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const damp = Math.max(0.92, 1 - dist / (70 * spreadMult));
                p.vx = (p.vx + (Math.random() - 0.5) * spreadMult * 2.2 + dx * 0.001) * damp;
                p.vy = (p.vy + (Math.random() - 0.5) * spreadMult * 2.2 + dy * 0.001) * damp;
                const maxV = spreadMult * 2;
                const cv   = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (cv > maxV) { p.vx *= maxV / cv; p.vy *= maxV / cv; }
                p.x += p.vx * dt * 16;
                p.y += p.vy * dt * 8;
                p.a  = Math.max(0, p.a - dt * 0.38);
            }

            if (p.a > 0.01) allDone = false;
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
