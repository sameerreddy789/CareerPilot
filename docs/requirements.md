# Requirements Document: Resume Analysis & Interview Validation Feature

## Introduction

This document specifies the requirements for the resume analysis and interview validation feature within **NextStep AI** (formerly CareerPilot AI), an AI-powered interview prep platform built for Hackathon 2026.

**Platform Vision**: "We don't help students prepare more — we help them prepare correctly."

**Core Problem**: 70% of college students fail technical interviews not because they lack knowledge, but because they don't know what to study next, practice random topics, and have no way to validate their resume claims.

**Platform Philosophy**: NextStep AI follows a continuous loop: **ASSESS → PLAN → PRACTICE → MEASURE → ADJUST → REPEAT**

**This Feature's Role**: The resume analysis feature (resume.html) implements the **interview-aware workflow** (not interview-first):
```
Resume Upload → Instant Analysis → Results Display → CTA: "Take Instant Interview" → Validation → Readiness Score → Personalized Roadmap
```

**Key Innovation**: "We don't trust static resumes — we use live Gemini AI multimodal analysis to extract the truth, then validate it through adaptive interviewing."

**Architecture Approach**: Advanced client-side application using **Vanilla JavaScript** (ES6+) for high performance, **Google Gemini AI** for multimodal intelligence, and **SerpAPI** for real-time market data. Frontend-heavy with Firebase/Firestore for secure persistence.

The system performs deep AI analysis of resumes, conducts adaptive mock interviews with performance evaluation, calculates readiness scores across 100+ dimensions, and generates 6-week personalized roadmaps with language-aware resource curation.

## Platform Context

**NextStep AI** is a hybrid frontend application built with:
- **HTML5, CSS3, JavaScript (ES6+)** - Vanilla JS for most pages
- **React Components** - Used where interactivity demands it (code editor, complex UI)
- **LocalStorage** - Client-side data persistence
- **Web APIs** - Speech recognition (Web Speech API), file handling
- **Kiro Editor** - Code editing experience for interview questions
- **Responsive Design** - Dark theme with glassmorphism effects

**Why Hybrid Stack?**
> "We use vanilla JS for most pages to keep things lightweight, and React components where interactivity demands it. No backend needed - proving this works even under low connectivity."

**Target Audience**: Students, freshers, and career switchers worldwide
- 🎓 **Students**: "I don't know what companies expect"
- 🌱 **Freshers**: "I freeze in interviews"
- 🔄 **Career Switchers**: "I need a structured path"

**Core Differentiators**:
1. **Interview-Aware Validation** - Encourage (not force) interview validation with strong CTA
2. **Readiness Score (0-100)** - Always visible in sidebar, updates live, transparent reasons
3. **Language-Aware Learning** - 13+ languages supported (language as learning constraint)
4. **Sequence Over Content** - Tell users WHAT, WHEN, WHY (not just resources)
5. **Prompt-Based Editing** - Natural language roadmap customization
6. **Time Compression** - Weeks of random prep → focused hours (e.g., "2h 15m to 80%")

## Scope and Non-Goals

This document covers the resume upload, simulated analysis, results display, interview encouragement, and structured storage within the NextStep AI platform.

**In Scope**:
- Resume upload and validation (resume.html)
- Simulated AI-powered skill extraction (demo data for hackathon)
- Results display with organized sections (skills, experience, projects)
- **Strong CTA to take validation interview (optional but encouraged)**
- Resume score, skill coverage, job readiness calculation
- LocalStorage-based data persistence
- Integration with readiness scoring system
- Integration with NextStep AI's data model
- **Production Deployment via Firebase Hosting**

**Out of Scope** (covered by other platform features):
- Interview module - full practice engine (interview.html)
- Interview feedback and scoring (feedback.html)
- Readiness score calculation algorithm (dashboard.html, sidebar.js)
- Skill gap visualization (skill-gap.html)
- Personalized roadmap generation with prompt-based editing (roadmap.html)
- Progress tracking with GitHub-style heatmap (tracker.html)
- Language-aware resource curation (roadmap.html)
- Job board integration
- Real AI backend integration (future enhancement)

These features exist in the platform but are specified separately.

## Glossary

