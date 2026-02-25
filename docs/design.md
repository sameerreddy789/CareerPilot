# Design Document: Resume Analysis & Interview Validation Feature (NextStep AI)

## Overview

This document describes the design and implementation of the resume analysis and interview validation feature within **NextStep AI** (formerly CareerPilot AI), an AI-powered career guidance platform built for Hackathon 2026.

**Platform Vision**: "Your AI-Powered Career Co-Pilot — Bridging the gap between where you are and where you want to be."

**Target Audience**: Students, freshers, career switchers, and returning professionals worldwide who need structured guidance for interview preparation and career development.

**Platform Philosophy**: NextStep AI follows a continuous loop: **ASSESS → PLAN → PRACTICE → MEASURE → ADJUST → REPEAT**

**This Feature**: The resume analysis feature (resume.html) implements the **interview-aware workflow** (not interview-first):
```
Resume Upload → Instant Analysis → Results Display → CTA: "Take Instant Interview" → Validation → Readiness Score → Personalized Roadmap
```

**Key Innovation**: "We don't trust resumes or interviews alone — we compare both and build the roadmap from verified skills."

The system extracts skills from resumes through simulated analysis, displays results with a strong CTA to take validation interviews (optional but encouraged), calculates readiness scores (0-100), and uses verified data to generate personalized 6-week roadmaps with language-aware learning.

**Tech Stack**:
- HTML5, CSS3, Vanilla JavaScript (ES6+ with ES Modules)
- Firebase Auth (Email/Password + Google Sign-In)
- **Firebase Hosting** (Static asset delivery and global CDN)
- Cloud Firestore (NoSQL database for user profiles)
- LocalStorage (client-side caching and offline support)
- GSAP (smooth animations and transitions)
- Monaco Editor (VS Code-like code editing for interviews)
- Web Speech API (speech-to-text for behavioral questions)
- Simulated AI extraction (future: real AI backend integration)

**Design Philosophy**: Dark theme with glassmorphism effects, glowing hover states, smooth animations, and responsive layout. Built to work offline and be accessible worldwide, even in low-bandwidth areas.

## Architecture

## Architecture

The feature uses a **Pipeline Architecture** where data flows from raw inputs (PDF/Speech) through an AI Intelligence Layer (`GeminiService`) and a Market Logic Layer (`SerpService`) to a personalized dashboard.

### Key Components

1.  **AI Intelligence Layer** (`gemini-service.js`): The unified engine for multimodal analysis, question generation, and performance evaluation.
2.  **Adaptive Logic Layer** (`interview-engine.js`): Manages the state and flow of the interview, integrating speech and code inputs.
3.  **Market Intelligence Layer** (`serp-service.js`): Fetches live job data to ground the AI's skills analysis in reality.
4.  **UI Ecosystem Layer**: A collection of high-end interactive components (Orbital Timeline, Magic Bento, Infinite Plane) providing a premium UX.
5.  **State & Persistence Layer**: Secure handling of user data via LocalStorage and Firebase.

### Component Interaction Flow (Interview-Aware)

```
User Upload (resume.html) 
    ↓
File Validation → Resume Analysis (simulated)
    ↓
Results Display (skills found, missing, experience, projects)
    ↓
CTA: "Take Instant Interview" → interview.html
    ↓
Interview Module (3 modes, 3 answer methods)
    ↓
Save Interview Results → feedback.html
    ↓
Readiness Score Calculation
    ↓
Skill Gap Analysis (skill-gap.html)
    ↓
Personalized Roadmap Generation (roadmap.html)
    ↓
Continuous Learning Loop (tracker.html)

Error Handler monitors all steps ↑
```

### Trust Boundaries

The system enforces strict trust boundaries to ensure security:

- **User-uploaded files** are treated as untrusted input and undergo validation before processing
- **Resume Parser** operates in sandboxed browser environment with no server access
- **LocalStorage** is isolated per-origin (NextStep AI only), preventing cross-site data access
- **Firestore** access is controlled by Firebase Security Rules (users can only access their own data)
- **Data Store** is accessed through store.js utilities only, not directly
- **Input sanitization** prevents XSS attacks when rendering user data
- **Input sanitization** prevents XSS attacks when rendering user data
- **File size limits** (10MB) prevent DoS attacks

### Deployment Architecture

The application adopts a **Serverless Static Site** architecture deployed on **Firebase Hosting**:

1.  **Static Asset Delivery**: HTML, CSS, and JS files are pre-built (or raw ES modules) and served directly from Firebase's SSD-backed global CDN.
2.  **Edge Caching**: Assets are cached at the nearest edge location to the user, ensuring <100ms load times globally.
3.  **Atomic Deploys**: Every deployment creates a precise, versioned snapshot. This allows for instant rollbacks if issues are detected.
4.  **HTTPS Everywhere**: Firebase automatically provisions and manages SSL certificates for secure data transmission.


## Design Decisions

### Decision 1: Pipeline Architecture

**Rationale**: A pipeline architecture provides clear separation of concerns, making each component independently testable and replaceable. This is particularly important for the AI Extractor, which may need to be upgraded or swapped with different AI models.

**Trade-offs**: While a pipeline adds some latency compared to a monolithic approach, it provides better maintainability and allows for parallel processing optimizations in the future.

### Decision 2: Client-Side Processing with LocalStorage

**Rationale**: CareerPilot AI is built as a frontend-only application for the hackathon, using LocalStorage for data persistence. This eliminates backend complexity, reduces latency, and keeps user data on their device for privacy.

**Implementation**: All processing happens in the browser. Resume parsing uses client-side libraries (PDF.js, Mammoth.js). AI extraction is simulated with pattern matching and keyword detection (future: backend AI API integration).

**Trade-offs**: Limited AI capabilities compared to server-side models, but provides instant feedback and works offline. LocalStorage has ~5-10MB limit, sufficient for resume data.

### Decision 3: Interview-First Validation (Core Innovation)

**Rationale**: Resume claims are often inflated or inaccurate. By triggering a mandatory interview immediately after upload, we validate skills in real-time and build roadmaps from verified gaps, not assumptions.

**Implementation**: 
- Resume upload triggers automatic redirect to interview.html
- Interview questions are generated based on resume-claimed skills
- Interview results are compared with resume claims to detect over-claiming
- Reconciled skill set (not raw resume data) is used for roadmap generation

**Impact**: Eliminates the "trust problem" - users can't game the system by inflating resumes. Roadmaps are built from honest assessments.

### Decision 4: Readiness Score as Primary Metric

**Rationale**: Students need a single, transparent metric to track progress. The readiness score (0-100) provides instant feedback and motivation, always visible in the sidebar.

**Implementation**:
- Score calculated from: verified skills, experience level, claim accuracy, interview performance
- Updates live after every practice session
- Shows transparent reasons for changes (e.g., "+5% - Arrays interview passed")
- Displays "Time-to-Ready" estimate (e.g., "2h 15m to 80%")

**Trade-offs**: Simplifies complex assessment into one number, but provides detailed breakdown on click.

### Decision 4: Skill Taxonomy Integration

**Rationale**: Mapping extracted skills to a standardized taxonomy enables better skill matching across CareerPilot features (skill gap analysis, interview questions, roadmap generation, language-aware resource curation).

**Implementation**: Maintain a predefined skill taxonomy in skills.js with canonical names, aliases, and language-specific resources. Use fuzzy matching to map extracted skills to canonical forms.

