/**
 * Roadmap Engine
 * Manages granular topic structures, dynamic module generation, and roadmap logic.
 */

const ROLE_TOPICS = {
    'frontend': [
        {
            title: 'HTML & CSS Mastery',
            topics: [
                { name: 'Semantic HTML', items: ['Accessibility (ARIA)', 'SEO Meta Tags', 'Form Validation & Inputs'] },
                { name: 'Modern CSS', items: ['Flexbox', 'CSS Grid', 'Custom Properties', 'Container Queries', 'Animations & Transitions', 'Responsive Design', 'Media Queries', 'Clamp & Fluid Typography'] },
                { name: 'CSS Architecture', items: ['BEM Methodology', 'SASS/SCSS', 'Utility-first (Tailwind)', 'CSS Modules'] }
            ]
        },
        {
            title: 'JavaScript Deep Dive',
            topics: [
                { name: 'Core Concepts', items: ['Closures & Scope', 'Prototypal Inheritance', 'ES6+ Features', 'Destructuring & Spread', 'Modules (import/export)', 'Symbol & Iterator', 'Proxy & Reflect', 'WeakMap & WeakSet', 'Tagged Template Literals'] },
                { name: 'Asynchronous JS', items: ['Promises', 'Async/Await', 'Event Loop & Microtasks', 'Web Workers', 'AbortController'] },
                { name: 'DOM & Browser APIs', items: ['Event Delegation', 'Intersection Observer', 'MutationObserver', 'Performance API', 'Service Workers', 'Web Storage API', 'Fetch & XMLHttpRequest', 'History API', 'Drag & Drop API', 'Clipboard API', 'Geolocation API', 'Notification API'] }
            ]
        },
        {
            title: 'React Ecosystem',
            topics: [
                { name: 'React Fundamentals', items: ['useState & useEffect', 'useRef & useContext', 'Custom Hooks', 'Error Boundaries', 'Suspense & Lazy Loading', 'React.memo', 'forwardRef', 'Portals', 'Strict Mode'] },
                { name: 'State Management', items: ['Context API', 'Redux Toolkit', 'Zustand', 'TanStack Query', 'Jotai', 'Recoil', 'Signals Pattern'] },
                { name: 'Testing & Tooling', items: ['Jest', 'React Testing Library', 'Cypress E2E'] },
                { name: 'Performance & SSR', items: ['Code Splitting', 'useMemo & useCallback', 'React Profiler', 'Next.js Basics', 'Server Components', 'Streaming SSR', 'ISR & SSG', 'Image Optimization', 'Bundle Analysis'] }
            ]
        }
    ],
    'backend': [
        {
            title: 'Node.js & Express',
            topics: [
                { name: 'Server Core', items: ['Event Loop Internals', 'Streams & Buffers', 'File System (fs)', 'Cluster Module', 'Child Processes', 'Worker Threads', 'Environment Config', 'Process Signals', 'Error Handling Patterns'] },
                { name: 'API Design', items: ['RESTful Conventions', 'Middleware Chains', 'Input Validation (Zod)', 'Rate Limiting'] },
                { name: 'Authentication & Security', items: ['JWT Tokens', 'OAuth2 Flows', 'Passport.js Strategies', 'Session Management', 'RBAC', 'Refresh Token Rotation', 'CORS', 'Helmet.js', 'CSRF Protection', 'SQL Injection Prevention', 'XSS Prevention'] }
            ]
        },
        {
            title: 'Database & Storage',
            topics: [
                { name: 'SQL Databases', items: ['PostgreSQL', 'Complex Joins', 'Indexing Strategies', 'Stored Procedures', 'Query Optimization', 'Migrations', 'Window Functions', 'CTEs', 'Partitioning', 'Connection Pooling', 'Replication', 'Backup Strategies'] },
                { name: 'NoSQL Databases', items: ['MongoDB CRUD', 'Schema Design Patterns', 'Aggregation Pipeline', 'Mongoose ODM'] },
                { name: 'Caching & Queues', items: ['Redis Data Structures', 'Cache Invalidation', 'Pub/Sub', 'CDN Caching', 'Bull/BullMQ Job Queues', 'RabbitMQ Basics', 'Kafka Fundamentals', 'Dead Letter Queues'] }
            ]
        },
        {
            title: 'System & DevOps',
            topics: [
                { name: 'System Design', items: ['Scalability Patterns', 'Load Balancing', 'Microservices Architecture', 'API Gateway', 'CAP Theorem', 'Database Sharding', 'Event-Driven Architecture', 'CQRS', 'Saga Pattern', 'Circuit Breaker', 'Service Mesh', 'Rate Limiting at Scale', 'Consistent Hashing'] },
                { name: 'Docker & CI/CD', items: ['Dockerfile & Images', 'Docker Compose', 'GitHub Actions', 'Nginx Reverse Proxy'] },
                { name: 'Monitoring', items: ['Logging (Winston/Pino)', 'Health Checks', 'APM Tools'] }
            ]
        }
    ],
    'sde': [
        {
            title: 'Aptitude & Reasoning',
            icon: '🧠',
            topics: [
                { name: 'Quantitative Aptitude', items: ['Number Systems', 'Percentages & Ratios', 'Time, Speed & Distance', 'Profit & Loss', 'Averages & Mixtures', 'Permutations & Combinations', 'Probability', 'Simple & Compound Interest', 'Work & Time', 'Mensuration'] },
                { name: 'Logical Reasoning', items: ['Seating Arrangement', 'Blood Relations', 'Syllogisms', 'Coding-Decoding', 'Direction Sense'] },
                { name: 'Verbal Ability', items: ['Reading Comprehension', 'Sentence Correction', 'Vocabulary'] },
                { name: 'Data Interpretation', items: ['Bar & Line Charts', 'Pie Charts', 'Tables & Caselets', 'Data Sufficiency', 'Ratio-based DI', 'Multi-level DI', 'Missing Data Problems'] }
            ]
        },
        {
            title: 'Data Structures & Algorithms',
            icon: '⚡',
            topics: [
                { name: 'Arrays & Strings', items: ['Kadane\'s Algorithm', 'Two Pointers', 'Sliding Window', 'Prefix Sums', 'Matrix Traversal', 'String Matching', 'Anagram Problems', 'Subarray Problems', 'Merge Intervals', 'Spiral Order', 'Next Permutation', 'Trapping Rain Water', 'Stock Buy/Sell'] },
                { name: 'Linked Lists', items: ['Singly & Doubly Linked Lists', 'Cycle Detection (Floyd)', 'Reverse a Linked List', 'Merge Two Sorted Lists'] },
                { name: 'Stacks & Queues', items: ['Monotonic Stack', 'Next Greater Element', 'Min Stack', 'Queue using Stacks'] },
                { name: 'Trees', items: ['Binary Tree Traversals', 'BST Operations', 'Lowest Common Ancestor', 'Diameter of Tree', 'Level Order Traversal', 'Serialize/Deserialize', 'Morris Traversal', 'AVL & Red-Black Basics', 'Segment Trees', 'Fenwick Tree (BIT)'] },
                { name: 'Graphs', items: ['BFS & DFS', 'Dijkstra\'s Algorithm', 'Bellman-Ford', 'Floyd-Warshall', 'Topological Sort', 'Union-Find (DSU)', 'Minimum Spanning Tree (Kruskal/Prim)', 'Cycle Detection', 'Bipartite Check', 'Strongly Connected Components', 'Articulation Points', 'Network Flow Basics'] },
                { name: 'Heaps & Hashing', items: ['Min/Max Heap', 'Priority Queue', 'Top K Elements', 'Median in Stream', 'HashMap Internals', 'Collision Resolution'] },
                { name: 'Dynamic Programming', items: ['0/1 Knapsack', 'Longest Common Subsequence', 'Longest Increasing Subsequence', 'Matrix Chain Multiplication', 'Coin Change', 'Edit Distance', 'Palindrome Partitioning', 'DP on Trees', 'DP on Grids', 'Bitmask DP', 'Digit DP', 'Interval DP', 'State Machine DP'] },
                { name: 'Greedy & Backtracking', items: ['Activity Selection', 'Huffman Coding', 'Job Scheduling', 'N-Queens', 'Sudoku Solver', 'Subset Sum', 'Permutations & Combinations'] },
                { name: 'Miscellaneous', items: ['Binary Search Variants', 'Bit Manipulation', 'Recursion Patterns', 'Divide & Conquer'] }
            ]
        },
        {
            title: 'CS Fundamentals',
            icon: '💻',
            topics: [
                { name: 'Operating Systems', items: ['Process vs Thread', 'CPU Scheduling Algorithms', 'Memory Management (Paging, Segmentation)', 'Virtual Memory', 'Deadlocks (Detection, Prevention, Avoidance)', 'Concurrency & Synchronization (Mutex, Semaphore)', 'File Systems', 'Disk Scheduling', 'Inter-Process Communication'] },
                { name: 'DBMS', items: ['ER Model & Schema Design', 'Normalization (1NF to BCNF)', 'ACID Properties', 'Indexing (B-Tree, Hash)', 'Transactions & Concurrency Control', 'SQL Queries (Joins, Subqueries, Aggregates)', 'Triggers & Views', 'NoSQL Concepts', 'CAP Theorem', 'Query Optimization', 'Stored Procedures', 'Database Recovery'] },
                { name: 'Computer Networks', items: ['OSI vs TCP/IP Model', 'HTTP/HTTPS & TLS', 'DNS Resolution', 'TCP vs UDP', 'Subnetting & CIDR'] },
                { name: 'OOPS Concepts', items: ['Encapsulation', 'Polymorphism (Compile-time & Runtime)', 'Inheritance (Single, Multiple, Multilevel)', 'Abstraction', 'SOLID Principles', 'Design Patterns (Singleton, Factory, Observer, Strategy, Decorator)'] }
            ]
        }
    ]
};