- **NextStep AI**: AI-powered interview prep platform (formerly CareerPilot AI)
- **Interview-Aware Workflow**: Resume upload → analysis → results → CTA to interview (optional but encouraged)
- **Readiness Score**: 0-100 metric showing exact interview preparedness, always visible in sidebar
- **Simulated Analysis**: Pattern matching and demo data used for hackathon (future: real AI)
- **Language-Aware Learning**: Resources curated in user's native language (13+ languages supported)
- **Prompt-Based Editing**: Natural language roadmap customization (e.g., "10 days, Hindi, DSA focus")
- **Time-to-Ready**: Estimated hours needed to reach target readiness (e.g., "2h 15m to 80%")
- **Hybrid Stack**: Vanilla JS for most pages + React components where needed
- **Resume_Parser**: Simulated extraction component (uses demo data for hackathon)
- **Interview_Module**: Conducts mock interviews (technical/behavioral/mixed) with 3 answer methods
- **Skill_Gap_Analyzer**: Compares user skills vs market requirements for target role
- **Roadmap_Generator**: Creates personalized 6-week learning plan with language filtering
- **User_Interface**: The resume.html page that displays extracted data and CTA to interview
- **Data_Store**: LocalStorage-based persistence layer (store.js utilities)
- **File_Validator**: Component that validates uploaded file formats and content
- **Readiness_Calculator**: Calculates 0-100 score from resume, skills, experience, interviews
- **User_Profile**: Centralized user data object stored in LocalStorage

## Requirements

### Requirement 1: File Upload and Validation

**User Story:** As a NextStep AI user, I want to upload my resume in common formats from the resume.html page, so that the system can analyze my skills and display results with a clear path to validation.

#### Acceptance Criteria

1. WHEN a user uploads a file on resume.html, THE File_Validator SHALL verify the file format is PDF or DOC/DOCX
2. WHEN a user uploads a file exceeding 10MB, THE File_Validator SHALL reject the upload and return a descriptive error message with glassmorphism-styled notification
3. WHEN a valid file is uploaded, THE System SHALL trigger simulated analysis (demo data for hackathon)
4. IF the uploaded file is corrupted or unreadable, THEN THE System SHALL return an error message and offer to use demo resume
5. WHEN file upload fails, THE User_Interface SHALL display the error message with retry option, maintaining NextStep AI's dark theme design
6. THE system SHALL support drag-and-drop file upload in addition to file picker
7. WHEN upload begins, THE System SHALL show animated "analyzing" section with progress indication
8. THE System SHALL persist the uploaded resume filename and upload timestamp for tracking purposes
9. THE System SHALL provide a "Use Demo Resume" option for users who want to explore without uploading

### Requirement 2: Simulated Resume Analysis (Hackathon MVP)

**User Story:** As a NextStep AI user, I want the system to analyze my resume and show me what skills I have, what's missing, and my overall readiness, so I can understand where I stand.

#### Acceptance Criteria

1. WHEN resume upload completes, THE System SHALL display simulated analysis results using demo data
2. THE analysis SHALL show three categories of skills: Present (✓ green), Partial (◐ yellow), Missing (✗ red)
3. THE System SHALL calculate and display: Resume Score (0-100), Skill Coverage (%), Job Readiness (%)
4. THE System SHALL extract and display experience timeline with title, company, duration
5. THE System SHALL extract and display projects with name and tech stack
6. THE results SHALL be organized in clear sections: Stats Grid, Skills Found, Missing Skills, Experience, Projects
7. THE System SHALL use realistic demo data that represents common resume patterns
8. THE analysis SHALL complete within 3 seconds to maintain user engagement
9. THE System SHALL store analysis results in LocalStorage as 'careerPilot_resume'

### Requirement 3: Interview Encouragement CTA (Interview-Aware, Not Interview-First)

**User Story:** As a NextStep AI user, I want to see a clear call-to-action to validate my resume through an interview, so I can get verified skills for my roadmap.

#### Acceptance Criteria

1. WHEN analysis results are displayed, THE System SHALL show a prominent warning: "⚠️ Resume Claims Need Validation"
2. THE System SHALL display a large, glowing CTA button: "Take Instant Interview →"
3. THE CTA button SHALL redirect to interview.html when clicked
4. THE interview SHALL be optional but strongly encouraged (not mandatory)
5. THE System SHALL allow users to proceed to other features without taking the interview
6. THE System SHALL display a message: "For best results, validate your skills through an interview"
7. IF user skips interview, THE System SHALL use resume data (unverified) for roadmap generation
8. THE System SHALL track whether user has taken validation interview in LocalStorage

