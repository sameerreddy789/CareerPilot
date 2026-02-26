
// Route Guard - Protects pages that require authentication
// Now with Unified App Instance and Nuclear Blocking Loader + Retry Logic

const PROTECTED_PAGES = ['dashboard.html', 'roadmap.html', 'interview.html', 'resume.html', 'studio.html', 'skill-gap.html', 'feedback.html', 'profile.html'];
const CURRENT_PAGE = window.location.pathname.split('/').pop();

// Helper to get cookies (if needed, but we rely on Firebase Auth + LocalStorage)
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

(function () {
    console.log('[RouteGuard] Checking access for:', CURRENT_PAGE);

    // Allow public pages
    if (!PROTECTED_PAGES.includes(CURRENT_PAGE) && CURRENT_PAGE !== '') {
        return;
    }

    // Check LocalStorage Flags
    const state = {
        onboarding: localStorage.getItem('nextStep_onboardingCompleted') === 'true',
        resume: !!localStorage.getItem('nextStep_resume'),
        roadmap: localStorage.getItem('nextStep_roadmapCompleted') === 'true',
        skillGap: localStorage.getItem('nextStep_skillGapCompleted') === 'true'
    };

    // 1. Strict Flow Enforcement
    // Sequence: Onboarding -> Resume -> Interview -> Dashboard/Roadmap

    if (CURRENT_PAGE === 'dashboard.html' || CURRENT_PAGE === 'studio.html') {
        if (!state.onboarding) {
            window.location.href = 'onboarding.html';
            return;
        }
        if (!state.resume) {
            window.location.href = 'resume.html';
            return;
        }
        if (!state.roadmap) {
            window.location.href = 'interview.html?restriction=1';
            return;
        }
    } else if (CURRENT_PAGE === 'roadmap.html') {
        if (!state.onboarding) {
            window.location.href = 'onboarding.html';
            return;
        }
        if (!state.resume) {
            window.location.href = 'resume.html';
            return;
        }
        // Allow roadmap if skill gap is completed (skills added to plan) OR roadmap already generated
        if (!state.roadmap && !state.skillGap) {
            window.location.href = 'skill-gap.html';
            return;
        }
    } else if (CURRENT_PAGE === 'interview.html' || CURRENT_PAGE === 'skill-gap.html' || CURRENT_PAGE === 'feedback.html') {
        if (!state.onboarding) {
            window.location.href = 'onboarding.html';
            return;
        }
        if (!state.resume) {
            window.location.href = 'resume.html';
            return;
        }
    } else if (CURRENT_PAGE === 'profile.html') {
        if (!state.onboarding) {
            window.location.href = 'onboarding.html';
            return;
        }
    } else if (CURRENT_PAGE === 'resume.html') {
        if (!state.onboarding) {
            window.location.href = 'onboarding.html';
            return;
        }
    } else if (CURRENT_PAGE === 'onboarding.html') {
        if (state.roadmap) {
            window.location.href = 'dashboard.html';
            return;
        }
    }

    // 2. Auth Verification
    // Use the stored user as a fast initial check
    const storedUser = localStorage.getItem('nextStep_user');
    if (!storedUser) {
        window.location.href = 'auth.html';
        return;
    }

    // Async Firebase auth verification with BLOCKING LOADER
    // This prevents "glitchy" redirects by waiting for a definitive answer from Firebase
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js").then(({ getAuth, onAuthStateChanged }) => {
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js").then(({ initializeApp, getApps, getApp }) => {

            // 1. Show Blocking Loader immediately if we suspect a user exists
            if (localStorage.getItem('nextStep_user')) {
                const loader = document.createElement('div');
                loader.id = 'auth-checking-loader';
                loader.innerHTML = `
                    <style>
                        #auth-checking-loader {
                            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                            background: radial-gradient(circle at center, #1e293b, #0f172a); 
                            z-index: 999999;
                            display: flex; justify-content: center; align-items: center; flex-direction: column;
                            color: white; font-family: 'Inter', sans-serif;
                            backdrop-filter: blur(10px);
                        }
                        .rg-logo-container {
                            position: relative; margin-bottom: 30px;
                        }
                        .rg-logo-glow {
                            width: 80px; height: 80px; background: #6366f1; border-radius: 50%;
                            filter: blur(40px); opacity: 0.5; position: absolute; top: 50%; left: 50%;
                            transform: translate(-50%, -50%); animation: rg-pulse 2s infinite;
                        }
                        .rg-logo {
                            font-size: 40px; position: relative; z-index: 2;
                        }
                        .rg-spinner {
                            width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.1);
                            border-radius: 50%; border-top-color: #818cf8;
                            animation: rg-spin 1s linear infinite; margin-top: 20px;
                        }
                        .rg-text {
                            font-size: 14px; color: #94a3b8; font-weight: 500; letter-spacing: 0.5px;
                            margin-top: 15px; animation: rg-fade 1.5s infinite alternate;
                        }
                        @keyframes rg-spin { to { transform: rotate(360deg); } }
                        @keyframes rg-pulse { 0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.2); } }
                        @keyframes rg-fade { from { opacity: 0.6; } to { opacity: 1; } }
                    </style>
                    <div class="rg-logo-container">
                        <div class="rg-logo-glow"></div>
                        <div class="rg-logo">🚀</div>
                    </div>
                    <div class="rg-text">NextStep AI</div>
                    <div class="rg-spinner"></div>
                `;
                // Append to documentElement (<html>) because body might not exist yet if script is in <head>
                if (document.body) {
                    document.body.appendChild(loader);
                } else {
                    document.documentElement.appendChild(loader);
                }
            }

            // Use existing app if available, or init from window.ENV
            const cfg = window.ENV || {};
            try {
                let app;
                if (getApps().length > 0) {
                    app = getApp(); // Use default app
                    console.log('[RouteGuard] Using existing default app for check');
                } else {
                    app = initializeApp({
                        apiKey: cfg.VITE_FIREBASE_API_KEY,
                        authDomain: cfg.VITE_FIREBASE_AUTH_DOMAIN,
                        projectId: cfg.VITE_FIREBASE_PROJECT_ID,
                        storageBucket: cfg.VITE_FIREBASE_STORAGE_BUCKET,
                        messagingSenderId: cfg.VITE_FIREBASE_MESSAGING_SENDER_ID,
                        appId: cfg.VITE_FIREBASE_APP_ID,
                        measurementId: cfg.VITE_FIREBASE_MEASUREMENT_ID
                    });
                    console.log('[RouteGuard] Initialized new default app for check');
                }
                const authInstance = getAuth(app);

                // 2. Wait for definitive Auth State (with Retry Mechanism)
                let retryCount = 0;
                const maxRetries = 3;

                const checkAuth = (user) => {
                    if (user) {
                        // Success - user is logged in
                        const loader = document.getElementById('auth-checking-loader');
                        if (loader) loader.remove();
                        console.log('[RouteGuard] Auth State Resolves: Logged In');
                        // Cleanup listener
                        unsubscribe();
                        return;
                    }

                    // User is null - retry or redirect
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.warn(`[RouteGuard] Auth returned null. Retrying (${retryCount}/${maxRetries})...`);
                        setTimeout(() => {
                            // Re-check current user from instance directly
                            // Note: onAuthStateChanged might fire again if state changes, but we also manually poll here
                            checkAuth(authInstance.currentUser);
                        }, 1000); // Wait 1s between retries (slower check for stability)
                    } else {
                        // Definitely logged out after retries
                        const loader = document.getElementById('auth-checking-loader');
                        if (loader) loader.remove();

                        if (CURRENT_PAGE !== 'auth.html' && CURRENT_PAGE !== 'index.html' && CURRENT_PAGE !== '') {
                            console.warn('[RouteGuard] No user found after retries. Redirecting to login.');
                            // Do NOT clear nextStep_user immediately, just redirect.
                            // If they login again, it will overwrite.
                            window.location.href = 'auth.html';
                        }
                        unsubscribe();
                    }
                };

                const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                    // Only trigger the check logic if we haven't already succeeded
                    // (Note: onAuthStateChanged can fire multiple times)
                    if (user) {
                        checkAuth(user);
                    } else {
                        // If null, start the retry sequence
                        checkAuth(null);
                    }
                });

            } catch (e) {
                console.warn('[RouteGuard] Auth check skipped:', e.message);
                const loader = document.getElementById('auth-checking-loader');
                if (loader) loader.remove();
            }
        });
    }).catch((e) => {
        console.warn('[RouteGuard] Could not load Firebase Auth for verification', e);
        const loader = document.getElementById('auth-checking-loader');
        if (loader) loader.remove();
    });

})();
