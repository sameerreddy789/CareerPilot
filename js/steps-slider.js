/**
 * StepsSlider - Modern SaaS Carousel
 * Clean state management with smooth animations
 */

class StepsSlider {
    constructor(options = {}) {
        this.options = {
            containerSelector: options.containerSelector || '#steps-slider-container',
            autoPlay: options.autoPlay !== undefined ? options.autoPlay : true,
            autoPlayInterval: options.autoPlayInterval || 4500,
            items: options.items || []
        };

        // State
        this.currentIndex = 0;
        this.totalSlides = this.options.items.length;
        this.autoPlayTimer = null;
        this.isHovering = false;

        // DOM elements
        this.container = null;
        this.track = null;
        this.slides = [];
        this.dots = [];
        this.prevBtn = null;
        this.nextBtn = null;

        if (this.totalSlides > 0) {
            this.init();
        }
    }

    init() {
        this.render();
        this.bindEvents();
        this.goToSlide(0, false);
        
        if (this.options.autoPlay) {
            this.startAutoPlay();
        }
    }

    render() {
        const container = document.querySelector(this.options.containerSelector);
        if (!container) return;

        this.container = container;
        container.className = 'steps-slider';

        // Build HTML
        container.innerHTML = `
            <div class="steps-slider-viewport">
                <div class="steps-slider-track">
                    ${this.options.items.map((item, i) => `
                        <div class="step-slide" data-index="${i}">
                            <div class="step-slide-inner">
                                <div class="step-slide-image">
                                    ${item.imageSrc ? `<img src="${item.imageSrc}" alt="${item.title}" loading="lazy">` : ''}
                                </div>
                                <div class="step-slide-overlay"></div>
                                <div class="step-slide-content">
                                    <div class="step-number">${i + 1}</div>
                                    <h3 class="step-slide-title">${item.title}</h3>
                                    <p class="step-slide-description">${item.description}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="steps-slider-nav prev" aria-label="Previous slide">
                    <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button class="steps-slider-nav next" aria-label="Next slide">
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </button>
            </div>
            <div class="steps-slider-dots">
                ${this.options.items.map((_, i) => `
                    <button class="steps-dot" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>
                `).join('')}
            </div>
        `;

        // Cache DOM references
        this.track = container.querySelector('.steps-slider-track');
        this.slides = Array.from(container.querySelectorAll('.step-slide'));
        this.dots = Array.from(container.querySelectorAll('.steps-dot'));
        this.prevBtn = container.querySelector('.steps-slider-nav.prev');
        this.nextBtn = container.querySelector('.steps-slider-nav.next');
    }

    bindEvents() {
        // Navigation buttons
        this.prevBtn?.addEventListener('click', () => this.prev());
        this.nextBtn?.addEventListener('click', () => this.next());

        // Dots
        this.dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.index, 10);
                this.goToSlide(index);
            });
        });

        // Pause on hover
        this.container?.addEventListener('mouseenter', () => {
            this.isHovering = true;
            this.stopAutoPlay();
        });

        this.container?.addEventListener('mouseleave', () => {
            this.isHovering = false;
            if (this.options.autoPlay) {
                this.startAutoPlay();
            }
        });

        // Keyboard navigation
        this.container?.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prev();
            } else if (e.key === 'ArrowRight') {
                this.next();
            }
        });

        // Touch/swipe support
        let touchStartX = 0;
        let touchEndX = 0;

        this.container?.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            this.stopAutoPlay();
        }, { passive: true });

        this.container?.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
            if (this.options.autoPlay && !this.isHovering) {
                this.startAutoPlay();
            }
        }, { passive: true });
    }

    handleSwipe(startX, endX) {
        const threshold = 50;
        const diff = startX - endX;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                this.next();
            } else {
                this.prev();
            }
        }
    }

    goToSlide(index, animate = true) {
        // Wrap index
        if (index < 0) {
            index = this.totalSlides - 1;
        } else if (index >= this.totalSlides) {
            index = 0;
        }

        this.currentIndex = index;

        // Update track position
        const translateX = -index * 100;
        this.track.style.transition = animate ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
        this.track.style.transform = `translateX(${translateX}%)`;

        // Update slides (active state for fade/scale)
        this.slides.forEach((slide, i) => {
            slide.classList.toggle('is-active', i === index);
        });

        // Update dots
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('is-active', i === index);
        });

        // Reset autoplay timer on manual change
        if (animate && this.options.autoPlay && !this.isHovering) {
            this.resetAutoPlay();
        }
    }

    next() {
        this.goToSlide(this.currentIndex + 1);
    }

    prev() {
        this.goToSlide(this.currentIndex - 1);
    }

    startAutoPlay() {
        this.stopAutoPlay();
        this.autoPlayTimer = setInterval(() => {
            this.next();
        }, this.options.autoPlayInterval);
    }

    stopAutoPlay() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }

    resetAutoPlay() {
        this.stopAutoPlay();
        this.startAutoPlay();
    }

    destroy() {
        this.stopAutoPlay();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Initialize on DOM ready
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

    const container = document.getElementById('steps-slider-container');
    if (container) {
        new StepsSlider({
            containerSelector: '#steps-slider-container',
            items: stepsData,
            autoPlay: true,
            autoPlayInterval: 4500
        });
    }
};

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStepsSlider);
} else {
    initStepsSlider();
}
