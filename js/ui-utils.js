// ===== Production Log Suppressor =====
// Silence console.log on production to keep the console clean
if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    console.log = function () {};
}

// ===== Loading States & UI Utilities =====

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} str - Untrusted string to escape
 * @returns {string} Escaped safe string
 */
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Shows a full-screen loading overlay with spinner and optional message
 * @param {string} message - Loading message to display
 */
function showLoader(message = 'Loading...') {
    // Remove existing loader if any
    hideLoader();

    const loader = document.createElement('div');
    loader.className = 'loader-overlay';
    loader.innerHTML = `
        <div class="loader-content">
            <div class="loader-spinner"></div>
            <p class="loader-message">${message}</p>
        </div>
    `;
    document.body.appendChild(loader);

    // Prevent body scroll while loading
    document.body.style.overflow = 'hidden';
}

/**
 * Hides the loading overlay
 */
function hideLoader() {
    const loader = document.querySelector('.loader-overlay');
    if (loader) {
        loader.remove();
        document.body.style.overflow = '';
    }
}

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    // Create toast container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Shows inline loading spinner for specific elements
 * @param {HTMLElement} element - Element to show spinner in
 * @param {string} size - Size: 'small', 'medium', 'large'
 */
function showInlineLoader(element, size = 'medium') {
    if (!element) return;

    const spinner = document.createElement('div');
    spinner.className = `inline-spinner inline-spinner-${size}`;
    spinner.innerHTML = '<div class="spinner"></div>';

    // Store original content
    element.dataset.originalContent = element.innerHTML;
    element.innerHTML = '';
    element.appendChild(spinner);
    element.classList.add('loading');
}

/**
 * Hides inline loading spinner and restores original content
 * @param {HTMLElement} element - Element to hide spinner from
 */
function hideInlineLoader(element) {
    if (!element) return;

    const originalContent = element.dataset.originalContent;
    if (originalContent) {
        element.innerHTML = originalContent;
        delete element.dataset.originalContent;
    }
    element.classList.remove('loading');
}

/**
 * Creates a skeleton loader for content placeholders
 * @param {string} type - Type: 'text', 'card', 'avatar', 'image'
 * @param {number} count - Number of skeleton items
 * @returns {string} HTML string for skeleton
 */
function createSkeleton(type = 'text', count = 1) {
    const skeletons = {
        text: '<div class="skeleton skeleton-text"></div>',
        card: `
            <div class="skeleton skeleton-card">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text" style="width: 60%;"></div>
            </div>
        `,
        avatar: '<div class="skeleton skeleton-avatar"></div>',
        image: '<div class="skeleton skeleton-image"></div>'
    };

    return (skeletons[type] || skeletons.text).repeat(count);
}

/**
 * Shows a confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {Function} onConfirm - Callback for confirm button
 * @param {Function} onCancel - Callback for cancel button
 * @param {Object} options - Additional options (confirmText, cancelText, danger)
 */
function showConfirmDialog(title, message, onConfirm, onCancel, options = {}) {
    const { confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = options;

    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
        <div class="dialog-content">
            <h3 class="dialog-title">${title}</h3>
            <p class="dialog-message">${message}</p>
            <div class="dialog-actions">
                <button class="btn btn-secondary" data-action="cancel">${cancelText}</button>
                <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmText}</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);
    document.body.style.overflow = 'hidden';

    // Handle button clicks
    dialog.querySelector('[data-action="confirm"]').addEventListener('click', () => {
        dialog.remove();
        document.body.style.overflow = '';
        if (onConfirm) onConfirm();
    });

    dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        dialog.remove();
        document.body.style.overflow = '';
        if (onCancel) onCancel();
    });

    // Close on overlay click or Escape key
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
            document.body.style.overflow = '';
            if (onCancel) onCancel();
        }
    });

    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            dialog.remove();
            document.body.style.overflow = '';
            if (onCancel) onCancel();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

/**
 * Updates a progress bar
 * @param {HTMLElement} progressBar - Progress bar element
 * @param {number} percentage - Progress percentage (0-100)
 */
function updateProgress(progressBar, percentage) {
    if (!progressBar) return;

    const fill = progressBar.querySelector('.progress-fill');
    if (fill) {
        fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }

    const text = progressBar.querySelector('.progress-text');
    if (text) {
        text.textContent = `${Math.round(percentage)}%`;
    }
}

/**
 * Creates an empty state component
 * @param {Object} config - Configuration object
 * @returns {string} HTML string for empty state
 */
function createEmptyState(config) {
    const {
        icon = '📭',
        title = 'Nothing here yet',
        description = 'Get started by taking an action.',
        actions = [],
        variant = '', // 'compact', 'success', 'warning', 'info'
    } = config;

    const actionsHtml = actions.map(action =>
        `<a href="${action.href || '#'}" class="btn ${action.primary ? 'btn-primary' : 'btn-secondary'}" ${action.onclick ? `onclick="${action.onclick}"` : ''}>${action.label}</a>`
    ).join('');

    return `
        <div class="empty-state ${variant}">
            <div class="empty-state-icon">${icon}</div>
            <h3 class="empty-state-title">${title}</h3>
            <p class="empty-state-description">${description}</p>
            ${actionsHtml ? `<div class="empty-state-actions">${actionsHtml}</div>` : ''}
        </div>
    `;
}

