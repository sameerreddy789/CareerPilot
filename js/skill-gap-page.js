// Global Explorer Data
const EXPLORER_ROLES = [
    'Software Developer', 'Frontend Developer', 'Backend Developer',
    'Full Stack Developer', 'Data Analyst', 'Data Scientist',
    'ML Engineer', 'DevOps Engineer', 'Product Manager', 'UI/UX Designer'
];

const COMMON_SKILLS = [
    'JavaScript', 'Python', 'SQL', 'React', 'Node.js',
    'AWS', 'Git', 'Docker', 'API Design', 'System Design'
];

let selectedExplorerRole = '';
let selectedExplorerSkills = new Set();
let radarChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    const userData = JSON.parse(localStorage.getItem('nextStep_user') || '{}') || {};
    const initialRole = userData.targetRole || 'Software Developer';
    const roleInput = document.getElementById('role-input');
    const updateBtn = document.getElementById('update-role-btn');

    if (roleInput) {
        roleInput.value = initialRole;
        selectedExplorerRole = initialRole;

        // Automatic Update (Debounced)
        let debounceTimer;
        const debouncedUpdate = (role) => {
            clearTimeout(debounceTimer);
            if (role) {
                debounceTimer = setTimeout(() => performAnalysis(role), 1200);
            }
        };

        roleInput.addEventListener('input', (e) => debouncedUpdate(e.target.value.trim()));
        roleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(debounceTimer);
                const newRole = roleInput.value.trim();
                if (newRole) performAnalysis(newRole);
            }
        });
    }

    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            const role = roleInput ? roleInput.value.trim() : initialRole;
            if (role) {
                // FORCE REFRESH on manual click
                performAnalysis(role, true);
                if (window.showToast) window.showToast('Refreshing analysis...', 'info');
            }
        });
    }

    // Initialize Explorer Content
    initExplorer();

    // Wait for SkillGapCache module to be ready (module scripts are deferred)
    await new Promise(resolve => {
        if (window.SkillGapCache) return resolve();
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            if (window.SkillGapCache || attempts > 20) {
                clearInterval(check);
                resolve();
            }
        }, 50);
    });

    // Initialize Firestore cache auth
    if (window.SkillGapCache) {
        await window.SkillGapCache.init();
    }

    // Initial Analysis
    performAnalysis(initialRole);
});

async function performAnalysis(role, forceRefresh = false) {
    const loading = document.getElementById('loading-overlay');
    const results = document.getElementById('skills-results');

    // Cache Key (localStorage)
    const cacheKey = `nextStep_skillGap_${role.toLowerCase().replace(/\s+/g, '_')}`;

    // Check Firestore cache first (persistent across sessions)
    if (!forceRefresh && window.SkillGapCache) {
        try {
            const firestoreResult = await window.SkillGapCache.load(role);
            if (firestoreResult) {
                // Also update localStorage for instant access next time
                localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: firestoreResult }));
                renderAnalysisResult(firestoreResult, role);
                return;
            }
        } catch (e) {
            console.warn('[SkillGap] Firestore cache check failed, continuing...', e);
        }
    }

    // Check localStorage cache
    if (!forceRefresh) {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
            try {
                const cached = JSON.parse(cachedRaw);
                if (cached && cached.timestamp && (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000)) {
                    console.log('[SkillGap] ⚡ Loading from localStorage cache:', role);
                    renderAnalysisResult(cached.data, role);
                    return;
                }
            } catch (e) {
                console.warn('[SkillGap] Cache parse failed, fetching fresh.');
            }
        }
    }

    // STRICT LOADING STATE: Content is fully hidden
    if (loading) loading.classList.remove('hidden');
    if (results) results.classList.add('hidden');

    const roleNameEl = document.getElementById('loading-role-name');
    if (roleNameEl) roleNameEl.textContent = role;

    try {
        // Get User Data
        const resumeDataRaw = localStorage.getItem('nextStep_resume');
        const resumeData = (resumeDataRaw && resumeDataRaw !== 'undefined' && resumeDataRaw !== 'null') ? JSON.parse(resumeDataRaw) : { skills: {} };
        const userSkills = dataToSkillArray(resumeData?.skills);

        // Add Interview Skills
        const interviewRaw = localStorage.getItem('nextStep_interview_autosave');
        if (interviewRaw) {
            const interviewData = JSON.parse(interviewRaw);
            const verifiedSkills = interviewData.answers
                ?.filter(a => a.evaluation && a.evaluation.score >= 70)
                ?.map(a => a.category) || [];
            verifiedSkills.forEach(s => { if (!userSkills.includes(s)) userSkills.push(s); });
        }

        // AI Analysis
        const result = await window.GeminiService.analyzeSkillGap(userSkills, role);

        // Save to localStorage
        const cacheData = {
            timestamp: Date.now(),
            data: result
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('[SkillGap] 💾 Saved analysis to cache:', cacheKey);

        // Save to Firestore for persistence across sessions
        if (window.SkillGapCache) {
            window.SkillGapCache.save(role, result);
        }

        // Render UI
        renderAnalysisResult(result, role);

    } catch (error) {
        console.error('[SkillGap] Analysis failed:', error);
        if (loading) loading.classList.add('hidden');
        if (window.showToast) window.showToast('Analysis failed. Please try again.', 'error');
    }
}

