import { auth, db } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Expose functions to window since we're in a module now
window.reUploadResume = reUploadResume;
window.analyzeResume = analyzeResume;

// Role-specific ATS Keywords Database
const ATS_KEYWORDS = {
    'sde': {
        technical: ['javascript', 'python', 'java', 'c++', 'react', 'node.js', 'sql', 'git', 'api', 'rest', 'mongodb', 'aws', 'docker', 'kubernetes', 'microservices', 'agile', 'scrum', 'data structures', 'algorithms', 'oop', 'system design'],
        soft: ['problem solving', 'teamwork', 'communication', 'collaboration', 'leadership', 'analytical'],
        experience: ['software development', 'full stack', 'backend', 'frontend', 'coding', 'programming', 'debugging', 'testing']
    },
    'frontend': {
        technical: ['html', 'css', 'javascript', 'react', 'vue', 'angular', 'typescript', 'sass', 'webpack', 'responsive design', 'ui/ux', 'figma', 'tailwind', 'bootstrap', 'redux', 'next.js', 'accessibility', 'web performance'],
        soft: ['creativity', 'attention to detail', 'communication', 'collaboration', 'user-focused'],
        experience: ['frontend development', 'web development', 'ui development', 'responsive design', 'cross-browser']
    },
    'backend': {
        technical: ['node.js', 'python', 'java', 'spring boot', 'express', 'django', 'flask', 'sql', 'postgresql', 'mongodb', 'redis', 'api', 'rest', 'graphql', 'microservices', 'docker', 'kubernetes', 'aws', 'azure', 'ci/cd'],
        soft: ['problem solving', 'analytical thinking', 'teamwork', 'communication', 'scalability mindset'],
        experience: ['backend development', 'server-side', 'database design', 'api development', 'system architecture']
    },
    'fullstack': {
        technical: ['javascript', 'react', 'node.js', 'python', 'sql', 'mongodb', 'html', 'css', 'git', 'api', 'rest', 'docker', 'aws', 'typescript', 'express', 'redux', 'postgresql'],
        soft: ['versatility', 'problem solving', 'communication', 'teamwork', 'adaptability'],
        experience: ['full stack development', 'end-to-end development', 'frontend', 'backend', 'web development']
    },
    'data-analyst': {
        technical: ['python', 'sql', 'excel', 'tableau', 'power bi', 'pandas', 'numpy', 'statistics', 'data visualization', 'r', 'machine learning', 'data mining', 'etl', 'big data'],
        soft: ['analytical thinking', 'attention to detail', 'communication', 'business acumen', 'problem solving'],
        experience: ['data analysis', 'business intelligence', 'reporting', 'data visualization', 'insights']
    },
    'data-scientist': {
        technical: ['python', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'sql', 'statistics', 'nlp', 'computer vision', 'pandas', 'numpy', 'jupyter', 'aws', 'spark'],
        soft: ['analytical thinking', 'problem solving', 'communication', 'research', 'innovation'],
        experience: ['data science', 'machine learning', 'predictive modeling', 'ai', 'research']
    },
    'ml-engineer': {
        technical: ['python', 'tensorflow', 'pytorch', 'machine learning', 'deep learning', 'mlops', 'docker', 'kubernetes', 'aws', 'model deployment', 'scikit-learn', 'neural networks', 'computer vision', 'nlp'],
        soft: ['problem solving', 'innovation', 'collaboration', 'analytical thinking', 'research'],
        experience: ['ml engineering', 'model development', 'ai', 'production ml', 'mlops']
    },
    'devops': {
        technical: ['docker', 'kubernetes', 'jenkins', 'ci/cd', 'aws', 'azure', 'terraform', 'ansible', 'linux', 'bash', 'python', 'git', 'monitoring', 'prometheus', 'grafana', 'nginx'],
        soft: ['automation mindset', 'problem solving', 'collaboration', 'reliability focus', 'communication'],
        experience: ['devops', 'infrastructure', 'automation', 'deployment', 'cloud engineering']
    },
    'product': {
        technical: ['product management', 'agile', 'scrum', 'jira', 'analytics', 'roadmap', 'user stories', 'wireframing', 'sql', 'a/b testing'],
        soft: ['leadership', 'communication', 'strategic thinking', 'stakeholder management', 'decision making'],
        experience: ['product management', 'product development', 'product strategy', 'user research', 'feature prioritization']
    },
    'designer': {
        technical: ['figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'ui/ux', 'wireframing', 'prototyping', 'user research', 'design systems', 'responsive design', 'accessibility'],
        soft: ['creativity', 'empathy', 'communication', 'collaboration', 'attention to detail'],
        experience: ['ui/ux design', 'product design', 'user experience', 'visual design', 'interaction design']
    }
};

// Calculate ATS Score
function calculateATSScore(resumeText, targetRole) {
    const keywords = ATS_KEYWORDS[targetRole] || ATS_KEYWORDS['sde'];
    const resumeLower = resumeText.toLowerCase();

    // 1. Keyword Match Score (50% weight)
    const allKeywords = [...keywords.technical, ...keywords.soft, ...keywords.experience];
    const matchedKeywords = allKeywords.filter(kw => resumeLower.includes(kw.toLowerCase()));
    const keywordScore = Math.round((matchedKeywords.length / allKeywords.length) * 100);

    // 2. Experience Relevance Score (30% weight)
    const experienceKeywords = keywords.experience;
    const matchedExperience = experienceKeywords.filter(kw => resumeLower.includes(kw.toLowerCase()));
    const experienceScore = Math.round((matchedExperience.length / experienceKeywords.length) * 100);

    // 3. Format Compatibility Score (20% weight)
    let formatScore = 100;
    // Check for common ATS-friendly indicators
    if (!resumeLower.includes('experience') && !resumeLower.includes('work history')) formatScore -= 20;
    if (!resumeLower.includes('education')) formatScore -= 15;
    if (!resumeLower.includes('skills')) formatScore -= 15;
    if (resumeText.length < 200) formatScore -= 30; // Too short
    if (resumeText.length > 5000) formatScore -= 20; // Too long
    formatScore = Math.max(0, formatScore);

    // Calculate overall ATS score (weighted average)
    const overallScore = Math.round(
        (keywordScore * 0.5) +
        (experienceScore * 0.3) +
        (formatScore * 0.2)
    );

    // Generate suggestions
    const suggestions = [];
    if (keywordScore < 60) {
        const missingTech = keywords.technical.filter(kw => !resumeLower.includes(kw.toLowerCase())).slice(0, 5);
        suggestions.push(`Add key technical skills: ${missingTech.join(', ')}`);
    }
    if (experienceScore < 50) {
        suggestions.push(`Include more relevant experience keywords like "${keywords.experience[0]}" or "${keywords.experience[1]}"`);
    }
    if (!resumeLower.includes('quantif') && !resumeLower.includes('achiev')) {
        suggestions.push('Add quantifiable achievements (e.g., "Improved performance by 30%")');
    }
    if (formatScore < 80) {
        suggestions.push('Ensure your resume has clear sections: Experience, Education, Skills');
    }
    if (resumeText.length < 300) {
        suggestions.push('Expand your resume with more details about your experience and projects');
    }
    if (overallScore >= 80) {
        suggestions.push('Great job! Your resume is well-optimized for ATS systems');
    }

    return {
        overall: overallScore,
        keyword: keywordScore,
        experience: experienceScore,
        format: formatScore,
        suggestions: suggestions,
        matchedKeywords: matchedKeywords
    };
}

// Load user data
document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
    const userType = localStorage.getItem('userType');

    // Show ATS tooltip only for freshers/students, not for career gap users
    const tooltipContainer = document.getElementById('ats-tooltip-container');
    if (tooltipContainer) {
        if (userType === 'student' || userData.experienceLevel === 'student' || userData.experienceLevel === 'fresher') {
            tooltipContainer.style.display = 'inline-block';
        } else {
            tooltipContainer.style.display = 'none';
        }
    }

    // Check if already analyzed
    const rawResumeData = localStorage.getItem('nextStep_resume');
    if (rawResumeData) {
        try {
            let parsedData = JSON.parse(rawResumeData);

            // Handle wrapper object from auth-modern.js
            if (parsedData.status && parsedData.data !== undefined) {
                if (parsedData.status === 'pending' || !parsedData.data) {
                    // If pending or empty, clear it and show upload
                    localStorage.removeItem('nextStep_resume');
                    return;
                }
                parsedData = parsedData.data;
            }

            // Check for valid analysis data
            if (parsedData.score !== undefined || (parsedData.skills && parsedData.skills.present)) {
                showResults(parsedData);
            } else {
                // Invalid data, clear it
                localStorage.removeItem('nextStep_resume');
            }
        } catch (e) {
            console.error('Error parsing resume data:', e);
            localStorage.removeItem('nextStep_resume');
        }
    }
});

