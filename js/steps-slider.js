/**
 * StepsSlider - 3D Stacked Card Carousel
 * Apple-style perspective depth with smooth transitions
 */

class StepsSlider {
    constructor(options = {}) {
        this.options = {
            containerSelector: options.containerSelector || '#steps-slider-container',
            items: options.items || []
        };

        this.currentIndex = 0;
        this.totalSlides = this.options.items.length;
        this.container = null;
        this.cards = [];
        this.dots = [];
        this.isAnimating = false;

        // Touch state
        this.touchStartX = 0;
        this.touchStartY = 0;

        if (this.totalSlides > 0) this.init();
    }

    init() {
        this.render();
        this.bindEvents();
        this.updateCards();
    }

    render() {
        const el = document.querySelector(this.options.containerSelector);
        if (!el) return;
        this.container = el;
        el.className = 'steps-slider';

        el.innerHTML = `
            <div class="steps3d-stage">
                ${this.options.items.map((item, i) => `
                    <div class="steps3d-card" data-index="${i}" tabindex="0" role="button" aria-label="Step ${i + 1}: ${item.title}">
                        <div class="steps3d-card-inner">
                            <div class="steps3d-img">${item.imageSrc ? `<img src="${item.imageSrc}" alt="${item.title}" loading="lazy">` : ''}</div>
                            <div class="steps3d-overlay"></div>
                            <div class="steps3d-content">
                                <span class="steps3d-num">${i + 1}</span>
                                <h3 class="steps3d-title">${item.title}</h3>
                                <p class="steps3d-desc">${item.description}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="steps3d-nav">
                <button class="steps3d-arrow steps3d-prev" aria-label="Previous step">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div class="steps3d-dots">
                    ${this.options.items.map((_, i) => `<button class="steps3d-dot" data-index="${i}" aria-label="Go to step ${i + 1}"></button>`).join('')}
                </div>
                <button class="steps3d-arrow steps3d-next" aria-label="Next step">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>
        `;

        this.cards = Array.from(el.querySelectorAll('.steps3d-card'));
        this.dots = Array.from(el.querySelectorAll('.steps3d-dot'));
    }

    bindEvents() {
        // Card clicks
        this.cards.forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.index, 10);
                if (idx !== this.currentIndex) this.goTo(idx);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const idx = parseInt(card.dataset.index, 10);
                    if (idx !== this.currentIndex) this.goTo(idx);
                }
            });
        });

        // Dots
        this.dots.forEach(dot => {
            dot.addEventListener('click', () => this.goTo(parseInt(dot.dataset.index, 10)));
        });

        // Arrows
        this.container.querySelector('.steps3d-prev')?.addEventListener('click', () => this.prev());
        this.container.querySelector('.steps3d-next')?.addEventListener('click', () => this.next());

        // Keyboard on container
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prev();
            else if (e.key === 'ArrowRight') this.next();
        });

        // Touch swipe (desktop 3D mode)
        this.container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        this.container.addEventListener('touchend', (e) => {
            const dx = this.touchStartX - e.changedTouches[0].screenX;
            const dy = this.touchStartY - e.changedTouches[0].screenY;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                dx > 0 ? this.next() : this.prev();
            }
        }, { passive: true });

        // Mobile scroll-snap: sync dots via IntersectionObserver
        this.setupMobileScrollSync();
    }

    setupMobileScrollSync() {
        if (!('IntersectionObserver' in window)) return;
        const stage = this.container.querySelector('.steps3d-stage');
        if (!stage) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    const idx = parseInt(entry.target.dataset.index, 10);
                    this.currentIndex = idx;
                    this.dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
                }
            });
        }, { root: stage, threshold: 0.6 });

        this.cards.forEach(card => observer.observe(card));
    }

    goTo(index) {
        if (this.isAnimating || index === this.currentIndex) return;
        if (index < 0) index = this.totalSlides - 1;
        if (index >= this.totalSlides) index = 0;
        this.isAnimating = true;
        this.currentIndex = index;
        this.updateCards();
        setTimeout(() => { this.isAnimating = false; }, 650);
    }

    next() { this.goTo(this.currentIndex + 1); }
    prev() { this.goTo(this.currentIndex - 1); }

    updateCards() {
        const mid = this.currentIndex;

        this.cards.forEach((card, i) => {
            // Distance from center (-2, -1, 0, 1, 2, etc.)
            let diff = i - mid;

            // Wrap for circular feel
            if (diff > Math.floor(this.totalSlides / 2)) diff -= this.totalSlides;
            if (diff < -Math.floor(this.totalSlides / 2)) diff += this.totalSlides;

            const absDiff = Math.abs(diff);

            card.classList.toggle('is-active', diff === 0);
            card.classList.toggle('is-prev', diff === -1);
            card.classList.toggle('is-next', diff === 1);
            card.classList.toggle('is-far', absDiff >= 2);

            // Positioning via CSS custom properties
            card.style.setProperty('--offset', diff);
            card.style.setProperty('--abs-offset', absDiff);

            // Visibility: only show center + 2 neighbors
            if (absDiff <= 2) {
                card.style.visibility = 'visible';
                card.style.pointerEvents = diff === 0 ? 'auto' : 'auto';
            } else {
                card.style.visibility = 'hidden';
                card.style.pointerEvents = 'none';
            }
        });

        // Dots
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('is-active', i === mid);
        });
    }
}

// Initialize
const initStepsSlider = () => {
    const stepsData = [
        {
            title: "AI Resume Analysis",
            description: "Get instant feedback on your resume with real-time scoring and ATS optimization tips to stand out from the crowd.",
            imageSrc: "assets/images/card-1.png"
        },
        {
            title: "Master Interviews",
            description: "Practice with our role-specific AI interviewer and conquer your nerves with personalized feedback and coaching.",
            imageSrc: "assets/images/card-2.png"
        },
        {
            title: "Skill Gap Identification",
            description: "Discover exactly what skills you're missing for your dream job and get a clear plan to bridge that gap.",
            imageSrc: "assets/images/card-3.png"
        },
        {
            title: "Custom Learning Roadmap",
            description: "Follow a tailored path of curated resources designed to help you level up where it matters most.",
            imageSrc: "assets/images/card-4.png"
        },
        {
            title: "Land Your Dream Job",
            description: "Track your progress, get final polish on your applications, and step into interviews with confidence.",
            imageSrc: "assets/images/card-5.png"
        }
    ];

    if (document.getElementById('steps-slider-container')) {
        new StepsSlider({
            containerSelector: '#steps-slider-container',
            items: stepsData
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStepsSlider);
} else {
    initStepsSlider();
}