function renderAnalysisResult(result, role) {
    const loading = document.getElementById('loading-overlay');
    const results = document.getElementById('skills-results');

    // Get User Skills again for highlighting
    const resumeData = JSON.parse(localStorage.getItem('nextStep_resume') || '{}');
    const userSkills = dataToSkillArray(resumeData?.skills);

    renderCharts(result, userSkills);
    renderSkillColumns(result.missingSkills, userSkills);

    // Reveal Content
    if (loading) loading.classList.add('hidden');
    if (results) results.classList.remove('hidden');

    // Sync Explorer
    selectedExplorerRole = role;
    updateExplorerUI();

    // Show Create Roadmap FAB only if roadmap hasn't been created yet
    const fab = document.getElementById('create-roadmap-fab');
    if (fab) {
        const roadmapCreated = localStorage.getItem('nextStep_roadmapCompleted') === 'true';
        if (roadmapCreated) {
            fab.classList.add('hidden');
        } else {
            fab.classList.remove('hidden');
        }
    }
}

function renderCharts(data, userSkills) {
    // Update Match Score
    const matchScore = data.matchPercentage || 0;
    const circle = document.getElementById('score-circle');
    const pctText = document.getElementById('match-percentage');
    const labelText = document.getElementById('match-label');

    if (circle && pctText && labelText) {
        // Anime the circle
        circle.style.strokeDasharray = `${matchScore}, 100`;
        circle.style.stroke = matchScore > 75 ? '#10b981' : matchScore > 50 ? '#f59e0b' : '#ef4444';
        pctText.textContent = `${matchScore}%`;

        if (matchScore > 80) labelText.innerHTML = "You are <span style='color:#10b981'>Job Ready!</span>";
        else if (matchScore > 50) labelText.innerHTML = "You are <span style='color:#f59e0b'>getting there!</span>";
        else labelText.innerHTML = "Significant <span style='color:#ef4444'>gaps detected.</span>";
    }

    // Render Radar Chart
    const ctx = document.getElementById('skillRadarChart');
    if (!ctx) return;

    if (radarChart) radarChart.destroy();

    // Mock categories for visual flair if AI doesn't provide them perfectly
    const labels = ['Frontend', 'Backend', 'Database', 'DevOps', 'Soft Skills', 'Tools'];
    // Simple logic to distribute score for demo purposes (real logic would segment skills)
    const score = matchScore;

    // Generate pseudo-random distribution based on score to make chart look dynamic but related to score
    const baseData = [
        Math.min(100, Math.max(10, score + 10)),
        Math.min(100, Math.max(10, score - 5)),
        Math.min(100, Math.max(10, score + 5)),
        Math.min(100, Math.max(10, score - 20)),
        Math.min(100, Math.max(10, score + 15)),
        Math.min(100, Math.max(10, score))
    ];

    const datasets = [{
        label: 'Your Profile',
        data: baseData,
        fill: true,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: '#6366f1',
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#6366f1'
    }, {
        label: 'Market Average',
        data: [80, 85, 75, 70, 90, 85],
        fill: true,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        pointBackgroundColor: 'rgba(255, 255, 255, 0.2)',
        pointBorderColor: '#fff',
        borderDash: [5, 5]
    }];

    radarChart = new Chart(ctx, {
        type: 'radar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: '#94a3b8', font: { size: 12 } },
                    ticks: { display: false, max: 100 }
                }
            },
            plugins: {
                legend: { labels: { color: '#cbd5e1' } }
            }
        }
    });
}

