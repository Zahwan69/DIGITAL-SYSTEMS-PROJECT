# AI Past Paper Study Assistant
### Final Year Project — Digital Systems Project
### Module: UFCFXK-30-3 | Level 6 | UWE Bristol

---

## Quick Reference — Module Learning Outcomes

Every section of this document maps to a module learning outcome. Use this table when writing your report, preparing your poster, and in your viva.

| Learning Outcome | What It Requires | Where It Appears in This Document |
|---|---|---|
| MO1 | Independent research into a comprehensive body of knowledge | Background Research, Literature Areas |
| MO2 | Develop a software artefact using appropriate methods | Features, Architecture, Development Phases |
| MO3 | Communicate knowledge of development approaches and their application | Tech Stack Justification, Methodology |
| MO4 | Analytical, critical, and reflective skills | Critical Evaluation, Limitations, Risks |
| MO5 | Informed reporting via academic, commercial and anecdotal literature | Literature Areas, References |

---

## 1. What Is This Project?

A web-based study tool for **O-Level and A-Level students** (Cambridge International syllabus). The system:

1. Allows a student to search for or upload a past examination paper
2. Uses AI to extract every question and categorise it by topic
3. Retrieves or infers the matching marking scheme
4. Accepts the student's answer (typed text or a photograph of handwritten work)
5. Grades the answer automatically and gives examiner-style feedback
6. Rewards progress through a gamified XP and levelling system

---

## 2. The Problem Being Solved

Cambridge past papers are freely available, but students have no structured, interactive way to use them. The standard workflow is:

1. Download a PDF
2. Attempt questions
3. Check the mark scheme manually
4. Receive no personalised feedback

This means students often do not know *why* an answer is wrong, cannot identify their weak topics systematically, and have no motivation mechanism to sustain daily practice. Private tutors and revision courses address this but are expensive and inaccessible to many students.

**This project proposes a software solution that closes this gap** — providing AI-generated, examiner-quality feedback on demand, available 24/7, at no cost to the student.

---

## 3. Background Research *(addresses MO1 and MO5)*

This section outlines the key research areas that must be investigated. For the report and poster, each area below requires a literature review with academic and commercial sources cited.

### 3.1 Existing Tools (Commercial Landscape)

The following tools already exist in adjacent spaces. Any project report must critically compare this project against them:

| Tool | What It Does | Limitation Relevant to This Project |
|---|---|---|
| **Quizlet** | Flashcard-based revision with AI generation | Does not accept past paper PDFs, no examiner-style grading |
| **Khan Academy** | Video lessons and practice exercises | Not aligned to Cambridge syllabus, no past paper ingestion |
| **Anki** | Spaced repetition flashcard system | Manual card creation, no automated question extraction |
| **Revision Village** | IB-specific past paper practice with solutions | Cambridge-specific gap; no AI-driven personalised feedback |
| **SaveMyExams** | Cambridge-specific worked solutions | Static content, no interactive answer submission or grading |
| **GradePaper (AI)** | AI essay grading | Not subject-specific, not Cambridge-aligned |

**Research task:** Identify at least two academic papers comparing intelligent tutoring systems (ITS) to traditional self-study, and evaluate where this project sits on that spectrum.

### 3.2 Intelligent Tutoring Systems (ITS) — Academic Foundation

Intelligent Tutoring Systems are software environments that provide personalised instruction without human intervention. This project is a lightweight ITS. Key authors and concepts to research:

- **Bloom's 2-Sigma Problem** (Bloom, 1984) — one-to-one tutoring produces a two standard deviation improvement over classroom instruction. ITS research attempts to approach this computationally.
- **VanLehn, K. (2011)** — "The Relative Effectiveness of Human Tutoring, Intelligent Tutoring Systems, and Other Tutoring Systems" — a foundational ITS survey paper.
- **Anderson et al. (1985)** — Cognitive Tutor, one of the first successful ITS implementations. Useful for framing the feedback loop this project implements.