// Core skills per role — used for minimum module enforcement
const CORE_SKILLS = {
    'frontend': ['javascript', 'react', 'css', 'html', 'typescript'],
    'backend': ['node', 'api', 'database', 'sql', 'authentication', 'system design'],
    'sde': ['data structures', 'algorithms', 'dynamic programming', 'trees', 'graphs', 'system design', 'oops', 'dbms'],
    'fullstack': ['javascript', 'react', 'node', 'database', 'api'],
    'devops': ['docker', 'ci/cd', 'kubernetes', 'cloud', 'linux'],
    'data-science': ['python', 'machine learning', 'statistics', 'sql', 'deep learning']
};

/**
 * Determine dynamic module count based on subtopic count, role difficulty, and core skill status
 */
function calculateModuleCount(subtopicCount, difficulty, isCore) {
    let count;
    if (subtopicCount <= 4) count = 2;
    else if (subtopicCount <= 8) count = 3;
    else if (subtopicCount <= 12) count = 4;
    else count = Math.min(6, 5);

    // Advanced role gets +1 module
    if (difficulty === 'advanced') count += 1;

    // Core skills get minimum 3 modules
    if (isCore && count < 3) count = 3;

    return Math.min(count, 6); // Cap at 6
}

/**
 * Check if a topic name matches core skills for the given role
 */