function renderSkillColumns(skills, userSkills) {
    // Clear existing
    const containers = {
        'must-have': document.getElementById('must-have-skills'),
        'good-to-have': document.getElementById('good-to-have-skills'),
        'future-proof': document.getElementById('future-proof-skills')
    };

    // Safely clear
    for (const key in containers) {
        if (containers[key]) containers[key].innerHTML = '';
    }

    // Counters
    const counts = { 'must-have': 0, 'good-to-have': 0, 'future-proof': 0 };

    if (!skills) return;

    // Load existing plan
    const plan = JSON.parse(localStorage.getItem('nextStep_roadmapPlan') || '[]');
    const planSet = new Set(plan.map(s => s.toLowerCase()));

    // Auto-add all must-have missing skills to the plan
    const mustHaveMissing = skills.filter(s => {
        const isMustHave = (s.priority || 'must-have') === 'must-have';
        const isPresent = userSkills.some(u => u.toLowerCase() === s.name.toLowerCase());
        return isMustHave && !isPresent;
    });
    mustHaveMissing.forEach(s => {
        if (!planSet.has(s.name.toLowerCase())) {
            plan.push(s.name);
            planSet.add(s.name.toLowerCase());
        }
    });
    localStorage.setItem('nextStep_roadmapPlan', JSON.stringify(plan));
    updateRoadmapGate();

    skills.forEach((skill, index) => {
        const type = skill.priority || 'must-have';
        const container = containers[type] || containers['must-have'];
        if (!container) return;

        counts[type]++;

        // Determine status
        const isPresent = userSkills.some(s => s.toLowerCase() === skill.name.toLowerCase());
        const statusClass = isPresent ? 'present' : 'missing';
        const statusText = isPresent ? 'Have' : 'Missing';
        const icon = getIconForSkill(skill.name);
        const isMustHave = type === 'must-have';
        const isInPlan = planSet.has(skill.name.toLowerCase());

        // Must-have missing skills: show "Added ✓" (auto-added), no button
        // Good-to-have / future-proof missing skills: show "Add to Plan" button or "Added ✓"
        let footerAction = '';
        if (!isPresent) {
            if (isMustHave || isInPlan) {
                footerAction = `<span class="added-badge">Added ✓</span>`;
            } else {
                footerAction = `<button class="add-btn" onclick="addToRoadmap('${skill.name}', this)">+ Add to Plan</button>`;
            }
        }

        const card = document.createElement('div');
        card.className = 'skill-card animate-in';
        card.style.animationDelay = `${index * 0.1}s`;
        card.innerHTML = `
            <div class="skill-card-header">
                <div class="skill-info">
                    <div class="skill-icon">${icon}</div>
                    <div class="skill-name">${skill.name}</div>
                </div>
                <span class="status-pill ${statusClass}">${statusText}</span>
            </div>
            <div class="skill-desc">${skill.reason || 'Required for this role'}</div>
            <div class="skill-footer">
                <small class="text-muted">High Relevance</small>
                ${footerAction}
            </div>
        `;
        container.appendChild(card);
    });

    // Update Counts
    const countMust = document.getElementById('count-must-have');
    const countGood = document.getElementById('count-good-to-have');
    const countFuture = document.getElementById('count-future-proof');

    if (countMust) countMust.textContent = counts['must-have'];
    if (countGood) countGood.textContent = counts['good-to-have'];
    if (countFuture) countFuture.textContent = counts['future-proof'];
}

function addToRoadmap(skillName, btnEl) {
    const plan = JSON.parse(localStorage.getItem('nextStep_roadmapPlan') || '[]');
    if (!plan.some(s => s.toLowerCase() === skillName.toLowerCase())) {
        plan.push(skillName);
        localStorage.setItem('nextStep_roadmapPlan', JSON.stringify(plan));
    }

    // Invalidate roadmap cache so it regenerates with new skills
    localStorage.removeItem('nextStep_appState_cache');
    localStorage.removeItem('nextStep_roadmap');

    // Swap button to "Added ✓"
    if (btnEl) {
        btnEl.outerHTML = `<span class="added-badge">Added ✓</span>`;
    }

    updateRoadmapGate();
    if (window.showToast) window.showToast(`Added ${skillName} to your roadmap plan`, 'success');
}