**Research task:** Find and cite at least three peer-reviewed papers on ITS effectiveness. Argue whether this project qualifies as an ITS or a simpler automated feedback system, and why that distinction matters.

### 3.3 Gamification in Education

The XP and levelling system draws from gamification research. This must be grounded in literature, not just described as a feature.

- **Deterding et al. (2011)** — "From Game Design Elements to Gamefulness: Defining Gamification" — the most cited definition in academic literature.
- **Hamari, Koivisto & Sarsa (2014)** — "Does Gamification Work? A Literature Review of Empirical Studies on Gamification" — critically evaluates whether gamification improves engagement and learning outcomes.
- **Deci & Ryan (1985)** — Self-Determination Theory — distinguishes intrinsic vs extrinsic motivation. XP systems are extrinsic; the report should critically reflect on whether this undermines deep learning.

**Research task:** Use these sources to argue whether the gamification design choices in this project are educationally sound or risk trivialising the revision process.

### 3.4 Large Language Models (LLMs) in Education

The project relies on a Large Language Model (Google Gemini) for question extraction and answer grading. The report must engage critically with the academic and commercial debate around LLMs in education.

- **Kasneci et al. (2023)** — "ChatGPT for Good? On Opportunities and Challenges of Large Language Models for Education" — a comprehensive review published in *Learning and Individual Differences*.
- **Baidoo-Anu & Ansah (2023)** — "Education in the Era of Generative Artificial Intelligence (AI)" — discusses benefits and ethical risks.
- **Key debate to address:** LLMs can hallucinate (produce confident but incorrect outputs). For an exam grading system, this is a serious reliability concern that must be critically evaluated.

### 3.5 Cambridge International Examinations — Domain Knowledge

- Understand the Cambridge syllabi structure: syllabus codes, paper variants, mark scheme formatting.
- Review Cambridge's own assessment principles documentation.
- Understand what a Cambridge mark scheme actually contains — point-based marks, alternative acceptable answers, quality of response marks (QWC) — as these affect how AI grading can and cannot work.

---

## 4. Core Features *(addresses MO2)*

### 4.1 Paper Search
- Student enters a Cambridge syllabus code (e.g. `0580` for IGCSE Maths)
- The AI identifies the subject and its topic areas
- Links are provided to download the paper from free online resources
- Year and paper number are optional filters

### 4.2 Paper Upload
- Student uploads a past paper as a PDF
- The AI reads every question and organises them into a list
- Each question is tagged with: **topic name**, **marks available**, and **difficulty** (easy / medium / hard)
- The AI also searches for and infers the matching marking scheme

### 4.3 Practice Mode
- Student picks any question
- They can submit their answer as typed text or an image of handwritten work
- The AI grades the answer against the marking scheme and returns:
  - A score (e.g. 7 / 10 marks)
  - What was correct
  - What was missing or wrong
  - A model answer to learn from

### 4.4 Gamification (Levelling System)
- Every action earns **XP (experience points)**
- XP accumulates into **levels** (every 500 XP = 1 level up)
- A progress bar shows how close the student is to the next level
- A **study streak** counter rewards daily use

| Action | XP Earned |
|---|---|
| Answer a question | +10 XP |
| Get full marks on a question | +25 XP |
| Complete a full paper | +100 XP |
| 3-day study streak | +50 XP bonus |
| 7-day study streak | +150 XP bonus |

### 4.5 Topic Breakdown Dashboard
- After a paper is analysed, the student sees every topic covered
- They can filter questions by topic or difficulty
- Over time, they can track which topics they score well or poorly in

---

## 5. How the AI Works

### Step 1 — Reading the paper
The uploaded PDF is sent to the AI with a structured prompt instructing it to extract each question with its number, full text, topic, marks, and difficulty. The AI returns structured JSON that is saved to a database.

### Step 2 — Finding the marking scheme
The AI is given the syllabus code, year, and paper number. It uses its trained knowledge of Cambridge examinations to infer expected answers. Where it cannot find a specific answer, it flags this clearly.