/**
 * Initializes global keyboard shortcuts
 * @param {Object} shortcuts - Map of key combinations to callbacks
 */
function initKeyboardShortcuts(shortcuts = {}) {
    document.addEventListener('keydown', (e) => {
        // Skip if user is typing in an input
        if (e.target.matches('input, textarea, select, [contenteditable]')) return;

        const key = [];
        if (e.ctrlKey) key.push('ctrl');
        if (e.shiftKey) key.push('shift');
        if (e.altKey) key.push('alt');
        key.push(e.key.toLowerCase());

        const combo = key.join('+');

        if (shortcuts[combo]) {
            e.preventDefault();
            shortcuts[combo]();
        }
    });
}

/**
 * Shows a modal with all available keyboard shortcuts
 */
function showKeyboardShortcutsModal() {
    const shortcuts = [
        { key: '?', description: 'Show keyboard shortcuts' },
        { key: 'D', description: 'Go to Dashboard' },
        { key: 'R', description: 'Go to Roadmap' },
        { key: 'I', description: 'Go to Interview' },
        { key: 'P', description: 'Go to Profile' },
        { key: 'Esc', description: 'Close modals / Go back' },
        { key: 'Enter', description: 'Continue / Submit' }
    ];

    const modal = document.createElement('div');
    modal.className = 'dialog-overlay keyboard-shortcuts-modal';
    modal.innerHTML = `
        <div class="dialog-content" style="max-width: 400px;">
            <div class="shortcuts-header">
                <h3 class="dialog-title">⌨️ Keyboard Shortcuts</h3>
                <button class="shortcuts-close" onclick="this.closest('.dialog-overlay').remove()">✕</button>
            </div>
            <div class="shortcuts-list">
                ${shortcuts.map(s => `
                    <div class="shortcut-item">
                        <kbd class="shortcut-key">${s.key}</kbd>
                        <span class="shortcut-desc">${s.description}</span>
                    </div>
                `).join('')}
            </div>
            <p style="color: var(--text-muted); font-size: 12px; margin-top: 16px; text-align: center;">
                Press <kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">Esc</kbd> to close
            </p>
        </div>
    `;

    // Add styles if not already present
    if (!document.getElementById('shortcuts-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'shortcuts-modal-styles';
        style.textContent = `
            .shortcuts-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .shortcuts-header .dialog-title {
                margin: 0;
            }
            .shortcuts-close {
                background: none;
                border: none;
                color: var(--text-muted);
                font-size: 18px;
                cursor: pointer;
                padding: 4px;
            }
            .shortcuts-close:hover {
                color: var(--text-primary);
            }
            .shortcuts-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .shortcut-item {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            .shortcut-key {
                min-width: 50px;
                padding: 6px 12px;
                background: rgba(99, 102, 241, 0.2);
                border: 1px solid rgba(99, 102, 241, 0.3);
                border-radius: 6px;
                font-family: 'SF Mono', 'Monaco', monospace;
                font-size: 13px;
                color: #a5b4fc;
                text-align: center;
            }
            .shortcut-desc {
                color: var(--text-secondary);
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Close on overlay click or Escape
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

/**
 * Shows first-visit keyboard shortcuts hint
 */
function showKeyboardShortcutsHint() {
    if (localStorage.getItem('shortcuts_hint_shown')) return;

    setTimeout(() => {
        showToast('💡 Pro tip: Press ? to see keyboard shortcuts', 'info', 5000);
        localStorage.setItem('shortcuts_hint_shown', 'true');
    }, 2000); // Show after 2 seconds
}

// Initialize global shortcuts and hint on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Skip on landing/auth pages
    const page = window.location.pathname.split('/').pop();
    if (page === 'index.html' || page === 'auth.html' || page === '') return;

    // Initialize keyboard shortcuts
    initKeyboardShortcuts({
        '?': showKeyboardShortcutsModal,
        'd': () => window.location.href = '/pages/dashboard.html',
        'r': () => window.location.href = '/pages/roadmap.html',
        'i': () => window.location.href = '/pages/interview.html',
        'p': () => window.location.href = '/pages/profile.html'
    });

    // Show first-visit hint
    showKeyboardShortcutsHint();
});

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.UIUtils = {
        escapeHTML,
        showLoader,
        hideLoader,
        showToast,
        showInlineLoader,
        hideInlineLoader,
        createSkeleton,
        showConfirmDialog,
        updateProgress,
        createEmptyState,
        initKeyboardShortcuts,
        showKeyboardShortcutsModal,
        showKeyboardShortcutsHint
    };
}
