/**
 * Keyboard Navigation & Accessibility
 * Adds keyboard shortcuts and ARIA enhancements
 */

class KeyboardNav {
    constructor() {
        this.init();
    }

    init() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyPress.bind(this));

        // Add focus indicators
        this.enhanceFocusIndicators();

        // Tab trap for modals
        this.setupModalTabTrap();
    }

    handleKeyPress(e) {
        // Escape to close modals/menus
        if (e.key === 'Escape') {
            this.closeAllModals();
            if (window.MobileMenu) window.MobileMenu.close();
        }

        // Ctrl/Cmd + K for search (if search exists)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) searchInput.focus();
        }

        // Arrow keys for navigation in lists
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const focused = document.activeElement;
            if (focused.classList.contains('sidebar-link')) {
                e.preventDefault();
                this.navigateSidebarLinks(e.key);
            }
        }
    }

    navigateSidebarLinks(direction) {
        const links = Array.from(document.querySelectorAll('.sidebar-link'));
        const currentIndex = links.indexOf(document.activeElement);

        if (currentIndex === -1) return;

        const nextIndex = direction === 'ArrowDown'
            ? (currentIndex + 1) % links.length
            : (currentIndex - 1 + links.length) % links.length;

        links[nextIndex].focus();
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal, .custom-modal-overlay');
        modals.forEach(modal => {
            if (!modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });

        // Close logout modal
        if (window.closeLogoutModal) window.closeLogoutModal();
    }

    enhanceFocusIndicators() {
        // Add focus-visible class for keyboard navigation
        const style = document.createElement('style');
        style.textContent = `
            *:focus {
                outline: none;
            }
            
            *:focus-visible {
                outline: 2px solid var(--accent-primary);
                outline-offset: 2px;
                border-radius: 4px;
            }
            
            button:focus-visible,
            a:focus-visible,
            input:focus-visible,
            textarea:focus-visible,
            select:focus-visible {
                outline: 2px solid var(--accent-primary);
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);
    }

    setupModalTabTrap() {
        document.addEventListener('keydown', function (e) {
            const modal = document.querySelector('.modal:not(.hidden), .custom-modal-overlay:not(.hidden)');
            if (!modal || e.key !== 'Tab') return;

            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        });
    }

}

// Initialize
const keyboardNav = new KeyboardNav();

// Add ARIA labels to common elements
function enhanceARIA() {
    // Buttons without aria-label
    document.querySelectorAll('button:not([aria-label])').forEach(btn => {
        if (btn.textContent.trim()) {
            btn.setAttribute('aria-label', btn.textContent.trim());
        }
    });

    // Links without text
    document.querySelectorAll('a:not([aria-label])').forEach(link => {
        if (!link.textContent.trim() && link.querySelector('svg, img')) {
            link.setAttribute('aria-label', 'Link');
        }
    });

    // Images without alt
    document.querySelectorAll('img:not([alt])').forEach(img => {
        img.setAttribute('alt', 'Image');
    });

    // Add role to navigation
    document.querySelectorAll('nav:not([role])').forEach(nav => {
        nav.setAttribute('role', 'navigation');
    });

    // Add role to main content
    const main = document.querySelector('main, .main-content');
    if (main && !main.getAttribute('role')) {
        main.setAttribute('role', 'main');
    }
}

// Run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceARIA);
} else {
    enhanceARIA();
}

// Export
window.KeyboardNav = KeyboardNav;
window.enhanceARIA = enhanceARIA;
