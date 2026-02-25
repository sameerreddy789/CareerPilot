
import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // State
    const loginForm = document.getElementById('login-view');
    const signupForm = document.getElementById('signup-view');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');

    // Toggle View (Login vs Signup)
    window.toggleView = (view) => {
        if (view === 'login') {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            authTitle.textContent = 'Welcome back';
            authSubtitle.textContent = 'Sign in to your account to continue';
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            authTitle.textContent = 'Create Account';
            authSubtitle.textContent = 'Join NextStep AI to start your journey';
        }
    };

    // Password Toggle
    window.togglePassword = (inputId, btn) => {
        const input = document.getElementById(inputId);
        if (input.type === 'password') {
            input.type = 'text';
            btn.style.color = '#7c3aed';
        } else {
            input.type = 'password';
            btn.style.color = 'var(--muted-foreground)';
        }
    };

    // Helper: Check Onboarding Status & Redirect
    async function handlePostAuth(user) {
        // Clear demo mode if it was active
        localStorage.removeItem('demoMode');

        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        let userData = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL
        };

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Sync Firestore state to LocalStorage for route-guard.js compatibility
            const fullUserData = { ...userData, ...data };
            localStorage.setItem('nextStep_user', JSON.stringify(fullUserData));

            // Sync Onboarding Flags
            if (data.onboardingCompleted) {
                localStorage.setItem('nextStep_onboardingCompleted', 'true');
            }
            if (data.resumeStatus) {
                localStorage.setItem('nextStep_resume', JSON.stringify({
                    status: data.resumeStatus,
                    data: data.resumeData
                }));
            }
            if (data.interviewCompleted) {
                localStorage.setItem('nextStep_interview', 'true');
            }
            if (data.roadmapGenerated) {
                localStorage.setItem('nextStep_roadmapCompleted', 'true');
            }

            // Redirect based on progress
            if (data.roadmapGenerated) {
                window.location.href = "/pages/dashboard.html";
            } else if (data.interviewCompleted) {
                window.location.href = "/pages/roadmap.html";
            } else if (data.onboardingCompleted) {
                window.location.href = "/pages/resume.html";
            } else {
                window.location.href = "/pages/onboarding.html";
            }
        } else {
            // First time user (likely Google)
            userData.onboardingCompleted = false;
            userData.roadmapGenerated = false;
            userData.createdAt = new Date().toISOString();

            await setDoc(docRef, userData);
            localStorage.setItem('nextStep_user', JSON.stringify(userData));
            window.location.href = "/pages/onboarding.html";
        }
    }

    // ==========================================
    // FIREBASE AUTH LOGIC
    // ==========================================

    // LOGIN
    document.getElementById('form-login').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = e.target.querySelector('button[type="submit"]');

        try {
            btn.disabled = true;
            btn.innerHTML = `<span class="loading-spinner"></span> Signing in...`;

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await handlePostAuth(userCredential.user);

        } catch (error) {
            console.error(error);
            const friendlyMessage = window.FirebaseErrorHandler
                ? window.FirebaseErrorHandler.getFriendlyFirebaseError(error)
                : (error.message || 'Something went wrong. Please try again.');
            if (typeof UIUtils !== 'undefined' && UIUtils.showToast) {
                UIUtils.showToast(friendlyMessage, 'error', 4000);
            } else if (window.Toast) {
                window.Toast.show(friendlyMessage, 'error');
            } else {
                alert(friendlyMessage);
            }
            btn.disabled = false;
            btn.textContent = "Sign In";
        }
    });

    // SIGN UP
    document.getElementById('form-signup').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const btn = e.target.querySelector('button[type="submit"]');

        try {
            btn.disabled = true;
            btn.innerHTML = `<span class="loading-spinner"></span> Creating Account...`;

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userData = {
                email: email,
                name: email.split('@')[0],
                createdAt: new Date().toISOString(),
                onboardingCompleted: false,
                roadmapGenerated: false
            };

            await setDoc(doc(db, "users", user.uid), userData);
            localStorage.setItem('nextStep_user', JSON.stringify(userData));

            window.location.href = "/pages/onboarding.html";

        } catch (error) {
            console.error(error);
            const friendlyMessage = window.FirebaseErrorHandler
                ? window.FirebaseErrorHandler.getFriendlyFirebaseError(error)
                : (error.message || 'Something went wrong. Please try again.');
            if (typeof UIUtils !== 'undefined' && UIUtils.showToast) {
                UIUtils.showToast(friendlyMessage, 'error', 4000);
            } else if (window.Toast) {
                window.Toast.show(friendlyMessage, 'error');
            } else {
                alert(friendlyMessage);
            }
            btn.disabled = false;
            btn.textContent = "Create Account";
        }
    });

    // FORGOT PASSWORD
    window.handleForgotPassword = async () => {
        const email = document.getElementById('login-email').value.trim();
        if (!email) {
            if (typeof UIUtils !== 'undefined' && UIUtils.showToast) {
                UIUtils.showToast('Enter your email address first, then click Forgot', 'warning', 4000);
            } else { alert('Please enter your email address first.'); }
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            if (typeof UIUtils !== 'undefined' && UIUtils.showToast) {
                UIUtils.showToast('Password reset email sent! Check your inbox.', 'success', 5000);
            } else { alert('Password reset email sent! Check your inbox.'); }
        } catch (error) {
            console.error(error);
            const friendlyMessage = window.FirebaseErrorHandler
                ? window.FirebaseErrorHandler.getFriendlyFirebaseError(error)
                : (error.message || 'Failed to send reset email.');
            if (typeof UIUtils !== 'undefined' && UIUtils.showToast) {
                UIUtils.showToast(friendlyMessage, 'error', 4000);
            } else { alert(friendlyMessage); }
        }
    };

    // GOOGLE AUTH
    window.handleGoogleAuth = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await handlePostAuth(result.user);

        } catch (error) {
            console.error(error);
            const friendlyMessage = window.FirebaseErrorHandler
                ? window.FirebaseErrorHandler.getFriendlyFirebaseError(error)
                : (error.message || 'Something went wrong. Please try again.');
            if (typeof UIUtils !== 'undefined' && UIUtils.showToast) {
                UIUtils.showToast(friendlyMessage, 'error', 4000);
            } else if (window.Toast) {
                window.Toast.show(friendlyMessage, 'error');
            } else {
                alert(friendlyMessage);
            }
        }
    };
});