// File upload handling
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');

uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) analyzeResume(file);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) analyzeResume(file);
});

// Initialize PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(" ") + "\n";
        }
        return text;
    } catch (error) {
        console.error('[PDF] Extraction failed:', error);
        return null;
    }
}

async function analyzeResume(file) {
    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('analyzing-section').classList.remove('hidden');

    const statusText = document.querySelector('#analyzing-section .text-muted');
    const progressBar = document.getElementById('analysis-progress');

    // Get user's target role
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const userData = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
    const targetRole = userProfile.targetRole || userData.targetRole || 'sde';

    // Progress callback to update UI
    const onProgress = (update) => {
        const messages = {
            'starting': 'Connecting to AI service...',
            'uploading': file.type === 'application/pdf' ? 'Uploading PDF to AI...' : 'Sending resume data...',
            'processing': 'AI is analyzing your resume...',
            'complete': 'Analysis complete!'
        };

        if (update.message) {
            statusText.textContent = update.message;
        } else if (messages[update.stage]) {
            statusText.textContent = messages[update.stage];
        }

        // Update progress bar based on stage
        const progressMap = {
            'starting': 10,
            'uploading': 30,
            'processing': 60,
            'complete': 100
        };
        if (progressMap[update.stage]) {
            progressBar.style.width = progressMap[update.stage] + '%';
        }
    };

    try {
        // Use Gemini AI
        if (file && window.GeminiService && window.GeminiService.isAvailable()) {
            const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

            statusText.textContent = 'Preparing to analyze your resume...';
            progressBar.style.width = '5%';

            let aiResult;
            if (isPDF) {
                statusText.textContent = 'Extracting text from PDF...';
                progressBar.style.width = '15%';
                const extractedText = await extractTextFromPDF(file);

                if (extractedText && extractedText.trim().length > 100) {
                    console.log('[Resume] Using extracted text for analysis');
                    statusText.textContent = 'AI analyzing resume text...';
                    progressBar.style.width = '25%';
                    aiResult = await window.GeminiService.analyzeResume(extractedText, targetRole, onProgress);
                } else {
                    console.log('[Resume] Falling back to multimodal PDF analysis');
                    statusText.textContent = 'AI analyzing PDF layout...';
                    progressBar.style.width = '25%';
                    aiResult = await window.GeminiService.analyzePDF(file, targetRole, onProgress);
                }
            } else {
                const text = await file.text();
                progressBar.style.width = '20%';
                aiResult = await window.GeminiService.analyzeResume(text, targetRole, onProgress);
            }

            if (!aiResult) {
                throw new Error('AI failed to produce a valid analysis. Please try again or check your API key.');
            }

            progressBar.style.width = '95%';
            statusText.textContent = 'Finalizing analysis...';

            const result = {
                skills: aiResult.skills,
                experience: aiResult.experience,
                projects: aiResult.projects,
                score: aiResult.score || 0,
                coverage: aiResult.coverage || 0,
                readiness: aiResult.readiness || 0,
                atsScore: aiResult.atsScore || null,
                _aiGenerated: true
            };

            progressBar.style.width = '100%';
            setTimeout(() => showResults(result), 500);
            return;
        } else {
            throw new Error('AI Service not available. Check your configuration.');
        }

    } catch (error) {
        console.error('[Resume] Analysis error:', error);

        // Determine if we should show a retry option or fallback
        const isTimeout = error.message.includes('timeout') || error.message.includes('taking longer');
        const isRateLimit = error.message.includes('429') || error.message.includes('Rate Limit') || error.message.includes('busy');
        const isNetworkError = error.message.includes('network') || error.message.includes('Connection');

        // Build user-friendly error message
        let errorTitle = 'Analysis Error';
        let errorMessage = error.message;
        let showRetry = true;
        let showFallback = false;

        if (isTimeout) {
            errorTitle = 'Analysis Taking Too Long';
            errorMessage = error.message + '\n\nTips:\n• Try a smaller file\n• Use a text-based resume instead of PDF\n• Retry in a moment';
            showFallback = true;
        } else if (isRateLimit) {
            errorTitle = 'Service Busy';
            errorMessage = error.message;
            showFallback = true;
        } else if (isNetworkError) {
            errorTitle = 'Connection Issue';
            errorMessage = error.message + '\n\nPlease check your internet connection and try again.';
        }

        // Show error dialog with options
        const userChoice = confirm(
            `${errorTitle}\n\n${errorMessage}\n\n` +
            (showFallback ? 'Would you like to use local analysis instead? (Click OK for local analysis, Cancel to retry)' : 'Click OK to retry, Cancel to go back.')
        );

        if (userChoice && showFallback) {
            // Use local fallback analysis
            console.warn('[Resume] Using local analysis fallback');
            statusText.textContent = 'Using local analysis engine...';
            progressBar.style.width = '40%';

            await new Promise(resolve => setTimeout(resolve, 1000));

            const extractedText = await extractTextFromPDF(file);
            const localResult = calculateATSScore(extractedText || "", targetRole);

            progressBar.style.width = '80%';

            const result = {
                skills: {
                    present: localResult.matchedKeywords.slice(0, 10),
                    partial: [],
                    missing: []
                },
                experience: [],
                projects: [],
                score: localResult.overall,
                coverage: localResult.keyword,
                readiness: localResult.overall,
                atsScore: localResult,
                _aiGenerated: false,
                _fallback: true
            };

            progressBar.style.width = '100%';
            setTimeout(() => showResults(result), 500);
        } else if (userChoice && !showFallback) {
            // Retry
            analyzeResume(file);
        } else {
            // Cancel - reset UI
            document.getElementById('upload-section').classList.remove('hidden');
            document.getElementById('analyzing-section').classList.add('hidden');
            progressBar.style.width = '0%';
        }
    }
}