### Decision 5: Platform-Wide Data Model with Reconciliation

**Rationale**: Resume data must be accessible to all CareerPilot features, but we store both raw resume claims AND reconciled (verified) skills to maintain transparency and enable re-validation.

**Implementation**: Define a standardized User_Profile schema in store.js with separate fields for resume claims, interview results, and reconciled skills. All features read from reconciled data. Changes trigger readiness score updates and cross-feature events.

## Data Models

### Extraction Result Schema

```typescript
interface ExtractionResult {
  userId: string;
  extractionId: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  technicalSkills: TechnicalSkill[];
  softSkills: SoftSkill[];
  experienceLevel: ExperienceLevel;
  projects: Project[];
  metadata: ExtractionMetadata;
}

interface TechnicalSkill {
  name: string;
  category: string; // e.g., "Programming Language", "Framework", "Tool", "Database"
  confidence: 'high' | 'medium' | 'low';
  canonicalId?: string; // Reference to skill taxonomy
}

interface SoftSkill {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'explicit' | 'implied'; // Whether stated directly or inferred
}

interface ExperienceLevel {
  totalYears: number;
  category: 'Entry' | 'Mid' | 'Senior' | 'Expert';
  confidence: 'high' | 'medium' | 'low';
  determined: boolean; // False if experience couldn't be determined
  breakdown?: { // Optional detailed breakdown
    fullTime: number;
    internships: number;
    partTime: number;
    contract: number;
  };
}

interface Project {
  name?: string;
  description?: string;
  technologies?: string[];
  duration?: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ExtractionMetadata {
  originalFileName: string;
  fileSize: number;
  processingTimeMs: number;
  parserVersion: string;
  aiModelVersion: string;
  parserConfidence: 'high' | 'medium' | 'low'; // Indicates parsing quality
}
```

### Storage Schema

```typescript
interface UserProfile {
  userId: string;
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    preferredLanguage?: 'English' | 'Hindi' | 'Telugu'; // Language-aware learning
  };
  resumeData: {
    resumeClaims: ExtractionResult; // Raw resume data
    interviewResults: InterviewResult; // Validation interview performance
    reconciledSkills: ReconciliationResult; // Verified skill set after comparison
    extractionHistory: ExtractionResult[]; // Last 3 extractions
    claimAccuracyScore: number; // Percentage of verified skills
  };
  readinessScore: {
    current: number; // 0-100
    history: ReadinessChange[]; // Track score changes with reasons
    timeToReady: string; // e.g., "2h 15m to 80%"
    lastUpdated: Date;
  };
  skillGapData?: SkillGapAnalysis; // Used by skill-gap.html
  interviewHistory?: InterviewSession[]; // Used by interview.html
  roadmap?: LearningRoadmap; // Used by roadmap.html (built from reconciled skills)
  progress?: ProgressMetrics; // Used by tracker.html, dashboard.html
  createdAt: Date;
  updatedAt: Date;
}

interface ReconciliationResult {
  verifiedSkills: TechnicalSkill[]; // Resume + Interview match
  overClaimedSkills: TechnicalSkill[]; // Resume only, failed interview
  underDemonstratedSkills: TechnicalSkill[]; // Interview only, not on resume
  discrepancies: Discrepancy[]; // Detailed explanations
}

interface Discrepancy {
  skill: string;
  resumeClaim: string; // e.g., "Expert"
  interviewPerformance: string; // e.g., "Failed medium-level question"
  status: 'Verified' | 'Over-Claimed' | 'Under-Demonstrated';
  explanation: string;
}

interface ReadinessChange {
  timestamp: Date;
  oldScore: number;
  newScore: number;
  change: number; // +/- value
  reason: string; // e.g., "+5% - Arrays interview passed"
  trigger: 'resume_upload' | 'interview' | 'practice' | 'roadmap_edit';
}

// Stored in LocalStorage as:
// localStorage.setItem('careerpilot_user_profile', JSON.stringify(userProfile));
```

## Component Specifications

### AI Evaluation Data Model

```json
{
  "questionId": "q_123",
  "score": 85,
  "feedback": "Strong logic, but could optimize space complexity.",
  "reasoning": "The user correctly implemented... however...",
  "suggestedImprovement": "Consider using a Hash Map for O(n) lookups.",
  "status": "correct|partially_correct|incorrect"
}
```

### Component Specification: GeminiService

| Property | Value |
|----------|-------|
| Logic | Centralized AI API wrapper for Google Gemini |
| Inputs | PDF Blobs, Text Strings, JSON Schemas |
| Outputs | Validated JSON objects matching requested schemas |
| Security | API Key handled via `env-config.js` and obfuscation |

### Component Specification: InterviewEngine

| Property | Value |
|----------|-------|
| Logic | State-machine based flow (Setup -> Interrogating -> Evaluating -> Results) |
| Features | MCQ rendering, Monaco Editor integration, Speech-to-Text |
| Persistence | LocalStorage sync + Firestore completion tracking |

**Error Cases**:
- Invalid format: Display glassmorphism notification with retry button
- File too large: Suggest compressing the resume
- Corrupted file: Offer manual entry option

### Resume Parser

**Responsibilities**:
- Extract text from PDF and DOC/DOCX files client-side
- Handle multi-column layouts
- Extract table content
- Preserve logical reading order
- Assess parsing quality and confidence

