/**
 * TypewriterVaporize
 * - Types each phrase in character by character
 * - Holds for a moment
 * - Vaporizes out with left-to-right particle dissolve
 * - Repeats with next phrase
 */
(function () {
    const PHRASES = [
        "Start Getting Hired.",
        "Start Mastering Skills.",
        "Start Crushing Interviews.",
        "Start Building Your Future."
    ];

    const TYPE_SPEED      = 60;    // ms per character
    const HOLD_DURATION   = 2200;  // ms to hold full text before vaporizing
    const VAPORIZE_DURATION = 1600; // ms for vaporize wave to cross full text
    const SPREAD          = 4;
    const DENSITY         = 0.72;  // fraction of particles that drift (rest quick-fade)

    // ── State ──────────────────────────────────────────────────────────────────
    let canvas, ctx, wrapper;
    let particles = [];
    let textBoundaries = null;
    let phraseIndex = 0;
    let charIndex = 0;
    let state = 'typing'; // typing | holding | vaporizing
    let vaporizeProgress = 0;
    let lastTime = null;
    let rafId = null;
    let typeTimer = null;
    let holdTimer = null;
    let dpr = Math.min(window.devicePixelRatio * 1.5, 3) || 1;

    // ── Boot ───────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const host = document.getElementById('hero-typewriter');
        if (!host) return;

        host.innerHTML = '';
        host.style.display = 'inline-block';
        host.style.position = 'relative';
        host.style.verticalAlign = 'middle';

        wrapper = host;

        canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'none';
        wrapper.appendChild(canvas);

        ctx = canvas.getContext('2d');

        // Size canvas to longest phrase so layout doesn't jump
        sizeTolongest();
        window.addEventListener('resize', debounce(() => { sizeTolongest(); typeStep(); }, 200));

        // Start typing first phrase
        charIndex = 0;
        typeStep();
    }

    // ── Size canvas to longest phrase ──────────────────────────────────────────
    function sizeTolongest() {
        const { size, weight, family } = getFontStyle();
        const scaledSize = size * dpr;
        const font = `${weight} ${scaledSize}px ${family}`;
        const tmpCtx = document.createElement('canvas').getContext('2d');
        tmpCtx.font = font;

        let maxW = 0;
        for (const p of PHRASES) {
            const w = tmpCtx.measureText(p).width;
            if (w > maxW) maxW = w;
        }

        const w = Math.ceil(maxW + scaledSize * 0.4);
        const h = Math.ceil(scaledSize * 1.3);

        canvas.width  = w;
        canvas.height = h;
        canvas.style.width  = (w / dpr) + 'px';
        canvas.style.height = (h / dpr) + 'px';
    }

    // ── Typing step ────────────────────────────────────────────────────────────
    function typeStep() {
        clearTimeout(typeTimer);
        const phrase = PHRASES[phraseIndex];

        if (charIndex > phrase.length) charIndex = phrase.length;

        drawText(phrase.slice(0, charIndex));

        if (charIndex < phrase.length) {
            charIndex++;
            typeTimer = setTimeout(typeStep, TYPE_SPEED);
        } else {
            // Fully typed — hold then vaporize
            holdTimer = setTimeout(() => {
                buildParticles(phrase);
                state = 'vaporizing';
                vaporizeProgress = 0;
                startLoop();
            }, HOLD_DURATION);
        }
    }

    // ── Draw text to canvas (typing phase) ────────────────────────────────────
    function drawText(text) {
        const { size, weight, family } = getFontStyle();
        const scaledSize = size * dpr;
        const font = `${weight} ${scaledSize}px ${family}`;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!text) return;

        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
        grad.addColorStop(0.00, '#ffffff');
        grad.addColorStop(0.25, '#e0e7ff');
        grad.addColorStop(0.45, '#a78bfa');
        grad.addColorStop(0.50, '#c4b5fd');
        grad.addColorStop(0.65, '#f472b6');
        grad.addColorStop(0.85, '#818cf8');
        grad.addColorStop(1.00, '#ffffff');
        ctx.fillStyle = grad;

        const tx = scaledSize * 0.2;
        const ty = canvas.height / 2;
        ctx.fillText(text, tx, ty);

        // Blinking cursor
        const metrics = ctx.measureText(text);
        const cx = tx + metrics.width + 3 * dpr;
        const cursorH = scaledSize * 0.85;
        const cursorY = ty - cursorH / 2;
        ctx.fillStyle = 'rgba(167,139,250,0.85)';
        ctx.fillRect(cx, cursorY, Math.max(2, 2 * dpr), cursorH);
    }

    // ── Build particles from current canvas pixels ─────────────────────────────
    function buildParticles(text) {
        const { size, weight, family } = getFontStyle();
        const scaledSize = size * dpr;
        const font = `${weight} ${scaledSize}px ${family}`;

        // Render full text to sample
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
        grad.addColorStop(0.00, '#ffffff');
        grad.addColorStop(0.25, '#e0e7ff');
        grad.addColorStop(0.45, '#a78bfa');
        grad.addColorStop(0.50, '#c4b5fd');
        grad.addColorStop(0.65, '#f472b6');
        grad.addColorStop(0.85, '#818cf8');
        grad.addColorStop(1.00, '#ffffff');
        ctx.fillStyle = grad;

        const tx = scaledSize * 0.2;
        const ty = canvas.height / 2;
        ctx.fillText(text, tx, ty);

        const metrics = ctx.measureText(text);
        textBoundaries = { left: tx, right: tx + metrics.width, width: metrics.width };

        // Sample pixels
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const sampleRate = Math.max(1, Math.round(dpr));
        particles = [];

        for (let y = 0; y < canvas.height; y += sampleRate) {
            for (let x = 0; x < canvas.width; x += sampleRate) {
                const i = (y * canvas.width + x) * 4;
                if (data[i + 3] > 20) {
                    const alpha = (data[i + 3] / 255) * (sampleRate / dpr);
                    particles.push({
                        x, y,
                        ox: x, oy: y,
                        r: data[i], g: data[i+1], b: data[i+2],
                        opacity: alpha, oa: alpha,
                        vx: 0, vy: 0,
                        speed: 0,
                        quickFade: Math.random() > DENSITY
                    });
                }
            }
        }
    }

    // ── Render particles ───────────────────────────────────────────────────────
    function renderParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            if (p.opacity <= 0) continue;
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
            ctx.fillRect(p.x / dpr, p.y / dpr, 1.5, 1.5);
        }
    }

    // ── Animation loop ─────────────────────────────────────────────────────────
    function startLoop() {
        if (rafId) cancelAnimationFrame(rafId);
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        if (state === 'vaporizing') {
            vaporizeProgress += (dt * 1000 / VAPORIZE_DURATION) * 100;
            const progress = Math.min(100, vaporizeProgress);
            const waveX = textBoundaries.left + textBoundaries.width * (progress / 100);
            const done = stepVaporize(waveX, dt);
            renderParticles();

            if (vaporizeProgress >= 100 && done) {
                cancelAnimationFrame(rafId);
                rafId = null;
                // Advance to next phrase
                phraseIndex = (phraseIndex + 1) % PHRASES.length;
                charIndex = 0;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                state = 'typing';
                typeStep();
                return;
            }
        }

        rafId = requestAnimationFrame(loop);
    }

    // ── Vaporize step ──────────────────────────────────────────────────────────
    function stepVaporize(waveX, dt) {
        const fontSize = getFontStyle().size;
        const baseSpread = calcSpread(fontSize);
        const spreadMult = baseSpread * SPREAD;
        let allDone = true;

        for (const p of particles) {
            const reached = p.ox <= waveX;
            if (!reached) { allDone = false; continue; }

            if (p.speed === 0) {
                const angle = Math.random() * Math.PI * 2;
                p.speed = (Math.random() * 1 + 0.5) * spreadMult;
                p.vx = Math.cos(angle) * p.speed;
                p.vy = Math.sin(angle) * p.speed;
            }

            if (p.quickFade) {
                p.opacity = Math.max(0, p.opacity - dt * 2.5);
            } else {
                const dx = p.ox - p.x, dy = p.oy - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const damp = Math.max(0.94, 1 - dist / (100 * spreadMult));
                const rand = spreadMult * 3;
                p.vx = (p.vx + (Math.random()-0.5)*rand + dx*0.002) * damp;
                p.vy = (p.vy + (Math.random()-0.5)*rand + dy*0.002) * damp;
                const maxV = spreadMult * 2;
                const cv = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
                if (cv > maxV) { p.vx *= maxV/cv; p.vy *= maxV/cv; }
                p.x += p.vx * dt * 20;
                p.y += p.vy * dt * 10;
                const fadeRate = 0.25 * (2000 / VAPORIZE_DURATION);
                p.opacity = Math.max(0, p.opacity - dt * fadeRate);
            }

            if (p.opacity > 0.01) allDone = false;
        }
        return allDone;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    function getFontStyle() {
        const el = document.querySelector('.hero-title span') || document.querySelector('.hero-title');
        const cs = el ? window.getComputedStyle(el) : null;
        const size = cs ? cs.fontSize : '60px';
        const weight = cs ? cs.fontWeight : '700';
        const family = cs ? cs.fontFamily : 'Inter, sans-serif';
        return { size: parseFloat(size), weight, family };
    }

    function calcSpread(size) {
        const pts = [{s:20,v:0.2},{s:50,v:0.5},{s:100,v:1.5}];
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
