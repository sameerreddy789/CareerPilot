import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { appState } from './app-state.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Global State
    const initialized = await appState.init();

    if (initialized) {
        // 2. Initial Render
        renderDashboard(appState);

        // 3. Subscribe to Updates
        appState.subscribe((state) => {
            renderDashboard(state);
        });
    } else {
        // Handle unauthenticated or offline state if needed
        console.log("App state not initialized (User logged out?)");
    }

    // 4. Initialize Interactive Elements
    // Any legacy UI inits can go here
});

function renderDashboard(state) {
    if (!state.user) return;

    // Store ref for filter function
    window.appStateRef = state;

    renderUserInfo(state.user);
    renderStats(state);
    renderActivityPulse(state);
    renderCharts(state);    // Donut + Readiness
    renderTasks(state);     // Assigned + Personal
    renderActionItems(state);
}

function renderUserInfo(user) {
    const greetingEl = document.getElementById('user-greeting-name');
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar');

    const displayName = user.name || user.email?.split('@')[0] || 'User';

    if (greetingEl) greetingEl.textContent = displayName.split(' ')[0];
    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

    if (roleEl) {
        const roleNames = { 'sde': 'Software Developer', 'frontend': 'Frontend Dev', 'backend': 'Backend Dev' };
        roleEl.textContent = roleNames[user.targetRole] || user.targetRole || 'Developer';
    }
}

function renderStats(state) {
    // Derive Stats from State
    const skillsCovered = (state.resumeData?.skills?.present?.length || 0) + (state.resumeData?.skills?.partial?.length || 0);
    const interviewsTaken = state.interviews.length;

    let avgScore = 0;
    if (interviewsTaken > 0) {
        const total = state.interviews.reduce((sum, i) => sum + (i.finalScore || i.overallScore || 0), 0);
        avgScore = Math.round(total / interviewsTaken);
    }

    // Calculate Streak — use shared calculateStreak function
    const dayStreak = calculateStreak(state);

    // Update stat values
    const elSkills = document.getElementById('skills-covered');
    const elInterviews = document.getElementById('interviews-taken');
    const elAvg = document.getElementById('avg-score');
    const elStreak = document.getElementById('day-streak');
    const elReadiness = document.getElementById('readiness-score-big');

    if (elSkills) elSkills.textContent = skillsCovered;
    if (elInterviews) elInterviews.textContent = interviewsTaken;
    if (elAvg) elAvg.textContent = interviewsTaken > 0 ? `${avgScore}%` : '—';
    if (elStreak) elStreak.textContent = dayStreak;
    if (elReadiness) elReadiness.textContent = `${state.readinessScore || 0}%`;

    // Update contextual change text
    const elSkillsChange = document.getElementById('skills-change');
    const elInterviewsChange = document.getElementById('interviews-change');
    const elAvgChange = document.getElementById('avg-score-change');
    const elStreakChange = document.getElementById('streak-change');

    if (elSkillsChange) {
        if (skillsCovered === 0) {
            elSkillsChange.textContent = 'Upload resume to detect skills';
            elSkillsChange.className = 'stat-card-change';
        } else {
            elSkillsChange.innerHTML = `<span>✓</span> ${skillsCovered} skills detected`;
            elSkillsChange.className = 'stat-card-change positive';
        }
    }

    if (elInterviewsChange) {
        if (interviewsTaken === 0) {
            elInterviewsChange.textContent = 'Take your first interview';
            elInterviewsChange.className = 'stat-card-change';
        } else {
            elInterviewsChange.innerHTML = `<span>✓</span> ${interviewsTaken} session${interviewsTaken > 1 ? 's' : ''} completed`;
            elInterviewsChange.className = 'stat-card-change positive';
        }
    }

    if (elAvgChange) {
        if (interviewsTaken === 0) {
            elAvgChange.textContent = 'No interviews yet';
            elAvgChange.className = 'stat-card-change';
        } else if (avgScore >= 70) {
            elAvgChange.innerHTML = '<span>↑</span> Strong performance';
            elAvgChange.className = 'stat-card-change positive';
        } else if (avgScore >= 40) {
            elAvgChange.textContent = 'Room to improve';
            elAvgChange.className = 'stat-card-change';
        } else {
            elAvgChange.textContent = 'Keep practicing';
            elAvgChange.className = 'stat-card-change';
        }
    }

    if (elStreakChange) {
        if (dayStreak === 0) {
            elStreakChange.textContent = 'Start learning today';
            elStreakChange.className = 'stat-card-change';
        } else if (dayStreak >= 7) {
            elStreakChange.innerHTML = '<span>🔥</span> On fire! Keep going';
            elStreakChange.className = 'stat-card-change positive';
        } else {
            elStreakChange.innerHTML = `<span>↑</span> ${dayStreak} day${dayStreak > 1 ? 's' : ''} in a row`;
            elStreakChange.className = 'stat-card-change positive';
        }
    }
}