**Implementation**:
- For PDF: Use PDF.js (Mozilla's library, works in browser)
- For DOC/DOCX: Use Mammoth.js (client-side DOCX to HTML converter)
- Implement layout analysis to determine reading order
- Extract tables as structured data when possible

**Client-Side Libraries**:
```html
<!-- In resume.html -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
```

**Design Decision**: Use client-side parsing libraries to avoid backend dependency and keep data on user's device.

#### Parser Confidence Scoring

PDF parsing is inherently challenging due to varied layouts. The parser assigns a confidence score based on:

**High Confidence**:
- Single-column layout detected
- Clear text extraction with proper spacing
- No tables or simple tables successfully parsed
- Minimal formatting artifacts

**Medium Confidence**:
- Multi-column layout detected but reading order preserved
- Tables present with some structural ambiguity
- Some formatting artifacts but text is readable
- Headers/footers successfully identified and handled

**Low Confidence**:
- Complex multi-column layout with uncertain reading order
- Nested tables or complex table structures
- Significant formatting artifacts or garbled text
- Heavy use of graphics/images affecting text flow
- Unusual fonts or encoding issues

#### Fallback Strategy

When parser confidence is low, the system implements a multi-tier fallback:

**Tier 1: Alternative Parser** (Low confidence detected)
- Attempt parsing with alternative library (e.g., switch from pdf-parse to pdfjs-dist)
- Compare outputs and use the one with higher confidence score

**Tier 2: OCR Enhancement** (Both parsers produce low confidence)
- Apply OCR (Tesseract or cloud OCR service) to extract text from PDF as images
- Combine OCR results with native text extraction
- Use AI to reconcile differences and reconstruct logical order

**Tier 3: User Notification** (All methods produce low confidence)
- Display warning: "Resume format may be complex. Please review extracted information carefully."
- Show side-by-side view: original resume (PDF viewer) + extracted data
- Provide option to manually paste resume text if extraction is poor

**Tier 4: Manual Entry Fallback** (User-initiated)
- Allow user to manually enter information if parsing fails completely
- Provide structured form matching extraction schema

#### Implementation Details

```typescript
interface ParserResult {
  text: string;
  confidence: 'high' | 'medium' | 'low';
  layoutType: 'single-column' | 'multi-column' | 'complex';
  issues: string[]; // List of detected parsing issues
}

async function parseResume(file: File): Promise<ParserResult> {
  const primaryResult = await primaryParser.parse(file);
  
  if (primaryResult.confidence === 'low') {
    // Tier 1: Try alternative parser
    const alternativeResult = await alternativeParser.parse(file);
    
    if (alternativeResult.confidence > primaryResult.confidence) {
      return alternativeResult;
    }
    
    // Tier 2: Apply OCR enhancement
    const ocrResult = await ocrEnhancedParser.parse(file);
    return ocrResult;
  }
  
  return primaryResult;
}
```

This multi-tier approach ensures:
- Best-effort parsing for all resume formats
- Transparent communication of parsing quality to users
- Graceful degradation with user control
- Higher overall extraction success rate

### AI Extractor

**Responsibilities**:
- Extract technical skills with categorization
- Extract soft skills (explicit and implied)
- Calculate experience level
- Extract project information
- Deduplicate and consolidate skills
- Map skills to taxonomy

**Implementation**:

#### Simulated AI Extraction (Hackathon MVP)

For the hackathon demo, AI extraction is implemented using JavaScript pattern matching and heuristics:

```javascript
// Simplified extraction logic in skills.js or extractor.js
class ResumeExtractor {
  constructor() {
    this.skillTaxonomy = loadSkillTaxonomy(); // From skills.js
  }
  
  extractTechnicalSkills(text) {
    const skills = [];
    // Pattern matching against known skills
    for (const [category, skillList] of Object.entries(this.skillTaxonomy)) {
      for (const skill of skillList) {
        const regex = new RegExp(`\\b${skill.name}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          skills.push({
            name: skill.canonical,
            category: category,
            confidence: matches.length > 2 ? 'high' : 'medium',
            claimedLevel: this.inferLevel(text, skill.name) // e.g., "Expert", "Intermediate"
          });
        }
      }
    }
    return this.deduplicateSkills(skills);
  }
  
  inferLevel(text, skillName) {
    // Look for context clues: "expert in X", "proficient in X", "basic knowledge of X"
    if (text.match(new RegExp(`expert.*${skillName}|${skillName}.*expert`, 'i'))) return 'Expert';
    if (text.match(new RegExp(`proficient.*${skillName}|${skillName}.*proficient`, 'i'))) return 'Intermediate';
    return 'Beginner';
  }
  
  extractSoftSkills(text) {
    const softSkillKeywords = {
      'Leadership': ['led team', 'managed', 'coordinated', 'mentored'],
      'Communication': ['presented', 'collaborated', 'documented'],
      'Problem Solving': ['solved', 'optimized', 'improved', 'debugged']
    };
    // Similar pattern matching logic
  }
  
  calculateExperience(text) {
    // Parse date ranges, apply weighting rules
    // See Experience Calculation section for full algorithm
  }
}
```

#### Future: Real AI Backend Integration

For production deployment, replace simulated extraction with backend AI API:

```javascript
async function extractWithAI(text) {
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText: text })
  });
  return await response.json();
}
```

### Interview Trigger (NEW)

**Responsibilities**:
- Automatically redirect to interview.html after resume extraction
- Display notification about mandatory validation
- Pass resume-claimed skills to interview generator
- Prevent skipping of validation interview

**Implementation**:

```javascript
// In resume.html after extraction completes
async function handleExtractionComplete(extractionResult) {
  // Save resume claims to LocalStorage
  dataStore.saveResumeClaims(extractionResult);
  
  // Show notification
  showNotification('⚠️ Resume Claims Need Validation', 'warning');
  
  // Redirect to interview after 2 seconds
  setTimeout(() => {
    window.location.href = 'interview.html?mode=validation&source=resume';
  }, 2000);
}
```

### Interview Code Editor (NEW)

**Responsibilities**:
- Provide a full-featured coding environment within the interview module
- Support syntax highlighting for multiple languages (JS, Python, Java)
- Manage editor state and auto-save changes
- Simulate code execution for immediate user feedback

**Implementation**:
- **Monaco Editor**: Integrated via CDN loader for lightweight performance.
- **Split-Pane UI**: Custom CSS grid layout to show Question vs. Code.
- **Mock Execution**: Client-side `eval()` for safe JS execution demo; mock output for other languages to simulate backend runner.

```javascript
// js/editor.js
const EditorState = {
    editor: null,
    currentLanguage: 'javascript',
    // ...
};

function initEditor(containerId) {
    require(['vs/editor/editor.main'], function () {
        EditorState.editor = monaco.editor.create(document.getElementById(containerId), {
            value: EditorState.languages['javascript'].defaultCode,
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true
        });
        // ...
    });
}
```

### Interview Validator (NEW)

**Responsibilities**:
- Generate interview questions based on resume-claimed skills
- Adapt difficulty based on claimed experience level
- Conduct timed interview with 3 answer methods (text, voice, code)
- Score interview performance
- Return structured interview results for reconciliation

**Implementation**:

```javascript
// In interview.html
class ValidationInterview {
  constructor(resumeClaims) {
    this.resumeClaims = resumeClaims;
    this.questions = this.generateQuestions();
    this.results = [];
  }
  
  generateQuestions() {
    const questions = [];
    
    // Generate questions for each claimed skill
    for (const skill of this.resumeClaims.technicalSkills) {
      const difficulty = this.mapLevelToDifficulty(skill.claimedLevel);
      const question = this.getQuestionForSkill(skill.name, difficulty);
      questions.push({
        skill: skill.name,
        claimedLevel: skill.claimedLevel,
        difficulty: difficulty,
        question: question
      });
    }
    
    return questions;
  }
  
  mapLevelToDifficulty(level) {
    const mapping = {
      'Beginner': 'easy',
      'Intermediate': 'medium',
      'Expert': 'hard'
    };
    return mapping[level] || 'medium';
  }
  