### Step 3 — Grading the student's answer
The AI is shown the original question, the marking scheme, and the student's answer (text or image). It is prompted to respond as a Cambridge examiner: awarding marks for correct points, identifying gaps, and providing a model answer.

---

## 6. Recommended Tech Stack *(addresses MO3)*

| Layer | Tool | Justification |
|---|---|---|
| **Framework** | Next.js 14 | Full-stack React framework. Handles frontend and backend API routes in one codebase, reducing architectural complexity for a solo project. |
| **Styling** | Tailwind CSS | Utility-first CSS. Eliminates context-switching between component and stylesheet files; faster UI iteration. |
| **UI Components** | shadcn/ui | Unstyled, accessible Radix UI primitives with Tailwind styling. Developer owns the component code, unlike component libraries such as MUI which abstract internals. |
| **Database** | Supabase (PostgreSQL) | Managed PostgreSQL with built-in authentication and file storage. Removes the need to configure and host a separate backend server. Chosen over Firebase because it uses standard SQL, which transfers to industry practice. |
| **AI** | Google Gemini 1.5 Flash | Chosen for: (1) native PDF and image input without preprocessing, (2) structured JSON output, (3) generous free tier suitable for a student project. Compared against OpenAI GPT-4o (more expensive, image input via separate API call) and Anthropic Claude (no native PDF support at time of writing). |
| **Deployment** | Vercel | Zero-configuration deployment for Next.js. Git-push-to-deploy workflow is appropriate for an iterative development process. |

### Critical Evaluation of Stack Choices *(addresses MO4)*

**What could go wrong with Gemini for grading?**
Gemini is a general-purpose language model, not a Cambridge-trained examiner. It may:
- Award marks for partially correct but insufficient answers
- Miss Cambridge's specific mark scheme conventions (e.g. "accept equivalent alternatives")
- Produce inconsistent scores for the same answer on different runs (temperature variation)

**Mitigation:** The system should present AI grading as *indicative*, not definitive. The student should always see the full marking scheme alongside the AI's decision so they can self-verify.

**What could go wrong with Supabase for data storage?**
If the Supabase free tier is discontinued or rate limits are hit, the application fails. For a project of this scope this is an acceptable risk; a production system would require a hosted PostgreSQL instance.

---

## 7. System Architecture *(addresses MO2 and MO3)*

```
Student's Browser
      │
      ├── Next.js Frontend (pages the student sees)
      │         │
      │         ├── Supabase Auth ──── stores user accounts
      │         │
      │         └── Next.js API Routes (server-side logic, keeps API keys private)
      │                   │
      │           ┌───────┴───────┐
      │           │               │
      │    Gemini AI API    Supabase Database
      │    (analyses paper,  (stores questions,
      │     grades answers)   scores, XP, papers)
      │
      └── Supabase Storage (stores PDF files and answer images)
```

The API Routes layer is the security boundary. The browser never communicates with Gemini or the database directly — all requests pass through the Next.js server, where credentials are stored as environment variables.

---

## 8. Database Design

| Table | Fields | Purpose |
|---|---|---|
| `profiles` | id, username, xp, level, study_streak, last_study_date | Student account data and gamification state |
| `past_papers` | id, syllabus_code, subject, year, paper_number, level, file_url | Metadata for each uploaded paper |
| `questions` | id, paper_id, question_number, question_text, topic, marks_available, difficulty, marking_scheme | Individual questions extracted from papers |
| `attempts` | id, user_id, question_id, answer_text, answer_image_url, score, max_score, feedback, xp_earned | Each student answer and its AI assessment |
| `achievements` | id, user_id, badge_key, badge_name, awarded_at | Earned gamification badges |

---

## 9. Development Methodology *(addresses MO3)*

This project will use an **iterative, incremental development approach** based on Agile principles, adapted for a solo developer.

**Why not Waterfall?** A Waterfall approach requires fully defined requirements before development begins. Since AI capabilities (e.g. how reliably Gemini extracts questions from a Cambridge PDF) are not fully predictable without empirical testing, an iterative approach is more appropriate. Each phase is built, tested, and evaluated before the next begins.