function renderCharts(state) {
    let totalTasks = state.roadmap?.totalTasks || 0;

    // Fallback: calculate totalTasks dynamically from weeks data (supports both formats)
    if (totalTasks === 0 && state.roadmap?.weeks) {
        state.roadmap.weeks.forEach(week => {
            (week.topics || []).forEach(topic => {
                if (topic.modules && Array.isArray(topic.modules)) {
                    topic.modules.forEach(mod => { totalTasks += (mod.subtopics || []).length; });
                } else if (topic.items && Array.isArray(topic.items)) {
                    totalTasks += topic.items.length;
                }
            });
        });
    }

    const completedTasks = state.roadmapProgress?.completedTopics?.length || 0;
    const completedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const inProgressProgress = 0;
    const pendingProgress = Math.max(0, 100 - completedProgress);

    drawPieChart(completedProgress, inProgressProgress, pendingProgress, state.readinessScore || 0);
}

// Draw Liquid Glass Pie/Donut Chart — Frosted Glass Ring
function drawPieChart(completedVal = 0, inProgressVal = 0, pendingVal = 0, readinessScore = 0) {
    const total = completedVal + inProgressVal + pendingVal;
    const svg = document.querySelector('.readiness-svg');
    const scoreBig = document.getElementById('readiness-score-big');

    if (scoreBig) scoreBig.textContent = `${readinessScore || 0}%`;
    if (svg) svg.innerHTML = '';
    if (!svg) return;

    const R = 0.82;            // Ring radius
    const STROKE = 0.26;       // Ring thickness
    const GAP = 0.008;         // Small gap between segments

    const segments = [
        {
            val: pendingVal,
            color: '#C8CCD4', colorLight: '#e8ebf08a', colorMid: '#D1D5DB', colorDark: '#9CA3AF',
            glowColor: 'rgba(200, 204, 212, 0.4)',
            label: 'Not Started', legendId: 'legend-pending'
        },
        {
            val: inProgressVal,
            color: '#3B82F6', colorLight: '#93C5FD', colorMid: '#60A5FA', colorDark: '#2563EB',
            glowColor: 'rgba(59, 130, 246, 0.5)',
            label: 'In Progress', legendId: 'legend-progress'
        },
        {
            val: completedVal,
            color: '#10B981', colorLight: '#6EE7B7', colorMid: '#34D399', colorDark: '#059669',
            glowColor: 'rgba(16, 185, 129, 0.5)',
            label: 'Completed', legendId: 'legend-completed'
        }
    ];

    // Update legend
    segments.forEach(seg => {
        const el = document.getElementById(seg.legendId);
        if (el) {
            const p = total > 0 ? Math.round((seg.val / total) * 100) : 0;
            el.textContent = `${p}%`;
        }
    });

    // --- SVG Defs ---
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Outer glow filter (wide soft bloom)
    const outerGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    outerGlow.setAttribute('id', 'ring-outer-glow');
    outerGlow.setAttribute('x', '-80%'); outerGlow.setAttribute('y', '-80%');
    outerGlow.setAttribute('width', '260%'); outerGlow.setAttribute('height', '260%');
    outerGlow.innerHTML = `
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.06" result="blur"/>
        <feFlood flood-color="rgba(200,210,240,0.35)" result="color"/>
        <feComposite in="color" in2="blur" operator="in" result="glow"/>
        <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
    `;
    defs.appendChild(outerGlow);

    // Soft ambient glow filter for the base ring
    const ambientGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    ambientGlow.setAttribute('id', 'ring-ambient');
    ambientGlow.setAttribute('x', '-60%'); ambientGlow.setAttribute('y', '-60%');
    ambientGlow.setAttribute('width', '220%'); ambientGlow.setAttribute('height', '220%');
    ambientGlow.innerHTML = `
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.04" result="blur"/>
        <feFlood flood-color="rgba(220,225,240,0.25)" result="color"/>
        <feComposite in="color" in2="blur" operator="in" result="ambientGlow"/>
        <feMerge>
            <feMergeNode in="ambientGlow"/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
    `;
    defs.appendChild(ambientGlow);

    // Segment hover glow filter
    const segGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    segGlow.setAttribute('id', 'seg-hover-glow');
    segGlow.setAttribute('x', '-60%'); segGlow.setAttribute('y', '-60%');
    segGlow.setAttribute('width', '220%'); segGlow.setAttribute('height', '220%');
    segGlow.innerHTML = `
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.045" result="blur"/>
        <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
    `;
    defs.appendChild(segGlow);

    // Frosted glass ring gradient (luminous white-to-light-blue)
    const ringGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    ringGrad.setAttribute('id', 'frosted-ring-grad');
    ringGrad.setAttribute('x1', '0'); ringGrad.setAttribute('y1', '-1');
    ringGrad.setAttribute('x2', '0'); ringGrad.setAttribute('y2', '1');
    ringGrad.setAttribute('gradientUnits', 'userSpaceOnUse');
    ringGrad.innerHTML = `
        <stop offset="0%" stop-color="#F0F4FF" stop-opacity="0.95"/>
        <stop offset="30%" stop-color="#E2E8F0" stop-opacity="0.88"/>
        <stop offset="60%" stop-color="#D6DCE8" stop-opacity="0.82"/>
        <stop offset="100%" stop-color="#CBD5E1" stop-opacity="0.75"/>
    `;
    defs.appendChild(ringGrad);

    // Per-segment gradients
    segments.forEach((seg, i) => {
        if (seg.val === 0) return;
        const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        grad.setAttribute('id', `seg-grad-${i}`);
        grad.setAttribute('gradientUnits', 'userSpaceOnUse');
        grad.setAttribute('x1', '-1'); grad.setAttribute('y1', '-1');
        grad.setAttribute('x2', '1'); grad.setAttribute('y2', '1');
        grad.innerHTML = `
            <stop offset="0%" stop-color="${seg.colorLight}" stop-opacity="0.95"/>
            <stop offset="45%" stop-color="${seg.colorMid}" stop-opacity="1"/>
            <stop offset="100%" stop-color="${seg.colorDark}" stop-opacity="0.9"/>
        `;
        defs.appendChild(grad);
    });

    svg.appendChild(defs);

    // ===== LAYER 1: Outer soft glow ring (wide, diffuse) =====
    const glowRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glowRing.setAttribute('cx', '0');
    glowRing.setAttribute('cy', '0');
    glowRing.setAttribute('r', String(R));
    glowRing.setAttribute('fill', 'none');
    glowRing.setAttribute('stroke', 'rgba(210, 218, 235, 0.20)');
    glowRing.setAttribute('stroke-width', String(STROKE + 0.08));
    glowRing.setAttribute('filter', 'url(#ring-outer-glow)');
    svg.appendChild(glowRing);

    // ===== LAYER 2: Main frosted glass ring =====
    const mainRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    mainRing.setAttribute('cx', '0');
    mainRing.setAttribute('cy', '0');
    mainRing.setAttribute('r', String(R));
    mainRing.setAttribute('fill', 'none');
    mainRing.setAttribute('stroke', 'url(#frosted-ring-grad)');
    mainRing.setAttribute('stroke-width', String(STROKE));
    mainRing.setAttribute('filter', 'url(#ring-ambient)');
    svg.appendChild(mainRing);

    // ===== LAYER 3: Inner highlight (subtle lighter stroke on inner edge) =====
    const innerHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    innerHighlight.setAttribute('cx', '0');
    innerHighlight.setAttribute('cy', '0');
    innerHighlight.setAttribute('r', String(R));
    innerHighlight.setAttribute('fill', 'none');
    innerHighlight.setAttribute('stroke', 'rgba(255, 255, 255, 0.12)');
    innerHighlight.setAttribute('stroke-width', String(STROKE - 0.06));
    innerHighlight.style.pointerEvents = 'none';
    svg.appendChild(innerHighlight);

    if (total === 0) return;

    // ===== LAYER 4: Colored segments on top =====
    const circumference = 2 * Math.PI * R;
    let cumPercent = 0;

    function getCoordinatesForPercent(percent) {
        const x = R * Math.cos(2 * Math.PI * percent);
        const y = R * Math.sin(2 * Math.PI * percent);
        return [x, y];
    }

    segments.forEach((seg, i) => {
        if (seg.val === 0) return;

        const percent = seg.val / total;
        // small gap
        const adjustedPercent = Math.max(0, percent - GAP);
        const startPercent = cumPercent + (GAP / 2);

        const [startX, startY] = getCoordinatesForPercent(startPercent);
        const [endX, endY] = getCoordinatesForPercent(startPercent + adjustedPercent);

        const largeArcFlag = adjustedPercent > 0.5 ? 1 : 0;
        const pathData = `M ${startX} ${startY} A ${R} ${R} 0 ${largeArcFlag} 1 ${endX} ${endY}`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', `url(#seg-grad-${i})`);
        path.setAttribute('stroke-width', String(STROKE - 0.02));
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('class', 'pie-ring-segment');
        path.style.transition = 'stroke-width 0.4s cubic-bezier(0.23, 1, 0.32, 1), filter 0.4s ease';
        path.style.cursor = 'pointer';

        // Hover: glow bloom
        path.addEventListener('mouseenter', () => {
            showTooltip(seg.label, Math.round(percent * 100));
            path.setAttribute('stroke-width', String(STROKE + 0.04));
            path.setAttribute('filter', 'url(#seg-hover-glow)');
        });
        path.addEventListener('mouseleave', () => {
            hideTooltip();
            path.setAttribute('stroke-width', String(STROKE - 0.02));
            path.removeAttribute('filter');
        });

        svg.appendChild(path);
        cumPercent += percent;
    });
}

