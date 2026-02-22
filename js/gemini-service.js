/**
 * Gemini AI Service
 * Handles AI-powered resume analysis, interview questions, and feedback
 */

const GeminiService = {
    apiKeys: [],
    currentKeyIndex: 0,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',

    /**
     * Initialize the service with API keys
     */
    init(apiKey) {
        // Collect all available Gemini keys from environment
        const keys = [];
        if (apiKey) keys.push(apiKey);

        // Check for indexed keys (VITE_GEMINI_API_KEY_1 to 4)
        for (let i = 1; i <= 4; i++) {
            const key = window.ENV?.[`VITE_GEMINI_API_KEY_${i}`];
            if (key && !key.includes('YOUR_GEMINI_API_KEY')) {
                keys.push(key);
            }
        }

        // Fallback to legacy single key if no indexed keys found
        if (keys.length === 0 && window.ENV?.VITE_GEMINI_API_KEY) {
            keys.push(window.ENV.VITE_GEMINI_API_KEY);
        }

        this.apiKeys = [...new Set(keys)]; // Unique keys
        this.currentKeyIndex = 0;
        this._triedKeysThisRequest = new Set(); // Track tried keys per request cycle

        if (this.apiKeys.length > 0) {
            console.log(`[GeminiService] ✅ Initialized with ${this.apiKeys.length} API key(s)`);
        } else {
            console.warn('[GeminiService] ⚠️ No API keys found. Using demo data.');
        }
    },

    /**
     * Check if service is available
     */
    isAvailable() {
        return this.apiKeys && this.apiKeys.length > 0;
    },

    /**
     * Make API request to Gemini with optional file data and retry/rotation logic
     * @param {string} prompt - The prompt to send to Gemini
     * @param {object|null} fileData - Optional file data {mimeType, base64}
     * @param {number} retries - Number of retry attempts
     * @param {number} delay - Initial delay between retries (exponential backoff)
     * @param {function} onProgress - Optional progress callback
     */
    async _request(prompt, fileData = null, retries = 3, delay = 1000, onProgress = null) {
        if (this.apiKeys.length === 0) {
            throw new Error('AI service is not configured. Please check your API keys.');
        }

        const currentApiKey = this.apiKeys[this.currentKeyIndex];

        // Progress tracking
        if (onProgress) {
            onProgress({ stage: 'starting', message: 'Connecting to AI service...' });
        }

        try {
            // Build parts array
            const parts = [];

            // Add file data if provided (for PDF analysis)
            if (fileData) {
                parts.push({
                    inline_data: {
                        mime_type: fileData.mimeType,
                        data: fileData.base64
                    }
                });
            }

            // Add text prompt
            parts.push({ text: prompt });

            if (onProgress) {
                onProgress({ stage: 'uploading', message: fileData ? 'Uploading file to AI...' : 'Sending request...' });
            }

            const response = await fetch(`${this.baseUrl}?key=${currentApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192,
                    }
                })
            });

            if (onProgress) {
                onProgress({ stage: 'processing', message: 'AI is analyzing...' });
            }

            if (!response.ok) {
                const error = await response.json();

                // Handle rate limits (429) & Service Unavailable (503) with Key Rotation 🔄
                if (response.status === 429 || response.status === 503) {
                    if (this.apiKeys.length > 1) {
                        // Track tried keys to prevent infinite rotation
                        if (!this._triedKeysThisRequest) this._triedKeysThisRequest = new Set();
                        this._triedKeysThisRequest.add(this.currentKeyIndex);
                        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

                        if (!this._triedKeysThisRequest.has(this.currentKeyIndex)) {
                            console.warn(`[GeminiService] 🔄 ${response.status} Error on Key ${currentApiKey.substring(0, 8)}... Switching to index ${this.currentKeyIndex}`);
                            return this._request(prompt, fileData, retries, delay, onProgress);
                        }
                        // All keys tried — clear tracker and fall through to retry with backoff
                        this._triedKeysThisRequest.clear();
                    }
                    if (retries > 0) {
                        console.warn(`[GeminiService] ⏳ ${response.status} Error. Retrying in ${delay / 1000}s... (${retries} retries left)`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return this._request(prompt, fileData, retries - 1, delay * 2, onProgress);
                    }
                    throw new Error('AI service is currently busy or overloaded. Please try again in a few moments.');
                }

                // User-friendly error messages
                let userMessage = 'AI service error. Please try again.';
                if (error.error?.message) {
                    if (error.error.message.includes('API key')) {
                        userMessage = 'API key issue detected. Please check your configuration.';
                    } else if (error.error.message.includes('quota')) {
                        userMessage = 'AI service quota exceeded. Please try again later.';
                    } else if (error.error.message.includes('invalid')) {
                        userMessage = 'Invalid request. Please try again with a different file.';
                    } else if (response.status === 503) {
                        userMessage = 'The AI service is temporarily unavailable. Please try again shortly.';
                    }
                }
                throw new Error(userMessage);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            if (onProgress) {
                onProgress({ stage: 'complete', message: 'Analysis complete!' });
            }

            return text;
        } catch (error) {
            // Handle network errors or rate limit strings
            if (error.message.includes('Resource has been exhausted') ||
                error.message.includes('429') ||
                error.message.includes('503') ||
                error.message.includes('Service Unavailable') ||
                error.message.includes('Overloaded')) {

                if (this.apiKeys.length > 1) {
                    if (!this._triedKeysThisRequest) this._triedKeysThisRequest = new Set();
                    this._triedKeysThisRequest.add(this.currentKeyIndex);
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

                    if (!this._triedKeysThisRequest.has(this.currentKeyIndex)) {
                        console.warn(`[GeminiService] 🔄 Retrying with next key after error...`);
                        return this._request(prompt, fileData, retries, delay, onProgress);
                    }
                    // All keys exhausted — clear tracker and fall through
                    this._triedKeysThisRequest.clear();
                }
            }

            if (error.message.includes('Rate Limit') && retries > 0) {
                // Exponential backoff with jitter
                const jitter = Math.random() * 1000; // 0-1s random jitter
                const backoffDelay = delay + jitter;
                console.warn(`[GeminiService] ⏳ Network error/Rate limit. Retrying in ${Math.round(backoffDelay / 1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                return this._request(prompt, fileData, retries - 1, delay * 2, onProgress);
            }
            console.error('[GeminiService] ❌ API Error:', error);
            throw error;
        }
    },

    /**
     * Parse JSON from Gemini response (handles markdown code blocks and partial structures)
     */
    _parseJSON(text) {
        try {
            let cleaned = text.trim();

            // Remove markdown code blocks
            cleaned = cleaned.replace(/^```json\s*/g, '').replace(/```$/g, '').trim();
            cleaned = cleaned.replace(/^```\s*/g, '').replace(/```$/g, '').trim();

            // Fix common AI JSON mistakes
            // 1. Fix unescaped quotes in descriptions
            cleaned = cleaned.replace(/"desc":\s*"([^"]*)"([^"]*)"([^"]*)",/g, (match, p1, p2, p3) => {
                return `"desc": "${p1}\\"${p2}\\"${p3}",`;
            });

            // 2. Remove trailing commas before closing braces/brackets
            cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

            // 3. Try to extract JSON if there's extra text
            const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                cleaned = jsonMatch[0];
            }

            const parsed = JSON.parse(cleaned);

            // If it's an array (like for questions), return it directly
            if (Array.isArray(parsed)) return parsed;

            // If it's an object, ensure it's not null and has minimum fields for safety
            if (parsed && typeof parsed === 'object') {
                // If it looks like a resume analysis, add defaults
                if (parsed.skills || parsed.score) {
                    return {
                        skills: {
                            present: Array.isArray(parsed.skills?.present) ? parsed.skills.present : [],
                            partial: Array.isArray(parsed.skills?.partial) ? parsed.skills.partial : [],
                            missing: Array.isArray(parsed.skills?.missing) ? parsed.skills.missing : []
                        },
                        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
                        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
                        score: typeof parsed.score === 'number' ? parsed.score : 0,
                        coverage: typeof parsed.coverage === 'number' ? parsed.coverage : 0,
                        readiness: typeof parsed.readiness === 'number' ? parsed.readiness : 0,
                        ...parsed
                    };
                }
                return parsed;
            }
            return null;
        } catch (e) {
            console.error('[GeminiService] Failed to parse JSON:', e.message);
            console.log('[GeminiService] Problematic text:', text.substring(0, 500));

            // Last resort: try to extract just the structure without descriptions
            try {
                // Try to find and extract valid JSON structure by removing description fields
                const structureMatch = text.match(/\{[\s\S]*?"mustHave"[\s\S]*?"goodToHave"[\s\S]*?"futureProof"[\s\S]*?\}/);
                if (structureMatch) {
                    // Simplified parsing: just extract skill names
                    const mustHaveMatch = text.match(/"mustHave":\s*\[([\s\S]*?)\]/);
                    const goodToHaveMatch = text.match(/"goodToHave":\s*\[([\s\S]*?)\]/);
                    const futureProofMatch = text.match(/"futureProof":\s*\[([\s\S]*?)\]/);

                    if (mustHaveMatch || goodToHaveMatch || futureProofMatch) {
                        console.warn('[GeminiService] Using simplified structure extraction');
                        return {
                            mustHave: this._extractSimpleSkills(mustHaveMatch?.[1] || ''),
                            goodToHave: this._extractSimpleSkills(goodToHaveMatch?.[1] || ''),
                            futureProof: this._extractSimpleSkills(futureProofMatch?.[1] || '')
                        };
                    }
                }
            } catch (fallbackError) {
                console.error('[GeminiService] Fallback parsing also failed:', fallbackError);
            }

            return null;
        }
    },

    /**
     * Extract basic skill structure from malformed JSON
     */
    _extractSimpleSkills(jsonText) {
        const skills = [];
        const nameMatches = jsonText.matchAll(/"name":\s*"([^"]+)"/g);
        const statusMatches = jsonText.matchAll(/"status":\s*"([^"]+)"/g);
        const priorityMatches = jsonText.matchAll(/"priority":\s*"([^"]+)"/g);

        const names = Array.from(nameMatches, m => m[1]);
        const statuses = Array.from(statusMatches, m => m[1]);
        const priorities = Array.from(priorityMatches, m => m[1]);

        for (let i = 0; i < names.length; i++) {
            skills.push({
                name: names[i],
                status: statuses[i] || 'missing',
                priority: priorities[i] || 'Medium',
                desc: 'Market-relevant skill'
            });
        }

        return skills;
    },

    /**
     * Convert File to base64
     */
    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Analyze PDF file directly using Gemini's multimodal capability
     */
    async analyzePDF(file, targetRole = 'sde', onProgress = null) {
        console.log('[GeminiService] 📄 Analyzing PDF:', file.name);

        const base64 = await this._fileToBase64(file);

        const prompt = `You are an expert resume analyzer. Analyze this PDF resume for a ${targetRole} role.

Respond with ONLY a JSON object (no markdown):
{
    "skills": {
        "present": ["skill1", "skill2"],
        "partial": ["skill3"],
        "missing": ["skill4", "skill5"]
    },
    "experience": [
        {"title": "Job Title", "company": "Company", "duration": "X years"}
    ],
    "projects": [
        {"name": "Project Name", "tech": "Technologies"}
    ],
    "score": 75,
    "coverage": 65,
    "readiness": 60,
    "atsScore": {
        "overall": 72,
        "keyword": 68,
        "experience": 75,
        "format": 80,
        "suggestions": ["suggestion1", "suggestion2"]
    }
}`;

        try {
            const response = await this._request(prompt, {
                mimeType: 'application/pdf',
                base64: base64
            }, 3, 1000, onProgress);
            const parsed = this._parseJSON(response);

            if (parsed) {
                console.log('[GeminiService] ✅ PDF analysis complete');
                return parsed;
            } else {
                throw new Error('Unable to parse the AI response. Please try again.');
            }
        } catch (error) {
            console.error('[GeminiService] ❌ PDF analysis failed:', error);
            throw error;
        }
    },

    /**
     * Analyze resume text
     */
    async analyzeResume(resumeText, targetRole = 'sde', onProgress = null) {
        console.log('[GeminiService] 🔍 Analyzing resume text');

        const prompt = `You are an expert resume analyzer. Analyze this resume for a ${targetRole} role.

Resume Text:
${resumeText}

Respond with ONLY a JSON object (no markdown):
{
    "skills": {
        "present": ["skill1", "skill2"],
        "partial": ["skill3"],
        "missing": ["skill4", "skill5"]
    },
    "experience": [
        {"title": "Job Title", "company": "Company", "duration": "X years"}
    ],
    "projects": [
        {"name": "Project Name", "tech": "Technologies"}
    ],
    "score": 75,
    "coverage": 65,
    "readiness": 60,
    "atsScore": {
        "overall": 72,
        "keyword": 68,
        "experience": 75,
        "format": 80,
        "suggestions": ["suggestion1", "suggestion2"]
    }
}`;

        try {
            const response = await this._request(prompt, null, 3, 1000, onProgress);
            const parsed = this._parseJSON(response);
            if (parsed) {
                console.log('[GeminiService] ✅ Resume analysis complete');
                return parsed;
            }
            throw new Error('Unable to parse the AI response. Please try again.');
        } catch (error) {
            console.error('[GeminiService] ❌ Resume analysis failed:', error);
            throw error;
        }
    },

    /**
     * Generate interview questions
     */
    async generateQuestions(skills, role = 'sde', type = 'mixed', count = 8) {
        console.log('[GeminiService] 📝 Generating questions');

        const skillList = Array.isArray(skills) ? skills.join(', ') : skills;

        const prompt = `Generate ${count} interview questions for a ${role} position.

Candidate's Skills: ${skillList}
Type: ${type}

Respond with ONLY a JSON array (no markdown):
[
    {
        "type": "code",
        "category": "Data Structures",
        "text": "Write a function to reverse a linked list.",
        "difficulty": "medium",
        "timeLimit": 300,
        "tips": ["Consider edge cases like empty list", "Discuss time vs space complexity", "Try both iterative and recursive approaches"]
    }
]`;

        const FALLBACK_QUESTIONS = [
            {
                "type": "code",
                "category": "Data Structures",
                "text": "Reverse a Linked List",
                "difficulty": "medium",
                "timeLimit": 300,
                "tips": ["Use three pointers: prev, curr, next", "Handle the head update carefully", "Watch for null pointer exceptions"],
                "testCases": [
                    { "input": "1->2->3", "expected": "3->2->1", "isHidden": false, "label": "List of 3" },
                    { "input": "1", "expected": "1", "isHidden": false, "label": "Single Node" }
                ]
            },
            {
                "type": "text",
                "category": "Behavioral",
                "text": "Describe a time you failed.",
                "difficulty": "easy",
                "timeLimit": 180,
                "tips": ["Be honest but focus on growth", "Explain what you learned", "Do not blame others"]
            },
            {
                "type": "code",
                "category": "Algorithms",
                "text": "Valid Parentheses",
                "difficulty": "easy",
                "timeLimit": 300,
                "tips": ["Use a stack", "Push opening brackets", "Pop and check matching closing brackets"],
                "testCases": [
                    { "input": "()[]{}", "expected": "true", "isHidden": false, "label": "Mixed Brackets" },
                    { "input": "(]", "expected": "false", "isHidden": false, "label": "Mismatched" }
                ]
            },
            {
                "type": "text",
                "category": "System Design",
                "text": "Design a URL Shortener",
                "difficulty": "hard",
                "timeLimit": 600,
                "tips": ["Clarify requirements first", "Discuss database choice (SQL vs NoSQL)", "Explain the encoding algorithm"]
            }
        ];

        try {
            const response = await this._request(prompt);
            const parsed = this._parseJSON(response);
            if (parsed && Array.isArray(parsed)) {
                console.log(`[GeminiService] ✅ Generated ${parsed.length
                    } questions`);
                return parsed;
            }
            throw new Error('Failed to parse questions');
        } catch (error) {
            console.warn('[GeminiService] ⚠️ API Failed, using FALLBACK questions for demo:', error);
            // HACKATHON SAFEGUARD: Return fallback data instead of crashing 🛡️
            return FALLBACK_QUESTIONS;
        }
    },

    /**
     * Evaluate an interview answer
     */
    async evaluateAnswer(question, answer) {
        console.log('[GeminiService] 📊 Evaluating answer');

        const prompt = `Evaluate this interview answer.

    Question: ${question.text}
Category: ${question.category}

Answer: ${answer}

Evaluate this interview answer based on intended problem logic, approach, and reasoning.
    Question: ${question.text} (${question.category})
Answer: ${answer}

Respond with ONLY a JSON object:
{
    "outcome": "Correct Answer" | "Incorrect Answer",
        "score": 0 - 100,
            "feedback": "Concise feedback on accuracy",
                "reasoning": "Brief analysis of the user's logic and approach",
                    "strengths": ["..."],
                        "improvements": ["..."]
} `;

        try {
            const response = await this._request(prompt);
            const parsed = this._parseJSON(response);
            if (parsed) {
                console.log('[GeminiService] ✅ Answer evaluated:', parsed.score);
                return parsed;
            }
            throw new Error('Failed to parse evaluation');
        } catch (error) {
            console.error('[GeminiService] ❌ Evaluation failed:', error);
            throw error;
        }
    },

    /**
     * Transcribe audio using Gemini's multimodal capabilities
     */
    async transcribeAudio(audioBlob, onProgress = null) {
        console.log('[GeminiService] 🎙️ Transcribing audio...');

        const base64 = await this._fileToBase64(audioBlob);
        const prompt = "Transcribe this audio exactly as spoken. Focus on accuracy. If there is no speech, return an empty string. Respond with ONLY the transcribed text.";

        try {
            const result = await this._request(prompt, {
                mimeType: audioBlob.type || 'audio/webm',
                base64: base64
            }, 3, 1000, onProgress);
            return result.trim();
        } catch (error) {
            console.error('[GeminiService] ❌ Transcription failed:', error);
            throw error;
        }
    },

    /**
     * Simulate code execution against multiple test cases
     */
    async executeCode(code, language, testCases, onProgress = null) {
        console.log(`[GeminiService] ⚙️ Executing ${language} code against ${testCases.length} tests`);

        const testsJson = JSON.stringify(testCases);
        const prompt = `You are a highly accurate code execution engine and compiler for ${language}.
Your task is to execute the provided code against multiple test cases and return a consolidated report.

    CODE:
${code}

LANGUAGE: ${language}

TEST CASES:
${testsJson}

For each test case:
1. Determine the expected output vs actual output of the code.
2. Capture STDOUT or any compilation / runtime errors.

Respond with ONLY a JSON object:
{
    "overallConsole": "Consolidated compiler output or runtime logs (e.g., 'Compiling... Build Successful' or 'Traceback...')",
        "testResults": [
            {
                "label": "Test Case Label",
                "input": "Input provided",
                "expected": "Expected output",
                "actual": "What the code produced",
                "status": "passed" | "failed",
                "output": "Specific console output for this test"
            }
        ]
}

IMPORTANT:
- Be strict about ${language} syntax.
- If it's a coding challenge where they must implement a function, assume the caller handles the return value check.
    - Return ONLY the JSON object.`;

        try {
            const response = await this._request(prompt, null, 3, 1000, onProgress);
            const parsed = this._parseJSON(response);
            if (parsed && typeof parsed === 'object') {
                console.log('[GeminiService] ✅ Code execution simulation complete');
                return parsed;
            }
            throw new Error('Unable to parse execution report. Please try again.');
        } catch (error) {
            console.error('[GeminiService] ❌ Execution simulation failed:', error);
            throw error;
        }
    },

    async analyzeSkillGap(userSkills, role) {
        console.log('[GeminiService] 📊 Starting full skill gap analysis...');

        // 1. Get Market Analysis
        const marketAnalysis = await this.analyzeMarketSkills(role, {}, userSkills);

        if (!marketAnalysis) throw new Error('Market analysis failed');

        // 2. Flatten all recommended skills
        // 2. Flatten all recommended skills with explicit category mapping for UI
        const allRecommended = [
            ...(marketAnalysis.mustHave || []).map(s => ({ ...s, priority: 'must-have', originalPriority: s.priority })),
            ...(marketAnalysis.goodToHave || []).map(s => ({ ...s, priority: 'good-to-have', originalPriority: s.priority })),
            ...(marketAnalysis.futureProof || []).map(s => ({ ...s, priority: 'future-proof', originalPriority: s.priority }))
        ];

        // 3. Calculate Match Score
        // Simple logic: (Matched Skills / Total Recommended Skills) * 100
        // Weighted: MustHave = 3pts, GoodToHave = 2pts, Future = 1pt
        let totalPoints = 0;
        let earnedPoints = 0;

        allRecommended.forEach(skill => {
            // Simplified weighting based on our explicit categories
            const weight = skill.priority === 'must-have' ? 3 :
                skill.priority === 'good-to-have' ? 2 : 1;

            totalPoints += weight;

            if (skill.status === 'present') earnedPoints += weight;
            else if (skill.status === 'partial') earnedPoints += (weight * 0.5);
        });

        const matchPercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

        return {
            matchPercentage,
            missingSkills: allRecommended, // The UI expects a list of all relevant market skills
            breakdown: marketAnalysis
        };
    },

    async analyzeMarketSkills(role, marketSearchData, userSkills) {
        console.log('[GeminiService] 🔍 Categorizing market skills');

        // Prepare fallback data first
        const fallbackData = this._getFallbackMarketSkills(role, userSkills);

        const prompt = `You are a career expert. Analyze these market search results for the role "${role}" and compare them with the user's current skills.
Market Trends context:
${JSON.stringify(marketSearchData)}

User's current skills (from resume):
${JSON.stringify(userSkills)}

Task: Identify the top 12 most relevant skills for this role and categorize them.
Status categorization rules:
- "present": User has this skill clearly on their resume.
- "partial": User has related skills but might lack specific depth or tool knowledge.
- "missing": Skill is mentioned in market trends but not found in user skills.

Respond with ONLY a JSON object:
{
    "mustHave": [
        { "name": "Skill Name", "status": "present" | "partial" | "missing", "priority": "Critical" | "Essential", "desc": "Short market relevance justification" }
    ],
        "goodToHave": [
            { "name": "Skill Name", "status": "present" | "partial" | "missing", "priority": "High" | "Medium", "desc": "Short market relevance justification" }
        ],
            "futureProof": [
                { "name": "Skill Name", "status": "present" | "partial" | "missing", "priority": "Growing" | "Emerging", "desc": "Short market relevance justification" }
            ]
} `;

        try {
            const response = await this._request(prompt);
            const parsed = this._parseJSON(response);

            if (parsed) {
                console.log('[GeminiService] ✅ Market skills analyzed');

                // Helper to re-verify status (AI status can be flaky)
                const skillsArray = Array.isArray(userSkills) ? userSkills : [];
                const userSkillSet = new Set(skillsArray.map(s => (typeof s === 'string' ? s : s.name).toLowerCase()));

                const recheckStatus = (s) => {
                    const lower = s.name.toLowerCase();
                    if (userSkillSet.has(lower)) return 'present';
                    for (const us of userSkillSet) {
                        if (us.includes(lower) || lower.includes(us)) return 'partial';
                    }
                    return 'missing';
                };

                // Merge with fallback to ensure no empty categories
                const result = {
                    mustHave: (parsed.mustHave && parsed.mustHave.length > 0) ? parsed.mustHave : fallbackData.mustHave,
                    goodToHave: (parsed.goodToHave && parsed.goodToHave.length > 0) ? parsed.goodToHave : fallbackData.goodToHave,
                    futureProof: (parsed.futureProof && parsed.futureProof.length > 0) ? parsed.futureProof : fallbackData.futureProof
                };

                // Re-apply status check to ensure score accuracy
                ['mustHave', 'goodToHave', 'futureProof'].forEach(key => {
                    if (result[key]) {
                        result[key].forEach(skill => {
                            // Prefer "present" if either AI or local check says so
                            const localStatus = recheckStatus(skill);
                            if (localStatus === 'present') skill.status = 'present';
                            else if (skill.status !== 'present' && localStatus === 'partial') skill.status = 'partial';
                        });
                    }
                });

                return result;
            }
            throw new Error('Failed to parse market analysis');
        } catch (error) {
            console.warn('[GeminiService] ⚠️ Market analysis failed, using fallback:', error.message);
            return fallbackData;
        }
    },

    /**
     * Helper to map timeline to weeks
     */
    _getWeeksFromTimeline(timeline) {
        switch (timeline) {
            case '1-3 months': return 8;
            case '3-6 months': return 16;
            case '6-12 months': return 32;
            case '12+ months': return 48;
            default: return 6; // Default fallback
        }
    },

    /**
     * Generate a personalized roadmap with dynamic modules based on topic depth/complexity
     */
    async generatePersonalizedRoadmap(resumeData, interviewGaps, marketGaps, targetRole, timeline = '3-6 months', commitment = '2 hours/day', refinementPrompt = null) {
        console.log('[GeminiService] 🗺️ Generating personalized roadmap with dynamic modules...');

        const totalWeeks = this._getWeeksFromTimeline(timeline);

        let contextInstruction = '';
        if (refinementPrompt) {
            console.log('[GeminiService] 🔧 Applying refinement:', refinementPrompt);
            contextInstruction = `
CRITICAL UPDATE INSTRUCTION:
The user wants to REFINE their existing roadmap. 
User Request: "${refinementPrompt}"
You must regenerate the roadmap to strictly adhere to this request.
- If they say "Remove X", remove all weeks/topics related to X.
- If they say "Add Y", replace less critical weeks with Y.
- If they say "Focus on Z", make Z the primary theme for multiple weeks.
`;
        }

        const prompt = `Create a detailed, personalized ${totalWeeks}-week learning roadmap for a ${targetRole} role.
User Commitment: ${commitment} (Adjust daily task load accordingly)

User Context:
1.  **Resume Skills**: ${JSON.stringify(resumeData.skills || [])}
2.  **Interview Weaknesses**: ${JSON.stringify(interviewGaps || [])}
3.  **Role/Market Gaps**: ${JSON.stringify(marketGaps || [])}

${contextInstruction}

Instructions:
-   **Total Duration**: Exactly ${totalWeeks} weeks.
-   **Weeks 1-2**: Foundation & Critical Fixes (Interview Weaknesses).
-   **Weeks 3-${Math.floor(totalWeeks / 2)}**: Core Competency & Market "Must-Haves".
-   **Weeks ${Math.floor(totalWeeks / 2) + 1}-${totalWeeks}**: Advanced Projects & Specialization.

DYNAMIC MODULE SYSTEM — CRITICAL RULES:
Each topic MUST contain modules that represent meaningful learning stages. The AI must determine the right number of modules based on topic depth and complexity. DO NOT use a fixed number.

Guidelines for module count:
- A narrow, focused topic (e.g. "Bit Manipulation") might need only 2 modules.
- A standard topic (e.g. "Stacks & Queues") might need 3-4 modules.
- A deep, multi-faceted topic (e.g. "Dynamic Programming", "System Design", "React Ecosystem") should have 5-8+ modules.
- Each module must represent a distinct learning stage, NOT an arbitrary split.
- Modules should flow logically: Fundamentals → Core Concepts → Applied Patterns → Advanced Techniques → Real-World Practice.
- NEVER create generic modules like just "Fundamentals" + "Advanced". Each module title must be specific and descriptive.

Each module MUST contain:
- "title": specific, descriptive module name (e.g. "Tree Traversal Patterns" not "Module 1")
- "subtopics": array of specific learning items. The count should match the module's scope:
  - A focused module: 2-4 subtopics
  - A broad module: 5-8 subtopics
- "practiceProblems": array of 3-8 practice problem titles (for technical topics) or empty array. More problems for core/complex topics.
- "youtubeQueries": array of 2 YouTube search queries for learning
- "deadline": estimated completion time based on actual content depth (e.g. "2 days", "5 days", "1 week")
- "tasks": array of 2-4 daily actionable tasks

For EACH topic, also provide:
- "isCore": boolean, true if this is a core skill for the ${targetRole} role
- "difficulty": "beginner", "intermediate", or "advanced"

IMPORTANT: The roadmap must feel like a real curriculum designed by an expert mentor. Each topic should have as many modules as it genuinely needs — no artificial limits, no padding. A topic like "Dynamic Programming" deserves 6-8 modules (Intro to DP, 1D DP, 2D DP, Knapsack Variants, String DP, Tree DP, Advanced DP Patterns, Contest-level DP). A topic like "Bit Manipulation" only needs 2 modules.

Respond with ONLY a JSON array (no markdown):
[
    {
        "week": 1,
        "title": "Focus: Data Structures & Weaknesses",
        "topics": [
            {
                "name": "Linked Lists Mastery",
                "query": "Linked Lists in depth tutorial for interviews",
                "isCore": true,
                "difficulty": "intermediate",
                "modules": [
                    {
                        "title": "Singly Linked List Fundamentals",
                        "subtopics": ["Node structure & pointers", "Insertion (head, tail, middle)", "Deletion & search", "Time complexity analysis"],
                        "practiceProblems": ["Reverse a Linked List", "Delete Node in a Linked List", "Remove Duplicates"],
                        "youtubeQueries": ["singly linked list implementation from scratch", "linked list basics for beginners"],
                        "deadline": "2 days",
                        "tasks": ["Implement singly linked list from scratch", "Solve 3 easy problems on LeetCode"]
                    },
                    {
                        "title": "Doubly & Circular Lists",
                        "subtopics": ["Doubly linked list operations", "Circular linked list", "LRU Cache using DLL"],
                        "practiceProblems": ["Design LRU Cache", "Flatten a Multilevel DLL", "Insert into Sorted Circular List"],
                        "youtubeQueries": ["doubly linked list tutorial", "LRU cache linked list implementation"],
                        "deadline": "2 days",
                        "tasks": ["Implement doubly linked list", "Build LRU Cache from scratch"]
                    },
                    {
                        "title": "Two-Pointer & Fast-Slow Patterns",
                        "subtopics": ["Floyd's cycle detection", "Finding middle element", "Intersection of two lists", "Palindrome check"],
                        "practiceProblems": ["Linked List Cycle II", "Find Middle of Linked List", "Intersection of Two Lists", "Palindrome Linked List", "Remove Nth Node From End"],
                        "youtubeQueries": ["linked list two pointer technique", "floyd cycle detection explained"],
                        "deadline": "3 days",
                        "tasks": ["Master Floyd's algorithm", "Solve 5 medium problems", "Review all patterns"]
                    },
                    {
                        "title": "Advanced Operations & Merge Patterns",
                        "subtopics": ["Merge two sorted lists", "Merge K sorted lists", "Sort a linked list (merge sort)", "Reorder list", "Copy list with random pointer"],
                        "practiceProblems": ["Merge K Sorted Lists", "Sort List", "Reorder List", "Copy List with Random Pointer", "Reverse Nodes in K-Group"],
                        "youtubeQueries": ["merge k sorted lists heap approach", "advanced linked list interview problems"],
                        "deadline": "4 days",
                        "tasks": ["Implement merge sort on linked list", "Solve 4 hard problems", "Mock interview practice"]
                    }
                ]
            }
        ]
    }
]`;

        try {
            const response = await this._request(prompt);
            const parsed = this._parseJSON(response);
            if (parsed && Array.isArray(parsed)) {
                console.log(`[GeminiService] ✅ Generated ${parsed.length} week roadmap with dynamic modules`);
                return parsed;
            }
            throw new Error('Failed to parse roadmap');
        } catch (error) {
            console.error('[GeminiService] ❌ Roadmap generation failed:', error);
            throw error;
        }
    },

    async analyzeDetailedPerformance(answers, role) {
        console.log('[GeminiService] 🧪 Performing 6-dimension interview analysis');

        const prompt = `You are a senior technical recruiter and career coach.
Analyze the following interview performance for a ${role} position.

Interview Responses:
${JSON.stringify(answers)}

Evaluate the candidate across exactly these 6 dimensions with specified weightings:
1. Technical Skills(20 %) - Code correctness, complexity, and algorithmic efficiency.
2. Problem Solving(20 %) - Approach, edge cases, and logical reasoning.
3. Role Knowledge(20 %) - Understanding of ${role} specific concepts and tools.
4. Experience(15 %) - Quality of past project descriptions and situation handling.
5. Communication(15 %) - Clarity, structure, and ability to explain complex ideas.
6. Professional Demeanor(10 %) - Soft skills, attitude, and team collaboration potential.

Respond with ONLY a JSON object:
{
    "overallScore": 0 - 100,
        "dimensions": [
            { "name": "Technical Skills", "score": 0 - 100, "weight": 20, "feedback": "..." },
            { "name": "Problem Solving", "score": 0 - 100, "weight": 20, "feedback": "..." },
            { "name": "Role Knowledge", "score": 0 - 100, "weight": 20, "feedback": "..." },
            { "name": "Experience", "score": 0 - 100, "weight": 15, "feedback": "..." },
            { "name": "Communication", "score": 0 - 100, "weight": 15, "feedback": "..." },
            { "name": "Professional Demeanor", "score": 0 - 100, "weight": 10, "feedback": "..." }
        ],
            "strengths": ["...", "..."],
                "weaknesses": ["...", "..."],
                    "improvements": ["...", "..."],
                        "summary": "Full overview of performance"
} `;

        try {
            const response = await this._request(prompt);
            const parsed = this._parseJSON(response);
            if (parsed) return parsed;
            throw new Error('Failed to parse analysis');
        } catch (error) {
            console.error('[GeminiService] Analysis failed:', error);
            throw error;
        }
    },

    /**
     * Provides high-quality static fallback when AI analysis fails
     */
    _getFallbackMarketSkills(role, userSkills) {
        // Ensure userSkills is an array to avoid .map error
        const skillsArray = Array.isArray(userSkills) ? userSkills : [];
        const userSkillSet = new Set(skillsArray.map(s => (typeof s === 'string' ? s : s.name).toLowerCase()));

        const checkStatus = (skill) => {
            const lowerSkill = skill.toLowerCase();
            if (userSkillSet.has(lowerSkill)) return 'present';
            // Simple partial check
            for (const s of userSkillSet) {
                if (s.includes(lowerSkill) || lowerSkill.includes(s)) return 'partial';
            }
            return 'missing';
        };

        const roleLower = role.toLowerCase();

        // Comprehensive fallback data
        const data = {
            mustHave: [
                { name: 'Core Language Proficiency', priority: 'Critical', desc: 'Deep knowledge of primary language required for the role' },
                { name: 'Data Structures & Algorithms', priority: 'Critical', desc: 'Essential for technical problem solving and performance' },
                { name: 'Version Control (Git)', priority: 'Essential', desc: 'Standard for team collaboration and code management' },
                { name: 'System Design Basics', priority: 'Essential', desc: 'Understanding of how software components interact' }
            ],
            goodToHave: [
                { name: 'Cloud Services (AWS/Azure)', priority: 'High', desc: 'Modern deployment and infrastructure knowledge' },
                { name: 'Docker & Containerization', priority: 'High', desc: 'Standard for reproducible environments' },
                { name: 'Unit Testing & Quality', priority: 'Medium', desc: 'Ensures code reliability and maintainability' },
                { name: 'API Design (REST/GraphQL)', priority: 'Medium', desc: 'Communication between distributed systems' }
            ],
            futureProof: [
                { name: 'AI/ML Integration', priority: 'Growing', desc: 'Ability to leverage AI models in applications' },
                { name: 'Microservices Architecture', priority: 'Growing', desc: 'Scaling applications for high availability' },
                { name: 'Prompts Engineering', priority: 'Emerging', desc: 'Effectively working with LLMs' },
                { name: 'Edge Computing', priority: 'Emerging', desc: 'Reducing latency for real-time applications' }
            ]
        };

        // Customizations for specific roles
        if (roleLower.includes('frontend') || roleLower.includes('ui')) {
            data.mustHave[0].name = 'Modern JS Frameworks (React/Vue)';
            data.goodToHave[3].name = 'TypeScript & State Management';
        } else if (roleLower.includes('backend')) {
            data.mustHave[0].name = 'Server-side Logic & DBs';
            data.goodToHave[0].name = 'Distributed Systems';
        }

        // Apply dynamic status based on user resume
        const applyStatus = (category) => {
            category.forEach(s => { s.status = checkStatus(s.name); });
        };

        applyStatus(data.mustHave);
        applyStatus(data.goodToHave);
        applyStatus(data.futureProof);

        return data;
    }
};

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
    GeminiService.init();
});

window.GeminiService = GeminiService;