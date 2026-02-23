/**
 * Roadmap UI Manager - Handles interactive elements of the roadmap page
 * Supports dynamic module system: Section → Topic → Modules → Subtopics
 */

import { auth, db } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { appState } from './app-state.js';

let completedTopics = JSON.parse(localStorage.getItem('nextStep_roadmap_progress') || '[]');
const openWeeks = new Set([0]);
let totalTaskCount = 0;

// Local escape helper (UIUtils.escapeHTML is a global script, not available in modules)
function esc(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
// Escape for use inside onclick="...'value'..." attribute strings
function escAttr(str) {
    return esc(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', async () => {
    await appState.init();

    if (appState.roadmapProgress) {
        completedTopics = appState.roadmapProgress.completedTopics || [];
        localStorage.setItem('nextStep_roadmap_progress', JSON.stringify(completedTopics));
    }

    const userRole = localStorage.getItem('userType') || 'student';
    const isSample = !appState.user;

    if (window.initRoadmap) initRoadmap(userRole, isSample, appState.skillGap);

    appState.subscribe(state => {
        if (state.roadmapProgress && state.roadmapProgress.completedTopics) {
            completedTopics = state.roadmapProgress.completedTopics;
            if (window.updateProgress) window.updateProgress();
        }
    });

    const showModal = localStorage.getItem('nextStep_showNewRoadmapModal');
    const skillFocus = localStorage.getItem('nextStep_newSkillFocus');
    if (showModal === 'true' && skillFocus) {
        localStorage.removeItem('nextStep_showNewRoadmapModal');
        const descEl = document.getElementById('new-roadmap-desc');
        if (descEl) {
            const safeFocus = document.createElement('span');
            safeFocus.textContent = skillFocus;
            descEl.innerHTML = `Your progress has been reset and a new <strong>${safeFocus.innerHTML}</strong> learning roadmap has been created for you!`;
        }
        setTimeout(() => {
            const modal = document.getElementById('new-roadmap-modal');
            if (modal) modal.classList.remove('hidden');
        }, 500);
    }
});


// Platform Link Helpers
window.getLearningLink = function (sectionTitle, module) {
    if (module.searchQuery) return `https://www.youtube.com/results?search_query=${encodeURIComponent(module.searchQuery)}`;
    const moduleName = module.name || module;
    const sTitle = sectionTitle.toLowerCase();
    const mName = moduleName.toLowerCase();
    if (sTitle.includes('aptitude')) return 'https://www.geeksforgeeks.org/aptitude/aptitude-questions-and-answers/';
    if (sTitle.includes('cs fundamentals') || sTitle.includes('computer science')) {
        if (mName.includes('operating system')) return 'https://www.geeksforgeeks.org/operating-systems/';
        if (mName.includes('dbms') || mName.includes('database')) return 'https://www.geeksforgeeks.org/dbms/';
        if (mName.includes('network')) return 'https://www.geeksforgeeks.org/computer-network-tutorials/';
        if (mName.includes('oops') || mName.includes('object')) return 'https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/';
    }
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(mName + ' tutorial')}`;
};

window.getPracticeLink = function (sectionTitle, module) {
    if (module.searchQuery) return `https://leetcode.com/problemset/all/?search=${encodeURIComponent(module.name)}`;
    const moduleName = module.name || module;
    const sTitle = sectionTitle.toLowerCase();
    const mName = moduleName.toLowerCase();
    if (sTitle.includes('aptitude')) return 'https://www.geeksforgeeks.org/aptitude/aptitude-questions-and-answers/';
    if (sTitle.includes('data structures') || sTitle.includes('dsa')) return `https://leetcode.com/problemset/all/?search=${encodeURIComponent(moduleName)}`;
    if (sTitle.includes('cs fundamentals') || sTitle.includes('computer science')) {
        if (mName.includes('operating system')) return 'https://www.geeksforgeeks.org/quizzes/50-operating-system-mcqs-with-answers/';
        if (mName.includes('dbms') || mName.includes('database')) return 'https://www.geeksforgeeks.org/quizzes/50-dbms-mcqs-with-answers/';
        if (mName.includes('network')) return 'https://www.geeksforgeeks.org/quizzes/50-computer-networks-mcqs-with-answers/';
    }
    return `https://www.google.com/search?q=${encodeURIComponent(mName + ' practice problems')}`;
};