### Requirement 4: Results Display and Organization

**User Story:** As a NextStep AI user, I want to see my resume analysis results organized clearly with visual indicators, so I can quickly understand my strengths and gaps.

#### Acceptance Criteria

1. THE results page SHALL display a stats grid with four key metrics: Resume Score, Skill Coverage, Missing Skills Count, Job Readiness
2. THE stats SHALL use large numbers with descriptive labels and appropriate icons
3. THE "Skills Found" section SHALL display green badges (✓) for each present skill
4. THE "Missing Skills" section SHALL display red badges (✗) for each missing skill
5. THE "Experience" section SHALL display a timeline with job title, company, and duration
6. THE "Projects" section SHALL display cards with project name and tech stack
7. ALL sections SHALL use glassmorphism card effects matching NextStep AI's design system
8. THE page SHALL be responsive and work on mobile devices
9. THE page SHALL include smooth scroll animations when sections appear

### Requirement 5: Data Persistence and Storage

**User Story:** As a NextStep AI user, I want my resume data stored locally, so it's available across all platform features without requiring re-upload.

#### Acceptance Criteria

1. WHEN analysis completes, THE Data_Store SHALL persist resume data to LocalStorage with key 'careerPilot_resume'
2. THE stored data SHALL include: score, coverage, readiness, skills (present/partial/missing), experience, projects
3. THE Data_Store SHALL maintain the most recent analysis, replacing previous data on new upload
4. THE stored data SHALL be accessible to other NextStep AI features: skill-gap.html, roadmap.html, dashboard.html
5. THE Data_Store SHALL implement the store.js utility module for centralized LocalStorage management
6. WHEN storage fails (LocalStorage quota exceeded), THE System SHALL display an error and suggest clearing old data
7. THE System SHALL provide a way to export resume data as JSON for backup
8. THE System SHALL track upload timestamp and filename in metadata
6. WHEN a user confirms the data, THE User_Interface SHALL submit the finalized extraction result for storage

### Requirement 6: Gemini AI Service (CORE)

**User Story:** As a system component, I want a centralized AI service to handle complex analysis and evaluation, so that the platform can provide intelligent insights.

#### Acceptance Criteria
1. THE System SHALL implement GeminiService to interact with Google's Gemini-1.5-Flash model.
2. THE Service SHALL support multimodal input (PDF resumes) for direct AI analysis without manual text extraction.
3. THE Service SHALL implement exponential backoff retry logic for rate-limited (429) requests.
4. THE Service SHALL provide structured JSON outputs for: Resume Analysis, Interview Questions, Answer Evaluation, and Market Skill Categorization.
5. THE Service SHALL provide high-quality fallback data in case of AI service unavailability or network failure.

### Requirement 7: Adaptive Interview Engine (ENHANCED)

**User Story:** As a user, I want an interview experience that adapts to my performance and provides instant feedback, so I can improve effectively.

#### Acceptance Criteria
1. THE InterviewEngine SHALL dynamically select questions based on the candidate's target role and resume-claimed skills.
2. THE Engine SHALL support "Mixed" mode (Technical + Behavioral) and "Specialized" modes.
3. THE Engine SHALL implement "Speaker Toggle" for AI-guided voice interviews using Web Speech API.
4. THE Engine SHALL provide per-question evaluation immediately after submission, showing score, feedback, and reasoning.
5. THE Engine SHALL simulate live proctoring with webcam feed and behavioral tracking.
6. THE Engine SHALL implement "Auto-Save" to LocalStorage every 10 seconds to prevent data loss.

### Requirement 8: Live Market Gap Analysis (ENHANCED)

**User Story:** As a user, I want to see how my skills stack up against real-time industry demands, so I can focus on what matters.

#### Acceptance Criteria
1. THE System SHALL use SerpAPI to fetch live job market trends and role requirements.
2. THE SkillGapAnalyzer SHALL compare live market data with the user's verified skills using Gemini AI.
3. THE Analyzer SHALL categorize gaps into: Must-Have, Good-to-Have, and Future-Proof.
4. THE Analyzer SHALL provide AI-generated "Market Relevance Justifications" for each identified skill.
5. THE User_Interface SHALL allow users to manually refresh analysis for different roles.