  scoreAnswer(question, answer) {
    // Simulated scoring (future: real AI evaluation)
    const correctKeywords = question.expectedKeywords;
    const matchCount = correctKeywords.filter(kw => answer.includes(kw)).length;
    const score = (matchCount / correctKeywords.length) * 100;
    
    return {
      skill: question.skill,
      claimedLevel: question.claimedLevel,
      difficulty: question.difficulty,
      score: score,
      passed: score >= 60
    };
  }
}
```

### Skill Reconciler (NEW)

**Responsibilities**:
- Compare resume-claimed skills with interview-demonstrated skills
- Categorize each skill as: Verified, Over-Claimed, or Under-Demonstrated
- Calculate claim accuracy score
- Generate detailed discrepancy explanations
- Return reconciled skill set for roadmap generation

**Implementation**:

```javascript
// In reconciler.js
class SkillReconciler {
  reconcile(resumeClaims, interviewResults) {
    const verifiedSkills = [];
    const overClaimedSkills = [];
    const discrepancies = [];
    
    for (const claimedSkill of resumeClaims.technicalSkills) {
      const interviewResult = interviewResults.find(r => r.skill === claimedSkill.name);
      
      if (!interviewResult) {
        // Skill claimed but not tested (shouldn't happen in validation interview)
        continue;
      }
      
      if (interviewResult.passed) {
        // Skill verified
        verifiedSkills.push({
          ...claimedSkill,
          status: 'Verified',
          interviewScore: interviewResult.score
        });
      } else {
        // Skill over-claimed
        overClaimedSkills.push(claimedSkill);
        discrepancies.push({
          skill: claimedSkill.name,
          resumeClaim: claimedSkill.claimedLevel,
          interviewPerformance: `Failed ${interviewResult.difficulty}-level question (${interviewResult.score}%)`,
          status: 'Over-Claimed',
          explanation: `Resume claims "${claimedSkill.claimedLevel}" but interview performance suggests lower proficiency.`
        });
      }
    }
    
    const claimAccuracyScore = (verifiedSkills.length / resumeClaims.technicalSkills.length) * 100;
    
    return {
      verifiedSkills,
      overClaimedSkills,
      underDemonstratedSkills: [], // Skills shown in interview but not on resume
      discrepancies,
      claimAccuracyScore
    };
  }
}
```

### Readiness Calculator (NEW)

**Responsibilities**:
- Calculate initial readiness score (0-100) after skill reconciliation
- Factor in: verified skills count, experience level, claim accuracy, interview performance
- Calculate "Time-to-Ready" estimate
- Generate transparent reason for score
- Update score after every practice session

**Implementation**:

```javascript
// In readiness.js
class ReadinessCalculator {
  calculateInitialScore(reconciliationResult, experienceLevel) {
    let score = 0;
    
    // Factor 1: Verified skills count (40% weight)
    const skillScore = Math.min((reconciliationResult.verifiedSkills.length / 15) * 40, 40);
    score += skillScore;
    
    // Factor 2: Claim accuracy (30% weight)
    const accuracyScore = (reconciliationResult.claimAccuracyScore / 100) * 30;
    score += accuracyScore;
    
    // Factor 3: Experience level (20% weight)
    const expScore = this.mapExperienceToScore(experienceLevel.category);
    score += expScore;
    
    // Factor 4: Interview performance (10% weight)
    const avgInterviewScore = this.calculateAvgInterviewScore(reconciliationResult);
    score += (avgInterviewScore / 100) * 10;
    
    return Math.round(score);
  }
  
  mapExperienceToScore(category) {
    const mapping = {
      'Entry': 5,
      'Mid': 10,
      'Senior': 15,
      'Expert': 20
    };
    return mapping[category] || 5;
  }
  
  calculateTimeToReady(currentScore, targetScore = 80) {
    const gap = targetScore - currentScore;
    const hoursPerPoint = 0.15; // Estimated 9 minutes per percentage point
    const totalHours = gap * hoursPerPoint;
    
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    
    return `${hours}h ${minutes}m to reach ${targetScore}%`;
  }
  
  generateReason(score, reconciliationResult, experienceLevel) {
    return `${score}% - Baseline assessment: ${reconciliationResult.verifiedSkills.length} verified skills, ` +
           `${reconciliationResult.overClaimedSkills.length} over-claimed, ${experienceLevel.category} level`;
  }
}
```

### Roadmap Completion Popup (NEW)

**Responsibilities**:
- Detect when all roadmap tasks are completed
- Display congratulatory popup modal with completion statistics
- Provide access to job/internship application sites
- Suggest related skills for continued learning

**Implementation**:

```javascript
// In roadmap.html
const RELATED_SKILLS = {
  'sde': [
    { name: 'Cloud Architecture (AWS/GCP)', desc: 'Design scalable cloud solutions' },
    { name: 'Microservices & API Design', desc: 'Build modular, maintainable systems' },
    { name: 'DevOps & CI/CD', desc: 'Automate deployment pipelines' },
    { name: 'Mobile Development', desc: 'Expand to iOS/Android apps' },
    { name: 'AI/ML Integration', desc: 'Add intelligent features to apps' }
  ],
  // ... similar arrays for other roles: frontend, backend, fullstack, 
  // data-analyst, data-scientist, ml-engineer, devops, product, designer
};