window.renderHeatmap = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setDate(today.getDate() - 364);
    const completedDates = JSON.parse(localStorage.getItem('nextStep_activity_log') || '{}');
    let html = `<div class="heatmap-grid" style="display: grid; grid-template-rows: repeat(7, 10px); grid-auto-flow: column; gap: 3px;">`;
    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const count = completedDates[dateStr] || 0;
        let intensity = 'level-0';
        if (count > 0) intensity = 'level-1';
        if (count > 2) intensity = 'level-2';
        if (count > 4) intensity = 'level-3';
        if (count > 6) intensity = 'level-4';
        html += `<div class="heatmap-cell ${intensity}" title="${dateStr}: ${count} tasks" style="width: 10px; height: 10px; border-radius: 2px;"></div>`;
    }
    html += `</div>`;
    const totalTasks = Object.values(completedDates).reduce((a, b) => a + b, 0);
    html += `
    <div class="heatmap-meta" style="margin-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
        <span>${totalTasks} contributions in the last year</span>
        <div style="display: flex; gap: 4px; align-items: center;">
            <span>Less</span>
            <div class="heatmap-cell level-0" style="width: 10px; height: 10px; border-radius: 2px;"></div>
            <div class="heatmap-cell level-1" style="width: 10px; height: 10px; border-radius: 2px;"></div>
            <div class="heatmap-cell level-2" style="width: 10px; height: 10px; border-radius: 2px;"></div>
            <div class="heatmap-cell level-3" style="width: 10px; height: 10px; border-radius: 2px;"></div>
            <div class="heatmap-cell level-4" style="width: 10px; height: 10px; border-radius: 2px;"></div>
            <span>More</span>
        </div>
    </div>
    <style>
        .heatmap-cell.level-0 { background-color: rgba(255,255,255,0.05); }
        .heatmap-cell.level-1 { background-color: rgba(16, 185, 129, 0.2); }
        .heatmap-cell.level-2 { background-color: rgba(16, 185, 129, 0.4); }
        .heatmap-cell.level-3 { background-color: rgba(16, 185, 129, 0.7); }
        .heatmap-cell.level-4 { background-color: #10B981; }
    </style>`;
    container.innerHTML = html;
};

window.openSubtopicLearn = function (topicName) {
    const query = encodeURIComponent(topicName + ' tutorial');
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
};

window.openSubtopicPractice = function (sectionTitle, topicName) {
    const sTitle = sectionTitle.toLowerCase();
    const tName = encodeURIComponent(topicName);
    if (sTitle.includes('data structures') || sTitle.includes('dsa')) {
        window.open(`https://leetcode.com/problemset/all/?search=${tName}`, '_blank');
    } else if (sTitle.includes('aptitude')) {
        window.open(`https://www.geeksforgeeks.org/search?q=${tName}+aptitude`, '_blank');
    } else {
        window.open(`https://www.geeksforgeeks.org/search?q=${tName}`, '_blank');
    }
};


