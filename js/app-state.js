import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const APP_STATE_CACHE_KEY = 'nextStep_appState_cache';
const APP_STATE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Global State Manager
 * Single source of truth for the application.
 * Syncs with Firestore and notifies listeners.
 */
export const appState = {
    // State Data
    user: null,
    resumeData: null,
    skillGap: null,
    interviews: [],
    roadmap: null, // Structure with weeks/topics
    roadmapProgress: null, // Completion status
    tasks: [],
    readinessScore: 0,
    learningActivity: {}, // { "YYYY-MM-DD": count }

    // Observers
    listeners: [],

    /**
     * Initialize the app state
     * Tries localStorage cache first, falls back to Firestore
     */
    init(forceRefresh = false) {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    this.user = user;

                    // Try cache first (unless force refresh)
                    if (!forceRefresh) {
                        const hydrated = this._hydrateFromCache(user.uid);
                        if (hydrated) {
                            console.log('[AppState] ⚡ Loaded from localStorage cache');
                            this.notifyListeners();
                            resolve(true);
                            return;
                        }
                    }

                    console.log('[AppState] 🔄 Fetching from Firestore...');
                    const success = await this.fetchAllData(user.uid);
                    if (success) {
                        this._saveToCache(user.uid);
                        console.log('[AppState] ✅ State initialized & cached');
                    } else {
                        console.warn('[AppState] ⚠️ State initialized with partial data');
                    }
                    this.notifyListeners();
                    resolve(true);
                } else {
                    console.log('[AppState] ⚠️ No user logged in');
                    this.reset();
                    resolve(false);
                }
            });
        });
    },

    /**
     * Save current state to localStorage with timestamp
     */
    _saveToCache(uid) {
        try {
            const cache = {
                uid,
                timestamp: Date.now(),
                resumeData: this.resumeData,
                skillGap: this.skillGap,
                roadmap: this.roadmap,
                roadmapProgress: this.roadmapProgress,
                interviews: this.interviews,
                learningActivity: this.learningActivity,
                userProfile: this.user ? {
                    displayName: this.user.displayName,
                    email: this.user.email,
                    photoURL: this.user.photoURL,
                    uid: this.user.uid,
                    targetRole: this.user.targetRole,
                    jobReadyTimeline: this.user.jobReadyTimeline,
                    dailyCommitment: this.user.dailyCommitment,
                    onboardingComplete: this.user.onboardingComplete
                } : null
            };
            localStorage.setItem(APP_STATE_CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            console.warn('[AppState] Cache save failed:', e);
        }
    },

    /**
     * Hydrate state from localStorage cache if fresh and same user
     * Returns true if cache was valid and used
     */
    _hydrateFromCache(uid) {
        try {
            const raw = localStorage.getItem(APP_STATE_CACHE_KEY);
            if (!raw) return false;
            const cache = JSON.parse(raw);
            if (!cache || cache.uid !== uid) return false;
            if (Date.now() - cache.timestamp > APP_STATE_CACHE_TTL) return false;

            this.resumeData = cache.resumeData;
            this.skillGap = cache.skillGap;
            this.roadmap = cache.roadmap;
            this.roadmapProgress = cache.roadmapProgress;
            this.interviews = cache.interviews || [];
            this.learningActivity = cache.learningActivity || {};
            if (cache.userProfile) {
                this.user = { ...this.user, ...cache.userProfile };
            }

            this.calculateReadiness();
            this.generateTasksList();
            return true;
        } catch (e) {
            console.warn('[AppState] Cache hydration failed:', e);
            return false;
        }
    },

    /**
     * Invalidate the cache (call after writes like resume upload, interview completion)
     */
    invalidateCache() {
        localStorage.removeItem(APP_STATE_CACHE_KEY);
        console.log('[AppState] 🗑️ Cache invalidated');
    },

    /**
     * Fetch all data from Firestore
     * @param {string} uid 
     */
    async fetchAllData(uid) {
        try {
            // Parallel fetch for valid sub-collections and documents
            const [
                userProfileSnap,
                resumeSnap,
                interviewSummarySnap,
                roadmapSnap,
                skillGapSnap,
                roadmapProgressSnap,
                interviewsSnap
            ] = await Promise.all([
                getDoc(doc(db, "users", uid)),
                getDoc(doc(db, "users", uid, "analysis", "resume")),
                getDoc(doc(db, "users", uid, "analysis", "interview")),
                getDoc(doc(db, "users", uid, "roadmap", "structure")),
                getDoc(doc(db, "users", uid, "roadmap", "current")), // Skill Gap Data
                getDoc(doc(db, "users", uid, "roadmap", "progress")),
                getDocs(collection(db, "users", uid, "interviews"))
            ]);

            // Profile
            if (userProfileSnap.exists()) {
                this.user = { ...this.user, ...userProfileSnap.data() };
            }

            // Resume
            this.resumeData = resumeSnap.exists() ? resumeSnap.data() : null;

            // Interviews
            this.interviews = [];
            if (interviewsSnap && !interviewsSnap.empty) {
                interviewsSnap.forEach(d => this.interviews.push(d.data()));
            }

            // Roadmap
            this.roadmap = roadmapSnap.exists() ? roadmapSnap.data() : null;
            this.skillGap = skillGapSnap.exists() ? skillGapSnap.data().skills : [];
            this.roadmapProgress = roadmapProgressSnap.exists() ? roadmapProgressSnap.data() : { completedTopics: [], activityLog: {} };
            this.learningActivity = this.roadmapProgress.activityLog || {};

            // Calculate Derived State
            this.calculateReadiness();
            this.generateTasksList();

            return true;
        } catch (error) {
            console.error('[AppState] ❌ Error fetching data:', error);
            return false;
        }
    },

    /**
     * Calculate Readiness Score
     * Formula: (Resume * 0.3) + (Interview * 0.4) + (Roadmap * 0.3)
     */
    calculateReadiness() {
        let score = 0;

        // 1. Resume Score (30%)
        if (this.resumeData?.atsScore) {
            score += (this.resumeData.atsScore / 100) * 30;
        }

        // 2. Interview Score (40%)
        if (this.interviews.length > 0) {
            const avgScore = this.interviews.reduce((sum, i) => sum + (i.finalScore || i.overallScore || 0), 0) / this.interviews.length;
            score += (avgScore / 100) * 40;
        }

        // 3. Roadmap Completion (30%)
        if (this.roadmap?.totalTasks && this.roadmapProgress?.completedTopics) {
            const completion = this.roadmapProgress.completedTopics.length / this.roadmap.totalTasks;
            score += Math.min(completion, 1) * 30;
        } else if (this.roadmap?.weeks && this.roadmapProgress?.completedTopics) {
            // Calculate totalTasks dynamically from weeks data (supports both formats)
            let totalTasks = 0;
            this.roadmap.weeks.forEach(week => {
                (week.topics || []).forEach(topic => {
                    if (topic.modules && Array.isArray(topic.modules)) {
                        topic.modules.forEach(mod => { totalTasks += (mod.subtopics || []).length; });
                    } else if (topic.items && Array.isArray(topic.items)) {
                        totalTasks += topic.items.length;
                    }
                });
            });
            if (totalTasks > 0) {
                const completion = this.roadmapProgress.completedTopics.length / totalTasks;
                score += Math.min(completion, 1) * 30;
            }
        }

        this.readinessScore = Math.round(score);
    },

    /**
     * Generate Tasks List
     * Flattens roadmap structure and checks completion status.
     * Supports both legacy (items) and new (modules → subtopics) formats.
     */
    generateTasksList() {
        this.tasks = [];
        if (!this.roadmap?.weeks) return;

        const completedSet = new Set(this.roadmapProgress?.completedTopics || []);

        this.roadmap.weeks.forEach((week, wIdx) => {
            if (week.topics) {
                week.topics.forEach((topic, tIdx) => {
                    const topicId = `${wIdx}-${tIdx}`;

                    // New format: topic.modules[] → subtopics[]
                    if (topic.modules && Array.isArray(topic.modules)) {
                        topic.modules.forEach((mod, mIdx) => {
                            const moduleId = `${topicId}-${mIdx}`;
                            if (mod.subtopics && Array.isArray(mod.subtopics)) {
                                mod.subtopics.forEach(sub => {
                                    const itemId = `${moduleId}-${sub.replace(/\s+/g, '')}`;
                                    this.tasks.push({
                                        id: itemId,
                                        title: sub,
                                        subtitle: `${topic.name} → ${mod.title}`,
                                        deadline: mod.deadline || (week.title.includes('Focus') ? 'This Week' : 'Next Week'),
                                        completed: completedSet.has(itemId),
                                        type: 'roadmap'
                                    });
                                });
                            }
                        });
                    }
                    // Legacy format: topic.items[]
                    else if (topic.items && Array.isArray(topic.items)) {
                        topic.items.forEach(item => {
                            const itemId = `${topicId}-${item.replace(/\s+/g, '')}`;
                            this.tasks.push({
                                id: itemId,
                                title: item,
                                subtitle: topic.name,
                                deadline: topic.deadline || (week.title.includes('Focus') ? 'This Week' : 'Next Week'),
                                completed: completedSet.has(itemId),
                                type: 'roadmap'
                            });
                        });
                    }
                });
            }
        });
    },

    /**
     * Update Learning Activity (Streak)
     */
    async logActivity() {
        if (!this.user?.uid) return;

        const today = new Date().toISOString().split('T')[0];
        const currentCount = this.learningActivity[today] || 0;

        this.learningActivity[today] = currentCount + 1;

        // Optimistic Update
        this.notifyListeners();

        // Firestore Update
        try {
            const roadmapRef = doc(db, "users", this.user.uid, "roadmap", "progress");
            await setDoc(roadmapRef, {
                activityLog: this.learningActivity
            }, { merge: true });
        } catch (e) {
            console.error('[AppState] Failed to log activity:', e);
        }
    },

    /**
     * Observer Pattern
     */
    subscribe(callback) {
        this.listeners.push(callback);
        // Immediate callback with current state
        callback(this);
    },

    notifyListeners() {
        this.listeners.forEach(cb => cb(this));
    },

    reset() {
        this.user = null;
        this.resumeData = null;
        this.skillGap = null;
        this.interviews = [];
        this.roadmap = null;
        this.roadmapProgress = null;
        this.tasks = [];
        this.readinessScore = 0;
        this.learningActivity = {};
        this.invalidateCache();
        this.notifyListeners();
    }
};
