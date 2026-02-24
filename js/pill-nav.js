/**
 * Pill Navigation - Sliding Island
 * Premium 'Mac-like' sliding pill animation
 */

class PillNav {
    constructor(options = {}) {
        this.options = {
            containerSelector: '#pill-nav-container',
            activeHref: options.activeHref || '/',
            items: options.items || [],
        };

        this.init();
    }

    init() {
        this.render();
        this.cacheDOM();
        this.setupInteractions();
        this.setupScrollSpy();
        this.setInitialActive();
    }

    render() {
        const container = document.querySelector(this.options.containerSelector);
        if (!container) return;

        const { items, activeHref } = this.options;
        const logo = '🚀';

        // Split items: Links vs CTA
        const navLinks = items.slice(0, items.length - 1);
        const ctaItem = items[items.length - 1];

        container.innerHTML = `
            <nav class="pill-nav">
                <!-- Branding -->
                <div class="nav-branding">
                    <a class="pill-logo" href="index.html" aria-label="Home">
                        <span class="logo-emoji">${logo}</span>
                    </a>
                    <span class="nav-brand-name">NextStep AI</span>
                </div>

                <!-- Center Links (Desktop) -->
                <div class="pill-nav-items">
                    <ul class="pill-list" role="menubar">
                        <div class="nav-slider-pill"></div> <!-- The sliding background -->
                        ${navLinks.map((item, i) => `
                            <li class="pill-link-item">
                                <a href="${item.href}" 
                                   class="pill${activeHref === item.href ? ' is-active' : ''}"
                                   data-target="${item.href.startsWith('#') ? item.href.substring(1) : ''}">
                                    ${item.label}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <!-- Right CTA + Mobile Toggle -->
                <div class="nav-cta-container">
                    <a href="${ctaItem.href}" class="cta-button desktop-only">
                        ${ctaItem.label}
                    </a>
                    <button class="mobile-menu-button mobile-only" aria-label="Menu">
                        <svg width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </nav>

            <!-- Mobile Menu -->
            <div class="mobile-menu-popover">
                <ul class="mobile-menu-list">
                    ${items.map((item) => `
                        <li>
                            <a href="${item.href}" class="mobile-menu-link">
                                ${item.label}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    cacheDOM() {
        this.nav = document.querySelector('.pill-nav');
        this.pillList = this.nav.querySelector('.pill-list');
        this.slider = this.nav.querySelector('.nav-slider-pill');
        this.links = this.nav.querySelectorAll('.pill-list .pill');
        this.mobileBtn = this.nav.querySelector('.mobile-menu-button');
        this.mobileMenu = document.querySelector('.mobile-menu-popover');
    }

    setupInteractions() {
        // Link Hover Effects
        this.links.forEach((link) => {
            link.addEventListener('mouseenter', (e) => this.moveSliderTo(e.target));
        });

        // Reset on list leave
        this.pillList.addEventListener('mouseleave', () => this.resetSlider());

        // Mobile Menu
        if (this.mobileBtn) {
            this.mobileBtn.addEventListener('click', () => {
                this.mobileMenu.classList.toggle('is-open');
            });
        }

        // Close mobile menu on click outside
        document.addEventListener('click', (e) => {
            if (this.mobileMenu.classList.contains('is-open') &&
                !this.mobileMenu.contains(e.target) &&
                !this.mobileBtn.contains(e.target)) {
                this.mobileMenu.classList.remove('is-open');
            }
        });
    }

    moveSliderTo(target) {
        if (!target) {
            this.slider.style.opacity = '0';
            return;
        }

        // Get relative position within the UL
        const listRect = this.pillList.getBoundingClientRect();
        const itemRect = target.getBoundingClientRect();

        const offsetLeft = itemRect.left - listRect.left;
        const width = itemRect.width;

        this.slider.style.opacity = '1';
        this.slider.style.transform = `translateX(${offsetLeft}px)`;
        this.slider.style.width = `${width}px`;

        // Add transition usually via CSS, but ensure opacity logic holds
    }

    resetSlider() {
        // Find active link
        const activeLink = this.nav.querySelector('.pill-list .pill.is-active');
        if (activeLink) {
            this.moveSliderTo(activeLink);
        } else {
            this.slider.style.opacity = '0';
        }
    }

    setInitialActive() {
        // Simple timeout to ensure layout is ready
        setTimeout(() => this.resetSlider(), 100);
    }

    setupScrollSpy() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.pill-list .pill');

        if (sections.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    this.updateActiveLink(id);
                }
            });
        }, { rootMargin: '-30% 0px -60% 0px' }); // Adjusted for accuracy

        sections.forEach(section => observer.observe(section));

        // Handle scroll to top for Home
        window.addEventListener('scroll', () => {
            if (window.scrollY < 100) {
                const homeLink = document.querySelector('.pill-list .pill[href="index.html"]');
                if (homeLink && !homeLink.classList.contains('is-active')) {
                    this.updateActiveLinkState(homeLink);
                }
            }
        });
    }

    updateActiveLink(id) {
        // Find link matching the ID (conceptual match)
        // Usually href="#id" or data-target="id"
        // But our code puts data-target on the link
        let targetLink = null;
        this.links.forEach(link => {
            if (link.dataset.target === id) {
                targetLink = link;
            }
        });

        if (targetLink) {
            this.updateActiveLinkState(targetLink);
        }
    }

    updateActiveLinkState(linkElement) {
        this.links.forEach(l => l.classList.remove('is-active'));
        linkElement.classList.add('is-active');
        // Only move slider if we are not hovering (to avoid conflict)
        if (!this.pillList.matches(':hover')) {
            this.moveSliderTo(linkElement);
        }
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pill-nav-container')) {
        new PillNav({
            items: [
                { label: 'Home', href: 'index.html' },
                { label: 'Features', href: '#features' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'FAQs', href: '#faq' },
                { label: 'Get Started', href: 'auth.html' }
            ],
            activeHref: 'index.html'
        });
    }
});
