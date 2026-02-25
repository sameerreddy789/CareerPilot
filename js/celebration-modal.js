/**
 * Celebration Modal Component
 * Shows congratulatory message after first interview completion
 */

function showCelebrationModal(options = {}) {
    // Prevent stacking — only one celebration modal at a time
    if (document.querySelector('.celebration-modal-overlay')) {
        return;
    }

    // Check if already shown today
    const lastShown = localStorage.getItem('celebration_last_shown');
    const today = new Date().toDateString();

    if (lastShown === today && !options.force) {
        return; // Don't spam celebrations
    }

    const defaults = {
        title: '🎉 Congratulations!',
        message: 'You completed your first interview!',
        score: null,
        showConfetti: true,
        onClose: null
    };

    const config = { ...defaults, ...options };

    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'celebration-modal-overlay';
    modal.innerHTML = `
        <div class="celebration-modal">
            <div class="celebration-icon-container">
                <div class="celebration-icon">🎉</div>
            </div>
            <h2 class="celebration-title">${config.title}</h2>
            <p class="celebration-message">${config.message}</p>
            ${config.score !== null ? `
                <div class="celebration-score">
                    <div class="celebration-score-circle">
                        <span class="celebration-score-value">${config.score}</span>
                        <span class="celebration-score-label">Score</span>
                    </div>
                </div>
            ` : ''}
            <div class="celebration-actions">
                <button class="btn-celebration-primary" id="celebration-continue">Continue</button>
                ${config.secondaryAction ? `
                    <button class="btn-celebration-secondary" id="celebration-secondary">${config.secondaryAction}</button>
                ` : ''}
            </div>
            <button class="celebration-close" aria-label="Close">×</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Launch confetti if enabled
    if (config.showConfetti && typeof launchInterviewConfetti === 'function') {
        setTimeout(() => launchInterviewConfetti(), 200);
    }

    // Animate in
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });

    // Event listeners
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            if (config.onClose) config.onClose();
        }, 300);
        localStorage.setItem('celebration_last_shown', today);
    };

    modal.querySelector('#celebration-continue').addEventListener('click', closeModal);
    modal.querySelector('.celebration-close').addEventListener('click', closeModal);
    modal.querySelector('.celebration-modal-overlay').addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (config.secondaryAction && config.onSecondary) {
        modal.querySelector('#celebration-secondary').addEventListener('click', () => {
            config.onSecondary();
            closeModal();
        });
    }
}

// Specific celebration functions
function celebrateFirstInterview(score) {
    showCelebrationModal({
        title: '🎉 Amazing! First Interview Complete!',
        message: 'You\'ve taken the first step towards your career goals. Keep going!',
        score: score,
        showConfetti: true,
        secondaryAction: 'View Roadmap',
        onSecondary: () => {
            window.location.href = '/pages/roadmap.html';
        }
    });
}

function celebrateRoadmapCompletion() {
    showCelebrationModal({
        title: '🎊 Roadmap Complete!',
        message: 'You\'re 100% job ready! Time to apply for your dream role.',
        showConfetti: true,
        secondaryAction: 'Find Jobs',
        onSecondary: () => {
            // Trigger job panel or navigate
            if (typeof showJobsPanel === 'function') {
                showJobsPanel();
            }
        }
    });

    // Launch multiple confetti bursts
    if (typeof celebrateRoadmapComplete === 'function') {
        celebrateRoadmapComplete();
    }
}

function celebrateSkillMastery(skillName) {
    showCelebrationModal({
        title: `✨ ${skillName} Mastered!`,
        message: 'You\'ve shown excellent proficiency in this skill.',
        showConfetti: true,
        force: false
    });
}
