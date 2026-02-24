/**
 * VaporizeTypewriter - Vanilla JS port of the vaporize text effect
 * Replaces the old delete-backwards typewriter on #hero-typewriter
 */
(function () {
    const PHRASES = [
        "Start Getting Hired.",
        "Start Mastering Skills.",
        "Start Crushing Interviews.",
        "Start Building Your Future."
    ];

    const VAPORIZE_DURATION = 1800;  // ms to vaporize out
    const FADE_IN_DURATION  = 900;   // ms to fade in next phrase
    const WAIT_DURATION     = 2400;  // ms to hold before vaporizing
    const SPREAD            = 4;
    const DENSITY           = 0.72;  // 0–1, fraction of particles that animate (rest quick-fade)

    // ── State ──────────────────────────────────────────────────────────────────
    let canvas, ctx, wrapper;
    let particles = [];
    let textBoundaries = null;
    let phraseIndex = 0;
    let state = 'waiting'; // waiting | vaporizing | fadingIn
    let vaporizeProgress = 0; // 0–100
    let fadeOpacity = 0;
    let lastTime = null;
    let rafId = null;
    let waitTimer = null;
    let dpr = Math.min(window.devicePixelRatio * 1.5, 3) || 1;

    // ── Boot ───────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const host = document.getElementById('hero-typewriter');
        if (!host) return;

        // Replace the <span> content with a canvas + hidden SEO text
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

        // Measure and draw first phrase
        resize();
        window.addEventListener('resize', debounce(resize, 200));

        // Start cycle after initial wait
        waitTimer = setTimeout(() => {
            state = 'vaporizing';
            vaporizeProgress = 0;
            startLoop();
        }, WAIT_DURATION);
    }

    // ── Resize / re-render ─────────────────────────────────────────────────────
    function resize() {
        buildParticles(PHRASES[phraseIndex]);
    }

    function getFontStyle() {
        // Match the hero-title span gradient style — we render white and let CSS gradient show through
        const el = document.querySelector('.hero-title span') || document.querySelector('.hero-title');
        const cs = el ? window.getComputedStyle(el) : null;
        const size = cs ? cs.fontSize : '60px';
        const weight = cs ? cs.fontWeight : '700';
        const family = cs ? cs.fontFamily : 'Inter, sans-serif';
        return { size: parseFloat(size), weight, family };
    }

    function buildParticles(text) {
        const { size, weight, family } = getFontStyle();
        const scaledSize = size * dpr;
        const font = `${weight} ${scaledSize}px ${family}`;

        // Measure text to size canvas
        const tmpCtx = document.createElement('canvas').getContext('2d');
        tmpCtx.font = font;
        const metrics = tmpCtx.measureText(text);
        const textW = metrics.width;
        const textH = scaledSize * 1.3;

        const w = Math.ceil(textW + scaledSize * 0.4);
        const h = Math.ceil(textH);

        canvas.width  = w;
        canvas.height = h;
        canvas.style.width  = (w / dpr) + 'px';
        canvas.style.height = (h / dpr) + 'px';

        ctx.clearRect(0, 0, w, h);

        // Draw gradient text to sample pixels
        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Replicate the CSS gradient: white → indigo → purple → pink → indigo → white
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0.00, '#ffffff');
        grad.addColorStop(0.25, '#e0e7ff');
        grad.addColorStop(0.45, '#a78bfa');
        grad.addColorStop(0.50, '#c4b5fd');
        grad.addColorStop(0.65, '#f472b6');
        grad.addColorStop(0.85, '#818cf8');
        grad.addColorStop(1.00, '#ffffff');
        ctx.fillStyle = grad;

        const tx = scaledSize * 0.2;
        const ty = h / 2;
        ctx.fillText(text, tx, ty);

        // Store text boundaries for vaporize wave
        textBoundaries = { left: tx, right: tx + textW, width: textW };

        // Sample pixels → particles
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const sampleRate = Math.max(1, Math.round(dpr));
        particles = [];

        for (let y = 0; y < h; y += sampleRate) {
            for (let x = 0; x < w; x += sampleRate) {
                const i = (y * w + x) * 4;
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

        ctx.clearRect(0, 0, w, h);
        renderParticles();
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    function renderParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            if (p.opacity <= 0) continue;
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
            ctx.fillRect(p.x / dpr, p.y / dpr, 1 / dpr * dpr, 1 / dpr * dpr);
        }
    }

    // ── Animation loop ─────────────────────────────────────────────────────────
    function startLoop() {
        if (rafId) cancelAnimationFrame(rafId);
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
        lastTime = now;

        if (state === 'vaporizing') {
            vaporizeProgress += (dt * 1000 / VAPORIZE_DURATION) * 100;
            const progress = Math.min(100, vaporizeProgress);
            const vx = textBoundaries.left + textBoundaries.width * (progress / 100);
            const done = stepVaporize(vx, dt);
            renderParticles();

            if (vaporizeProgress >= 100 && done) {
                // Advance phrase
                phraseIndex = (phraseIndex + 1) % PHRASES.length;
                buildParticles(PHRASES[phraseIndex]);
                // Reset all particles to invisible for fade-in
                for (const p of particles) { p.opacity = 0; }
                fadeOpacity = 0;
                state = 'fadingIn';
            }
        } else if (state === 'fadingIn') {
            fadeOpacity += dt * 1000 / FADE_IN_DURATION;
            const t = Math.min(fadeOpacity, 1);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                const op = t * p.oa;
                ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${op})`;
                ctx.fillRect(p.ox / dpr, p.oy / dpr, 1 / dpr * dpr, 1 / dpr * dpr);
            }
            if (fadeOpacity >= 1) {
                // Restore full opacity
                for (const p of particles) { p.opacity = p.oa; }
                renderParticles();
                state = 'waiting';
                waitTimer = setTimeout(() => {
                    state = 'vaporizing';
                    vaporizeProgress = 0;
                    resetParticles();
                    startLoop();
                }, WAIT_DURATION);
                cancelAnimationFrame(rafId);
                rafId = null;
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

            // Init motion on first touch
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

    function resetParticles() {
        for (const p of particles) {
            p.x = p.ox; p.y = p.oy;
            p.opacity = p.oa;
            p.vx = 0; p.vy = 0; p.speed = 0;
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
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
