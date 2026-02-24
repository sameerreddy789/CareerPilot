(function () {
    'use strict';

    const PHRASES = [
        'Start Getting Hired.',
        'Start Mastering Skills.',
        'Start Crushing Interviews.',
        'Start Building Your Future.'
    ];

    const TYPE_SPEED        = 85;
    const HOLD              = 2400;
    const VAPORIZE_DURATION = 1125;
    const SPREAD            = 3.2;
    const DENSITY           = 0.68;

    let span, wrap, canvas, ctx;
    let particles = [];
    let textW = 0;
    let phraseIndex = 0;
    let charIndex   = 0;
    let vaporProg   = 0;
    let lastTime    = null;
    let rafId       = null;
    let typeTimer   = null;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    document.addEventListener('DOMContentLoaded', () => {
        span = document.getElementById('hero-typewriter');
        if (!span) return;

        // Wrap span in a relative container for canvas overlay
        wrap = document.createElement('span');
        wrap.style.cssText = 'display:inline-block;position:relative;vertical-align:top;';
        span.parentNode.insertBefore(wrap, span);
        wrap.appendChild(span);

        // Canvas lives inside wrap, absolutely positioned
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'display:none;position:absolute;top:0;left:0;pointer-events:none;';
        wrap.appendChild(canvas);
        ctx = canvas.getContext('2d', { alpha: true });

        span.textContent = '';
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(typeStep);
    });

    // ── Typing ─────────────────────────────────────────────────────────────────
    function typeStep() {
        clearTimeout(typeTimer);
        const phrase = PHRASES[phraseIndex];
        charIndex = Math.min(charIndex, phrase.length);
        span.textContent = phrase.slice(0, charIndex);

        if (charIndex < phrase.length) {
            charIndex++;
            typeTimer = setTimeout(typeStep, TYPE_SPEED);
        } else {
            typeTimer = setTimeout(beginVaporize, HOLD);
        }
    }

    // ── Vaporize ───────────────────────────────────────────────────────────────
    function beginVaporize() {
        const cs         = window.getComputedStyle(span);
        const fontSize   = parseFloat(cs.fontSize);
        const fontWeight = cs.fontWeight;
        const fontFamily = cs.fontFamily;
        const fontStr    = `${fontWeight} ${fontSize}px ${fontFamily}`;
        const text       = span.textContent;

        // Measure tight glyph bounds on offscreen canvas
        const probe = document.createElement('canvas').getContext('2d');
        probe.font  = fontStr;
        const m     = probe.measureText(text);

        const glyphW = Math.ceil(m.actualBoundingBoxRight  + Math.abs(m.actualBoundingBoxLeft))  + 4;
        const glyphH = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 4;

        // Position canvas over the span
        const wrapRect = wrap.getBoundingClientRect();
        const spanRect = span.getBoundingClientRect();
        const ox = Math.round(spanRect.left - wrapRect.left);
        const oy = Math.round(spanRect.top  - wrapRect.top + (spanRect.height - glyphH) / 2);

        canvas.width        = glyphW * dpr;
        canvas.height       = glyphH * dpr;
        canvas.style.width  = glyphW + 'px';
        canvas.style.height = glyphH + 'px';
        canvas.style.left   = ox + 'px';
        canvas.style.top    = oy + 'px';

        // Draw text — ONLY text pixels, transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.font         = fontStr;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';

        const grad = ctx.createLinearGradient(0, 0, glyphW, 0);
        grad.addColorStop(0.00, '#ffffff');
        grad.addColorStop(0.25, '#e0e7ff');
        grad.addColorStop(0.45, '#a78bfa');
        grad.addColorStop(0.50, '#c4b5fd');
        grad.addColorStop(0.65, '#f472b6');
        grad.addColorStop(0.85, '#818cf8');
        grad.addColorStop(1.00, '#ffffff');
        ctx.fillStyle = grad;

        // Draw at ascent so glyph top aligns with canvas top
        const ascent = m.actualBoundingBoxAscent;
        const leftOff = Math.abs(m.actualBoundingBoxLeft);
        ctx.fillText(text, leftOff + 2, ascent + 2);
        ctx.restore();

        // Sample ONLY text pixels (alpha > 30) → particles
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data    = imgData.data;
        particles     = [];
        textW         = glyphW;

        for (let py = 0; py < canvas.height; py += 2) {
            for (let px = 0; px < canvas.width; px += 2) {
                const i = (py * canvas.width + px) * 4;
                if (data[i + 3] > 30) {          // only where text exists
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

        // Hide span text (keep layout), clear canvas, show canvas
        span.style.visibility = 'hidden';
        ctx.clearRect(0, 0, canvas.width, canvas.height); // wipe draw — particles redraw fresh
        canvas.style.display = 'block';

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
        span.textContent = '';
        phraseIndex = (phraseIndex + 1) % PHRASES.length;
        charIndex   = 0;
        typeStep();
    }

    // ── Draw only particle pixels — canvas bg stays transparent ───────────────
    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            if (p.a <= 0.01) continue;
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.a})`;
            ctx.fillRect(p.x * dpr, p.y * dpr, 2 * dpr, 2 * dpr);
        }
    }

    // ── Particle physics ───────────────────────────────────────────────────────
    function tickParticles(waveX, dt) {
        const fontSize   = parseFloat(window.getComputedStyle(span).fontSize) || 60;
        const spreadMult = calcSpread(fontSize) * SPREAD;
        let allDone = true;

        for (const p of particles) {
            if (p.ox > waveX) { allDone = false; continue; }

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