// ============================================================
// MAIN INITIALIZER — Dynamic Module Rendering
// Structure: Section (week) → Topic → Modules → Subtopics
// ============================================================
window.initRoadmap = async function (role, isSample, skillGaps = [], aiData = null, refinementPrompt = null) {
    const container = document.getElementById('roadmap-container');
    if (!container || !window.RoadmapEngine) return;

    let sectionsData = null;

    // 1. Try to load persisted roadmap from AppState first (ONLY if not refining)
    if (!refinementPrompt && appState.roadmap && appState.roadmap.weeks) {
        console.log('[RoadmapUI] 📂 Loading persisted roadmap from AppState');
        sectionsData = appState.roadmap.weeks;

        // Migrate legacy format if needed
        if (window.RoadmapEngine.isLegacyFormat(appState.roadmap)) {
            console.log('[RoadmapUI] 🔄 Detected legacy format, migrating...');
            const migrated = window.RoadmapEngine.migrateLegacyRoadmap(appState.roadmap, role);
            sectionsData = migrated.weeks;
            appState.roadmap = migrated;
        }
    }
    // 2. If no persisted roadmap OR refining, generate using AI
    else if (window.GeminiService && appState.user && !isSample) {
        const actionText = refinementPrompt ? 'Refining Your Roadmap...' : 'Building Your Personalized Roadmap...';
        container.innerHTML = `
            <div class="roadmap-loading">
                <div class="loading-spinner"></div>
                <h3>${actionText}</h3>
                <p>Analyzing your profile and market trends for <strong>${role}</strong>.</p>
            </div>`;

        try {
            console.log('[RoadmapUI] 🚀 Starting roadmap generation with dynamic modules...');
            const resumeData = appState.resumeData || {};
            const userData = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
            const timeline = userData.jobReadyTimeline || '3-6 months';
            const commitment = userData.dailyCommitment || '2 hours/day';

            let marketGaps = [];
            try {
                const mockMarketData = { source: 'LinkedIn/Indeed', date: new Date().toISOString() };
                const marketAnalysis = await window.GeminiService.analyzeMarketSkills(role, mockMarketData, resumeData.skills || []);
                if (marketAnalysis && marketAnalysis.mustHave) {
                    marketGaps = marketAnalysis.mustHave.filter(s => s.status === 'missing');
                }
            } catch (err) {
                console.warn('[RoadmapUI] Market analysis failed, proceeding without it:', err);
            }

            const generatedWeeks = await window.GeminiService.generatePersonalizedRoadmap(
                resumeData, skillGaps, marketGaps, role, timeline, commitment, refinementPrompt
            );

            if (generatedWeeks) {
                sectionsData = window.RoadmapEngine.generateFullRoadmap(role, skillGaps, generatedWeeks);

                // Calculate total tasks from new module structure
                const totalTasks = sectionsData.reduce((acc, w) =>
                    acc + w.topics.reduce((tAcc, topic) =>
                        tAcc + topic.modules.reduce((mAcc, mod) => mAcc + mod.subtopics.length, 0), 0), 0);

                // Save to Firestore
                await setDoc(doc(db, "users", appState.user.uid, "roadmap", "structure"), {
                    weeks: sectionsData,
                    totalTasks: totalTasks,
                    generatedAt: serverTimestamp(),
                    role: role,
                    version: 2 // Mark as new module format
                });

                localStorage.setItem('nextStep_roadmap', JSON.stringify({ weeks: sectionsData }));
                console.log('[RoadmapUI] 💾 Saved roadmap with dynamic modules');
                appState.roadmap = { weeks: sectionsData, totalTasks: totalTasks };
            }
        } catch (e) {
            console.error('[RoadmapUI] ❌ Generation failed:', e);
            sectionsData = window.RoadmapEngine.generateFullRoadmap(role, skillGaps, null);
        }
    }
    // 3. Fallback / Guest Mode
    else {
        sectionsData = isSample
            ? RoadmapEngine.generateSampleRoadmap(role)
            : RoadmapEngine.generateFullRoadmap(role, skillGaps, aiData);
    }

    if (!sectionsData || !Array.isArray(sectionsData)) {
        sectionsData = RoadmapEngine.generateSampleRoadmap(role);
    }

    // ============================================================
    // RENDER: Section → Topic → Modules → Subtopics
    // ============================================================
    container.innerHTML = sectionsData.map((section, sIdx) => {
        const isDSA = section.title.includes('Data Structures') || sIdx === 1;
        const sectionIcon = section.icon || (sIdx === 0 ? '🧠' : (sIdx === 1 ? '⚡' : '💻'));
        let sectionTotalTasks = 0, sectionCompletedTasks = 0;

        const topicsHtml = section.topics.map((topic, tIdx) => {
            const topicId = `${sIdx}-${tIdx}`;
            let topicTotalTasks = 0, topicCompletedTasks = 0;

            // Render each module inside this topic
            const modulesHtml = (topic.modules || []).map((mod, mIdx) => {
                const moduleId = `${topicId}-${mIdx}`;
                const taskIds = mod.subtopics.map(sub => `${moduleId}-${sub.replace(/\s+/g, '')}`);
                topicTotalTasks += taskIds.length;
                const completedInModule = taskIds.filter(id => completedTopics.includes(id)).length;
                topicCompletedTasks += completedInModule;
                const isModuleCompleted = completedInModule === taskIds.length && taskIds.length > 0;

                // YouTube links from module metadata
                const ytQuery = mod.youtubeQueries?.[0] || `${topic.name} ${mod.title} tutorial`;
                const learnLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`;
                const practiceLink = getPracticeLink(section.title, { name: topic.name, searchQuery: topic.searchQuery });

                const subtopicsHtml = mod.subtopics.map(sub => {
                    const itemId = `${moduleId}-${sub.replace(/\s+/g, '')}`;
                    const isItemDone = completedTopics.includes(itemId);
                    const safeSub = esc(sub);
                    const attrSub = escAttr(sub);
                    const attrSectionTitle = escAttr(section.title);
                    return `
                    <div class="subtopic-item">
                        <div class="subtopic-left">
                            <div class="task-checkbox ${isItemDone ? 'checked' : ''}" onclick="event.stopPropagation(); toggleTask('${itemId}', '${moduleId}', this)"></div>
                            <span class="subtopic-name ${isItemDone ? 'completed' : ''}">${safeSub}</span>
                        </div>
                        <div class="subtopic-actions">
                            <button class="icon-btn youtube" onclick="window.openSubtopicLearn('${attrSub}')" title="Watch Tutorial">📺</button>
                            <button class="icon-btn practice" onclick="window.openSubtopicPractice('${attrSectionTitle}', '${attrSub}')" title="Practice">🎯</button>
                        </div>
                    </div>`;
                }).join('');

                // Practice problems section
                const practiceHtml = (mod.practiceProblems && mod.practiceProblems.length > 0) ? `
                    <div class="module-practice">
                        <div class="practice-header">🏋️ Practice Problems</div>
                        <div class="practice-list">
                            ${mod.practiceProblems.map(p => `<span class="practice-tag">${esc(p)}</span>`).join('')}
                        </div>
                    </div>` : '';

                // Deadline badge
                const deadlineHtml = mod.deadline ? `<span class="module-deadline">⏰ ${esc(mod.deadline)}</span>` : '';

                return `
                <div class="module-card ${isModuleCompleted ? 'completed' : ''}" id="module-${moduleId}">
                    <div class="module-header">
                        <div class="module-checkbox ${isModuleCompleted ? 'checked' : ''}" onclick="toggleModule('${moduleId}', [${taskIds.map(id => `'${id}'`).join(',')}], this)"></div>
                        <div class="module-info">
                            <div class="module-title">${esc(mod.title)}</div>
                            <div class="module-meta">${mod.subtopics.length} Subtopics • ${completedInModule}/${taskIds.length} Done ${deadlineHtml}</div>
                        </div>
                    </div>
                    <div class="module-actions">
                        <button class="action-btn learn" onclick="window.open('${learnLink}', '_blank')">📚 Learn</button>
                        <button class="action-btn practice ${isDSA ? 'leetcode' : 'geeksforgeeks'}" onclick="window.open('${practiceLink}', '_blank')">
                            ${isDSA ? '⚡ Practice' : '🧠 Practice'}
                        </button>
                    </div>
                    <div class="module-subtopics">${subtopicsHtml}</div>
                    ${practiceHtml}
                </div>`;
            }).join('');

            sectionTotalTasks += topicTotalTasks;
            sectionCompletedTasks += topicCompletedTasks;

            const coreBadge = topic.isCore ? '<span class="core-badge">⭐ Core</span>' : '';
            const diffBadge = topic.difficulty ? `<span class="diff-badge diff-${esc(topic.difficulty)}">${esc(topic.difficulty)}</span>` : '';

            return `
            <div class="topic-group" id="topic-group-${topicId}">
                <div class="topic-group-header">
                    <div class="topic-group-title">${esc(topic.name)} ${coreBadge} ${diffBadge}</div>
                    <div class="topic-group-meta">${(topic.modules || []).length} Modules • ${topicCompletedTasks}/${topicTotalTasks} Tasks</div>
                </div>
                <div class="module-list">${modulesHtml}</div>
            </div>`;
        }).join('');

        return `
        <div class="topic-card ${openWeeks.has(sIdx) ? 'active' : ''}" id="topic-${sIdx}">
            <div class="topic-header" onclick="toggleTopic(${sIdx})">
                <div class="topic-info">
                    <div class="topic-icon-wrapper">${sectionIcon}</div>
                    <div class="topic-title-group">
                        <div class="topic-title">${esc(section.title)}</div>
                        <div class="topic-subtitle">${section.topics.length} Topics • ${sectionCompletedTasks}/${sectionTotalTasks} Tasks</div>
                    </div>
                </div>
                <div class="topic-toggle-icon">▼</div>
            </div>
            <div class="topic-body">
                ${topicsHtml}
            </div>
        </div>`;
    }).join('');

    totalTaskCount = sectionsData.reduce((acc, sec) =>
        acc + sec.topics.reduce((tAcc, topic) =>
            tAcc + (topic.modules || []).reduce((mAcc, mod) => mAcc + mod.subtopics.length, 0), 0), 0);
    updateProgress();
};


// ============================================================
// TASK TOGGLES
// ============================================================
window.toggleTask = function (taskId, moduleId, checkbox) {
    const taskItem = checkbox.closest('.subtopic-item');
    const topicCard = checkbox.closest('.topic-card');
    const topicName = taskItem.querySelector('.subtopic-name').textContent;
    const isNowCompleted = !completedTopics.includes(taskId);

    if (!isNowCompleted) {
        completedTopics.splice(completedTopics.indexOf(taskId), 1);
        checkbox.classList.remove('checked');
        taskItem.querySelector('.subtopic-name').classList.remove('completed');
    } else {
        completedTopics.push(taskId);
        checkbox.classList.add('checked');
        taskItem.querySelector('.subtopic-name').classList.add('completed');

        const today = new Date().toISOString().split('T')[0];
        const log = JSON.parse(localStorage.getItem('nextStep_activity_log') || '{}');
        log[today] = (log[today] || 0) + 1;
        localStorage.setItem('nextStep_activity_log', JSON.stringify(log));

        // Record activity for heatmap/streak tracking
        if (window.appState && window.appState.logActivity) {
            window.appState.logActivity();
        } else {
            import('./app-state.js').then(m => m.appState.logActivity()).catch(() => {});
        }
    }

    saveRoadmapToDatabase();

    if (window.SkillStore && window.SkillStore.syncTaskByTitle) {
        SkillStore.syncTaskByTitle(topicName, isNowCompleted);
    }

    localStorage.setItem('nextStep_roadmap_progress', JSON.stringify(completedTopics));
    const moduleCard = document.getElementById(`module-${moduleId}`);
    const allSubCks = moduleCard.querySelectorAll('.subtopic-item .task-checkbox');
    const allChecked = Array.from(allSubCks).every(ck => ck.classList.contains('checked'));
    const moduleCk = moduleCard.querySelector('.module-header .module-checkbox');
    if (allChecked) { moduleCk.classList.add('checked'); moduleCard.classList.add('completed'); }
    else { moduleCk.classList.remove('checked'); moduleCard.classList.remove('completed'); }
    updateModuleMeta(moduleCard, allSubCks.length);
    updateTaskCountsInPlace(topicCard);
    updateProgress();
};

window.toggleModule = function (moduleId, taskIds, checkbox) {
    const moduleCard = document.getElementById(`module-${moduleId}`);
    const topicCard = checkbox.closest('.topic-card');
    const isChecked = checkbox.classList.contains('checked');
    const subtopicElements = moduleCard.querySelectorAll('.subtopic-item');

    if (isChecked) {
        checkbox.classList.remove('checked');
        moduleCard.classList.remove('completed');
        taskIds.forEach(id => { const idx = completedTopics.indexOf(id); if (idx > -1) completedTopics.splice(idx, 1); });
        subtopicElements.forEach(el => {
            el.querySelector('.task-checkbox').classList.remove('checked');
            el.querySelector('.subtopic-name').classList.remove('completed');
            if (window.SkillStore && window.SkillStore.syncTaskByTitle) {
                SkillStore.syncTaskByTitle(el.querySelector('.subtopic-name').textContent, false);
            }
        });
    } else {
        checkbox.classList.add('checked');
        moduleCard.classList.add('completed');
        taskIds.forEach(id => { if (!completedTopics.includes(id)) completedTopics.push(id); });
        subtopicElements.forEach(el => {
            el.querySelector('.task-checkbox').classList.add('checked');
            el.querySelector('.subtopic-name').classList.add('completed');
            if (window.SkillStore && window.SkillStore.syncTaskByTitle) {
                SkillStore.syncTaskByTitle(el.querySelector('.subtopic-name').textContent, true);
            }
        });

        // Record activity for each newly completed task
        const newCount = taskIds.length;
        if (newCount > 0) {
            const today = new Date().toISOString().split('T')[0];
            const log = JSON.parse(localStorage.getItem('nextStep_activity_log') || '{}');
            log[today] = (log[today] || 0) + newCount;
            localStorage.setItem('nextStep_activity_log', JSON.stringify(log));

            const logOnce = (state) => {
                for (let i = 0; i < newCount; i++) state.logActivity();
            };
            if (window.appState && window.appState.logActivity) {
                logOnce(window.appState);
            } else {
                import('./app-state.js').then(m => logOnce(m.appState)).catch(() => {});
            }
        }
    }

    saveRoadmapToDatabase();
    localStorage.setItem('nextStep_roadmap_progress', JSON.stringify(completedTopics));
    updateModuleMeta(moduleCard, subtopicElements.length);
    updateTaskCountsInPlace(topicCard);
    updateProgress();
};

function updateModuleMeta(moduleCard, total) {
    const completed = moduleCard.querySelectorAll('.subtopic-item .task-checkbox.checked').length;
    const meta = moduleCard.querySelector('.module-meta');
    if (meta) {
        const parts = meta.innerText.split('•');
        meta.innerText = `${parts[0].trim()} • ${completed}/${total} Done${parts.length > 2 ? ' • ' + parts.slice(2).join('•').trim() : ''}`;
    }
}

function updateTaskCountsInPlace(topicCard) {
    if (!topicCard) return;
    let secTotal = 0, secDone = 0;
    topicCard.querySelectorAll('.module-meta').forEach(meta => {
        const match = meta.innerText.match(/(\d+)\/(\d+) Done/);
        if (match) { secDone += parseInt(match[1]); secTotal += parseInt(match[2]); }
    });
    const subtitle = topicCard.querySelector('.topic-subtitle');
    if (subtitle) {
        const parts = subtitle.textContent.split('•');
        subtitle.textContent = `${parts[0].trim()} • ${secDone}/${secTotal} Tasks`;
    }
    // Also update topic-group-meta
    topicCard.querySelectorAll('.topic-group-meta').forEach(meta => {
        const modules = meta.closest('.topic-group').querySelectorAll('.module-meta');
        let gTotal = 0, gDone = 0;
        modules.forEach(m => {
            const match = m.innerText.match(/(\d+)\/(\d+) Done/);
            if (match) { gDone += parseInt(match[1]); gTotal += parseInt(match[2]); }
        });
        const parts = meta.textContent.split('•');
        meta.textContent = `${parts[0].trim()} • ${gDone}/${gTotal} Tasks`;
    });
}

window.toggleTopic = function (idx) {
    document.querySelectorAll('.topic-card').forEach((card) => {
        const cardIdx = parseInt(card.id.split('-')[1]);
        if (cardIdx !== idx) { card.classList.remove('active'); openWeeks.delete(cardIdx); }
    });
    const card = document.getElementById(`topic-${idx}`);
    if (card) {
        if (card.classList.contains('active')) { card.classList.remove('active'); openWeeks.delete(idx); }
        else { card.classList.add('active'); openWeeks.add(idx); }
    }
};

window.updateProgress = function () {
    const total = totalTaskCount > 0 ? totalTaskCount : 1;
    const percentage = Math.min(100, Math.round((completedTopics.length / total) * 100));
    const progressVal = document.getElementById('overall-progress-val');
    const progressBar = document.getElementById('overall-progress-bar');
    if (progressVal) progressVal.textContent = percentage + '%';
    if (progressBar) progressBar.style.width = percentage + '%';

    const topicCards = document.querySelectorAll('.topic-card');
    let completedSections = 0;
    topicCards.forEach(card => {
        const modules = card.querySelectorAll('.module-card');
        if (modules.length > 0 && Array.from(modules).every(m => m.classList.contains('completed'))) completedSections++;
    });
    const weeksLabel = document.querySelector('.overview-stat .overview-label');
    if (weeksLabel && weeksLabel.textContent.includes('Weeks')) weeksLabel.textContent = 'Sections Complete';
    const weeksVal = document.getElementById('weeks-complete-val');
    if (weeksVal) weeksVal.textContent = `${completedSections}/${topicCards.length}`;
    if (percentage === 100 && completedTopics.length > 0 && completedTopics.length === totalTaskCount) triggerCelebration();
};

function triggerCelebration() {
    const modal = document.getElementById('celebration-modal');
    if (modal && modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        document.getElementById('confetti-canvas').style.display = 'block';
        const duration = 3000, end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
            if (Date.now() < end) requestAnimationFrame(frame);
            else document.getElementById('confetti-canvas').style.display = 'none';
        }());
    }
}

window.showJobLinks = () => { document.getElementById('job-panel').classList.remove('hidden'); document.getElementById('skills-panel').classList.add('hidden'); };
window.showRelatedSkills = () => { document.getElementById('skills-panel').classList.remove('hidden'); document.getElementById('job-panel').classList.add('hidden'); };
window.closeCelebrationModal = () => { ['celebration-modal', 'job-panel', 'skills-panel'].forEach(id => document.getElementById(id).classList.add('hidden')); };
window.startNewRoadmap = skill => { localStorage.removeItem('nextStep_roadmap_progress'); localStorage.setItem('nextStep_newSkillFocus', skill); localStorage.setItem('nextStep_showNewRoadmapModal', 'true'); closeCelebrationModal(); window.location.reload(); };
window.closeNewRoadmapModal = () => document.getElementById('new-roadmap-modal').classList.add('hidden');

// ============================================================
// DATABASE INTEGRATION
// ============================================================
async function saveRoadmapToDatabase() {
    try {
        const user = appState.user;
        if (!user) {
            console.log('[Roadmap] ⚠️ User not logged in, skipping cloud save');
            return;
        }
        const localLog = JSON.parse(localStorage.getItem('nextStep_activity_log') || '{}');
        const progressData = {
            completedTopics: completedTopics,
            activityLog: localLog,
            lastUpdated: serverTimestamp()
        };
        console.log('[Roadmap] Saving progress to Firestore...');
        await setDoc(doc(db, "users", user.uid, "roadmap", "progress"), progressData, { merge: true });
        appState.roadmapProgress = {
            completedTopics: completedTopics,
            activityLog: localLog,
            lastUpdated: new Date()
        };
        appState.learningActivity = localLog;
        appState.calculateReadiness();
        appState.notifyListeners();
        console.log('[Roadmap] ✅ Progress saved');
    } catch (error) {
        console.error('[Roadmap] ❌ Error saving progress:', error);
    }
}