function showTooltip(status, percent) {
    const tooltip = document.getElementById('chart-tooltip');
    if (tooltip) {
        const statusEl = tooltip.querySelector('.tooltip-status');
        const percentEl = tooltip.querySelector('.tooltip-percent');
        if (statusEl) statusEl.textContent = status;
        if (percentEl) percentEl.textContent = `${percent}%`;
        tooltip.classList.add('active');
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
    }
}

function hideTooltip() {
    const tooltip = document.getElementById('chart-tooltip');
    if (tooltip) {
        tooltip.classList.remove('active');
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
    }
}


// ====== Momentum System — ring tracker with progressive fills ======
let selectedPulseDay = null;

function renderActivityPulse(state) {
    const timeline = document.getElementById('pulse-timeline');
    const insightEl = document.getElementById('pulse-insight');
    const totalEl = document.getElementById('pulse-total');
    const streakEl = document.getElementById('streak-count');
    const detailPanel = document.getElementById('pulse-detail');
    const crownWrap = document.getElementById('momentum-crown');
    if (!timeline) return;

    timeline.innerHTML = '';
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Monday of this week
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const dailyGoal = 3; // daily target for ring fill
    let totalWeek = 0;
    let bestDay = { name: '', count: 0 };
    let activeDays = 0;
    const weekData = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const isToday = d.toDateString() === today.toDateString();

        // Activity count
        const activityCount = state.learningActivity?.[dateStr] || 0;

        // Tasks completed that day
        let tasksOnDay = [];
        if (state.tasks) {
            state.tasks.forEach(t => {
                if (t.completed && t.completedAt) {
                    const cDate = new Date(t.completedAt).toISOString().split('T')[0];
                    if (cDate === dateStr) tasksOnDay.push(t);
                }
            });
        }

        const dayTotal = Math.max(activityCount, tasksOnDay.length);
        totalWeek += dayTotal;
        if (dayTotal > 0) activeDays++;
        if (dayTotal > bestDay.count) bestDay = { name: dayNames[i], count: dayTotal };

        const fillPercent = Math.min(Math.round((dayTotal / dailyGoal) * 100), 100);

        weekData.push({ dateStr, dayTotal, tasksOnDay, isToday, fillPercent, label: dayNames[i] });

        // Build ring node
        const node = document.createElement('div');
        node.className = 'pulse-day';
        if (isToday) node.classList.add('is-today');
        if (dayTotal > 0) node.classList.add('active');
        if (selectedPulseDay === i) node.classList.add('selected');

        const displayLabel = isToday ? 'Today' : dayNames[i];

        // Progressive gradient fill — green→blue spectrum
        // Glow intensity proportional to fill
        const glowIntensity = fillPercent / 100;
        const glowRadius = Math.round(4 + glowIntensity * 8);
        const glowAlpha = (0.08 + glowIntensity * 0.25).toFixed(2);

        let ringStyle = `--fill: ${fillPercent};`;
        if (fillPercent > 0) {
            ringStyle += ` --ring-start: #10b981; --ring-end: #3b82f6;`;
            ringStyle += ` filter: drop-shadow(0 0 ${glowRadius}px rgba(16, 185, 129, ${glowAlpha}));`;
        }

        node.innerHTML = `
            <div class="pulse-ring" style="${ringStyle}">
                <span class="pulse-count">${dayTotal || '·'}</span>
            </div>
            <span class="pulse-day-label">${displayLabel}</span>
        `;

        node.addEventListener('click', () => {
            if (selectedPulseDay === i) {
                // Toggle off
                selectedPulseDay = null;
                detailPanel.classList.remove('expanded');
                setTimeout(() => { detailPanel.innerHTML = ''; }, 400);
                node.classList.remove('selected');
            } else {
                selectedPulseDay = i;
                expandPulseDetail(weekData[i], detailPanel, state);
                // Update ring visuals
                timeline.querySelectorAll('.pulse-day').forEach((n, idx) => {
                    n.classList.toggle('selected', idx === i);
                });
            }
        });

        timeline.appendChild(node);
    }

    // Smart Microcopy
    if (totalEl) {
        totalEl.textContent = generateMomentumStatus(totalWeek, activeDays);
    }

    // Streak
    if (streakEl) {
        const streak = calculateStreak(state);
        streakEl.textContent = streak;
    }

    // Dynamic insight
    if (insightEl) {
        insightEl.textContent = generateInsight(totalWeek, activeDays, bestDay, state);
    }

    // Consistency Crown
    const consistencyScore = Math.round((activeDays / 7) * 100);
    renderConsistencyCrown(crownWrap, consistencyScore);

    // Weekly Progress Strip
    renderWeeklyProgressStrip(state, totalWeek);

    // Restore expanded detail if a day was selected
    if (selectedPulseDay !== null && weekData[selectedPulseDay]) {
        expandPulseDetail(weekData[selectedPulseDay], detailPanel, state);
    }
}

