import { auth, db } from './firebase-config.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { appState } from './app-state.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for appState to initialize
    const isLoggedIn = await appState.init();

    const hasInterview = isLoggedIn && (appState.interviews.length > 0 || localStorage.getItem('nextStep_interview'));
    const hasResume = isLoggedIn && (appState.resumeData || localStorage.getItem('nextStep_resume'));

    const userData = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
    const userRole = userData.targetRole || 'sde';

    const roadmapData = JSON.parse(localStorage.getItem('nextStep_roadmap') || '{"skills":[]}');
    const planSkills = JSON.parse(localStorage.getItem('nextStep_roadmapPlan') || '[]');
    const skillGaps = planSkills.length > 0
        ? planSkills.map(name => ({ name, priority: 'must-have' }))
        : (appState.skillGap || roadmapData.skills || []);

    // Gated Access Logic
    const skillGapDone = localStorage.getItem('nextStep_skillGapCompleted') === 'true';
    if (!skillGapDone) {
        document.getElementById('gated-modal').classList.remove('hidden');
        const gatedTitle = document.querySelector('#gated-modal h2, #gated-modal .gated-title');
        if (gatedTitle) gatedTitle.textContent = 'Complete Skill Gap Analysis First';
        const gatedDesc = document.querySelector('#gated-modal p, #gated-modal .gated-desc');
        if (gatedDesc) gatedDesc.textContent = 'Visit the Skill Gap page and add skills to your plan before accessing the Roadmap.';
    } else if (!hasInterview && !hasResume) {
        document.getElementById('gated-modal').classList.remove('hidden');
    } else {
        // Let roadmap-ui.js handle ALL generation logic (single orchestrator)
        await initRoadmap(userRole, false, skillGaps);

        // Mark roadmap as completed to allow dashboard access
        localStorage.setItem('nextStep_roadmapCompleted', 'true');
        console.log("Roadmap loaded. Dashboard access unlocked.");

        // Sync with Firestore
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userRef = doc(db, "users", user.uid);
                    await updateDoc(userRef, {
                        roadmapGenerated: true
                    });
                } catch (e) {
                    console.error("Error updating roadmap status:", e);
                }
            }
        });
    }
});

// Unlock Sample Mode (Preview)
window.unlockSampleMode = function () {
    document.getElementById('gated-modal').classList.add('hidden');
    const userData = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
    const userRole = userData.targetRole || 'sde';
    initRoadmap(userRole, true); // true = isSample
};