const JOB_SITES = {
  general: [
    { name: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs/', icon: '💼' },
    { name: 'Indeed', url: 'https://www.indeed.com/', icon: '🔍' },
    { name: 'Glassdoor', url: 'https://www.glassdoor.com/Job/', icon: '🏢' }
  ],
  tech: [
    { name: 'AngelList Talent', url: 'https://angel.co/jobs', icon: '🚀' },
    { name: 'Wellfound (Startups)', url: 'https://wellfound.com/', icon: '⭐' },
    { name: 'Hired', url: 'https://hired.com/', icon: '💎' }
  ],
  internships: [
    { name: 'Internshala', url: 'https://internshala.com/', icon: '🎓' },
    { name: 'LinkedIn Internships', url: 'https://www.linkedin.com/jobs/internship-jobs/', icon: '📚' }
  ],
  remote: [
    { name: 'Remote.co', url: 'https://remote.co/remote-jobs/', icon: '🌍' },
    { name: 'We Work Remotely', url: 'https://weworkremotely.com/', icon: '🏠' }
  ]
};

function checkAllTasksComplete() {
  const allTasks = ROADMAP_DATA.flatMap(week => week.tasks);
  return allTasks.every(task => task.done);
}

function showCompletionPopup() {
  const userData = JSON.parse(localStorage.getItem('nextStep_user') || '{}');
  const role = userData.targetRole || 'sde';
  const relatedSkills = RELATED_SKILLS[role] || RELATED_SKILLS['sde'];
  
  // Create modal with:
  // 1. Congratulations message personalized by role
  // 2. Stats grid (weeks completed, tasks finished, job readiness)
  // 3. Two action buttons: "Find Jobs" and "Explore Skills"
  // 4. Side panels for job links and skill suggestions
}
```

**UI Components**:

1. **Completion Modal**: 
   - Centered overlay with dark backdrop
   - Celebration emoji animation (🎉)
   - Graduate-style gradient title
   - Stats grid showing completion metrics
   - Two CTA buttons with icons

2. **Jobs Side Panel**:
   - Slides in from right
   - Categorized job site links (Tech, Internships, Remote, General)
   - Each link opens in new tab
   - Hover effects for visual feedback

3. **Skills Side Panel**:
   - Slides in from right  
   - 5 role-specific skill cards
   - Each card shows skill name and brief description
   - Tip box at bottom encouraging continued learning

**Styling**:
- Uses NextStep AI design system CSS variables
- Glassmorphism effects on modal and panels
- Smooth animations (fadeIn, slideUp, bounce)
- Responsive design for mobile devices

#### AI Provider Abstraction

The AI Extractor uses a provider interface to abstract the underlying AI service:

```typescript
interface AIProvider {
  extractStructuredData(text: string, schema: object): Promise<ExtractionResult>;
  getModelVersion(): string;
}

class SimulatedAIProvider implements AIProvider {
  async extractStructuredData(text: string, schema: object): Promise<ExtractionResult> {
    // Pattern matching implementation
  }
  getModelVersion() { return 'simulated-v1.0'; }
}

class OpenAIProvider implements AIProvider {
  async extractStructuredData(text: string, schema: object): Promise<ExtractionResult> {
    // OpenAI API call
  }
  getModelVersion() { return 'gpt-4-turbo'; }
}
```

This abstraction allows:
- Switching between simulated and real AI without code changes
- A/B testing different models for quality comparison
- Fallback to simulated extraction if API is unavailable
- Cost optimization by routing to different providers based on load

#### Prompt Engineering Strategy

Use a structured prompt with clear instructions and examples:

```
You are a resume analysis expert. Extract the following information from the resume text:

1. Technical Skills: Identify all technical skills and categorize them (Programming Languages, Frameworks, Tools, Databases, Cloud Platforms, etc.)
2. Soft Skills: Identify both explicitly stated and implied soft skills
3. Experience Level: Calculate total years of professional experience, handling overlapping periods
4. Projects: Extract project names, descriptions, technologies, and durations

Return the data in the following JSON format:
{
  "technicalSkills": [{"name": "...", "category": "...", "confidence": "..."}],
  "softSkills": [{"name": "...", "confidence": "...", "source": "..."}],
  "experienceLevel": {"totalYears": 0, "category": "...", "determined": true},
  "projects": [{"name": "...", "description": "...", "technologies": [...], "duration": "..."}]
}
```

#### Skill Deduplication

- Normalize skill names (lowercase, remove special characters)
- Use fuzzy matching (Levenshtein distance) to identify similar skills
- Consolidate variations (e.g., "JavaScript", "Javascript", "JS" → "JavaScript")

#### Experience Calculation

The system calculates professional experience using explicit rules and assumptions:

**Experience Calculation Rules**:

1. **Full-Time Employment**: Counted at 100% of duration
2. **Internships**: Counted at 50% of duration (0.5x weight)
3. **Part-Time Roles**: Counted at 50% of duration (0.5x weight)
4. **Contract/Freelance**: Counted at 100% of duration if full-time, 50% if part-time
5. **Overlapping Periods**: When multiple roles overlap (e.g., freelance + full-time), count only once at the highest weight
6. **Academic Projects**: Excluded from professional experience calculation unless explicitly marked as "industry collaboration" or "sponsored research"
7. **Volunteer Work**: Excluded from professional experience unless in a professional capacity (e.g., "Pro Bono Consultant")
8. **Co-op Programs**: Counted at 100% of duration (treated as full-time work experience)

**Date Parsing**:
- Parse date ranges from work experience sections
- Handle various date formats (MM/YYYY, Month Year, "Jan 2020", etc.)
- Handle "Present", "Current", or missing end dates (use current date)
- Handle approximate dates ("Summer 2020" → 3 months)

**Overlap Resolution Algorithm**:

```typescript
interface ExperiencePeriod {
  startDate: Date;
  endDate: Date;
  type: 'full-time' | 'internship' | 'part-time' | 'contract';
  weight: number; // 1.0 for full-time, 0.5 for internship/part-time
}

function calculateTotalExperience(periods: ExperiencePeriod[]): number {
  // Sort periods by start date
  const sorted = periods.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  let totalYears = 0;
  let currentPeriodEnd: Date | null = null;
  
  for (const period of sorted) {
    if (!currentPeriodEnd || period.startDate > currentPeriodEnd) {
      // No overlap: add full weighted duration
      totalYears += calculateDuration(period) * period.weight;
      currentPeriodEnd = period.endDate;
    } else {
      // Overlap detected: add only non-overlapping portion at highest weight
      const overlapStart = currentPeriodEnd;
      const overlapEnd = new Date(Math.min(period.endDate.getTime(), currentPeriodEnd.getTime()));
      
      if (period.endDate > currentPeriodEnd) {
        // Add non-overlapping portion
        const nonOverlapDuration = calculateDuration({
          startDate: currentPeriodEnd,
          endDate: period.endDate
        });
        totalYears += nonOverlapDuration * period.weight;
        currentPeriodEnd = period.endDate;
      }
    }
  }
  
  return totalYears;
}
```

**Experience Level Categorization**:
- **Entry**: 0-2 years
- **Mid**: 3-5 years
- **Senior**: 6-10 years
- **Expert**: 10+ years

**Assumptions and Edge Cases**:

- **Internships = 0.5x duration**: Reflects that internships provide valuable but limited experience compared to full-time roles
- **Overlapping freelance + full-time → counted once**: Prevents double-counting when someone freelances while employed full-time
- **Education-only projects do not contribute to years**: Academic projects are valuable for skills but don't count as professional experience
- **Gap years are not counted**: Periods without employment are excluded from calculation
- **Short-term roles (< 1 month)**: Included but may indicate job-hopping if frequent
- **Ambiguous dates**: If only year is provided (e.g., "2020"), assume full year (12 months)
- **Future dates**: If end date is in the future, use current date instead

#### Taxonomy Mapping

- After extraction, query skill taxonomy database
- Use exact match first, then fuzzy match
- If no match found, flag for manual taxonomy addition
- Store both extracted name and canonical ID

### User Interface

**Responsibilities**:
- Display extraction results in editable format
- Show confidence indicators
- Accept user corrections
- Validate user input
- Submit finalized data

**Implementation**:

#### UI State Machine

The user interface follows a state machine pattern to manage the extraction workflow:

```
States:
- Idle: Initial state, ready for file upload
- Uploading: File is being uploaded to server
- Parsing: Resume text is being extracted
- Analyzing: AI is extracting structured data
- Review: User is reviewing and correcting extracted data
- Saving: Finalized data is being stored
- Completed: Process finished successfully
- Error: An error occurred (with retry/manual entry options)

Transitions:
Idle → Uploading (user selects file)
Uploading → Parsing (upload complete)
Parsing → Analyzing (text extracted)
Analyzing → Review (extraction complete)
Review → Saving (user confirms)
Saving → Completed (storage successful)
Any State → Error (on failure)
Error → Idle (user retries)
Error → Review (user chooses manual entry)
```

This state machine ensures:
- Clear user feedback at each stage
- Proper error handling and recovery
- Prevention of invalid state transitions
- Consistent UI behavior

#### Review Interface Design

Display extracted data in sections:
1. Technical Skills (grouped by category, with confidence badges)
2. Soft Skills (with confidence badges)
3. Experience Level (with calculated years)
4. Projects (with all available fields)

Each section allows:
- Editing existing items
- Adding new items
- Removing items
- Confidence indicators (color-coded: green=high, yellow=medium, red=low)

#### Validation Rules

- Technical skills: Non-empty string, max 100 characters
- Soft skills: Non-empty string, max 100 characters
- Experience years: Non-negative number
- Project name: Max 200 characters
- Project description: Max 2000 characters

#### Progress Feedback

- Show spinner during upload
- Display "Parsing resume..." during text extraction
- If parser confidence is low, show "Trying alternative parsing method..."
- Display "Analyzing content..." during AI extraction
- Show progress bar if processing exceeds 10 seconds
- Display "Finalizing results..." during data storage
- If parser confidence is low, show warning banner: "Complex resume format detected. Please review extracted information carefully."

### Data Store

**Responsibilities**:
- Persist extraction results to LocalStorage
- Maintain current and archived extractions
- Handle concurrent updates
- Ensure data consistency
- Provide utilities for cross-feature data access

**Implementation**:

#### Storage Technology

Use browser LocalStorage for client-side persistence. Implement store.js utility module for centralized data management.

#### Storage Strategy

```javascript
// store.js - Centralized LocalStorage management
const STORAGE_KEY = 'careerpilot_user_profile';

class DataStore {
  getUserProfile() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : this.createDefaultProfile();
  }
  
  saveExtractionResult(extractionResult) {
    const profile = this.getUserProfile();
    
    // Archive current extraction
    if (profile.resumeData.currentExtraction) {
      profile.resumeData.extractionHistory.unshift(profile.resumeData.currentExtraction);
      profile.resumeData.extractionHistory = profile.resumeData.extractionHistory.slice(0, 3); // Keep last 3
    }
    
    // Set new extraction as current
    profile.resumeData.currentExtraction = extractionResult;
    profile.updatedAt = new Date().toISOString();
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    
    // Trigger platform-wide updates
    this.notifyFeatures('resume_updated', extractionResult);
  }
  
  notifyFeatures(event, data) {
    // Dispatch custom event for other features to listen
    window.dispatchEvent(new CustomEvent('careerpilot:' + event, { detail: data }));
  }
  
  clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    // Clear other CareerPilot data
  }
}

