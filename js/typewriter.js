/**
 * TypewriterVaporize
 * - Typing: plain inline span, zero layout interference
 * - Vaporize: absolutely-positioned canvas overlaid at exact offset,
 *   span set to visibility:hidden (keeps layout space)
 */
(function () {
    'use strict';

    const PHRASES = [
        "Start Getting Hired.",
        "Start Mastering Skills.",
        "Start Crushing Interviews.",
        "Start Building Your Future."
    ];

    const TYPE_SPEED        = 85;
    const HOLD_DURATION     = 2400;
    const VAPORIZE_DURATION = 1125;
    const SPREAD            = 3.5;
    const DENSITY           = 0.70;

    let host, textSpan, canvas, ctx;
    let particles = [];
    let textW = 0;
    let phraseIndex = 0;
    let charIndex   = 0;
    let vaporizeProgress = 0;
    let lastTime = null;
    let rafId    = null;
    let typeTimer = null;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        host = document.getElementById('hero-typewriter');
        if (!host) return;

        host.innerHTML = '';
        host.style.position = 'relative';

        // Plain inline span — inherits ALL CSS from .hero-title span
        textSpan = document.createElement('span');
        host.appendChild(textSpan);

        // Canvas overlaid absolutely during vaporize only
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'display:none;position:absolute;top:0;left:0;pointer-events:none;background:transparent;';
        host.appendChild(canvas);
        ctx = canvas.getContext('2d', { alpha: true });

        charIndex = 0;
        typeStep();
    }

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
            setTimeout(startVaporize, HOLD_DURATION);
        }
    }

    // ── Vaporize ───────────────────────────────────────────────────────────────
    function startVaporize() {
        const cs         = window.getComputedStyle(textSpan);
        const fontSize   = parseFloat(cs.fontSize);
        const fontWeight = cs.fontWeight;
        const fontFamily = cs.fontFamily;

        // True text width via scratch canvas (no DOM wrap constraints)
        const tmpC = document.createElement('canvas').getContext('2d');
        tmpC.font  = `${fontWeight} ${fontSize}px ${fontFamily}`;
        const trueW = Math.ceil(tmpC.measureText(textSpan.textContent).width) + 2;

        // Offset of span relative to host
        const hostRect = host.getBoundingClientRect();
        const spanRect = textSpan.getBoundingClientRect();
        const offsetX  = Math.round(spanRect.left - hostRect.left);
        const offsetY  = Math.round(spanRect.top  - hostRect.top);
        const cssH     = Math.ceil(spanRect.height);

        canvas.width        = trueW * dpr;
        canvas.height       = cssH  * dpr;
        canvas.style.width  = trueW + 'px';
        canvas.style.height = cssH  + 'px';
        canvas.style.left   = offsetX + 'px';
        canvas.style.top    = offsetY + 'px';

        // Draw gradient text onto canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.font         = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';

        const grad = ctx.createLinearGradient(0, 0, trueW, 0);
        grad.addColorStop(0.00, '#ffffff');
        grad.addColorStop(0.25, '#e0e7ff');
        grad.addColorStop(0.45, '#a78bfa');
        grad.addColorStop(0.50, '#c4b5fd');
        grad.addColorStop(0.65, '#f472b6');
        grad.addColorStop(0.85, '#818cf8');
        grad.addColorStop(1.00, '#ffffff');
        ctx.fillStyle = grad;

        // Center glyph vertically within cssH (matches browser line-height centering)
        const m        = ctx.measureText(textSpan.textContent);
        const ascent   = m.actualBoundingBoxAscent;
        const descent  = m.actualBoundingBoxDescent;
        const topPad   = (cssH - ascent - descent) / 2;
        ctx.fillText(textSpan.textContent, 0, topPad + ascent);
        ctx.restore();

        // Sample pixels → particles
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data    = imgData.data;
        const step    = Math.max(1, Math.round(dpr));
        particles     = [];
        textW         = trueW;

        for (let y = 0; y < canvas.height; y += step) {
            for (let x = 0; x < canvas.width; x += step) {
                const i = (y * canvas.width + x) * 4;
                if (data[i + 3] > 20) {
                    particles.push({
                        x: x / dpr, y: y / dpr,
                        ox: x / dpr, oy: y / dpr,
                        r: data[i], g: data[i+1], b: data[i+2],
                        opacity: data[i+3] / 255,
                        vx: 0, vy: 0, speed: 0,
                        quickFade: Math.random() > DENSITY
                    });
                }
            }
        }

        // Keep layout space, overlay canvas on top
        textSpan.style.visibility = 'hidden';
        canvas.style.display = 'block';
        ctx.clearRect(0, 0, canvas.width, canvas.height); // clear snapshot, particles will draw

        vaporizeProgress = 0;
        lastTime = performance.now();
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(loop);
    }

    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        vaporizeProgress += (dt * 1000 / VAPORIZE_DURATION) * 100;
        const waveX = textW * Math.min(vaporizeProgress, 100) / 100;
        const done  = stepVaporize(waveX, dt);
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
        textSpan.style.visibility = 'visible';
        textSpan.textContent = '';
        phraseIndex = (phraseIndex + 1) % PHRASES.length;
        charIndex   = 0;
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

    // ── Vaporize physics ───────────────────────────────────────────────────────
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
                const dist = Math.sqrt(dx * dx + dy * dy);
                const damp = Math.max(0.93, 1 - dist / (80 * spreadMult));
                p.vx = (p.vx + (Math.random() - 0.5) * spreadMult * 2.5 + dx * 0.002) * damp;
                p.vy = (p.vy + (Math.random() - 0.5) * spreadMult * 2.5 + dy * 0.002) * damp;
                const maxV = spreadMult * 2;
                const cv   = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (cv > maxV) { p.vx *= maxV / cv; p.vy *= maxV / cv; }
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
        if (size >= pts[pts.length - 1].s) return pts[pts.length - 1].v;
        let i = 0;
        while (i < pts.length - 1 && pts[i + 1].s < size) i++;
        const a = pts[i], b = pts[i + 1];
        return a.v + (size - a.s) * (b.v - a.v) / (b.s - a.s);
    }
})();