function isCoreTopic(topicName, role) {
    const coreList = CORE_SKILLS[role] || CORE_SKILLS['sde'];
    const lower = topicName.toLowerCase();
    return coreList.some(skill => lower.includes(skill) || skill.includes(lower));
}

/**
 * Generate dynamic modules from a flat list of items (for legacy/static data)
 * Splits items into balanced modules with generated metadata
 */
function generateDynamicModulesFromItems(topicName, items, role, difficulty = 'intermediate') {
    const isCore = isCoreTopic(topicName, role);
    const moduleCount = calculateModuleCount(items.length, difficulty, isCore);

    // Split items evenly across modules
    const modules = [];
    const itemsPerModule = Math.ceil(items.length / moduleCount);

    for (let i = 0; i < moduleCount; i++) {
        const start = i * itemsPerModule;
        const moduleItems = items.slice(start, start + itemsPerModule);
        if (moduleItems.length === 0) break;

        // Generate descriptive title from content
        let moduleTitle;
        if (moduleCount === 2) {
            moduleTitle = i === 0 ? `${topicName} — Core Concepts` : `${topicName} — Applied & Advanced`;
        } else {
            moduleTitle = `${moduleItems[0]}${moduleItems.length > 1 ? ' & Related' : ''}`;
        }

        modules.push({
            title: moduleTitle,
            subtopics: moduleItems,
            practiceProblems: [],
            youtubeQueries: [
                `${topicName} ${moduleItems[0]} tutorial`,
                `${topicName} ${moduleItems[moduleItems.length - 1]} explained`
            ],
            deadline: `${Math.max(2, Math.ceil(moduleItems.length * 1.5))} days`,
            tasks: moduleItems.slice(0, 3).map(item => `Study and practice: ${item}`)
        });
    }

    return modules;
}

