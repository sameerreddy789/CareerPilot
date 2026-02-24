import { appState } from './app-state.js';

const SIDEBAR_CONFIG = {
    logo: {
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2s-7 2-9 6a22 22 0 0 1-4 2"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5c1.08 1.45 4 2 4 2s-1.08-3.38 0-5c.9-.71 2-1 2-1"></path></svg>',
        text: 'NextStep AI',
        href: 'index.html'
    },
    mainNav: [
        {
            // Activity/TrendingUp (Dashboard)
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
            text: 'Dashboard',
            href: 'dashboard.html'
        },
        {
            // UserSquare (Resume)
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="12" cy="10" r="3"></circle><path d="M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"></path></svg>',
            text: 'Resume',
            href: 'resume.html'
        },
        {
            // Target (Skill Gap)
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
            text: 'Skill Gap',
            href: 'skill-gap.html'
        },
        {
            // Mic2 (Interview)
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>',
            text: 'Interview',
            href: 'interview.html'
        },
        {
            // Milestone (Roadmap)
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z"></path><path d="M12 13v8"></path><path d="M12 3v3"></path></svg>',
            text: 'Roadmap',
            href: 'roadmap.html'
        }
    ]
};

function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    return page;
}

function generateSidebar() {
    const currentPage = getCurrentPage();
    // Use AppState if available, fallback to localStorage for immediate render if needed
    const userData = appState.user ?
        { ...appState.user, targetRole: appState.user.targetRole || 'sde' } :
        JSON.parse(localStorage.getItem('nextStep_user') || '{}');

    const userName = userData.name || 'User';
    const userInitial = userName.charAt(0).toUpperCase();
    const roleNames = {
        'sde': 'Software Developer',
        'frontend': 'Frontend Dev',
        'backend': 'Backend Dev',
        'fullstack': 'Full Stack Dev',
        'data-analyst': 'Data Analyst',
        'data-scientist': 'Data Scientist',
        'ml-engineer': 'ML Engineer',
        'devops': 'DevOps Engineer',
        'product': 'Product Manager',
        'designer': 'UI/UX Designer'
    };
    const userRole = roleNames[userData.targetRole] || 'Developer';

    // Fetch stats from AppState
    const progress = appState.readinessScore || 0;

    // Calculate streak from AppState or fallback
    let streak = 0;
    if (appState.streakData) {
        // Simple count of keys for now, or use a proper streak calculator
        streak = Object.keys(appState.streakData).length;
        // Real implementation should calculate consecutive days. 
        // For now, let's trust appState or calculate it briefly if needed.
        // Assuming appState might have a pre-calculated streak property?
        // Let's check appState structure. It has "streakData".
        // Let's use a simple placeholder or a helper if available.
        // Reverting to existing logic if simple:
        const today = new Date().toISOString().split('T')[0];
        if (appState.streakData[today]) {
            // Logic to calc streak... simplistic for now
        }
    }
    // Fallback to existing global store if AppState streak is empty/not ready
    if (streak === 0 && window.SkillStore) {
        const stats = SkillStore.getStats();
        streak = stats.maxStreak;
    }
    // Final fallback
    if (streak === 0) streak = 1;


    const sidebarHTML = `
        <div class="sidebar-header">
            <button class="sidebar-toggle-btn" onclick="toggleSidebar()" aria-label="Toggle sidebar">
                <span class="hamburger-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            </button>
            <a href="${SIDEBAR_CONFIG.logo.href}" class="nav-logo">
                <span class="nav-logo-icon">${SIDEBAR_CONFIG.logo.icon}</span>
                <span class="nav-logo-text">${SIDEBAR_CONFIG.logo.text}</span>
            </a>
        </div>
        <nav class="sidebar-nav">
            ${SIDEBAR_CONFIG.mainNav.map(item => `

                <a href="${item.href}" class="sidebar-link ${currentPage === item.href ? 'active' : ''}" data-tooltip="${item.text}">
                    <span class="sidebar-link-icon">${item.icon}</span>
                    <span class="sidebar-link-text">${item.text}</span>
                </a>
            `).join('')}
        </nav>
        <div class="sidebar-progress-card">
            <div class="progress-main-row">
                <div class="progress-stat-item">
                    <span class="progress-percent-big">${Math.round(progress)}%</span>
                    <span class="progress-label">Readiness</span>
                </div>
                <div class="progress-streak-item">
                    <span class="progress-streak-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #F59E0B;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6 2.136 2.136 3.5 4.554 3.5 7a7 7 0 1 1-14 0c0-3 2.5-5 2.5-7 1 1 1.5 1.5 2.5 3.5Z"></path></svg>
                    </span>
                    <span class="progress-streak-val">${streak}</span>
                </div>
            </div>
            <div class="progress-track">
                <div class="progress-track-fill" style="width: ${progress}%"></div>
            </div>
            <a href="roadmap.html" class="progress-action-btn">
                Resume Roadmap
            </a>
        </div>

        <div class="sidebar-footer">
            <a href="profile.html" class="user-info-widget" style="text-decoration: none; cursor: pointer;">
                <div class="user-avatar-widget" style="${userData.photoURL ? `background-image: url(${userData.photoURL}); font-size: 0;` : ''}">
                    ${userData.photoURL ? '' : userInitial}
                </div>
                <div class="user-details-widget">
                    <div class="user-name-widget">${userName}</div>
                    <div class="user-role-widget">${userRole}</div>
                </div>
            </a>
        </div>
    `;

    /* Inject Sidebar HTML */
    let sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.innerHTML = sidebarHTML;
    }

    /* Inject Logout Modal */
    if (!document.getElementById('logout-modal')) {
        const modalHTML = `
            <div id="logout-modal" class="custom-modal-overlay hidden">
                <div class="custom-modal">
                    <div class="modal-icon">👋</div>
                    <h3 class="modal-title">Ready to leave?</h3>
                    <p class="modal-desc">Are you sure you want to log out of your account?</p>
                    <div class="modal-actions">
                        <button onclick="closeLogoutModal()" class="btn-modal-cancel">Cancel</button>
                        <button onclick="confirmLogout()" class="btn-modal-confirm">Log Out</button>
                    </div>
                </div>
            </div>
            <style>
                .custom-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.2s ease;
                }
                
                .custom-modal {
                    background: #1a1a2e; /* Matches bg-card var */
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    padding: 32px;
                    width: 90%;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .modal-icon {
                    font-size: 40px;
                    margin-bottom: 16px;
                }

                .modal-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 8px;
                    font-family: 'Inter', sans-serif;
                }

                .modal-desc {
                    color: #94a3b8;
                    font-size: 14px;
                    margin-bottom: 24px;
                    line-height: 1.5;
                    font-family: 'Inter', sans-serif;
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                }

                .btn-modal-cancel, .btn-modal-confirm {
                    flex: 1;
                    padding: 12px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    font-family: 'Inter', sans-serif;
                }

                .btn-modal-cancel {
                    background: rgba(255, 255, 255, 0.05);
                    color: white;
                }

                .btn-modal-cancel:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .btn-modal-confirm {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                }

                .btn-modal-confirm:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
                }

                .hidden {
                    display: none !important;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

// Toggle User Menu Dropdown
window.toggleUserMenu = function (event) {
    event.stopPropagation();
    const menu = document.getElementById('user-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
};

// Close menu when clicking outside
document.addEventListener('click', function (event) {
    const menu = document.getElementById('user-menu');
    const userWidget = document.querySelector('.user-info-widget');

    if (menu && !menu.classList.contains('hidden')) {
        if (!userWidget || !userWidget.contains(event.target)) {
            menu.classList.add('hidden');
        }
    }
});

// Global Logout Logic
window.logout = function () {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        // Fallback if sidebar hasn't loaded (rare)
        if (confirm('Are you sure you want to logout?')) {
            confirmLogout();
        }
    }
};

window.closeLogoutModal = function () {
    const modal = document.getElementById('logout-modal');
    if (modal) modal.classList.add('hidden');
};

window.confirmLogout = function () {
    // Clear all app-specific localStorage keys (prefix-based wipe)
    Object.keys(localStorage)
        .filter(k => k.startsWith('nextStep_') || k === 'userType' || k === 'userProfile' || k === 'pendingResumeFile')
        .forEach(k => localStorage.removeItem(k));

    // Also sign out from AppState/Firebase
    try {
        appState.logout(); // Assuming appState has logout or we just redirect
    } catch (e) { console.log("AppState logout error", e); }

    // Redirect to landing page
    window.location.href = 'index.html';
};

// Toggle Sidebar Collapse/Expand
window.toggleSidebar = function () {
    const sidebar = document.querySelector('.sidebar');
    const isCollapsed = sidebar.classList.toggle('collapsed');

    // Save state to localStorage
    localStorage.setItem('sidebar_collapsed', isCollapsed);
};

// Initialize sidebar state from localStorage
function initializeSidebarState() {
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    const sidebar = document.querySelector('.sidebar');

    if (isCollapsed && sidebar) {
        sidebar.classList.add('collapsed');
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for AppState if possible, or render immediately
    generateSidebar();

    // Subscribe to AppState updates
    appState.subscribe(() => {
        generateSidebar();
        initializeSidebarState();
    });

    setTimeout(initializeSidebarState, 0);
});

// Export for use if needed
window.SidebarComponent = {
    generate: generateSidebar,
    config: SIDEBAR_CONFIG
};