/** Update roadmap gate: unlock sidebar Roadmap link if plan has skills */
function updateRoadmapGate() {
    const plan = JSON.parse(localStorage.getItem('nextStep_roadmapPlan') || '[]');
    const hasSkills = plan.length > 0;

    // Mark that skill gap was visited and plan exists
    if (hasSkills) {
        localStorage.setItem('nextStep_skillGapCompleted', 'true');
    }

    // Update sidebar Roadmap link if it exists on this page
    const roadmapLink = document.querySelector('.sidebar-link[href="/pages/roadmap.html"]');
    if (roadmapLink) {
        if (hasSkills) {
            roadmapLink.classList.remove('locked');
            roadmapLink.removeAttribute('title');
            roadmapLink.onclick = null;
        } else {
            roadmapLink.classList.add('locked');
            roadmapLink.setAttribute('title', 'Complete Skill Gap Analysis first');
            roadmapLink.onclick = (e) => {
                e.preventDefault();
                if (window.showToast) window.showToast('Add skills to your plan from Skill Gap Analysis first', 'info');
            };
        }
    }

    // Also update the "Resume Roadmap" button in sidebar progress card
    const resumeRoadmapBtn = document.querySelector('.progress-action-btn[href="/pages/roadmap.html"]');
    if (resumeRoadmapBtn) {
        if (hasSkills) {
            resumeRoadmapBtn.classList.remove('locked');
            resumeRoadmapBtn.onclick = null;
        } else {
            resumeRoadmapBtn.classList.add('locked');
            resumeRoadmapBtn.onclick = (e) => {
                e.preventDefault();
                if (window.showToast) window.showToast('Add skills to your plan from Skill Gap Analysis first', 'info');
            };
        }
    }
}

function getIconForSkill(name) {
    // Simple mapping for icons
    const n = name.toLowerCase();
    if (n.includes('react') || n.includes('js') || n.includes('front')) return '⚛️';
    if (n.includes('data') || n.includes('sql')) return '🗄️';
    if (n.includes('cloud') || n.includes('aws')) return '☁️';
    if (n.includes('python') || n.includes('ai')) return '🤖';
    return '⚡';
}

// Explorer Logic (Simplified/Kept)
function initExplorer() {
    const roleList = document.getElementById('role-explorer-list');
    const skillList = document.getElementById('skill-explorer-list');

    if (!roleList || !skillList) return;

    // Build Roles
    roleList.innerHTML = EXPLORER_ROLES.map(role => `
        <div class="role-pill ${role === selectedExplorerRole ? 'active' : ''}" 
             onclick="setExplorerRole('${role}')">${role}</div>
    `).join('');

    // Build Skills
    const resumeData = JSON.parse(localStorage.getItem('nextStep_resume') || '{}');
    const userSkills = dataToSkillArray(resumeData?.skills);
    selectedExplorerSkills = new Set(userSkills);

    skillList.innerHTML = COMMON_SKILLS.map(skill => `
        <div class="skill-toggle-item ${selectedExplorerSkills.has(skill) ? 'active' : ''}" 
             id="toggle-${skill}" onclick="toggleExplorerSkill('${skill}')">
            <div class="info">
                <span class="name">${skill}</span>
            </div>
            <div class="check">✓</div>
        </div>
    `).join('');
}

function dataToSkillArray(skills) {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    return [...(skills.present || []), ...(skills.partial || [])];
}

window.toggleDrawer = function () {
    const drawer = document.getElementById('explorer-drawer');
    const overlay = document.getElementById('explorer-overlay');
    if (drawer) drawer.classList.toggle('active');
    if (overlay) {
        overlay.classList.toggle('hidden');
        setTimeout(() => overlay.classList.toggle('active'), 0);
    }
};

window.setExplorerRole = function (role) {
    selectedExplorerRole = role;
    updateExplorerUI();
};

window.toggleExplorerSkill = function (skill) {
    if (selectedExplorerSkills.has(skill)) {
        selectedExplorerSkills.delete(skill);
    } else {
        selectedExplorerSkills.add(skill);
    }
    updateExplorerUI();
};

function updateExplorerUI() {
    // Update Roles
    document.querySelectorAll('.role-pill').forEach(pill => {
        pill.classList.toggle('active', pill.textContent === selectedExplorerRole);
    });

    // Update Skills
    COMMON_SKILLS.forEach(skill => {
        const item = document.getElementById(`toggle-${skill}`);
        if (item) item.classList.toggle('active', selectedExplorerSkills.has(skill));
    });
}

window.applyExplorerChanges = function () {
    // Update Main Input
    const roleInput = document.getElementById('role-input');
    if (roleInput) roleInput.value = selectedExplorerRole;

    // Update Resume Data
    const resumeData = JSON.parse(localStorage.getItem('nextStep_resume') || '{}');
    if (!resumeData.skills) resumeData.skills = { present: [], partial: [], missing: [] };
    resumeData.skills.present = Array.from(selectedExplorerSkills);
    localStorage.setItem('nextStep_resume', JSON.stringify(resumeData));

    toggleDrawer();
    performAnalysis(selectedExplorerRole);
};