**Why not full Scrum?** Scrum requires team ceremonies (stand-ups, sprint reviews with stakeholders). As a solo project, lightweight iterative cycles are more suitable.

### Development Phases

| Phase | Deliverable | Tests |
|---|---|---|
| 1 — Foundation | User authentication, dashboard shell, database connected | Can create account, log in, see dashboard |
| 2 — Paper Ingestion | PDF upload → AI extracts questions → displayed in list | Upload a real Cambridge paper; verify question count and topic tags are reasonable |
| 3 — Practice Mode | Question attempt screen, AI grading, feedback display | Submit a known-correct answer; verify score is full marks. Submit a blank answer; verify score is 0 |
| 4 — Search | Syllabus code search page and API | Enter 0580; verify AI identifies IGCSE Mathematics |
| 5 — Gamification | XP awarded after attempts, level bar, badges | Complete a question; verify XP increments in database |

### Testing Strategy

- **Functional testing:** Manual test cases for each user-facing feature (e.g. "upload a PDF and verify questions appear")
- **AI output testing:** Evaluate AI grading accuracy by submitting answers with known correct marks and comparing AI output against official mark scheme
- **Edge case testing:** Empty answers, corrupted PDFs, unsupported file types, very long question texts
- **Usability:** Informal think-aloud sessions with at least two O-Level/A-Level students

---

## 10. Limitations and Risks *(addresses MO4)*

This section is critical for the report. Identifying limitations honestly demonstrates analytical maturity at Level 6.

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI grading inaccuracy | High | High | Present grading as indicative; always show full mark scheme to student |
| AI hallucinating a marking scheme | Medium | High | Flag when AI cannot find a scheme; allow student to add their own |
| Copyright of past papers | Medium | Medium | Only store user-uploaded files; do not redistribute papers; display legal notice |
| Student data privacy (GDPR) | Low–Medium | High | No sensitive personal data required; answer images stored securely; privacy policy needed |
| Gemini free tier rate limits | Low | Medium | Cache AI results per question; do not re-call AI for repeated questions |
| PDF parsing failure on scanned papers | High | Medium | OCR quality varies; alert user if extraction appears incomplete |
| Gamification reduces intrinsic motivation | Low | Medium | Acknowledged in literature (Deci & Ryan); XP is supplementary, not the core feature |

---

## 11. Ethical Considerations *(addresses MO4)*

- **AI accuracy and trust:** Students must not blindly trust AI grades. The system must make clear it is an AI assistant, not an authoritative examiner. Incorrect feedback on exam preparation could harm a student's confidence or revision direction.
- **Data privacy:** Student answer images may contain personal handwriting. These must be stored securely and not shared. A clear privacy policy should be in place before the application is used by real students.
- **Copyright:** Cambridge past papers are copyright of Cambridge Assessment International Education. The application should not redistribute or publicly host papers — it should only process papers the student has themselves downloaded.
- **Bias in AI outputs:** LLMs can reflect biases present in training data. Answer grading may be inconsistently fair across different writing styles or dialects. This should be acknowledged as a limitation.

---

## 12. Gamification Badge Definitions

| Badge | Trigger |
|---|---|
| 🎯 First Step | Answer your first question |
| ⭐ Perfect Score | Get full marks on any question |
| 📄 Paper Champion | Complete all questions in a paper |
| 🔥 Consistent Learner | Study 3 days in a row |
| 🏆 Week Warrior | Study 7 days in a row |
| 🎓 Topic Master | Answer 10 questions from the same topic |
| 🌟 Rising Star | Reach Level 5 |
| 👑 Scholar | Reach Level 10 |

---

## 13. Folder Structure (When Development Begins)