/**
 * Validate and normalize AI-generated modules for a topic.
 * If AI didn't provide modules or provided flat items, generate modules dynamically.
 */
function normalizeTopicModules(topic, role) {
    const difficulty = topic.difficulty || 'intermediate';
    const isCore = topic.isCore || isCoreTopic(topic.name, role);

    // Case 1: AI provided proper modules array
    // BUT enforce minimum modules for topics with many total subtopics
    if (topic.modules && Array.isArray(topic.modules) && topic.modules.length > 0) {
        // Count total subtopics across all AI modules
        const totalSubtopics = topic.modules.reduce((sum, m) => sum + (m.subtopics?.length || 0), 0);
        const expectedMin = calculateModuleCount(totalSubtopics, difficulty, isCore);

        // If AI gave too few modules for the content volume, re-split from flat subtopics
        if (topic.modules.length < expectedMin && totalSubtopics > 6) {
            console.log(`[RoadmapEngine] ⚠️ AI gave ${topic.modules.length} modules for "${topic.name}" (${totalSubtopics} subtopics), re-splitting to ${expectedMin}`);
            const allSubtopics = topic.modules.flatMap(m => m.subtopics || []);
            return generateDynamicModulesFromItems(topic.name, allSubtopics, role, difficulty);
        }

        // Normalize each module to ensure all fields exist
        return topic.modules.map(mod => ({
            title: mod.title || 'Untitled Module',
            subtopics: mod.subtopics || [],
            practiceProblems: mod.practiceProblems || [],
            youtubeQueries: mod.youtubeQueries || [`${topic.name} ${mod.title} tutorial`],
            deadline: mod.deadline || '3 days',
            tasks: mod.tasks || mod.subtopics?.slice(0, 3).map(s => `Study: ${s}`) || []
        }));
    }

    // Case 2: Legacy format — flat items array, no modules
    if (topic.items && Array.isArray(topic.items) && topic.items.length > 0) {
        return generateDynamicModulesFromItems(topic.name, topic.items, role, difficulty);
    }

    // Case 3: No items or modules — generate a single placeholder module
    return [{
        title: topic.name,
        subtopics: [topic.desc || `Learn ${topic.name}`],
        practiceProblems: [],
        youtubeQueries: [`${topic.name} tutorial for beginners`],
        deadline: '3 days',
        tasks: [`Study ${topic.name} fundamentals`]
    }];
}