export const dataStore = new DataStore();
```

#### Platform Integration

Other CareerPilot features listen for data updates:

```javascript
// In skill-gap.html
window.addEventListener('careerpilot:resume_updated', (e) => {
  const skills = e.detail.technicalSkills;
  updateSkillGapVisualization(skills);
});

// In dashboard.html
window.addEventListener('careerpilot:resume_updated', (e) => {
  updateProfileCompletionPercentage();
  updateSkillsCount(e.detail.technicalSkills.length);
});
```

#### LocalStorage Quota Management

- LocalStorage limit: ~5-10MB (varies by browser)
- Resume data typically: < 100KB
- Monitor storage usage and warn user if approaching limit
- Implement data cleanup for old extraction history

#### Data Consistency

- Use try-catch for all LocalStorage operations
- Validate data structure before saving
- Implement data migration for schema changes
- Provide export/import functionality for backup

### Error Handler

**Responsibilities**:
- Catch and log errors from all components
- Provide user-friendly error messages
- Implement retry logic
- Track error patterns for monitoring

**Implementation**:

#### Error Categories

1. **Validation Errors**: User-facing, no retry needed
2. **Parsing Errors**: Offer manual entry fallback
3. **AI Extraction Errors**: Retry with exponential backoff (max 3 attempts)
4. **Storage Errors**: Retry with exponential backoff (max 3 attempts)
5. **Network Errors**: Preserve state, allow resumption

#### Error Messages

Map technical errors to user-friendly messages:
- "Unable to process resume. Please try again."
- "Resume format not supported. Please ensure your file is a valid PDF or DOC/DOCX."
- "Service temporarily unavailable. Please try again in a few moments."

#### Logging

Log all errors with:
- Timestamp
- User ID (anonymized in logs)
- Component name
- Error type and message
- Stack trace
- Request context

## API Design

### Client-Side Module Interface

Since CareerPilot AI is frontend-only, there are no REST APIs. Instead, modules expose JavaScript functions:

#### Resume Upload and Processing

```javascript
// In resume.html or resume-handler.js
async function handleResumeUpload(file) {
  // 1. Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    showError(validation.error);
    return;
  }
  
  // 2. Parse resume
  showProgress('Parsing resume...');
  const parseResult = await parseResume(file);
  
  if (parseResult.confidence === 'low') {
    showWarning('Complex resume format detected. Please review carefully.');
  }
  
  // 3. Extract data
  showProgress('Analyzing content...');
  const extractionResult = await extractResumeData(parseResult.text);
  
  // 4. Show review interface
  displayExtractionResults(extractionResult);
}
```

#### Data Store Interface

```javascript
// store.js exports
export function saveExtractionResult(extractionResult);
export function getUserProfile();
export function getExtractionHistory();
export function clearAllData();
export function exportData(); // For backup
export function importData(jsonData); // For restore
```

#### Cross-Feature Communication

```javascript
// Event-based communication
window.dispatchEvent(new CustomEvent('careerpilot:resume_updated', { 
  detail: extractionResult 
}));

// Other features listen:
window.addEventListener('careerpilot:resume_updated', handleResumeUpdate);
```

### Future: Backend API Design (Production)

When backend integration is added:

```
POST /api/resume/upload
Content-Type: multipart/form-data
Request: { file: File, userId: string }
Response: { extractionId: string, status: 'pending' }

GET /api/resume/extraction/{extractionId}
Response: { status: 'completed', result: ExtractionResult }

PUT /api/resume/extraction/{extractionId}
Request: { correctedData: ExtractionResult }
Response: { success: true }
```

## Security Considerations

### Data Privacy (Frontend-Only Architecture)

- Store all data in browser LocalStorage (data never leaves user's device)
- No server transmission in current implementation
- User has full control to delete data via profile.html settings
- Display privacy notice explaining local-only storage
- When backend is added: implement encryption, authentication, and consent management

### Input Validation and XSS Prevention

- Validate file types using File API and magic numbers
- Sanitize all user input before rendering to DOM
- Use textContent instead of innerHTML where possible
- Escape HTML entities in user-corrected data
- Implement Content Security Policy (CSP) headers

### LocalStorage Security

- Data is origin-isolated (only CareerPilot can access)
- Vulnerable to XSS attacks (mitigated by input sanitization)
- Not suitable for highly sensitive data (acceptable for resume data)
- Consider encryption for sensitive fields in future versions

### File Upload Security

- Validate file size and type before processing
- Use sandboxed iframe for PDF rendering if needed
- Limit file processing to prevent DoS attacks
- Scan for malicious content patterns (future enhancement)

## Performance Optimization

### Target Performance

- File upload: < 1 second (local file reading)
- Text extraction: < 5 seconds (client-side parsing)
- AI extraction: < 10 seconds (simulated, instant; real AI: < 20 seconds)
- Total processing time: < 30 seconds (Requirement 11.1)
- Page load time: < 2 seconds (with lazy loading)

### Optimization Strategies

1. **Lazy Loading**: Load PDF.js and Mammoth.js only when user uploads a file
2. **Web Workers**: Offload parsing to background thread to keep UI responsive
3. **Caching**: Cache skill taxonomy in memory after first load
4. **Debouncing**: Debounce user corrections to reduce LocalStorage writes
5. **Code Splitting**: Load resume.html assets separately from main app
6. **Minification**: Minify CSS and JS for production
7. **Progressive Enhancement**: Show partial results as extraction progresses

### Client-Side Performance

```javascript
// Use Web Worker for heavy parsing
const parserWorker = new Worker('parser-worker.js');
parserWorker.postMessage({ file: fileData });
parserWorker.onmessage = (e) => {
  const parsedText = e.data;
  continueExtraction(parsedText);
};