```
/app
  /page.tsx              ← Landing page
  /auth/login            ← Login page
  /auth/signup           ← Sign-up page
  /dashboard             ← Student home: XP, streak, stats, recent activity
  /papers                ← List of saved papers and their questions
  /papers/search         ← Syllabus code search
  /upload                ← Upload a PDF past paper
  /practice/[id]         ← Attempt a specific question, view feedback
  /api
    /analyse             ← Server route: send PDF to Gemini, save questions to DB
    /grade               ← Server route: send answer to Gemini, return score, save attempt
    /search              ← Server route: ask Gemini to identify syllabus

/components              ← Reusable UI: Navbar, XPBar, QuestionCard, AchievementBadge
/lib
  /supabase.ts           ← Supabase client configuration
  /gemini.ts             ← Gemini AI client configuration
/types                   ← TypeScript type definitions matching database schema
```

---

## 14. Report Structure Guidance *(addresses MO5)*

The report is 8000–10000 words and worth 55% of the module grade. It tests all five learning outcomes. Suggested chapter structure:

1. **Introduction** — Problem statement, project objectives, scope, brief overview of the solution
2. **Literature Review** — ITS research, gamification in education, LLMs in education, existing tools review, Cambridge assessment context
3. **Requirements** — Functional requirements (what the system must do), non-functional requirements (performance, security, usability), use case diagrams
4. **Design** — System architecture, database schema, UI wireframes, AI prompt design rationale
5. **Implementation** — Key technical decisions with justification, code excerpts for significant components, challenges encountered and how they were resolved
6. **Testing and Evaluation** — Test cases, results, AI grading accuracy evaluation, user feedback
7. **Critical Reflection** — What worked, what did not, how AI limitations affected the design, ethical considerations, what you would do differently
8. **Conclusion** — Summary, extent to which objectives were met, future work
9. **References** — Harvard or IEEE format; must include academic papers, not just documentation links

---

## 15. Poster Session Checklist *(midpoint submission, 25%)*

The poster tests MO1–MO4 and must include, at a minimum:

- [ ] Project title and problem statement
- [ ] Summary of background research (existing tools, ITS literature, gamification evidence)
- [ ] Project objectives stated clearly
- [ ] System architecture diagram
- [ ] Development approach/methodology
- [ ] Progress so far (completed phases)
- [ ] A working prototype demonstration or screenshots
- [ ] Known risks and how they are being mitigated
- [ ] Next steps

---

## 16. Key Literature to Start With

The following are starting points. Use Google Scholar, UWE Library, and ACM Digital Library to find full texts.

- Bloom, B.S. (1984). The 2 sigma problem. *Educational Researcher*, 13(6), 4–16.
- VanLehn, K. (2011). The relative effectiveness of human tutoring, intelligent tutoring systems, and other tutoring systems. *Educational Psychologist*, 46(4), 197–221.
- Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness. *Proceedings of the 15th International Academic MindTrek Conference*.
- Hamari, J., Koivisto, J., & Sarsa, H. (2014). Does gamification work? *Proceedings of the 47th Hawaii International Conference on System Sciences*.
- Kasneci, E. et al. (2023). ChatGPT for good? On opportunities and challenges of large language models for education. *Learning and Individual Differences*, 103.
- Deci, E.L., & Ryan, R.M. (1985). *Intrinsic Motivation and Self-Determination in Human Behavior*. Springer.

---

## 17. Environment Variables (Development Setup)

```
NEXT_PUBLIC_SUPABASE_URL=         ← from supabase.com project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=    ← from supabase.com project settings
SUPABASE_SERVICE_ROLE_KEY=        ← from supabase.com (keep secret, server-side only)
GEMINI_API_KEY=                   ← from aistudio.google.com (free)
```

---

## 18. Scope for Grading Purposes

**Must-have (required to pass MO2)**
- Working user authentication
- PDF upload → AI question extraction → questions displayed
- Answer submission → AI grading → score and feedback displayed
- XP awarded and displayed

**Good to have (required for a strong mark)**
- Syllabus code search
- Study streak tracking
- Achievement badges
- Topic-filtered question lists
- Testing documented with results

**Distinction-level additions**
- Demonstrated AI grading accuracy evaluation (compare AI scores against human marker for 20+ questions)
- Spaced repetition logic (resurface weak topics automatically)
- Performance analytics charts (topic scores over time)
- Comprehensive critical reflection on AI limitations in the report