### Requirement 8: Error Handling and Recovery

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and can take corrective action.

#### Acceptance Criteria

1. WHEN any component encounters an error, THE System SHALL log the error with sufficient detail for debugging
2. WHEN an error occurs during extraction, THE User_Interface SHALL display a user-friendly error message and offer to retry
3. WHEN the AI_Extractor fails to extract meaningful data, THE User_Interface SHALL allow the user to manually enter their information
4. WHEN network connectivity is lost during upload, THE System SHALL preserve the upload state and allow resumption when connectivity is restored
5. IF multiple consecutive errors occur, THEN THE System SHALL provide contact information for user support

### Requirement 9: Resume Format Handling

**User Story:** As a user, I want the system to handle various resume formats and layouts, so that my resume is processed regardless of how I formatted it.

#### Acceptance Criteria

1. WHEN a resume uses a multi-column layout, THE Resume_Parser SHALL extract text in logical reading order
2. WHEN a resume contains tables, THE Resume_Parser SHALL extract table content and preserve structural relationships
3. WHEN a resume includes images or graphics, THE Resume_Parser SHALL skip non-text content and process only textual information
4. WHEN a resume uses non-standard fonts or formatting, THE Resume_Parser SHALL extract the underlying text content
5. WHEN text extraction produces garbled or malformed output, THE System SHALL notify the user that the resume format may not be supported

### Requirement 10: Data Privacy and Security

**User Story:** As a CareerPilot AI user, I want my resume data to be handled securely, so that my personal information is protected.

#### Acceptance Criteria

1. THE System SHALL store all data in the browser's LocalStorage, ensuring data remains on the user's device only
2. THE System SHALL not transmit resume data to external servers in the current implementation (frontend-only)
3. THE System SHALL allow users to delete their uploaded resume and extracted data from profile.html settings
4. THE System SHALL provide a "Clear All Data" option that removes all LocalStorage entries for the user
5. THE System SHALL display a privacy notice explaining that data is stored locally and not transmitted
6. WHEN backend integration is added (future enhancement), THE System SHALL not use resume data for AI training without explicit user consent
7. THE System SHALL implement basic XSS protection by sanitizing user inputs before rendering

### Requirement 11: Performance and Responsiveness

**User Story:** As a CareerPilot AI user, I want resume analysis to complete quickly, so that I can proceed to other platform features without delay.

#### Acceptance Criteria

1. THE System SHALL complete resume extraction within 30 seconds under normal conditions
2. IF extraction exceeds expected time, THE User_Interface SHALL display progress feedback with animated loading states matching CareerPilot's design system
3. THE extraction process SHALL be asynchronous and non-blocking, allowing users to navigate to other pages
4. THE resume.html page SHALL be responsive and work seamlessly on desktop and mobile devices
5. THE System SHALL provide smooth animations and micro-interactions consistent with CareerPilot's UX guidelines
6. THE System SHALL lazy-load heavy libraries (PDF parser) to improve initial page load time

### Requirement 12: Interview Code Editor (NEW)

**User Story:** As a user, I want a robust code editor during technical interviews to write, execute, and debug code in real-time.

#### Acceptance Criteria

1. **Monaco Editor Integration**: The system SHALL integrate the Monaco Editor (VS Code engine) for a familiar coding experience.
2. **Language Support**: The editor SHALL support syntax highlighting and snippets for JavaScript, Python, and Java.
3. **Split-Pane Layout**: The interview interface SHALL display the question description and code editor side-by-side.
4. **Execution Simulation**: The system SHALL provide a "Run Code" feature that simulates execution and displays output in a console pane.
5. **Auto-Save**: The system SHALL automatically save the user's code to LocalStorage to prevent data loss.
6. **Theme Consistency**: The editor SHALL use a dark theme (`vs-dark`) that matches the application's design system.

### Requirement 13: Interview-First Validation (NEW)

**User Story:** As a CareerPilot AI user, I want my resume claims to be validated through an instant interview, so that my roadmap is built from verified skills, not assumptions.

#### Acceptance Criteria

