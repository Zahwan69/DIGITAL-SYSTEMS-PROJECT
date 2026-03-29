# AI Past Paper Study Assistant
### Final Year Project — Digital Systems Project

---

## What Is This?

A web-based study tool for **O-Level and A-Level students** (Cambridge syllabus). The core idea:

1. A student finds or uploads a past paper
2. The AI reads the paper, organises every question by topic, and fetches the marking scheme
3. The student attempts a question (typed or photographed)
4. The AI grades the answer like an examiner and gives detailed feedback
5. The student earns XP and levels up — making revision feel like a game

---

## The Problem It Solves

Most students have access to past papers but no structured way to use them. They attempt questions, have no idea if their answer is correct, and get no feedback unless they have a teacher available. This tool fills that gap — available 24/7, personalised, and self-marking.

---

## Core Features

### 1. Paper Search
- Student enters a Cambridge syllabus code (e.g. `0580` for IGCSE Maths)
- The AI identifies the subject and its topic areas
- Links are provided to download the paper from free online resources
- Year and paper number are optional filters

### 2. Paper Upload
- Student uploads a past paper as a PDF
- The AI reads every question and organises them into a list
- Each question is tagged with: **topic name**, **marks available**, and **difficulty** (easy / medium / hard)
- The AI also searches for and saves the matching marking scheme

### 3. Practice Mode
- Student picks any question from their paper
- They can submit their answer as:
  - **Typed text** — written directly in the app
  - **Image upload** — a photo of handwritten work
- The AI grades the answer against the marking scheme and returns:
  - A score (e.g. 7 / 10 marks)
  - What was correct
  - What was missing or wrong
  - A model answer to learn from

### 4. Gamification (Levelling System)
- Every action earns **XP (experience points)**
- XP accumulates into **levels** (every 500 XP = 1 level up)
- A progress bar shows how close the student is to the next level
- A **study streak** counter rewards daily use (3 days, 7 days = bonus XP)
- Unlockable **achievement badges** for milestones

| Action | XP Earned |
|---|---|
| Answer a question | +10 XP |
| Get full marks | +25 XP |
| Complete a full paper | +100 XP |
| 3-day study streak | +50 XP bonus |
| 7-day study streak | +150 XP bonus |

### 5. Topic Breakdown Dashboard
- After a paper is analysed, the student sees every topic covered
- They can filter questions by topic or difficulty
- Over time, they can see which topics they score well or poorly in

---

## How the AI Works (Plain English)

### Step 1 — Reading the paper
When a PDF is uploaded, it is sent to the AI with this instruction:
> "Extract every question. For each one, tell me the question number, the full question text, what topic it belongs to, how many marks it is worth, and whether it is easy, medium, or hard."

The AI returns this as structured data that the app saves to a database.

### Step 2 — Finding the marking scheme
The AI is given the syllabus code, year, and paper number and asked:
> "Find the marking scheme for this Cambridge paper. What are the expected answers?"

It searches its knowledge (and optionally the web) to retrieve the answers and saves them against each question.

### Step 3 — Grading the student's answer
When the student submits their answer, the AI is shown:
- The original question
- The marking scheme
- The student's answer (text or image)

It is instructed to award marks fairly, explain what was right, what was missing, and provide a model answer. It responds like an actual Cambridge examiner.

---

## Recommended Tech Stack

> These are beginner-friendly, free to start, and widely used professionally.

| Layer | Tool | Why |
|---|---|---|
| **Framework** | Next.js 14 | Handles both the website (frontend) and the server logic (backend) in one codebase. The most popular React framework. |
| **Styling** | Tailwind CSS | Write styles directly in your HTML using short class names. No separate CSS files. |
| **UI Components** | shadcn/ui | Copy-paste ready components (buttons, cards, forms) that look professional immediately. |
| **Database** | Supabase | Free PostgreSQL database with built-in user login system and file storage. No server to manage. |
| **AI** | Google Gemini 1.5 Flash | Free tier, reads PDFs and images natively, returns structured data your app can use. |
| **File Storage** | Supabase Storage | Store uploaded PDFs and answer images. Included free in Supabase. |
| **Authentication** | Supabase Auth | Email/password login built into Supabase. Connects to the database automatically. |
| **Deployment** | Vercel | Push to GitHub → site goes live automatically. Made by the Next.js team. Free tier. |

### Why Gemini over ChatGPT?
- Gemini 1.5 Flash has a **free tier** generous enough to build and test with
- It can read a **PDF directly** without you writing PDF-reading code
- It can read an **image of handwriting** without any extra setup
- It returns clean structured JSON that your app can process

### Why Supabase over Firebase or a custom server?
- Supabase is a full backend (database + auth + file storage) with **no server to manage**
- Uses standard SQL — a skill that transfers to every programming job
- Free tier covers everything needed for a student project
- Has a visual dashboard where you can see your data as a table