// ---- Smart Microcopy ----
function generateMomentumStatus(totalWeek, activeDays) {
    if (totalWeek === 0) return 'Momentum not started.';
    if (totalWeek === 1) return 'Streak initiated.';
    if (activeDays >= 6) return 'Peak momentum.';
    if (activeDays >= 5) return 'Deep in flow state.';
    if (activeDays >= 3) return "You're building rhythm.";
    if (activeDays >= 2) return 'Gaining traction.';
    return `${totalWeek} completed.`;
}

// ---- Consistency Crown SVG ----
function renderConsistencyCrown(container, score) {
    if (!container) return;
    const total = 100;
    const fillWidth = (score / total) * 100;

    container.innerHTML = `
        <svg viewBox="0 0 100 6" preserveAspectRatio="none">
            <defs>
                <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.5"/>
                    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.5"/>
                </linearGradient>
            </defs>
            <rect x="0" y="2" width="100" height="2" rx="1" fill="rgba(255,255,255,0.04)"/>
            <rect x="0" y="2" width="${fillWidth}" height="2" rx="1" fill="url(#crownGrad)" style="transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"/>
        </svg>
    `;
}

// ---- Weekly Progress Strip ----
function renderWeeklyProgressStrip(state, totalWeek) {
    const strip = document.getElementById('weekly-progress-strip');
    if (!strip) return;

    // Topics: completed roadmap topics this week
    const completedTopics = state.roadmapProgress?.completedTopics?.length || 0;
    // Use weekly activity-correlated count (tasks done this week)
    const weeklyTopics = totalWeek;

    // Questions: interview questions answered this week
    let weeklyQuestions = 0;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    if (state.interviews && state.interviews.length > 0) {
        state.interviews.forEach(interview => {
            const iDate = new Date(interview.date || interview.createdAt);
            if (iDate >= monday) {
                weeklyQuestions += interview.questionCount || interview.questions?.length || 5;
            }
        });
    }

    // Time Spent: estimate from activities (15 min per activity unit)
    const totalMinutes = totalWeek * 15;
    const timeStr = totalMinutes >= 60
        ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 > 0 ? (totalMinutes % 60) + 'm' : ''}`
        : `${totalMinutes}m`;
    const timeDisplay = totalMinutes === 0 ? '0h' : timeStr.trim();

    strip.innerHTML = `
        <span class="weekly-strip-title">Weekly Progress</span>
        <div class="weekly-strip-stats">
            <div class="weekly-strip-stat">
                <span class="weekly-strip-value">${weeklyTopics}</span>
                <span class="weekly-strip-label">Topics</span>
            </div>
            <div class="weekly-strip-divider"></div>
            <div class="weekly-strip-stat">
                <span class="weekly-strip-value">${weeklyQuestions}</span>
                <span class="weekly-strip-label">Questions</span>
            </div>
            <div class="weekly-strip-divider"></div>
            <div class="weekly-strip-stat">
                <span class="weekly-strip-value">${timeDisplay}</span>
                <span class="weekly-strip-label">Time Spent</span>
            </div>
        </div>
    `;
}

// ---- Enriched Detail Panel ----
function expandPulseDetail(dayData, panel, state) {
    if (!panel) return;

    // Stats
    const tasksCompleted = dayData.tasksOnDay.length;
    const focusTime = dayData.dayTotal > 0 ? `${dayData.dayTotal * 15}m` : '0m';

    // Skills improved
    let skillsTouched = 0;
    if (dayData.tasksOnDay.length > 0) {
        const uniqueSkills = new Set(dayData.tasksOnDay.map(t => t.subtitle || t.category || 'general'));
        skillsTouched = uniqueSkills.size;
    }

    // Consistency delta
    const weekActivity = state?.learningActivity || {};
    const totalActiveDays = Object.keys(weekActivity).filter(d => weekActivity[d] > 0).length;
    const consistencyDelta = totalActiveDays > 0 ? `+${Math.round((totalActiveDays / 7) * 100)}%` : '—';

    const statsHTML = `
        <div class="detail-stats-grid">
            <div class="detail-stat-item">
                <span class="detail-stat-value">${tasksCompleted}</span>
                <span class="detail-stat-label">Tasks Done</span>
            </div>
            <div class="detail-stat-item">
                <span class="detail-stat-value">${focusTime}</span>
                <span class="detail-stat-label">Focus Time</span>
            </div>
            <div class="detail-stat-item">
                <span class="detail-stat-value">${skillsTouched}</span>
                <span class="detail-stat-label">Skills Touched</span>
            </div>
            <div class="detail-stat-item">
                <span class="detail-stat-value">${consistencyDelta}</span>
                <span class="detail-stat-label">Consistency</span>
            </div>
        </div>
    `;

    let itemsHTML = '';
    if (dayData.tasksOnDay.length > 0) {
        itemsHTML = dayData.tasksOnDay.map(t => `
            <div class="detail-item">
                <span class="detail-item-icon">✅</span>
                <span>${typeof UIUtils !== 'undefined' ? UIUtils.escapeHTML(t.title) : t.title}</span>
            </div>
        `).join('');
    } else if (dayData.dayTotal > 0) {
        itemsHTML = `
            <div class="detail-item">
                <span class="detail-item-icon">📊</span>
                <span>${dayData.dayTotal} activit${dayData.dayTotal > 1 ? 'ies' : 'y'} logged</span>
            </div>
        `;
    } else {
        itemsHTML = `<div class="detail-empty">No activity on ${dayData.label}</div>`;
    }

    panel.innerHTML = `
        <div class="detail-header">
            <span class="detail-title">${dayData.isToday ? 'Today' : dayData.label} — ${dayData.dateStr}</span>
            <button class="detail-close" onclick="closePulseDetail()">✕</button>
        </div>
        ${statsHTML}
        <div class="detail-items">${itemsHTML}</div>
    `;

    requestAnimationFrame(() => panel.classList.add('expanded'));
}

window.closePulseDetail = () => {
    selectedPulseDay = null;
    const panel = document.getElementById('pulse-detail');
    if (panel) {
        panel.classList.remove('expanded');
        setTimeout(() => { panel.innerHTML = ''; }, 400);
    }
    document.querySelectorAll('.pulse-day.selected').forEach(n => n.classList.remove('selected'));
};

function calculateStreak(state) {
    const activity = state.learningActivity || {};
    const dates = Object.keys(activity).filter(d => activity[d] > 0).sort().reverse();
    if (dates.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    // Streak must include today or yesterday
    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;

    let streak = 0;
    let checkDate = new Date(dates[0]);

    while (true) {
        const check = checkDate.toISOString().split('T')[0];
        if (activity[check] && activity[check] > 0) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

function generateInsight(totalWeek, activeDays, bestDay, state) {
    if (totalWeek === 0) return 'Start your week — complete a task to light up the rings';

    const insights = [];

    if (activeDays >= 5) {
        insights.push(`On fire — ${activeDays} active days this week`);
    } else if (activeDays >= 3) {
        insights.push(`Solid progress — ${activeDays} active days`);
    } else {
        insights.push(`${activeDays} day${activeDays !== 1 ? 's' : ''} active — keep building momentum`);
    }

    if (bestDay.count >= 3) {
        insights.push(`Best day: ${bestDay.name} with ${bestDay.count} tasks`);
    }

    // Pick one based on day
    const idx = new Date().getDay() % insights.length;
    return insights[idx];
}



// Current filter state
let currentTaskFilter = 'all';

function renderAssignedTasks(state) {
    const systemList = document.getElementById('system-task-list');
    if (!systemList) return;

    if (!state.tasks || state.tasks.length === 0) {
        systemList.innerHTML = '<div class="empty-state-text">No assigned tasks. Generate a roadmap to get started!</div>';
        return;
    }

    // Apply filter
    let filteredTasks = [...state.tasks];
    if (currentTaskFilter === 'pending') {
        filteredTasks = filteredTasks.filter(t => !t.completed);
    } else if (currentTaskFilter === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.completed);
    }

    // Sort: Pending first, then by deadline
    filteredTasks.sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1;
    });

    if (filteredTasks.length === 0) {
        const msg = currentTaskFilter === 'completed'
            ? 'No completed tasks yet. Keep going!'
            : currentTaskFilter === 'pending'
                ? 'All tasks completed! 🎉'
                : 'No tasks found.';
        systemList.innerHTML = `<div class="empty-state-text">${msg}</div>`;
        return;
    }

    systemList.innerHTML = filteredTasks.map(t => {
        const esc = typeof UIUtils !== 'undefined' ? UIUtils.escapeHTML : (s) => s;
        const completedDateHTML = t.completed && t.completedAt
            ? `<div class="task-completed-date">Completed ${esc(formatCompletedDate(t.completedAt))}</div>`
            : t.completed
                ? `<div class="task-completed-date">Completed</div>`
                : '';

        return `
        <div class="task-item ${t.completed ? 'completed' : ''}">
            <div class="task-icon purple">🎯</div>
            <div class="task-content">
                <div class="task-title ${t.completed ? 'completed' : ''}">${esc(t.title)}</div>
                <div class="task-due">${t.subtitle ? esc(t.subtitle) + ' • ' : ''}${esc(t.deadline)}</div>
                ${completedDateHTML}
            </div>
            <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} onclick="toggleTask('${esc(t.id)}', 'system')">
        </div>
    `}).join('');
}

// Format completion date
function formatCompletedDate(dateInput) {
    try {
        const d = new Date(dateInput);
        const now = new Date();
        const diff = now - d;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

// Filter tasks handler (Assigned Tasks only)
window.filterTasks = function (filter) {
    currentTaskFilter = filter;

    // Update active tab — scoped to assigned card
    document.querySelectorAll('#task-filter-tabs .task-filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });

    // Re-render with current app state
    if (window.appStateRef) {
        renderAssignedTasks(window.appStateRef);
    }
};

// Personal tasks filter
let currentPersonalFilter = 'all';

window.filterPersonalTasks = function (filter) {
    currentPersonalFilter = filter;

    // Update active tab — scoped to personal card
    document.querySelectorAll('#personal-filter-tabs .task-filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });

    renderUserTasks();
};

function renderUserTasks() {
    if (!window.SkillStore) return;
    const personalList = document.getElementById('personal-task-list');
    if (!personalList) return;

    const tasks = SkillStore.getTasks();
    let personalTasks = tasks.filter(t => t.type === 'personal');

    // Apply filter
    if (currentPersonalFilter === 'done') {
        personalTasks = personalTasks.filter(t => t.completed);
    }

    if (personalTasks.length === 0) {
        const msg = currentPersonalFilter === 'done'
            ? 'No completed tasks yet.'
            : 'No personal tasks yet. Add one to stay on track.';
        personalList.innerHTML = `<div class="empty-state-text">${msg}</div>`;
        return;
    }

    personalList.innerHTML = personalTasks.map(t => {
        const esc = typeof UIUtils !== 'undefined' ? UIUtils.escapeHTML : (s) => s;
        return `
        <div class="task-item ${t.completed ? 'completed' : ''}">
            <div class="task-icon ${esc(t.color || 'blue')}">${esc(t.icon || '📝')}</div>
            <div class="task-content">
                <div class="task-title ${t.completed ? 'completed' : ''}">${esc(t.title)}</div>
                <div class="task-due">${esc(t.due || 'Personal')}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} onclick="toggleTask('${esc(t.id)}', 'personal')">
                <div class="task-delete-btn" onclick="deleteTask('${esc(t.id)}')">✕</div>
            </div>
        </div>
    `}).join('');
}

// Global wrapper for initial render
function renderTasks(state) {
    if (!state) return;
    renderAssignedTasks(state);
    renderUserTasks(state);
}

// Task & Skill Management
window.toggleTask = async (id, type) => {
    if (type === 'system') {
        // Roadmap Task
        const state = appState;
        const currentCompleted = state.roadmapProgress?.completedTopics || [];
        const isCompleted = currentCompleted.includes(id);

        let newCompleted;
        if (isCompleted) {
            newCompleted = currentCompleted.filter(t => t !== id);
        } else {
            newCompleted = [...currentCompleted, id];
        }

        // Optimistic Update
        state.roadmapProgress.completedTopics = newCompleted;
        state.generateTasksList(); // Regenerate tasks list

        // Record completedAt timestamp on each task
        if (state.tasks) {
            state.tasks.forEach(t => {
                if (t.id === id) {
                    t.completedAt = t.completed ? new Date().toISOString() : null;
                }
            });
        }

        state.calculateReadiness();
        state.logActivity(); // Log activity on completion
        renderDashboard(state); // Re-render immediately

        // Firestore Update
        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const { db } = await import('./firebase-config.js');

            await setDoc(doc(db, "users", state.user.uid, "roadmap", "progress"), {
                completedTopics: newCompleted,
                lastUpdated: new Date()
            }, { merge: true });
            console.log('[Dashboard] Task updated in Firestore');
        } catch (e) {
            console.error('[Dashboard] Failed to update task:', e);
            // Revert on failure? For now, just log.
        }

    } else {
        // Personal Task
        if (window.SkillStore) {
            SkillStore.toggleTask(id);
            renderUserTasks();
        }
    }
};

function renderActionItems(state) {
    if (!state) return;
    const roadmapDone = state.readinessScore >= 90; // Example threshold
    const roadmapCard = document.getElementById('action-card-roadmap');
    if (roadmapCard) roadmapCard.style.display = roadmapDone ? 'none' : 'block';
}




window.DashboardManager = {
    refresh: () => {
        renderStats();
        renderCharts();
        renderTasks();
    }
};

// --- Modal & Task Logic ---
window.openAddModal = (type) => {
    const modal = document.getElementById('add-modal');
    const input = document.getElementById('task-title-input');
    if (modal) modal.classList.add('active');
    if (input) {
        input.value = '';
        input.focus();
    }
};

window.closeModal = () => {
    const modal = document.getElementById('add-modal');
    if (modal) modal.classList.remove('active');
};

window.saveNewTask = () => {
    const titleInput = document.getElementById('task-title-input');
    const title = titleInput.value.trim();

    if (!title) {
        if (typeof UIUtils !== 'undefined' && UIUtils.showToast) {
            UIUtils.showToast('Please enter a task title', 'warning');
        } else {
            alert('Please enter a task title');
        }
        return;
    }

    if (window.SkillStore) {
        SkillStore.addTask({
            title: title,
            due: 'Today',
            icon: '📝',
            color: 'blue',
            type: 'personal' // Explicitly set as personal
        });

        closeModal();
        renderUserTasks();

        if (window.showToast) {
            showToast('Task added successfully!');
        }
    }
};
