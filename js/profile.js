        import { auth } from './firebase-config.js';
        import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import ProfileService from './profile-service.js';
        import { appState } from './app-state.js';

        document.addEventListener('DOMContentLoaded', async () => {
            // Wait for appState to fully load from Firestore
            await appState.init();

            onAuthStateChanged(auth, (user) => {
                if (user) {
                    loadProfile(user.uid);
                } else {
                    loadProfile();
                }
                populateRealStats();
                renderHeatmap();
            });
        });

        // Populate stats from real data sources
        function populateRealStats() {
            // --- Interviews Taken ---
            const interviews = appState.interviews || [];
            const interviewCount = interviews.length;
            const elDaily = document.getElementById('stat-daily-time');
            if (elDaily) elDaily.textContent = interviewCount;

            const elInterviewsAlt = document.getElementById('stat-interviews-alt');
            if (elInterviewsAlt) elInterviewsAlt.textContent = interviewCount;

            // --- Roadmap Progress ---
            const completedTopics = appState.roadmapProgress?.completedTopics || [];
            let totalTopics = 0;

            // New format: weeks → topics → modules → subtopics
            if (appState.roadmap?.weeks) {
                appState.roadmap.weeks.forEach(week => {
                    (week.topics || []).forEach(topic => {
                        if (topic.modules && Array.isArray(topic.modules)) {
                            topic.modules.forEach(mod => {
                                totalTopics += (mod.subtopics || []).length;
                            });
                        } else if (topic.items && Array.isArray(topic.items)) {
                            totalTopics += topic.items.length;
                        }
                    });
                });
            }
            // Fallback: use totalTasks if stored
            if (totalTopics === 0 && appState.roadmap?.totalTasks) {
                totalTopics = appState.roadmap.totalTasks;
            }

            const roadmapPct = totalTopics > 0 ? Math.round((completedTopics.length / totalTopics) * 100) : 0;

            const elTotalLearning = document.getElementById('stat-total-learning');
            if (elTotalLearning) elTotalLearning.textContent = `${roadmapPct}%`;

            const elRoadmapPct = document.getElementById('stat-roadmap-pct');
            if (elRoadmapPct) elRoadmapPct.textContent = `${roadmapPct}%`;

            // --- Skills ---
            const skillCount = (appState.resumeData?.skills?.present?.length || 0)
                + (appState.resumeData?.skills?.partial?.length || 0);
            const elSkillsAlt = document.getElementById('stat-skills-alt');
            if (elSkillsAlt) elSkillsAlt.textContent = skillCount;

            // --- Streak from learningActivity ---
            const activity = appState.learningActivity || {};
            const activityDates = Object.keys(activity).sort();
            const totalActive = activityDates.length;

            let currentStreak = 0;
            let maxStreak = 0;
            if (activityDates.length > 0) {
                // Calculate streaks
                let streak = 1;
                for (let i = 1; i < activityDates.length; i++) {
                    const prev = new Date(activityDates[i - 1]);
                    const curr = new Date(activityDates[i]);
                    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
                    if (diffDays === 1) {
                        streak++;
                    } else {
                        maxStreak = Math.max(maxStreak, streak);
                        streak = 1;
                    }
                }
                maxStreak = Math.max(maxStreak, streak);

                // Check if the last date is today or yesterday for current streak
                const lastDate = new Date(activityDates[activityDates.length - 1]);
                const today = new Date();
                const diffToday = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));
                currentStreak = diffToday <= 1 ? streak : 0;
            }

            const elCurrentStreak = document.getElementById('stat-current-streak');
            if (elCurrentStreak) elCurrentStreak.textContent = `Current: ${currentStreak} Days`;

            const elMaxStreak = document.getElementById('stat-max-streak');
            if (elMaxStreak) elMaxStreak.textContent = `Max: ${maxStreak} Days`;

            const elTotalActive = document.getElementById('stat-total-active');
            if (elTotalActive) elTotalActive.textContent = `Total Active: ${totalActive} Days`;
        }

        function renderHeatmap() {
            const graph = document.getElementById('heatmap-graph');
            const tooltip = document.getElementById('heatmap-tooltip');
            if (!graph) return;
            graph.innerHTML = '';

            const activity = appState.learningActivity || {};
            const today = new Date();
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const DAY_LABELS = ['','Mon','','Wed','','Fri',''];

            // Calculate start date: go back to the Sunday that starts the 53rd week ago
            // We want 53 columns of weeks (371 days covers a full year + partial week)
            const endDate = new Date(today);
            const dayOfWeek = endDate.getDay(); // 0=Sun
            const startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - dayOfWeek - (52 * 7));

            // Build a flat array of dates organized as columns (weeks) × rows (days)
            const totalWeeks = 53;
            const weeks = [];
            const cursor = new Date(startDate);
            for (let w = 0; w < totalWeeks; w++) {
                const week = [];
                for (let d = 0; d < 7; d++) {
                    week.push(new Date(cursor));
                    cursor.setDate(cursor.getDate() + 1);
                }
                weeks.push(week);
            }

            // --- Row 1: Month labels ---
            // Corner cell (top-left)
            const corner = document.createElement('div');
            corner.className = 'heatmap-corner';
            graph.appendChild(corner);

            // Month labels across the top
            let lastMonth = -1;
            for (let w = 0; w < totalWeeks; w++) {
                const cell = document.createElement('div');
                cell.className = 'heatmap-month-label';
                const firstDayOfWeek = weeks[w][0];
                const month = firstDayOfWeek.getMonth();
                if (month !== lastMonth && firstDayOfWeek.getDate() <= 7) {
                    cell.textContent = MONTHS[month];
                    lastMonth = month;
                }
                cell.style.gridColumn = w + 2;
                cell.style.gridRow = 1;
                graph.appendChild(cell);
            }

            // --- Rows 2-8: Day labels + day boxes ---
            for (let d = 0; d < 7; d++) {
                // Day label (Mon, Wed, Fri)
                const label = document.createElement('div');
                label.className = 'heatmap-day-label';
                label.textContent = DAY_LABELS[d];
                label.style.gridColumn = 1;
                label.style.gridRow = d + 2;
                graph.appendChild(label);

                // Day boxes for each week
                for (let w = 0; w < totalWeeks; w++) {
                    const date = weeks[w][d];
                    // Don't render future dates
                    if (date > today) {
                        const empty = document.createElement('div');
                        empty.style.gridColumn = w + 2;
                        empty.style.gridRow = d + 2;
                        graph.appendChild(empty);
                        continue;
                    }

                    const dateKey = date.toISOString().split('T')[0];
                    const count = activity[dateKey] || 0;

                    let level = 0;
                    if (count >= 5) level = 4;
                    else if (count >= 3) level = 3;
                    else if (count >= 2) level = 2;
                    else if (count >= 1) level = 1;

                    const box = document.createElement('div');
                    box.className = `day-box l${level}`;
                    box.style.gridColumn = w + 2;
                    box.style.gridRow = d + 2;
                    box.dataset.date = dateKey;
                    box.dataset.count = count;

                    // Tooltip on hover
                    box.addEventListener('mouseenter', (e) => {
                        const c = parseInt(box.dataset.count);
                        const dateStr = new Date(box.dataset.date + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                        });
                        tooltip.textContent = c === 0
                            ? `No activity on ${dateStr}`
                            : `${c} contribution${c > 1 ? 's' : ''} on ${dateStr}`;
                        tooltip.style.display = 'block';
                    });
                    box.addEventListener('mousemove', (e) => {
                        tooltip.style.left = e.clientX + 12 + 'px';
                        tooltip.style.top = e.clientY - 36 + 'px';
                    });
                    box.addEventListener('mouseleave', () => {
                        tooltip.style.display = 'none';
                    });

                    graph.appendChild(box);
                }
            }
        }

        async function loadProfile(uid) {
            let profileData = null;
            if (uid) {
                profileData = await ProfileService.loadProfile(uid);
            }

            // Fallback to local storage if not in DB or no UID
            if (!profileData) {
                const userData = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
                const extraProfile = JSON.parse(localStorage.getItem('nextStep_profile') || '{}');
                profileData = { ...userData, ...extraProfile };
            }

            // Populate UI
            if (profileData.name) {
                const nameParts = profileData.name.split(' ');
                document.getElementById('profile-name').textContent = profileData.name;
                document.getElementById('avatar-initial').textContent = profileData.name.charAt(0).toUpperCase();
                document.getElementById('edit-firstname').value = nameParts[0] || '';
                document.getElementById('edit-lastname').value = nameParts.slice(1).join(' ') || '';
            }

            if (profileData.email) {
                document.getElementById('view-email').textContent = profileData.email;
                document.getElementById('edit-email').value = profileData.email;
            }

            if (profileData.phone) {
                document.getElementById('view-phone').textContent = profileData.phone;
                document.getElementById('edit-phone').value = profileData.phone;
            }

            if (profileData.targetRole) {
                const roleNames = {
                    'sde': 'Software Developer',
                    'frontend': 'Frontend Developer',
                    'backend': 'Backend Developer',
                    'fullstack': 'Full Stack Developer',
                    'data-analyst': 'Data Analyst',
                    'data-scientist': 'Data Scientist',
                    'ml-engineer': 'ML Engineer',
                    'devops': 'DevOps Engineer',
                    'product': 'Product Manager',
                    'designer': 'UI/UX Designer'
                };
                const displayName = roleNames[profileData.targetRole] || profileData.targetRole;
                document.getElementById('profile-role').textContent = displayName;
                document.getElementById('view-role-alt').textContent = displayName;
                document.getElementById('edit-role').value = profileData.targetRole;
            }

            if (profileData.photoURL) {
                const avatarEl = document.getElementById('profile-avatar');
                avatarEl.style.backgroundImage = `url(${profileData.photoURL})`;
                document.getElementById('avatar-initial').style.display = 'none';
                document.getElementById('btn-remove-photo').style.display = 'flex';
            } else {
                document.getElementById('profile-avatar').style.backgroundImage = 'none';
                document.getElementById('avatar-initial').style.display = 'block';
                document.getElementById('btn-remove-photo').style.display = 'none';
            }

            if (profileData.location) {
                document.getElementById('profile-location').textContent = profileData.location;
            }

            // Load social media links
            loadSocialLinks(profileData.socialLinks || {});
        }

        function loadSocialLinks(socialLinks) {
            const platforms = ['linkedin', 'github', 'leetcode'];

            platforms.forEach(platform => {
                const linkData = socialLinks[platform];
                const editInputEl = document.getElementById(`edit-${platform}`);

                // Showcase elements (main content)
                const showcaseEl = document.getElementById(`${platform}-showcase`);
                const actionEl = document.getElementById(`${platform}-action`);

                if (linkData && linkData.url) {
                    // Populate edit field
                    if (editInputEl) editInputEl.value = linkData.url;

                    // Show/hide based on visibility
                    if (linkData.visible !== false) {
                        // Showcase - has link
                        if (showcaseEl) {
                            showcaseEl.href = linkData.url;
                            showcaseEl.classList.remove('empty-state');
                            showcaseEl.removeAttribute('onclick');
                        }
                        if (actionEl) {
                            actionEl.textContent = 'View Profile';
                        }
                    } else {
                        // Showcase - hidden link shows as empty
                        if (showcaseEl) {
                            showcaseEl.href = '#';
                            showcaseEl.classList.add('empty-state');
                            showcaseEl.setAttribute('onclick', 'window.toggleEdit(\'social\'); return false;');
                        }
                        if (actionEl) {
                            actionEl.textContent = '+ Add Profile';
                        }
                    }
                } else {
                    // No URL set
                    if (editInputEl) editInputEl.value = '';

                    // Showcase - empty state
                    if (showcaseEl) {
                        showcaseEl.href = '#';
                        showcaseEl.classList.add('empty-state');
                        showcaseEl.setAttribute('onclick', 'window.toggleEdit(\'social\'); return false;');
                    }
                    if (actionEl) {
                        actionEl.textContent = '+ Add Profile';
                    }
                }
            });

            // Always show showcase card
            const showcaseCard = document.getElementById('social-showcase-card');
            if (showcaseCard) {
                showcaseCard.style.display = 'block';
            }
        }

        window.validateURL = function (url, platform) {
            if (!url || url.trim() === '') {
                return { valid: true, message: '' }; // Empty is okay (optional)
            }

            // Basic URL validation
            try {
                const urlObj = new URL(url);

                // Platform-specific validation
                const platformPatterns = {
                    linkedin: /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/.+/i,
                    github: /^https?:\/\/(www\.)?github\.com\/.+/i,
                    leetcode: /^https?:\/\/(www\.)?leetcode\.com\/.+/i
                };

                if (platformPatterns[platform] && !platformPatterns[platform].test(url)) {
                    return {
                        valid: false,
                        message: `Please enter a valid ${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`
                    };
                }

                return { valid: true, message: '✓ Valid URL' };
            } catch (e) {
                return { valid: false, message: 'Please enter a valid URL' };
            }
        }

        window.toggleSocialVisibility = async function (platform) {
            const user = auth.currentUser;

            // Get current profile data
            let profileData = user ?
                await ProfileService.loadProfile(user.uid) :
                JSON.parse(localStorage.getItem('nextStep_profile') || '{}');

            const socialLinks = profileData.socialLinks || {};
            const linkData = socialLinks[platform] || {};

            // Toggle visibility
            linkData.visible = !(linkData.visible !== false); // Default true, so toggle

            // If no URL, can't toggle visibility
            if (!linkData.url) {
                showNotification(`Please add your ${platform} URL first!`);
                return;
            }

            // Update social links
            socialLinks[platform] = linkData;
            const dataToSave = { socialLinks };

            // Save
            if (user) {
                await ProfileService.saveProfile(user.uid, dataToSave);
            } else {
                const current = JSON.parse(localStorage.getItem('nextStep_profile') || '{}');
                current.socialLinks = socialLinks;
                localStorage.setItem('nextStep_profile', JSON.stringify(current));
                localStorage.setItem('nextStep_user', JSON.stringify(current));
            }

            // Update UI
            loadSocialLinks(socialLinks);
            showNotification(linkData.visible ?
                `${platform} link is now visible` :
                `${platform} link is now hidden`);
        }

        window.removeAvatar = async function (e) {
            e.stopPropagation(); // Prevent triggering the file input
            if (!confirm('Are you sure you want to remove your profile photo?')) return;

            const user = auth.currentUser;
            const data = { photoURL: null };

            if (user) {
                await ProfileService.saveProfile(user.uid, data);
            } else {
                const current = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
                current.photoURL = null;
                localStorage.setItem('nextStep_user', JSON.stringify(current));
                localStorage.setItem('nextStep_profile', JSON.stringify(current));
            }

            // Update UI
            document.getElementById('profile-avatar').style.backgroundImage = 'none';
            document.getElementById('avatar-initial').style.display = 'block';
            document.getElementById('btn-remove-photo').style.display = 'none';
            showNotification('Profile photo removed!');
        }

        window.handleAvatarUpload = function (input) {
            const file = input.files[0];
            if (!file) return;

            // Check file size (limit to 1MB for local storage)
            if (file.size > 1024 * 1024) {
                showNotification('Image too large! Please choose an image under 1MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = async function (e) {
                const photoURL = e.target.result;
                const avatarEl = document.getElementById('profile-avatar');
                avatarEl.style.backgroundImage = `url(${photoURL})`;
                document.getElementById('avatar-initial').style.display = 'none';
                document.getElementById('btn-remove-photo').style.display = 'flex';

                // Save to Firebase/LocalStorage
                const user = auth.currentUser;
                const data = { photoURL: photoURL };

                if (user) {
                    await ProfileService.saveProfile(user.uid, data);
                } else {
                    const current = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
                    const merged = { ...current, ...data };
                    localStorage.setItem('nextStep_user', JSON.stringify(merged));
                    localStorage.setItem('nextStep_profile', JSON.stringify(merged));
                }
                showNotification('Profile photo updated!');
            };
            reader.readAsDataURL(file);
        }

        window.toggleEdit = function (section) {
            const editEl = document.getElementById(`${section}-edit`);
            if (editEl) {
                editEl.classList.toggle('hidden');
                // Scroll to edit section if opening
                if (!editEl.classList.contains('hidden')) {
                    editEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }

        window.savePersonal = async function () {
            const user = auth.currentUser;
            const firstname = document.getElementById('edit-firstname').value;
            const lastname = document.getElementById('edit-lastname').value;
            const email = document.getElementById('edit-email').value;
            const phone = document.getElementById('edit-phone').value;
            const targetRole = document.getElementById('edit-role').value;

            // Validate and collect social media links
            const socialLinks = {};
            const platforms = ['linkedin', 'github', 'leetcode'];
            let hasValidationError = false;

            platforms.forEach(platform => {
                const inputEl = document.getElementById(`edit-${platform}`);
                const validationEl = document.getElementById(`${platform}-validation`);
                const url = inputEl ? inputEl.value.trim() : '';

                if (url) {
                    const validation = validateURL(url, platform);

                    if (!validation.valid) {
                        hasValidationError = true;
                        if (inputEl) inputEl.classList.add('invalid');
                        if (validationEl) {
                            validationEl.textContent = validation.message;
                            validationEl.classList.add('error');
                            validationEl.classList.remove('success');
                        }
                    } else {
                        if (inputEl) {
                            inputEl.classList.remove('invalid');
                            inputEl.classList.add('valid');
                        }
                        if (validationEl) {
                            validationEl.textContent = validation.message;
                            validationEl.classList.add('success');
                            validationEl.classList.remove('error');
                        }
                        socialLinks[platform] = { url, visible: true };
                    }
                } else {
                    // Clear validation styling
                    if (inputEl) {
                        inputEl.classList.remove('invalid', 'valid');
                    }
                    if (validationEl) {
                        validationEl.textContent = '';
                        validationEl.classList.remove('error', 'success');
                    }
                }
            });

            if (hasValidationError) {
                showNotification('Please fix the invalid URLs before saving.');
                return;
            }

            const data = {
                name: `${firstname} ${lastname}`.trim(),
                email: email,
                phone: phone,
                targetRole: targetRole,
                socialLinks: socialLinks
            };

            if (user) {
                await ProfileService.saveProfile(user.uid, data);
            } else {
                const current = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
                const merged = { ...current, ...data };
                localStorage.setItem('nextStep_user', JSON.stringify(merged));
                localStorage.setItem('nextStep_profile', JSON.stringify(merged));
            }

            // Update UI
            document.getElementById('view-email').textContent = email;
            document.getElementById('view-phone').textContent = phone;
            document.getElementById('profile-name').textContent = data.name;
            document.getElementById('avatar-initial').textContent = data.name.charAt(0).toUpperCase();

            const roleNames = {
                'sde': 'Software Developer',
                'frontend': 'Frontend Developer',
                'backend': 'Backend Developer',
                'fullstack': 'Full Stack Developer',
                'data-analyst': 'Data Analyst',
                'data-scientist': 'Data Scientist',
                'ml-engineer': 'ML Engineer',
                'devops': 'DevOps Engineer'
            };
            const roleDisplay = roleNames[targetRole] || targetRole;
            document.getElementById('profile-role').textContent = roleDisplay;
            document.getElementById('view-role-alt').textContent = roleDisplay;

            // Update social links view
            loadSocialLinks(socialLinks);

            window.toggleEdit('personal');
            if (window.UIUtils) window.UIUtils.showToast('Profile updated successfully!', 'success');

            // Refresh sidebar immediately
            if (window.SidebarComponent) window.SidebarComponent.generate();
        }

        window.saveSocialLinks = async function () {
            const user = auth.currentUser;

            // Validate and collect social media links
            const socialLinks = {};
            const platforms = ['linkedin', 'github', 'leetcode'];
            let hasValidationError = false;

            platforms.forEach(platform => {
                const inputEl = document.getElementById(`edit-${platform}`);
                const validationEl = document.getElementById(`${platform}-validation`);
                const url = inputEl ? inputEl.value.trim() : '';

                if (url) {
                    const validation = validateURL(url, platform);

                    if (!validation.valid) {
                        hasValidationError = true;
                        if (inputEl) inputEl.classList.add('invalid');
                        if (validationEl) {
                            validationEl.textContent = validation.message;
                            validationEl.classList.add('error');
                            validationEl.classList.remove('success');
                        }
                    } else {
                        if (inputEl) {
                            inputEl.classList.remove('invalid');
                            inputEl.classList.add('valid');
                        }
                        if (validationEl) {
                            validationEl.textContent = validation.message;
                            validationEl.classList.add('success');
                            validationEl.classList.remove('error');
                        }
                        socialLinks[platform] = { url, visible: true };
                    }
                } else {
                    if (inputEl) inputEl.classList.remove('invalid', 'valid');
                    if (validationEl) {
                        validationEl.textContent = '';
                        validationEl.classList.remove('error', 'success');
                    }
                }
            });

            if (hasValidationError) {
                if (window.UIUtils) window.UIUtils.showToast('Please fix the invalid URLs before saving.', 'warning');
                return;
            }

            const data = { socialLinks };

            if (user) {
                await ProfileService.saveProfile(user.uid, data);
            } else {
                const current = JSON.parse(localStorage.getItem('nextStep_profile') || '{}');
                const merged = { ...current, ...data };
                localStorage.setItem('nextStep_profile', JSON.stringify(merged));
            }

            // Update showcase UI
            loadSocialLinks(socialLinks);

            window.toggleEdit('social');
            if (window.UIUtils) window.UIUtils.showToast('Professional links updated!', 'success');
        }