// Lazy load libraries
async function loadPDFParser() {
  if (!window.pdfjsLib) {
    await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  }
  return window.pdfjsLib;
}
```

### Monitoring

- Track processing time for each component using Performance API
- Log slow operations (> 5 seconds) to console
- Display progress feedback if processing exceeds 10 seconds
- Monitor LocalStorage usage and warn if approaching limit

## Testing Strategy

### Unit Tests

- File Validator: Test format validation, size limits, corruption detection
- Resume Parser: Test text extraction from various formats, confidence scoring
- AI Extractor: Test skill deduplication, taxonomy mapping, experience calculation with various role types
- Experience Calculator: Test overlap handling, weight application (internships, part-time), edge cases (gaps, future dates)
- Data Store: Test CRUD operations, archiving logic

### Integration Tests

- End-to-end upload and extraction flow
- Error handling and recovery
- User correction and storage flow

### Property-Based Tests

Property-based tests will be defined to verify correctness properties across the system.

## Correctness Properties

### Property 1: File Validation Consistency
**Validates: Requirement 1.1, 1.2**

For all uploaded files:
- IF file format is PDF, DOC, or DOCX AND file size ≤ 10MB, THEN validation succeeds
- IF file format is not PDF, DOC, or DOCX OR file size > 10MB, THEN validation fails with appropriate error

### Property 2: Skill Deduplication Idempotence
**Validates: Requirement 2.4**

For any list of skills with duplicates:
- Applying deduplication once produces the same result as applying it multiple times
- The deduplicated list contains no semantic duplicates
- All unique skills from the original list are preserved

### Property 3: Experience Overlap Handling
**Validates: Requirement 4.2**

For any set of employment periods:
- Total calculated experience ≤ sum of all individual period durations
- Overlapping periods are counted only once at the highest weight
- Non-overlapping periods are summed correctly with appropriate weights
- Internships contribute 0.5x their duration
- Part-time roles contribute 0.5x their duration
- Full-time roles contribute 1.0x their duration
- Academic projects do not contribute to professional experience

### Property 4: Data Storage Consistency
**Validates: Requirement 7.1, 7.2, 7.3**

For any user:
- After storing extraction result, retrieving data returns the same result
- After uploading new resume, previous extraction is archived
- Current extraction always reflects the most recent upload

### Property 5: Error Recovery Completeness
**Validates: Requirement 8.2, 8.3**

For any error during extraction:
- System provides user-friendly error message
- System offers retry or manual entry option
- No partial data is stored without user confirmation

### Property 6: Taxonomy Mapping Consistency
**Validates: Requirement 2.3**

For any extracted skill:
- If skill matches taxonomy entry, canonical ID is assigned
- Same skill name always maps to same canonical ID
- Mapping is case-insensitive and handles common variations

### Property 7: Confidence Score Validity
**Validates: Requirement 6.2**

For all extracted items:
- Confidence score is one of: 'high', 'medium', 'low'
- Items mentioned multiple times have higher confidence than single mentions
- Confidence scores are consistent across extraction runs for identical input

### Property 8: User Correction Preservation
**Validates: Requirement 6.3, 6.4, 6.5**

For any user corrections:
- Modified items reflect user changes exactly
- Added items appear in final stored data
- Removed items do not appear in final stored data
- Original extraction is not modified until user confirms

### Property 9: Parser Confidence Accuracy
**Validates: Resume Parser confidence scoring**

For any parsed resume:
- Parser confidence score accurately reflects parsing quality
- Low confidence resumes trigger fallback strategies
- High confidence resumes have minimal formatting artifacts
- Confidence score correlates with extraction accuracy

## Future Enhancements

The following features are out of scope for this design but may be added in future iterations:

- Skill gap analysis
- Personalized learning roadmaps
- Learning resource recommendations
- Skill assessments and badges
- AI-powered interview analysis
- Progress tracking and resume updating
- Multi-language resume support
- Real-time collaborative editing
- Resume comparison and versioning
- Export to standard formats (JSON Resume, LinkedIn, etc.)

## Open Questions

1. **AI Model Selection**: Should we use OpenAI GPT-4, Anthropic Claude, or an open-source model? Trade-offs include cost, latency, and data privacy.

2. **Skill Taxonomy Source**: Should we build our own taxonomy or use an existing one (e.g., O*NET, LinkedIn Skills)?

3. **Resume Retention**: How long should we keep uploaded resume files? Delete immediately after extraction or retain for re-processing?

4. **Confidence Threshold**: Should we automatically flag low-confidence items for user review, or display all items equally?

5. **Concurrent Uploads**: Should we allow users to upload multiple resumes simultaneously, or enforce one-at-a-time processing?

## Dependencies

### External Libraries (CDN)
- **PDF.js** (Mozilla): Client-side PDF parsing
- **Mammoth.js**: Client-side DOC/DOCX parsing
- **Inter Font** (Google Fonts): Typography

### CareerPilot Modules
- **store.js**: LocalStorage management
- **skills.js**: Skill taxonomy and utilities
- **sidebar.js**: Navigation component
- **ui.js**: UI helpers and notifications
- **effects.js**: Visual effects and animations
- **main.js**: Core application logic

### Browser APIs
- **File API**: File upload and reading
- **LocalStorage API**: Data persistence
- **Web Workers API**: Background processing (optional)
- **Performance API**: Timing and monitoring
- **Custom Events API**: Cross-feature communication

### Future Dependencies (Backend Integration)
- AI/LLM API (OpenAI, Anthropic, or similar)
- Cloud storage (AWS S3, Azure Blob, or similar)
- Database (MongoDB, PostgreSQL, or similar)
- Authentication service (Auth0, Firebase Auth, or similar)

## Deployment Considerations

### Hackathon Deployment (Current)

**Static Hosting**: Deploy as static site to:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront

**No Backend Required**: All processing happens client-side

**Deployment Steps**:
1. Minify CSS and JS files
2. Upload to static hosting service
3. Configure custom domain (optional)
4. Enable HTTPS

### Production Deployment (Future)

**Frontend**: Same static hosting as above

**Backend**: 
- API server (Node.js/Express, Python/Flask, or similar)
- AI service integration (OpenAI, Anthropic)
- Database (MongoDB Atlas, PostgreSQL on AWS RDS)
- Authentication (Auth0, Firebase Auth)

**Scalability**:
- CDN for static assets
- Serverless functions for API endpoints
- Auto-scaling for AI processing
- Database replication for high availability

**Monitoring**:
- Application performance monitoring (Sentry, LogRocket)
- Error tracking and logging
- User analytics (Google Analytics, Mixpanel)
- Uptime monitoring

**Disaster Recovery**:
- Database backups (daily, retained for 30 days)
- Multi-region deployment for high availability
- Graceful degradation if AI service is unavailable

## Conclusion

This design provides a pragmatic, frontend-focused solution for resume analysis within the CareerPilot AI platform. The client-side architecture eliminates backend complexity for the hackathon demo while maintaining a clear path to production deployment with real AI integration.

**Key Strengths**:
- ✅ Works entirely in the browser (no backend required)
- ✅ Fast processing with instant feedback
- ✅ Privacy-focused (data stays on user's device)
- ✅ Seamless integration with other CareerPilot features
- ✅ Production-ready architecture with clear upgrade path
- ✅ Responsive design matching CareerPilot's visual identity
- ✅ Accessible worldwide with offline capability

**Hackathon Demo Ready**: The simulated AI extraction provides a working prototype that demonstrates the complete user flow and platform integration.

**Production Ready**: The modular architecture and provider abstraction enable easy transition to real AI backend when ready to scale.

---

## UI/UX Component Specifications (NEW)

### Toast Notification System

**Component**: `js/toast-notifications.js`

**Purpose**: Provide non-intrusive feedback for user actions with auto-dismissible notifications.

**Features**:
- 4 notification types: success (green), error (red), warning (yellow), info (blue)
- Auto-dismiss after 3 seconds with manual close option
- Stackable notifications in top-right corner
- Smooth slide-in/fade-out animations
- ARIA live regions for screen reader accessibility

**API**:
```javascript
showToast(message, type, duration);
// Example: showToast('Resume uploaded successfully!', 'success');
```

**Styling**:
- Uses CSS variables from design system
- Glassmorphism backdrop filter
- Icon indicators for each type
- Z-index: 10000 (top layer)
- Mobile-responsive positioning

---

### Loading States System

**Component**: `js/loading-states.js`

**Purpose**: Provide visual feedback during asynchronous operations.

**Features**:
1. **Full Page Overlay**: Blur backdrop with centered spinner and custom message
2. **Skeleton Screens**: Shimmer effect placeholders for content
3. **Button Loading States**: Inline spinners with disabled state
4. **Card Loading**: Shimmer animation overlay

**API**:
```javascript
showLoader('Analyzing resume...');
hideLoader();
setButtonLoading(buttonElement, true/false);
createSkeleton('text' | 'title' | 'card' | 'circle');
```

**Performance**: Uses CSS-only animations (60fps guaranteed)

---

### Page Transition Animations

**Component**: `css/page-transitions.css`

**Purpose**: Smooth, professional page load experience.

**Animations**:
- Page fade-in on load (0.4s)
- Card slide-up with stagger delay (0.1s, 0.2s, 0.3s)
- Sidebar slide-in from left (0.4s)
- Modal zoom-in (0.3s cubic-bezier)
- Respects `prefers-reduced-motion` accessibility setting

**Implementation**: Pure CSS with `@keyframes`, no JavaScript overhead.

---

### Micro-Interactions

**Component**: `css/micro-interactions.css`

**Purpose**: Add delightful feedback to user interactions.

**Interactions**:
1. **Button Ripple Effect**: Expanding circle on click using ::after pseudo-element
2. **Hover Lift**: translateY(-2px) + shadow enhancement
3. **Active Scale**: scale(0.98) on button press
4. **Input Focus Glow**: 3px shadow in accent color
5. **Link Underline Animation**: Width transition from 0 to 100%
6. **Icon Bounce**: translateY animation on hover
7. **Checkbox Scale**: scale(1.1) when checked

**Performance**: Hardware-accelerated transforms, no layout thrashing.

---

### Mobile Optimization

**Components**: 
- `css/mobile-responsive.css`
- `js/mobile-menu.js`

**Purpose**: Provide excellent mobile experience with touch-friendly interactions.

**Features**:

1. **Hamburger Menu**:
   - Fixed position button (top-left, 44x44px)
   - 3-bar animated icon transforms to X
   - Toggles sidebar visibility with slide animation
   - Auto-creates on mobile devices

2. **Sidebar Overlay**:
   - Dark backdrop with blur
   - Closes on tap outside
   - Slide-in animation from left
   - Box shadow for depth

3. **Touch Targets**:
   - Minimum 44x44px for all interactive elements
   - Increased padding on links and buttons
   - Larger font sizes (16px minimum)

4. **Responsive Breakpoints**:
   - Mobile: < 768px (hamburger menu)
   - Tablet: 769-1024px (narrow sidebar)
   - Desktop: > 1024px (full sidebar)

5. **Bottom Navigation** (optional alternative):
   - Fixed 64px height bar
   - Icon + label layout
   - 5-item limit for optimal UX

**Mobile-Specific Styles**:
- Full-width modals (95% viewport)
- Stacked footer layout
- Padding adjustments for content

---

### Keyboard Navigation & Accessibility

**Component**: `js/keyboard-nav.js`

**Purpose**: Provide full keyboard control and screen reader support.

**Keyboard Shortcuts**:
- **Esc**: Close modals, menus, overlays
- **Tab/Shift+Tab**: Navigate interactive elements
- **Arrow Up/Down**: Navigate sidebar links
- **Ctrl+K / Cmd+K**: Focus search input (if present)

**Accessibility Features**:

1. **Focus Management**:
   - Visible focus indicators (2px outline)
   - Skip-to-content link (appears on Tab)
   - Focus trap in modals
   - Focus return after modal close

2. **ARIA Labels**:
   - Auto-added to buttons without text
   - Navigation landmarks (`role="navigation"`)
   - Main content (`role="main"`)
   - Live regions for dynamic content

3. **Screen Reader Support**:
   - Semantic HTML5 elements
   - Alt text on images
   - aria-label for icons
   - aria-expanded for collapsibles
   - aria-hidden for decorative elements

4. **Color Contrast**:
   - WCAG AA compliant
   - Text: #ffffff on dark backgrounds
   - Links: #3B82F6 (4.5:1 ratio)

---

### Enhanced Footer

**Updated in**: `css/styles.css` (lines 472-567)

**Enhancements**:
- Gradient background: `linear-gradient(180deg, transparent, rgba(15,20,25,0.5))`
- Link hover effects: translateY(-2px) + underline animation
- Social icon lift: translateY(-4px) + blue glow shadow
- Mobile-responsive: stacked layout below 768px
- Glassmorphism on icon containers

**Layout**:
- Max-width container (var(--container-max))
- Flexbox row with space-between alignment
- Footer links with gap spacing
- Social icons in 36x36px containers

---

### Custom 404 Page

**File**: `404.html`

**Features**:
- Large animated 404 number with gradient text
- Floating emoji animation (keyframe-based)
- Action buttons: "Go Home" and "Go Back"
- Popular pages quick links
- Fully styled standalone page

**Animations**:
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
```

