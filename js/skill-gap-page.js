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
                const newRole = Math.round.value.trim();
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

    // Initial Analysis
    performAnalysis(initialRole);
});

async function performAnalysis(role, forceRefresh = false) {
    const loading = document.getElementById('loading-overlay');
    const results = document.getElementById('skills-results');

    // Cache Key
    const cacheKey = `nextStep_skillGap_${role.toLowerCase().replace(/\s+/g, '_')}`;

    // Check Cache
    if (!forceRefresh) {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
            try {
                const cached = JSON.parse(cachedRaw);
                // Optional: Check expiry (e.g., 24 hours). For now, we trust it until manual refresh.
                if (cached && cached.timestamp && (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000)) {
                    console.log('[SkillGap] ⚡ Loading from cache:', role);
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

        // Save to Cache
        const cacheData = {
            timestamp: Date.now(),
            data: result
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('[SkillGap] 💾 Saved analysis to cache:', cacheKey);

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
                ${!isPresent ? `<button class="add-btn" onclick="addToRoadmap('${skill.name}')">+ Add to Plan</button>` : ''}
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

function addToRoadmap(skillName) {
    // Mock logic for adding to roadmap
    window.showToast(`Active: Added ${skillName} to your roadmap!`, 'success');
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