function showResults(data) {
    // Normalize skills data to expected format {present:[], partial:[], missing:[]}
    if (data.skills && Array.isArray(data.skills)) {
        // Skills is a flat array, convert to expected format
        data.skills = { present: data.skills, partial: [], missing: data.missing || [] };
    } else if (!data.skills) {
        data.skills = { present: [], partial: [], missing: [] };
    } else {
        // Ensure all sub-arrays exist
        data.skills.present = data.skills.present || [];
        data.skills.partial = data.skills.partial || [];
        data.skills.missing = data.skills.missing || [];
    }

    // Save to localStorage
    localStorage.setItem('nextStep_resume', JSON.stringify(data));

    // Save to Firestore if user is logged in
    saveResumeToDatabase(data);

    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('analyzing-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');

    // Get user's target role
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const userData = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
    const targetRole = userProfile.targetRole || userData.targetRole || 'sde';

    // Calculate ATS Score
    const presentSkills = data?.skills?.present || [];
    const partialSkills = data?.skills?.partial || [];
    const projects = data?.projects || [];

    const resumeText = `
        Skills: ${[...presentSkills, ...partialSkills].join(', ')}
        Experience: Software Development, Programming, Coding
        Education: Computer Science
        Projects: ${projects.map(p => (p?.name || '') + ' ' + (p?.tech || '')).join(', ')}
    `;
    const atsResult = calculateATSScore(resumeText, targetRole);

    // Update stats
    document.getElementById('resume-score').textContent = (data?.score || 0) + '/100';
    document.getElementById('skill-coverage').textContent = (data?.coverage || 0) + '%';
    document.getElementById('missing-count').textContent = data?.skills?.missing?.length || 0;
    document.getElementById('readiness').textContent = (data?.readiness || 0) + '%';

    // Update ATS Score with animation
    setTimeout(() => {
        document.getElementById('ats-score').textContent = atsResult.overall + '%';
        document.getElementById('ats-progress').style.width = atsResult.overall + '%';
        document.getElementById('keyword-score').textContent = atsResult.keyword + '%';
        document.getElementById('keyword-progress').style.width = atsResult.keyword + '%';
        document.getElementById('experience-score').textContent = atsResult.experience + '%';
        document.getElementById('experience-progress').style.width = atsResult.experience + '%';
        document.getElementById('format-score').textContent = atsResult.format + '%';
        document.getElementById('format-progress').style.width = atsResult.format + '%';

        // Update ATS badge
        const badge = document.getElementById('ats-badge');
        if (atsResult.overall >= 80) {
            badge.textContent = 'Excellent';
            badge.style.background = 'var(--accent-green)';
        } else if (atsResult.overall >= 60) {
            badge.textContent = 'Good';
            badge.style.background = 'var(--accent-primary)';
        } else if (atsResult.overall >= 40) {
            badge.textContent = 'Fair';
            badge.style.background = 'var(--accent-gold)';
        } else {
            badge.textContent = 'Needs Improvement';
            badge.style.background = 'var(--accent-red)';
        }

    }, 300);

    // Skills found
    const foundSkills = [...data.skills.present, ...data.skills.partial];
    document.getElementById('found-count').textContent = foundSkills.length + ' skills';
    // Render Found Skills
    const foundEl = document.getElementById('skills-found');
    foundEl.innerHTML = '';
    (data.skills?.present || []).forEach((skill, index) => {
        const tag = document.createElement('div');
        tag.className = 'skill-tag present animate-in';
        tag.style.animationDelay = `${index * 0.05}s`;
        tag.innerHTML = `<span>✅</span> ${typeof UIUtils !== 'undefined' ? UIUtils.escapeHTML(skill) : skill}`;
        foundEl.appendChild(tag);
    });

    // Render Missing Skills
    const missingEl = document.getElementById('skills-missing');
    missingEl.innerHTML = '';
    const missingSkills = data.skills?.missing || [];
    missingSkills.forEach((skill, index) => {
        const tag = document.createElement('div');
        tag.className = 'skill-tag missing animate-in';
        tag.style.animationDelay = `${((data.skills?.present?.length || 0) + index) * 0.05}s`;
        tag.innerHTML = `<span>❌</span> ${typeof UIUtils !== 'undefined' ? UIUtils.escapeHTML(skill) : skill}`;
        missingEl.appendChild(tag);
    });

    // Suggestions
    const suggestionsEl = document.getElementById('ats-suggestions');
    suggestionsEl.innerHTML = '';
    const suggestions = data?.atsScore?.suggestions || data?.suggestions || [];
    suggestions.forEach((text, index) => {
        const li = document.createElement('li');
        li.className = 'animate-in';
        li.style.animationDelay = `${((data.skills?.present?.length || 0) + missingSkills.length + index) * 0.1}s`;
        li.textContent = text;
        suggestionsEl.appendChild(li);
    });
    // Experience
    document.getElementById('experience-list').innerHTML = (data.experience || []).map((e, index) => `
        <div class="experience-item animate-in" style="animation-delay: ${index * 0.15}s">
            <h4>${e.role || 'Role'}</h4>
            <p>${e.company || 'Company'} • ${e.duration || ''}</p>
        </div>
    `).join('');

    // Projects
    document.getElementById('projects-list').innerHTML = (data.projects || []).map((p, index) => `
        <div class="project-item animate-in" style="animation-delay: ${index * 0.15}s">
            <h4>${p.name || 'Project Name'}</h4>
            <p>${p.tech || ''}</p>
        </div>
    `).join('');
}