const RoadmapEngine = {
    customTopics: [],

    addCustomTopic(weekTitle, topic) {
        this.customTopics.push({ weekTitle, topic });
    },

    getRoleData(role) {
        return ROLE_TOPICS[role] || ROLE_TOPICS['sde'];
    },

    generateSampleRoadmap(role = 'sde') {
        const data = this.getRoleData(role);
        return data.map((week, index) => ({
            week: index + 1,
            title: week.title,
            status: 'locked',
            topics: week.topics.map(t => ({
                name: t.name,
                isCore: isCoreTopic(t.name, role),
                difficulty: 'intermediate',
                modules: generateDynamicModulesFromItems(t.name, t.items, role)
            }))
        }));
    },

    /**
     * Generate roadmap from AI data or fallback to static.
     * Applies dynamic module generation as post-processing.
     */
    generateFullRoadmap(role, skillGaps = [], aiRoadmapData = null) {
        // 1. If AI data exists, use it as the primary source
        if (aiRoadmapData && Array.isArray(aiRoadmapData) && aiRoadmapData.length > 0) {
            console.log('[RoadmapEngine] 🤖 Using AI-generated roadmap data with dynamic modules');
            return aiRoadmapData.map((week, index) => ({
                week: week.week || index + 1,
                title: week.title,
                status: index === 0 ? 'current' : 'upcoming',
                topics: week.topics.map(t => ({
                    name: t.name,
                    searchQuery: t.query,
                    isCore: t.isCore || isCoreTopic(t.name, role),
                    difficulty: t.difficulty || 'intermediate',
                    modules: normalizeTopicModules(t, role)
                }))
            }));
        }

        // 2. Fallback to Static Data with dynamic module generation
        const data = JSON.parse(JSON.stringify(this.getRoleData(role)));

        // Inject skill gaps if provided
        if (skillGaps && skillGaps.length > 0) {
            let focusSection = data.find(s => s.title.includes('Focus Area'));
            if (!focusSection) {
                focusSection = {
                    title: '🎯 Interview Focus Areas',
                    icon: '🚀',
                    topics: []
                };
                data.unshift(focusSection);
            }

            skillGaps.forEach(gap => {
                focusSection.topics.push({
                    name: gap.name,
                    items: [
                        gap.reason === 'low_score' ? `Improve score (current: ${gap.score}%)` : `Master ${gap.name}`,
                        `Demonstrated in: ${gap.addedFrom}`,
                        'Review related conceptual modules'
                    ]
                });
            });
        }

        // Inject custom topics
        this.customTopics.forEach(custom => {
            const week = data.find(w => w.title.includes(custom.weekTitle)) || data[data.length - 1];
            if (week) {
                week.topics.push(custom.topic);
            }
        });

        return data.map((week, index) => ({
            week: index + 1,
            title: week.title,
            status: index === 0 ? 'current' : 'upcoming',
            topics: week.topics.map(t => ({
                name: t.name,
                isCore: isCoreTopic(t.name, role),
                difficulty: 'intermediate',
                modules: generateDynamicModulesFromItems(t.name, t.items || [], role)
            }))
        }));
    },

    /**
     * Detect if a roadmap uses the legacy flat format (items) vs new module format.
     * Used for backward compatibility with saved Firestore data.
     */
    isLegacyFormat(roadmapData) {
        if (!roadmapData?.weeks || !Array.isArray(roadmapData.weeks)) return false;
        const firstWeek = roadmapData.weeks[0];
        if (!firstWeek?.topics?.[0]) return false;
        // Legacy format has topic.items but no topic.modules
        return firstWeek.topics[0].items && !firstWeek.topics[0].modules;
    },

    /**
     * Migrate legacy roadmap data to new module format
     */
    migrateLegacyRoadmap(roadmapData, role = 'sde') {
        if (!this.isLegacyFormat(roadmapData)) return roadmapData;

        console.log('[RoadmapEngine] 🔄 Migrating legacy roadmap to dynamic module format');
        return {
            ...roadmapData,
            weeks: roadmapData.weeks.map(week => ({
                ...week,
                topics: week.topics.map(t => ({
                    name: t.name,
                    searchQuery: t.searchQuery,
                    isCore: isCoreTopic(t.name, role),
                    difficulty: 'intermediate',
                    modules: generateDynamicModulesFromItems(t.name, t.items || [], role)
                }))
            })),
            totalTasks: roadmapData.weeks.reduce((acc, w) =>
                acc + w.topics.reduce((t, topic) => {
                    const items = topic.items || [];
                    return t + items.length;
                }, 0), 0)
        };
    }
};

window.RoadmapEngine = RoadmapEngine;