---

## System Architecture (How the Pieces Connect)

```
Student's Browser
      │
      ├── Next.js Frontend (pages the student sees)
      │         │
      │         ├── Supabase Auth ──── stores user accounts
      │         │
      │         └── Next.js API Routes (server-side logic)
      │                   │
      │           ┌───────┴───────┐
      │           │               │
      │    Gemini AI API    Supabase Database
      │    (analyses paper,  (stores questions,
      │     grades answers)   scores, XP, papers)
      │
      └── Supabase Storage (stores PDF files and answer images)
```

**API Routes** are the private backend. The student's browser never talks to the AI or database directly — everything goes through these server routes, which keeps your API keys secure.

---

## Database Tables (What Gets Stored)

| Table | What It Stores |
|---|---|
| `profiles` | Each student's username, total XP, level, study streak |
| `past_papers` | Paper metadata — subject, syllabus code, year, PDF file location |
| `questions` | Each extracted question — text, topic, marks, difficulty, marking scheme |
| `attempts` | Each time a student answered a question — their answer, score, AI feedback |
| `achievements` | Badges the student has unlocked |

---

## User Flow (Step by Step)

```
1. Student signs up → Profile created with 0 XP, Level 1

2a. Search flow:
    Enter syllabus code → AI identifies subject → Student downloads PDF externally → Uploads it

2b. Upload flow:
    Upload PDF → AI extracts questions → Questions organised by topic → Paper saved

3. Practice flow:
    Pick a question → Read question → Type or photograph answer → Submit
    → AI grades it → Score + feedback shown → XP added → Level-up if threshold crossed

4. Dashboard:
    Shows XP bar, level, streak, recent attempts, achievements
```

---

## Achievement Badges

| Badge | How to Earn It |
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

## Project Folder Structure (for when you build it)

```
/app
  /page.tsx              ← Landing page (homepage)
  /auth
    /login               ← Login page
    /signup              ← Sign-up page
  /dashboard             ← Student home (XP, streak, stats)
  /papers                ← List of student's saved papers
  /papers/search         ← Search by syllabus code
  /upload                ← Upload a PDF past paper
  /practice/[id]         ← Attempt a specific question
  /api
    /analyse             ← Backend: send PDF to AI, save questions
    /grade               ← Backend: send answer to AI, return score
    /search              ← Backend: look up syllabus code with AI

/components              ← Reusable pieces (Navbar, XP bar, Question card)
/lib
  /supabase.ts           ← Database connection setup
  /gemini.ts             ← AI connection setup
/types                   ← Data type definitions
```

---

## Development Phases (Suggested Order)

Work through these one at a time. Do not move to the next phase until the current one works.

**Phase 1 — Foundation**
- Set up the Next.js project
- Connect Supabase (database + auth)
- Build sign-up and log-in pages
- Build the dashboard page showing name and XP (even if XP is just 0)

**Phase 2 — Paper Management**
- Build the PDF upload page
- Write the API route that sends the PDF to Gemini
- Display the extracted questions in a list

**Phase 3 — Practice Mode**
- Build the question attempt page
- Allow text input and image upload for answers
- Write the API route that sends the answer to Gemini for grading
- Display score and feedback

**Phase 4 — Search**
- Build the syllabus code search page
- Write the API route that asks Gemini to identify the subject

**Phase 5 — Gamification**
- Add XP awards after each attempt
- Build the level-up progress bar
- Add achievement badge checking and display

---

## Environment Variables Needed

These are private keys you store in a `.env.local` file (never commit this to GitHub):

```
NEXT_PUBLIC_SUPABASE_URL=         ← from your Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=    ← from your Supabase project settings
SUPABASE_SERVICE_ROLE_KEY=        ← from your Supabase project settings (keep this secret)
GEMINI_API_KEY=                   ← from https://aistudio.google.com (free)
```

---

## Where to Get Everything (All Free)

| Resource | Link |
|---|---|
| Gemini API key | https://aistudio.google.com |
| Supabase account | https://supabase.com |
| Vercel (deployment) | https://vercel.com |
| Next.js docs | https://nextjs.org/docs |
| Tailwind CSS docs | https://tailwindcss.com/docs |
| Past papers (PapaCambridge) | https://papacambridge.com |

---

## Scope Advice for a Final Year Project

**Must-have (core grade)**
- User authentication (sign up / log in)
- Upload a past paper and extract questions with AI
- Attempt a question and receive AI feedback with a score
- Basic XP and level display

**Good to have (stronger grade)**
- Syllabus code search
- Study streak tracking
- Achievement badges
- Topic-filtered question lists

**Nice to have (distinction territory)**
- Leaderboard among students
- Progress charts (topic performance over time)
- Spaced repetition — the app reminds you to revisit weak topics
- Export a report of your performance as a PDF

Start with the must-haves and layer on the rest once those work.