1. WHEN resume extraction completes, THE System SHALL automatically trigger a mandatory validation interview
2. THE System SHALL display a notification: "⚠️ Resume Claims Need Validation" with a "Start Interview" button
3. THE validation interview SHALL be non-skippable until completed
4. THE interview SHALL test skills claimed in the resume (technical skills, experience level, projects)
5. THE interview SHALL adapt difficulty based on claimed experience level (Entry/Mid/Senior/Expert)
6. WHEN interview completes, THE System SHALL proceed to skill reconciliation
7. THE System SHALL store both resume claims and interview results for comparison
8. THE User_Interface SHALL display a progress indicator: "Step 1/3: Resume Uploaded → Step 2/3: Interview → Step 3/3: Roadmap"

### Requirement 14: Skill Reconciliation (NEW)

**User Story:** As a CareerPilot AI user, I want the system to compare my resume claims with my interview performance, so that I get an honest assessment of my skills.

#### Acceptance Criteria

1. WHEN interview completes, THE Skill_Reconciler SHALL compare resume-claimed skills with interview-demonstrated skills
2. THE Skill_Reconciler SHALL categorize each skill as: "Verified", "Over-Claimed", or "Under-Demonstrated"
3. WHEN a skill is over-claimed (resume lists it but interview fails to demonstrate), THE System SHALL flag it with a warning icon
4. WHEN a skill is verified (resume lists it and interview demonstrates it), THE System SHALL mark it with a checkmark
5. THE System SHALL calculate a "Claim Accuracy Score" (percentage of verified skills)
6. THE reconciliation results SHALL be displayed in a side-by-side comparison view: "Resume Claims" vs "Interview Performance"
7. THE System SHALL allow users to review and accept the reconciliation before proceeding
8. THE reconciled skill set (not raw resume data) SHALL be used for roadmap generation
9. THE System SHALL provide explanations for each discrepancy (e.g., "Arrays: Claimed 'Expert' but failed medium-level question")

### Requirement 15: Readiness Score Integration (NEW)

**User Story:** As a CareerPilot AI user, I want to see my interview readiness score (0-100) update after resume validation, so that I understand my starting point.

#### Acceptance Criteria

1. WHEN skill reconciliation completes, THE System SHALL calculate an initial readiness score (0-100)
2. THE readiness score SHALL be based on: verified skills count, experience level, claim accuracy, and interview performance
3. THE System SHALL display the score prominently with a circular progress indicator
4. THE System SHALL show a transparent reason for the score (e.g., "63% - Baseline assessment: 8 verified skills, 2 over-claimed, Entry level")
5. THE readiness score SHALL be persisted to LocalStorage and displayed in the sidebar across all pages
6. THE System SHALL calculate and display "Time-to-Ready" estimate (e.g., "2h 15m to reach 80%")
7. WHEN the score updates, THE System SHALL show the change with a +/- indicator and reason (e.g., "+5% - Arrays interview passed")
8. THE sidebar readiness widget SHALL be clickable and navigate to a detailed breakdown page

**User Story:** As a CareerPilot AI user, I want my resume data to seamlessly integrate with other platform features, so I can get a complete career development experience.

#### Acceptance Criteria

1. WHEN resume extraction completes, THE System SHALL update the dashboard.html with profile completion status
2. THE extracted technical skills SHALL be available to skill-gap.html for comparison against job requirements
3. THE extracted experience level SHALL influence interview difficulty in interview.html
4. THE extracted skills and gaps SHALL inform roadmap generation in roadmap.html
5. THE System SHALL maintain consistent navigation via sidebar.js across all pages
6. THE User_Profile object SHALL follow a standardized schema accessible via store.js utilities
7. WHEN a user navigates from resume.html to other features, THE System SHALL preserve extraction state
8. THE System SHALL display consistent UI components (cards, buttons, notifications) using the global styles.css design system

### Requirement 16: Roadmap Completion Celebration (NEW)

**User Story:** As a NextStep AI user, I want to see a congratulatory popup when I complete my roadmap, with options to apply for jobs or explore related skills, so I can take the next step in my career journey.

#### Acceptance Criteria

1. WHEN all roadmap tasks are marked as complete, THE System SHALL display a congratulatory popup modal
2. THE popup SHALL display completion statistics: weeks completed, total tasks finished, and "100% Job Ready" indicator
3. THE popup SHALL include a personalized message based on the user's target role (e.g., "You've mastered all the required skills for Software Developer!")
4. THE popup SHALL provide two primary action buttons:
   - "Find Internships & Jobs" — Opens a side panel with categorized job site links
   - "Explore Related Skills" — Opens a side panel with role-specific skill recommendations