---

### Empty State Templates

**File**: `templates/empty-states.md`

**Purpose**: Engaging placeholders for content-less pages.

**Structure**:
- Large emoji icon with float animation
- Title and description text
- Call-to-action button
- Dashed border container

**Usage**: Copy HTML snippets for:
- Dashboard without data
- Resume before upload
- Roadmap before generation
- Interview history when empty

**Styling**: Consistent with design system, reusable classes.

---

### Animated Number Counters

**Component**: `js/counter-animation.js`

**Purpose**: Animate statistics from 0 to target value.

**Implementation**:
- Easing function: ease-out cubic
- Duration: 1-1.5s
- Scroll-triggered via IntersectionObserver
- Prevents re-animation (data-animated flag)

**API**:
```javascript
animateNumber(element, targetValue, duration, suffix);
// Auto-init via data attributes:
<div data-counter="85" data-suffix="%">0%</div>
```

**Use Cases**:
- Dashboard statistics
- Readiness score updates
- Progress percentages
- Task completion counts

---

## Updated Tech Stack

**Frontend UI/UX**:
- Custom toast notification system
- Loading state management
- Page transition animations
- Micro-interaction CSS
- Mobile-first responsive design
- Keyboard navigation system
- ARIA accessibility enhancements
- Animated number counters
- Custom 404 handling
- Empty state templates

**CSS Architecture**:
- Modular CSS files for each system
- CSS custom properties (variables)
- BEM-style naming conventions
- Mobile-first media queries
- Hardware-accelerated animations

**JavaScript Patterns**:
- Class-based components
- Global utility functions
- Event delegation
- IntersectionObserver APIs
- Progressive enhancement

---

## Performance Considerations

**Animation Performance**:
- CSS-only animations where possible (GPU-accelerated)
- Transform and opacity properties (no layout thrashing)
- RequestAnimationFrame for JavaScript animations
- Reduced motion media query support

**Bundle Size**:
- No external UI libraries (vanilla JS)
- Modular CSS (load only what's needed)
- Lazy initialization of heavy components
- Total added size: ~25KB (minified)

**Runtime Performance**:
- Event delegation for dynamic content
- Debounced resize handlers
- Passive event listeners for scroll
- Intersection Observer for scroll-based triggers

---

