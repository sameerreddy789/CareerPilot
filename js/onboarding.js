
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// State
let currentStep = 1;
const totalSteps = 5;
let resumeMode = 'choice'; // 'choice', 'upload', 'create'
let builderStep = 1;
const totalBuilderSteps = 14;
let uploadedResumeFile = null; // Store the uploaded resume file

let userData = {
    careerGoal: null,
    targetRole: null,
    jobReadyTimeline: null,
    dailyCommitment: null, // replaced preparationStyle
    resumeStatus: 'pending',
    resumeData: null // For built resume
};

// DOM Elements
const progressBar = document.getElementById('progress-bar');
const stepIndicator = document.getElementById('step-indicator');
const btnNext = document.getElementById('btn-next');
const btnBack = document.getElementById('btn-back');

// Init
document.addEventListener('DOMContentLoaded', () => {

    // Check Auth & Redirect if already onboarded
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '/pages/auth.html';
            return;
        }

        // Check if onboarding is already finished
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // If roadmap is already generated, go straight to dashboard
                if (data.roadmapGenerated) {
                    localStorage.setItem('nextStep_onboardingCompleted', 'true');
                    localStorage.setItem('nextStep_roadmapCompleted', 'true');
                    localStorage.setItem('nextStep_user', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        name: data.name || user.displayName || user.email.split('@')[0],
                        ...data
                    }));
                    window.location.href = '/pages/dashboard.html';
                    return;
                }

                // If onboarding is done, go to next step (resume)
                if (data.onboardingCompleted) {
                    localStorage.setItem('nextStep_onboardingCompleted', 'true');
                    localStorage.setItem('nextStep_user', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        name: data.name || user.displayName || user.email.split('@')[0],
                        ...data
                    }));
                    window.location.href = '/pages/resume.html';
                    return;
                }

                // Restore State if exists (user in progress)
                if (data.careerGoal) {
                    userData = { ...userData, ...data };
                    // Optionally advance step if we saved that, for now just load data
                }
            }
        } catch (error) {
            console.error("Error checking user status:", error);
        }
    });

    // Event Listeners
    btnNext.addEventListener('click', nextStep);
    btnBack.addEventListener('click', prevStep);

    // Custom Role Input
    const roleInput = document.getElementById('custom-role-input');
    if (roleInput) {
        roleInput.addEventListener('input', (e) => {
            selectOption('targetRole', e.target.value, false); // Don't highlight cards
            // Visually deselect cards
            document.querySelectorAll('#step-2 .option-card').forEach(c => c.classList.remove('selected'));
        });
    }

    // Resume Upload
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('resume-upload');
    const removeFileBtn = document.getElementById('remove-file');

    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    removeFileBtn.addEventListener('click', removeFile);

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !btnNext.disabled) {
            e.preventDefault();
            nextStep();
        } else if (e.key === 'Escape' && currentStep > 1) {
            e.preventDefault();
            prevStep();
        }
    });

    updateUI();
});

// Navigation
async function nextStep() {
    // If we are on Step 5 and in Builder Mode, handle builder navigation
    if (currentStep === 5 && resumeMode === 'create') {
        if (builderStep < totalBuilderSteps) {
            builderStep++;
            updateUI();
            return;
        }
    }

    if (currentStep < totalSteps) {
        await saveProgress();
        currentStep++;
        updateUI();
    } else {
        finishOnboarding();
    }
}

function prevStep() {
    // Handle Builder Back
    if (currentStep === 5 && resumeMode === 'create') {
        if (builderStep > 1) {
            builderStep--;
            updateUI();
            return;
        } else {
            // Go back to choice
            setResumeMode('choice');
            return;
        }
    }

    // Handle Upload Back
    if (currentStep === 5 && resumeMode === 'upload') {
        setResumeMode('choice');
        return;
    }

    if (currentStep > 1) {
        currentStep--;
        updateUI();
    }
}