5. THE job sites panel SHALL include links organized by category: Tech Jobs (AngelList, Wellfound, Hired), Internships (Internshala, LinkedIn), Remote (Remote.co, FlexJobs), General (LinkedIn, Indeed, Glassdoor)
6. THE related skills panel SHALL display 5 domain-specific skills to learn next, based on the user's target role
7. THE related skills data SHALL cover all supported roles: SDE, Frontend, Backend, Full Stack, Data Analyst, Data Scientist, ML Engineer, DevOps, Product Manager, UI/UX Designer
8. THE popup and panels SHALL use NextStep AI's design system (CSS variables, glassmorphism, smooth animations)
9. THE System SHALL allow users to close the popup and return to the roadmap page
10. THE popup SHALL re-appear on page load if all tasks remain complete, allowing users to access job links and skills at any time

### Requirement 17: UI/UX Enhancements (NEW)

**User Story:** As a NextStep AI user, I want a polished, responsive, and accessible interface with helpful feedback, so I can use the platform comfortably on any device and have a professional experience.

#### Acceptance Criteria

1. **Toast Notifications**:
   - THE System SHALL implement a toast notification system with 4 types: success, error, warning, info
   - THE toasts SHALL auto-dismiss after 3 seconds with a close button for manual dismissal
   - THE toasts SHALL stack vertically in the top-right corner
   - THE toasts SHALL use smooth slide-in/fade-out animations

2. **Loading States**:
   - THE System SHALL provide a full-page loading overlay with spinner for long-running operations
   - THE System SHALL implement skeleton screens for content placeholders
   - THE System SHALL provide button loading states with inline spinners
   - THE System SHALL show card shimmer effects during data loading

3. **Page Transitions**:
   - THE System SHALL implement smooth page fade-in animations on load
   - THE System SHALL animate cards with staggered slide-up effects
   - THE System SHALL use modal zoom-in animations
   - THE System SHALL respect prefers-reduced-motion user preferences

4. **Micro-Interactions**:
   - THE System SHALL add ripple effects to all buttons on click
   - THE System SHALL implement hover scale animations for interactive cards
   - THE System SHALL provide input focus glow effects
   - THE System SHALL animate icon bounces on hover

5. **Mobile Optimization**:
   - THE System SHALL implement a hamburger menu for mobile devices
   - THE System SHALL ensure all tap targets are minimum 44x44px
   - THE System SHALL provide a responsive sidebar with slide-in animation
   - THE System SHALL implement touch-friendly interactions
   - THE System SHALL support bottom navigation as alternative to sidebar

6. **Keyboard Navigation & Accessibility**:
   - THE System SHALL support Esc key to close modals and menus
   - THE System SHALL support Tab key navigation with visible focus indicators
   - THE System SHALL support Arrow keys for sidebar link navigation
   - THE System SHALL implement modal tab trapping
   - THE System SHALL provide skip-to-content links
   - THE System SHALL add ARIA labels to all interactive elements
   - THE System SHALL be screen reader compatible

7. **Visual Enhancements**:
   - THE System SHALL enhance the footer with gradient background and animated social icons
   - THE System SHALL implement number counter animations for statistics
   - THE System SHALL provide a custom 404 error page with navigation
   - THE System SHALL implement empty state templates for all pages
   - THE System SHALL maintain consistent glassmorphism effects throughout

8. **Performance**:
   - THE System SHALL use CSS-only animations where possible for better performance
   - THE System SHALL lazy-load heavy components
   - THE System SHALL maintain 60fps animations
   - THE System SHALL minimize JavaScript execution on scroll
### Requirement 18: Deployment & Hosting (NEW)

**User Story:** As a user, I want to access the platform via a reliable, public URL, so that I can use it from any device without local setup.

#### Acceptance Criteria

1. **Firebase Hosting**: The application SHALL be deployed to Firebase Hosting for global availability.
2. **CDN Delivery**: Static assets (HTML, CSS, JS) SHALL be served via Firebase's global CDN for low latency.
3. **SSL Security**: The application SHALL be served over HTTPS with a valid SSL certificate.
4. **Cache Control**: The hosting configuration SHALL implement appropriate cache-control headers for static assets (long cache for hashed assets, no-cache for HTML).
5. **Clean URLs**: The hosting configuration SHALL support clean URLs (dropping .html extensions where possible).