// Re-upload resume function
function reUploadResume() {
    if (confirm('Are you sure you want to upload a new resume? This will replace your current analysis.')) {
        // Clear existing resume data
        localStorage.removeItem('nextStep_resume');

        // Hide results and show upload section
        document.getElementById('results-section').classList.add('hidden');
        document.getElementById('upload-section').classList.remove('hidden');

        // Reset file input
        document.getElementById('file-input').value = '';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
// Database Integration
async function saveResumeToDatabase(data) {
    try {
        // Wait for auth to initialize if it hasn't yet
        const user = await new Promise((resolve) => {
            if (auth.currentUser) return resolve(auth.currentUser);
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe();
                resolve(user);
            });
            // Timeout after 3 seconds if auth still hasn't settled
            setTimeout(() => resolve(auth.currentUser), 3000);
        });

        if (!user) {
            console.log('[Database] ⚠️ User not logged in to Firebase Auth, skipping cloud save');
            return;
        }

        console.log('[Database] Saving resume analysis to Firestore (UID: ' + user.uid + ')...');

        // Save to root user document so auth-modern.js can find it on login
        await setDoc(doc(db, "users", user.uid), {
            resumeStatus: 'completed',
            resumeData: data,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Also save to subcollection for backup/history (optional, but good for structure)
        await setDoc(doc(db, "users", user.uid, "analysis", "resume"), {
            ...data,
            updatedAt: serverTimestamp()
        }, { merge: true });

        console.log('[Database] ✅ Resume analysis saved successfully');
        // Invalidate appState cache so next page load re-fetches fresh data
        localStorage.removeItem('nextStep_appState_cache');
    } catch (error) {
        console.error('[Database] ❌ Error saving resume:', error);
    }
}

// Check for pending resume file from onboarding (after analyzeResume is defined)
window.addEventListener('load', async () => {
    // Don't process if already analyzed
    const resumeData = localStorage.getItem('nextStep_resume');
    if (resumeData) {
        return;
    }

    // Check for pending resume file from onboarding
    const pendingFileData = localStorage.getItem('pendingResumeFile');
    if (pendingFileData) {
        try {
            const fileData = JSON.parse(pendingFileData);
            console.log('[Resume] Found pending resume file from onboarding:', fileData.name);

            // Convert base64 back to File object
            const response = await fetch(fileData.data);
            const blob = await response.blob();
            const file = new File([blob], fileData.name, {
                type: fileData.type,
                lastModified: fileData.lastModified
            });

            // Clear the pending file from storage
            localStorage.removeItem('pendingResumeFile');

            // Automatically analyze the file
            console.log('[Resume] Auto-analyzing resume from onboarding...');
            setTimeout(() => analyzeResume(file), 100); // Small delay to ensure DOM is ready
        } catch (error) {
            console.error('[Resume] Error processing pending file:', error);
            // Clear the corrupted data
            localStorage.removeItem('pendingResumeFile');
        }
    }
});