function updateUI() {
    // Show/Hide Steps
    document.querySelectorAll('.step-content').forEach((el, index) => {
        if (index + 1 === currentStep) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    // Handle Step 5 Sub-views
    if (currentStep === 5) {
        const choiceView = document.getElementById('resume-choice-view');
        const uploadFlow = document.getElementById('upload-flow');
        const builderFlow = document.getElementById('builder-flow');

        choiceView.classList.toggle('hidden', resumeMode !== 'choice');
        uploadFlow.classList.toggle('hidden', resumeMode !== 'upload');
        builderFlow.classList.toggle('hidden', resumeMode !== 'create');

        if (resumeMode === 'create') {
            updateBuilderUI();
        }
    }

    // Update Progress
    const pct = ((currentStep) / totalSteps) * 100;
    progressBar.style.width = `${pct}%`;
    stepIndicator.textContent = `Step ${currentStep} of ${totalSteps}`;

    // Buttons
    btnBack.classList.toggle('hidden', currentStep === 1 && resumeMode === 'choice');
    btnNext.textContent = (currentStep === totalSteps && (resumeMode !== 'create' || builderStep === totalBuilderSteps)) ? 'Finish' : 'Next';

    // Show/hide skip button for optional steps (3 and 4)
    const skipBtn = document.getElementById('btn-skip');
    if (skipBtn) {
        skipBtn.classList.toggle('hidden', currentStep !== 3 && currentStep !== 4);
    }

    validateStep();
}

function updateBuilderUI() {
    const titles = [
        "Personal Information", "Professional Summary", "Education", "Technical Skills",
        "Projects", "Work Experience", "Career Gap Details", "Internships / Training",
        "Certifications", "Achievements & Activities", "Soft Skills", "Career Preferences",
        "Resume Tone", "Declaration"
    ];

    document.getElementById('builder-step-title').textContent = titles[builderStep - 1];
    document.getElementById('builder-current-step').textContent = builderStep;

    document.querySelectorAll('.builder-section').forEach((el, index) => {
        el.classList.toggle('hidden', index + 1 !== builderStep);
    });
}

window.setResumeMode = (mode) => {
    resumeMode = mode;
    builderStep = 1;
    updateUI();
};

// Option Selection
window.selectOption = (key, value, highlight = true) => {
    userData[key] = value;

    // Visual Feedback
    const stepEl = document.getElementById(`step-${currentStep}`);
    if (highlight && stepEl) {
        stepEl.querySelectorAll('.option-card, .option-row').forEach(card => {
            // Check label text or click check
            if (card.innerText.includes(value) || card.textContent.includes(value)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    validateStep();
};

function validateStep() {
    let isValid = false;

    switch (currentStep) {
        case 1: isValid = !!userData.careerGoal; break;
        case 2: isValid = !!userData.targetRole; break;
        case 3: isValid = !!userData.jobReadyTimeline; break;
        case 4: isValid = !!userData.dailyCommitment; break;
        case 5:
            if (resumeMode === 'choice') isValid = false;
            else if (resumeMode === 'upload') isValid = userData.resumeStatus === 'uploaded';
            else if (resumeMode === 'create') isValid = validateBuilderStep();
            break;
    }

    btnNext.disabled = !isValid;
}

function validateBuilderStep() {
    // Simplified validation: check required fields for current step
    switch (builderStep) {
        case 1: return !!document.getElementById('rb-full-name').value && !!document.getElementById('rb-email').value;
        case 2: return !!document.getElementById('rb-summary').value;
        case 3: return !!document.getElementById('rb-edu-degree').value;
        case 14: return true; // Declaration is optional check but step is valid
        default: return true; // Most other fields are optional or have defaults
    }
}

// Skip optional steps with default values
window.skipStep = () => {
    if (currentStep === 3) {
        userData.jobReadyTimeline = '3-6 months'; // Default
    } else if (currentStep === 4) {
        userData.dailyCommitment = '2 hours/day'; // Default
    }
    nextStep();
};

// File Handling
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-preview').classList.remove('hidden');
        document.getElementById('upload-zone').classList.add('hidden');
        userData.resumeStatus = 'uploaded';

        // Store the file for later analysis
        uploadedResumeFile = file;

        // Convert file to base64 and store in localStorage for transfer to resume.html
        try {
            const reader = new FileReader();
            reader.onload = function (event) {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: event.target.result, // base64 data
                    lastModified: file.lastModified
                };
                localStorage.setItem('pendingResumeFile', JSON.stringify(fileData));
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Error storing file:", error);
        }

        validateStep();
    }
}

function removeFile() {
    document.getElementById('file-preview').classList.add('hidden');
    document.getElementById('upload-zone').classList.remove('hidden');
    document.getElementById('resume-upload').value = '';
    userData.resumeStatus = 'pending';

    // Clear stored file data
    uploadedResumeFile = null;
    localStorage.removeItem('pendingResumeFile');

    validateStep();
}

// Save & Finish
async function saveProgress() {
    const user = auth.currentUser;
    if (user) {
        try {
            await setDoc(doc(db, "users", user.uid), {
                ...userData,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("Save error:", e);
        }
    }
}

async function finishOnboarding() {
    const user = auth.currentUser;
    btnNext.textContent = "Generating Roadmap...";
    btnNext.disabled = true;

    if (resumeMode === 'create') {
        collectBuilderData();
        userData.resumeStatus = 'created';
    }

    if (user) {
        await setDoc(doc(db, "users", user.uid), {
            ...userData,
            onboardingCompleted: true,
            completedAt: serverTimestamp()
        }, { merge: true });

        // Update Local Storage for Dashboard compatibility
        try {
            localStorage.setItem("nextStep_onboardingCompleted", "true");
            localStorage.setItem("userType", userData.careerGoal === 'Student' ? 'student' : 'careerGap');
            const nextStepUser = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
            localStorage.setItem("nextStep_user", JSON.stringify({
                ...nextStepUser,
                targetRole: userData.targetRole,
                resumeStatus: userData.resumeStatus,
                resumeData: userData.resumeData
            }));
        } catch (e) {
            console.error("LocalStorage Error (Quota Exceeded?):", e);
            // Fallback: Clear pending file to make space, then try saving user flags again
            localStorage.removeItem('pendingResumeFile');
            try {
                localStorage.setItem("nextStep_onboardingCompleted", "true");
                const nextStepUser = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
                localStorage.setItem("nextStep_user", JSON.stringify({
                    ...nextStepUser,
                    targetRole: userData.targetRole,
                    resumeStatus: userData.resumeStatus
                }));
            } catch (retryError) {
                console.error("Critical: Could not save user state even after clearing file", retryError);
            }
        }

        // Note: Do NOT set nextStep_resume here - let resume.html handle the actual
        // AI analysis of the uploaded file via the pendingResumeFile mechanism.
    }

    // Redirect to Resume Analysis (Next Step in Flow)
    setTimeout(() => {
        window.location.href = '/pages/resume.html';
    }, 1500);
}

function collectBuilderData() {
    userData.resumeData = {
        personalInfo: {
            fullName: document.getElementById('rb-full-name').value,
            email: document.getElementById('rb-email').value,
            phone: document.getElementById('rb-phone').value,
            location: document.getElementById('rb-location').value,
            linkedin: document.getElementById('rb-linkedin').value,
            portfolio: document.getElementById('rb-portfolio').value
        },
        summary: document.getElementById('rb-summary').value,
        education: {
            degree: document.getElementById('rb-edu-degree').value,
            school: document.getElementById('rb-edu-school').value,
            field: document.getElementById('rb-edu-field').value,
            years: document.getElementById('rb-edu-years').value,
            grade: document.getElementById('rb-edu-grade').value
        },
        skills: {
            languages: document.getElementById('rb-skills-langs').value,
            frameworks: document.getElementById('rb-skills-frames').value,
            tools: document.getElementById('rb-skills-tools').value,
            databases: document.getElementById('rb-skills-db').value
        },
        project: {
            title: document.getElementById('rb-proj-title').value,
            desc: document.getElementById('rb-proj-desc').value,
            tech: document.getElementById('rb-proj-tech').value,
            role: document.getElementById('rb-proj-role').value,
            outcome: document.getElementById('rb-proj-outcome').value,
            link: document.getElementById('rb-proj-link').value
        },
        experience: {
            company: document.getElementById('rb-exp-company').value,
            title: document.getElementById('rb-exp-title').value,
            duration: document.getElementById('rb-exp-years').value,
            description: document.getElementById('rb-exp-desc').value
        },
        careerGap: {
            reason: document.getElementById('rb-gap-reason').value,
            activities: document.getElementById('rb-gap-activities').value
        },
        internship: {
            title: document.getElementById('rb-intern-title').value,
            org: document.getElementById('rb-intern-org').value,
            duration: document.getElementById('rb-intern-years').value,
            skills: document.getElementById('rb-intern-skills').value
        },
        certification: {
            name: document.getElementById('rb-cert-name').value,
            org: document.getElementById('rb-cert-org').value,
            year: document.getElementById('rb-cert-year').value
        },
        achievements: {
            awards: document.getElementById('rb-achievements').value,
            activities: document.getElementById('rb-extracurricular').value
        },
        softSkills: document.getElementById('rb-soft-skills').value,
        preferences: {
            role: document.getElementById('rb-pref-role').value,
            industry: document.getElementById('rb-pref-industry').value,
            relocate: document.getElementById('rb-pref-relocate').value
        },
        tone: document.getElementById('rb-tone').value,
        declaration: document.getElementById('rb-declaration').checked
    };
}
