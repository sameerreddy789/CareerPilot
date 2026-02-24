/**
 * Skill Gap Firestore Cache Bridge
 * Loads/saves skill gap analysis to Firestore so it persists across sessions.
 * Exposes window.SkillGapCache for use by skill-gap-page.js (plain script).
 */
import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

window.SkillGapCache = {
    _uid: null,
    _ready: null,

    /** Wait for auth and resolve with uid (or null) */
    init() {
        if (this._ready) return this._ready;
        this._ready = new Promise((resolve) => {
            onAuthStateChanged(auth, (user) => {
                this._uid = user ? user.uid : null;
                resolve(this._uid);
            });
        });
        return this._ready;
    },

    /** Load cached analysis from Firestore for a given role */
    async load(role) {
        const uid = await this.init();
        if (!uid) return null;

        try {
            const cacheKey = role.toLowerCase().replace(/\s+/g, '_');
            const snap = await getDoc(doc(db, "users", uid, "analysis", `skillgap_${cacheKey}`));
            if (!snap.exists()) return null;

            const data = snap.data();
            // Check TTL: 24 hours
            if (data.timestamp) {
                const ts = data.timestamp.toDate ? data.timestamp.toDate().getTime() : data.timestamp;
                if (Date.now() - ts > 24 * 60 * 60 * 1000) return null;
            }
            console.log('[SkillGapCache] ⚡ Loaded from Firestore:', role);
            return data.result;
        } catch (e) {
            console.warn('[SkillGapCache] Load failed:', e);
            return null;
        }
    },

    /** Save analysis result to Firestore */
    async save(role, result) {
        const uid = await this.init();
        if (!uid) return;

        try {
            const cacheKey = role.toLowerCase().replace(/\s+/g, '_');
            await setDoc(doc(db, "users", uid, "analysis", `skillgap_${cacheKey}`), {
                result,
                role,
                timestamp: Date.now(),
                updatedAt: serverTimestamp()
            });
            console.log('[SkillGapCache] 💾 Saved to Firestore:', role);
        } catch (e) {
            console.warn('[SkillGapCache] Save failed:', e);
        }
    }
};
