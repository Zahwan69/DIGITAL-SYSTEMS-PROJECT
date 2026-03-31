# Implementation Guide — AI Past Paper Study Assistant
### 15-Day Crunch Plan | Cursor IDE Edition

---

## How to Use This Document

This guide assumes you are using **Cursor IDE** — an AI-powered code editor that can write, explain, and fix code for you. With Cursor, tasks that would take a beginner a full day can be done in 1–2 hours. That is the reason this plan can compress 10 weeks of work into 15 days.

Every day has:
- A **Session Goal** — what must be working before you stop
- **What to prompt Cursor** — exact things to type into Cursor's chat
- **What you do manually** — the small things Cursor cannot do for you (account setup, API keys, running commands)
- **Done checklist** — how you know the day is complete
- **Commit target** — what to save to GitHub at the end

**Plan for 4–6 hours per day.** Some days are lighter (setup days), some are heavier (AI integration days). If you finish early, use the extra time to test and break things — that feeds your report.

---

## Before Day 1 — Install Everything (1–2 hours, do this the night before)

Do all of this before your first day starts so you are not wasting crunch time on downloads.

### Install these on your computer

**1. Node.js LTS**
- Go to https://nodejs.org → download the LTS version → install it
- Test: open a terminal and type `node --version` — should show `v20.x.x`

**2. Cursor IDE**
- Go to https://cursor.com → download for your OS → install it
- Sign in or create an account (free tier works fine)
- Open Cursor. The chat panel is on the right side — this is your main tool

**3. Git**
- Go to https://git-scm.com → install
- Test: type `git --version` in a terminal

### Create these accounts (all free)

| Account | URL | Time |
|---|---|---|
| GitHub | https://github.com | 2 min |
| Supabase | https://supabase.com | 2 min |
| Google AI Studio | https://aistudio.google.com | 2 min |
| Vercel | https://vercel.com (sign in with GitHub) | 1 min |

### Get your API keys tonight

**Gemini API key:**
1. Go to https://aistudio.google.com
2. Click **Get API key** → **Create API key**
3. Copy and save it somewhere safe (Notes app, text file)

**Supabase keys:** You get these on Day 1 when you create the project.

---

## Day 1 — Project Scaffolding + Database Setup
### Goal: A running Next.js app connected to a real database

**Time estimate: 4–5 hours**

---

### Part A — Create the Next.js Project (30 min, you do this manually)

Open a terminal (you can use the one inside Cursor: Terminal → New Terminal).

```bash
npx create-next-app@latest studyai --typescript --tailwind --eslint --app --no-src-dir --import-alias="@/*"
```

When it asks questions, press Enter to accept all defaults.

Then open the project in Cursor:
```bash
cd studyai
cursor .
```

Install all packages you will need for the whole project in one go:
```bash
npm install @supabase/supabase-js @supabase/ssr @google/generative-ai pdf-parse lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-progress @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-dialog
```

Test the app is running:
```bash
npm run dev
```
Open `http://localhost:3000` — you should see the Next.js welcome page.

---

### Part B — Set Up Supabase (45 min, you do this manually)

**1. Create your Supabase project**
- Go to https://supabase.com → New Project → name it `studyai`
- Choose the region closest to you
- Save the database password somewhere safe
- Wait ~2 minutes for the project to spin up

**2. Create all database tables**
- Click **SQL Editor** → **New Query**
- Paste the entire block below and click **Run**:

```sql
-- Student profiles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  xp integer default 0 not null,
  level integer default 1 not null,
  study_streak integer default 0 not null,
  last_study_date date,
  created_at timestamptz default now() not null
);

-- Past papers uploaded by students
create table past_papers (
  id uuid default gen_random_uuid() primary key,
  uploaded_by uuid references profiles(id) on delete cascade not null,
  subject_name text not null,
  syllabus_code text not null,
  year integer,
  paper_number text,
  level text check (level in ('O-Level','A-Level','IGCSE','AS-Level')) not null,
  file_url text,
  question_count integer default 0,
  created_at timestamptz default now() not null
);

-- Individual questions extracted from papers
create table questions (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references past_papers(id) on delete cascade not null,
  question_number text not null,
  question_text text not null,
  topic text not null,
  marks_available integer not null,
  difficulty text check (difficulty in ('easy','medium','hard')) not null,
  marking_scheme text,
  created_at timestamptz default now() not null
);

-- Every time a student submits an answer
create table attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  answer_text text,
  answer_image_url text,
  score integer not null,
  max_score integer not null,
  percentage integer not null,
  feedback text not null,
  strengths text[] default '{}',
  improvements text[] default '{}',
  model_answer text not null,
  xp_earned integer default 0,
  created_at timestamptz default now() not null
);

-- Badges and achievements earned
create table achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  badge_key text not null,
  badge_name text not null,
  badge_description text not null,
  badge_icon text not null,
  awarded_at timestamptz default now() not null,
  unique(user_id, badge_key)
);

-- Auto-create a profile when someone signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Row Level Security (only you can see your own data)
alter table profiles enable row level security;
alter table past_papers enable row level security;
alter table questions enable row level security;
alter table attempts enable row level security;
alter table achievements enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own papers" on past_papers for all using (auth.uid() = uploaded_by);
create policy "own paper questions" on questions for all using (
  exists (select 1 from past_papers where past_papers.id = questions.paper_id and past_papers.uploaded_by = auth.uid())
);
create policy "own attempts" on attempts for all using (auth.uid() = user_id);
create policy "own achievements" on achievements for all using (auth.uid() = user_id);
```

**3. Create Storage buckets**
- Click **Storage** → **New bucket** → name: `papers` → private
- Create another: name: `answers` → private

**4. Copy your API keys**
- Go to **Settings → API**
- Copy: Project URL, anon public key, service_role key

---

### Part C — Connect the App to Supabase (30 min — Cursor does most of this)

Create a `.env.local` file in your project root manually (File → New File in Cursor):

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
GEMINI_API_KEY=your_gemini_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Now open Cursor's chat (press `Ctrl+L` or `Cmd+L`) and type:

> **Cursor prompt:**
> "Create the following files for a Next.js 14 project using Supabase and Google Gemini AI:
> 1. `lib/supabase.ts` — exports a browser-side `supabase` client using `createClient` from `@supabase/supabase-js`, and a `createServerClient()` function using the service role key for use in API routes only
> 2. `lib/gemini.ts` — exports `geminiFlash` using `@google/generative-ai` with model `gemini-1.5-flash`
> 3. `lib/utils.ts` — exports a `cn()` function using clsx and tailwind-merge, plus `levelFromXp(xp)` that returns `Math.floor(xp/500)+1`, and `xpProgressInLevel(xp)` that returns `xp % 500`
> 4. `types/database.ts` — TypeScript interfaces for: Profile (id, username, full_name, xp, level, study_streak, last_study_date, created_at), PastPaper, Question (with marking_scheme field), Attempt (with score, max_score, percentage, feedback, strengths string[], improvements string[], model_answer, xp_earned), Achievement"

Accept the generated files. Quickly read through them — if anything looks wrong, ask Cursor to fix it.

---

### Part D — Create the Folder Structure (5 min, you do this)

In the Cursor terminal:
```bash
mkdir -p app/auth/login app/auth/signup app/dashboard app/papers app/papers/search "app/practice/[id]" app/upload app/api/analyse app/api/grade app/api/search components/ui
```

---

### Day 1 Done Checklist
- [ ] `npm run dev` runs without errors
- [ ] Supabase has 5 tables visible in the Table Editor
- [ ] `.env.local` has all 4 keys filled in
- [ ] `lib/supabase.ts`, `lib/gemini.ts`, `lib/utils.ts`, `types/database.ts` all exist

### Day 1 Commit
```bash
git init
git add .
git commit -m "day 1: project scaffold, database, supabase + gemini connections"
```
Then create a GitHub repo and push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/studyai.git
git push -u origin main
```

---

## Day 2 — UI Components + Authentication Pages
### Goal: Working sign-up, log-in, and a styled shell

**Time estimate: 4–5 hours**

---

### Part A — Build Core UI Components (Cursor does this)

Open Cursor chat and type:

> **Cursor prompt:**
> "Create these reusable UI components for a Next.js app with Tailwind CSS. All files go in `components/ui/`:
>
> 1. `button.tsx` — a Button component with variants: `default` (indigo-600 filled), `outline` (bordered), `ghost` (transparent hover). Sizes: `sm`, `default`, `lg`. Use forwardRef and accept all standard button HTML attributes. Use the `cn` util from `@/lib/utils`.
>
> 2. `input.tsx` — an Input component that forwards ref, has a ring-indigo-500 focus style, rounded-lg border, full width. Accepts all standard input HTML attributes.
>
> 3. `textarea.tsx` — same as Input but for textarea, with min-h-[100px] and resize-none.
>
> 4. `badge.tsx` — a Badge span component with variants: `default` (indigo), `secondary` (slate-100), `success` (green), `warning` (amber), `easy` (green), `medium` (amber), `hard` (red).
>
> 5. `card.tsx` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter components. White background, rounded-xl, border border-slate-200, shadow-sm."

Review and accept. Run `npm run dev` to make sure no TypeScript errors appear.

---

### Part B — Build the Navbar (Cursor does this)

> **Cursor prompt:**
> "Create `components/Navbar.tsx` — a sticky top navigation bar for a Next.js app. It should:
> - Show a logo on the left: a lightning bolt emoji ⚡ and 'StudyAI' in indigo-600
> - Show nav links in the middle for: Dashboard (/dashboard), My Papers (/papers), Upload (/upload), Search (/papers/search)
> - Highlight the active link using `usePathname()` with an indigo-50 background
> - Show a 'Sign out' button on the right that calls `supabase.auth.signOut()` and redirects to `/auth/login`
> - Be fully responsive — collapse links to a hamburger menu on mobile using useState
> - Use `'use client'` directive
> - Import supabase from `@/lib/supabase`"

---

### Part C — Build Auth Pages (Cursor does this)

> **Cursor prompt:**
> "Create `app/auth/login/page.tsx` — a login page for a Next.js 14 app router app. It should:
> - Use `'use client'`
> - Have useState for email, password, loading (boolean), error (string | null)
> - Call `supabase.auth.signInWithPassword()` on form submit
> - On success redirect to `/dashboard` using `useRouter`
> - On error show the error message in a red alert box
> - Be centered on the page with max-w-md, white card with shadow
> - Include a link to `/auth/signup`
> - Import supabase from `@/lib/supabase`, Button from `@/components/ui/button`, Input from `@/components/ui/input`"

> **Cursor prompt:**
> "Create `app/auth/signup/page.tsx` — same pattern as login but for sign up. Fields: username, email, password. Call `supabase.auth.signUp()` with `options.data: { username }`. If `data.session` exists after signup, redirect to `/dashboard`. If not (email confirmation required), show a green success message saying to check their email. Include password length validation (min 8 chars)."

---

### Part D — Update the Root Layout and Globals

> **Cursor prompt:**
> "Update `app/layout.tsx` to set the page title to 'StudyAI — AI Past Paper Assistant' and the background to bg-slate-50. Update `app/globals.css` to import tailwindcss, set a clean system font stack on the body, and add a custom scrollbar style using ::-webkit-scrollbar with a slate-200 track and slate-400 thumb."

---

### Part E — Test Auth

Run `npm run dev`. Go to `localhost:3000/auth/signup`. Sign up with a test email and password. Check Supabase → Table Editor → `profiles` — your username should appear.

Then go to `localhost:3000/auth/login` and sign in.

### Day 2 Done Checklist
- [ ] All 5 UI components exist and have no TypeScript errors
- [ ] Navbar renders correctly and active link is highlighted
- [ ] Sign-up creates a profile row in Supabase
- [ ] Log-in works and does not error on valid credentials

### Day 2 Commit
```bash
git add . && git commit -m "day 2: UI components, navbar, auth pages"
git push
```

---

## Day 3 — Dashboard Page
### Goal: After login, student sees their name, XP bar, level, streak, and quick action links

**Time estimate: 3–4 hours**

---

### Cursor Prompt — Full Dashboard

> **Cursor prompt:**
> "Create `app/dashboard/page.tsx` for a Next.js 14 app router project. This is the main student dashboard. Requirements:
>
> - Use `'use client'`
> - On mount (useEffect), call `supabase.auth.getUser()`. If no user, redirect to `/auth/login`. Otherwise fetch the profile from the `profiles` table.
> - Show a welcome heading: 'Welcome back, [username]! 👋'
> - Show a Level card containing:
>   - The level number calculated as `Math.floor(xp / 500) + 1`
>   - Total XP shown as a number
>   - A progress bar showing XP progress within the current level (xp % 500 out of 500)
>   - Text: '[xpInLevel] / 500 XP to Level [nextLevel]'
>   - A fire emoji 🔥 and the study streak number
> - Below that, show 3 quick action cards in a grid (links using Next.js Link):
>   - 🔍 Search Papers → /papers/search
>   - 📤 Upload Paper → /upload
>   - 📚 My Papers → /papers
> - Show a section called 'How to earn XP' listing: answer a question (+10), full marks (+25), complete a paper (+100), 3-day streak (+50 bonus), 7-day streak (+150 bonus)
> - Use the Navbar component from `@/components/Navbar`
> - Import supabase from `@/lib/supabase`
> - Import types from `@/types/database`
> - Style with Tailwind, white cards with rounded-xl border border-slate-200 shadow-sm"

After Cursor generates the code, run it. Sign in and check that the dashboard loads your username.

If anything is wrong (e.g. the XP bar doesn't show, or the level is incorrect), tell Cursor exactly what you see:

> **Cursor fix prompt:** "The XP progress bar is not showing. The value is 0 even though the user has 0 XP which should show an empty bar, not nothing. Fix the progress bar to always render, even when XP is 0."

### Day 3 Done Checklist
- [ ] Dashboard shows logged-in user's username
- [ ] Level displays as 1 (for a new user with 0 XP)
- [ ] XP bar renders (empty for 0 XP)
- [ ] Study streak shows 0
- [ ] Three quick action cards link correctly

### Day 3 Commit
```bash
git add . && git commit -m "day 3: student dashboard with XP bar and quick actions"
git push
```

---

## Day 4 — Paper Upload Page (Frontend + File Handling)
### Goal: Upload form exists and sends data correctly to the API route

**Time estimate: 3–4 hours**

---

### Cursor Prompt — Upload Page

> **Cursor prompt:**
> "Create `app/upload/page.tsx` — a PDF upload page for a Next.js 14 app. Requirements:
>
> - Use `'use client'`
> - Form fields: Subject Name (text), Syllabus Code (text, e.g. 0580), Year (text, optional), Level (select: IGCSE / O-Level / AS-Level / A-Level), PDF file input (accept='.pdf' only)
> - On file selection, validate it is a PDF (file.type === 'application/pdf'). Show an error if not.
> - Show the selected filename below the file input
> - On submit, use FormData to POST to `/api/analyse` with all fields and the file
> - Show loading state: 'Uploading and analysing with AI...'
> - On success show: 'Done! X questions extracted from your paper.'
> - On error show the error message in red
> - After success show a link: 'View your questions →' linking to `/papers/[paperId]` using the returned paperId
> - Include the Navbar
> - Style: white card, max-w-2xl, centered
> - Use Button and Input from `@/components/ui/`"

### Day 4 Done Checklist
- [ ] Upload page renders at `/upload`
- [ ] File picker only accepts PDFs
- [ ] Selecting a non-PDF shows an error immediately
- [ ] Submitting shows loading state (the API route will return an error since we haven't built it yet — that is fine for today)

### Day 4 Commit
```bash
git add . && git commit -m "day 4: PDF upload page frontend"
git push
```

---

## Day 5 — Paper Analysis API Route (Gemini reads the PDF)
### Goal: Uploading a real Cambridge PDF extracts questions and saves them to the database

**Time estimate: 5–6 hours — this is the most technically complex day**

---

### Cursor Prompt — Analysis API Route

> **Cursor prompt:**
> "Create `app/api/analyse/route.ts` — a Next.js API route that handles PDF upload and AI question extraction. Requirements:
>
> - Export an async `POST` function
> - Read FormData from the request: file (File), subjectName, syllabusCode, year, level
> - Validate all required fields are present
> - Get the currently authenticated user using Supabase: call `createServerClient()` from `@/lib/supabase`, then `supabase.auth.getUser()`. Return 401 if no user.
> - Convert the PDF file to base64: `const bytes = await file.arrayBuffer(); const base64 = Buffer.from(bytes).toString('base64')`
> - Send to Gemini using `geminiFlash.generateContent()` with two parts: a text prompt and an inlineData part `{ mimeType: 'application/pdf', data: base64 }`
> - The text prompt should instruct Gemini to extract all questions and return ONLY JSON in this format: `{ questions: [{ questionNumber, questionText, topic, marksAvailable, difficulty ('easy'|'medium'|'hard'), markingScheme }] }`
> - Parse the JSON response. If parsing fails, try to extract JSON using a regex `/\{[\s\S]*\}/`
> - Save a row to the `past_papers` table (uploaded_by = user.id, subject_name, syllabus_code, year as integer or null, level, question_count)
> - Save all extracted questions to the `questions` table (paper_id from the saved paper)
> - Return `{ success: true, paperId, questionCount }`
> - Use try/catch and return appropriate error responses with status codes
> - Import geminiFlash from `@/lib/gemini`, createServerClient from `@/lib/supabase`"

---

### How to Test This

1. Download a real Cambridge past paper PDF from https://papacambridge.com (pick Maths 0580 or Biology 0610 — they have clean text that Gemini reads well)
2. Go to `localhost:3000/upload`
3. Fill in the form and upload the PDF
4. Watch the terminal in Cursor — you will see console logs
5. After success, go to Supabase → Table Editor → `questions` — you should see rows

**If Gemini returns an error or no JSON:**

> **Cursor fix prompt:** "The Gemini API is returning this error: [paste the exact error from the terminal]. Fix the `app/api/analyse/route.ts` to handle this case."

**If the questions look wrong (wrong topics, missing questions):**

> **Cursor fix prompt:** "The AI is extracting questions but assigning the wrong topics. Update the prompt in `app/api/analyse/route.ts` to be more specific: tell Gemini to use precise Cambridge syllabus topic names rather than generic labels."

### Day 5 Done Checklist
- [ ] Uploading a Cambridge PDF shows a success message with question count
- [ ] `questions` table in Supabase has rows with topics and mark values
- [ ] `past_papers` table has a row linked to your user
- [ ] Uploading a non-PDF or empty form returns an error

### Day 5 Commit
```bash
git add . && git commit -m "day 5: Gemini PDF analysis API route - extracts and saves questions"
git push
```

---

## Day 6 — Papers List Page + Question Browser
### Goal: Student can see all their papers and browse questions by topic

**Time estimate: 4–5 hours**

---

### Cursor Prompt — Papers List

> **Cursor prompt:**
> "Create `app/papers/page.tsx` — a page that lists all past papers uploaded by the logged-in user. Requirements:
>
> - Fetch papers from Supabase `past_papers` table filtered by the logged-in user's id, ordered by created_at descending
> - Display each paper as a card showing: subject_name, syllabus_code, level badge, year (if available), question_count, created_at formatted as readable date
> - Each card links to `/papers/[id]`
> - If no papers yet, show an empty state: 'No papers yet' with a link to /upload
> - Include the Navbar
> - Use supabase client from `@/lib/supabase`"

### Cursor Prompt — Paper Detail (Question List)

> **Cursor prompt:**
> "Create `app/papers/[id]/page.tsx` — a page showing all questions for a specific past paper. Requirements:
>
> - Read the paper id from `params.id`
> - Fetch the paper details from `past_papers` and all questions from `questions` table where paper_id matches
> - Show paper title (subject_name + year + syllabus_code) at the top
> - Show filter buttons to filter by topic (extract unique topics from questions array using a Set) and by difficulty (easy / medium / hard)
> - Display each question as a card showing: question number, first 150 characters of question text (truncated with ...), topic badge, marks badge, difficulty badge (green/amber/red), and a 'Practice →' button linking to `/practice/[question.id]`
> - Filtering is done client-side using useState — do not re-fetch
> - Include the Navbar"

### Day 6 Done Checklist
- [ ] `/papers` shows a list of your uploaded papers
- [ ] Clicking a paper shows its questions
- [ ] Topic and difficulty filters work without reloading the page
- [ ] 'Practice →' button appears on each question

### Day 6 Commit
```bash
git add . && git commit -m "day 6: papers list and question browser with filters"
git push
```

---

## Day 7 — Practice Mode (Answer + AI Grading)
### Goal: Student submits an answer and gets a score and feedback from Gemini

**Time estimate: 5–6 hours**

---

### Cursor Prompt — Practice Page

> **Cursor prompt:**
> "Create `app/practice/[id]/page.tsx` — a full practice/grading page. Requirements:
>
> - Read question id from `params.id`
> - Fetch the question from Supabase `questions` table
> - Show the question text prominently, with topic badge and marks
> - Show two tabs: 'Type answer' and 'Upload image' (use useState to switch between them)
> - Type answer tab: a large textarea
> - Upload image tab: a file input accepting image/* only. Show a preview of the selected image using URL.createObjectURL
> - Submit button: 'Submit for AI grading'
> - On submit, POST to `/api/grade` with: questionId, questionText, markingScheme, maxMarks, answerText (or imageBase64 if image was uploaded — convert using FileReader)
> - Show a loading state: 'The AI is marking your answer...'
> - After response, show:
>   - Score as a large number: '7 / 10 marks (70%)'
>   - A progress bar coloured green (>=80%), amber (50-79%), or red (<50%)
>   - A paragraph of overall feedback
>   - A green box: 'What you did well' listing strengths as bullet points
>   - An amber box: 'What to improve' listing improvements as bullet points
>   - A slate box: 'Model Answer' with the ideal response
>   - A 'Try again' button that resets the form
>   - A 'Next question' button (links back to the paper)
> - Show XP earned after grading: '+10 XP earned!' (or +25 if 100%)
> - Use the Navbar"

---

### Cursor Prompt — Grading API Route

> **Cursor prompt:**
> "Create `app/api/grade/route.ts` — a Next.js API route for AI answer grading. Requirements:
>
> - Export async POST function
> - Read JSON body: questionId, questionText, markingScheme, maxMarks, answerText, imageBase64 (optional)
> - Get the authenticated user from Supabase (return 401 if not logged in)
> - Build a Gemini prompt that acts as a Cambridge examiner: provides the question, marking scheme (or 'not available' if null), max marks, and student answer
> - Instruct Gemini to return ONLY this JSON: `{ score, maxScore, percentage, feedback, strengths: string[], improvements: string[], modelAnswer }`
> - If imageBase64 is provided, include it as an inlineData part with mimeType 'image/jpeg' alongside the text prompt
> - Parse the JSON response with fallback regex
> - Calculate xpEarned: 25 if percentage === 100, else 10
> - Save the attempt to the `attempts` table
> - Update the user's XP in the `profiles` table using Supabase: increment xp by xpEarned, recalculate level as Math.floor((currentXp + xpEarned) / 500) + 1
> - Update last_study_date to today. If last_study_date was yesterday, increment study_streak. If it was more than 1 day ago, reset study_streak to 1.
> - Return the grading result JSON including xpEarned"

### Day 7 Done Checklist
- [ ] Practice page shows the question and two tabs
- [ ] Submitting a typed answer returns AI feedback
- [ ] Score, feedback, strengths, improvements, and model answer all display
- [ ] XP earned message appears
- [ ] Check Supabase `attempts` table — a new row appears
- [ ] Check Supabase `profiles` table — XP value increased

### Day 7 Commit
```bash
git add . && git commit -m "day 7: practice mode with AI grading, XP award, streak tracking"
git push
```

---

## Day 8 — Syllabus Code Search Page
### Goal: Student types a syllabus code and gets subject info and download links

**Time estimate: 3–4 hours**

---

### Cursor Prompt — Search API Route

> **Cursor prompt:**
> "Create `app/api/search/route.ts` — a POST API route. Read JSON body: syllabusCode, year (optional), paperNumber (optional). Build a Gemini prompt asking it to identify the Cambridge subject for this syllabus code, list its main topic areas, the exam level (IGCSE/O-Level/A-Level/AS-Level), and where to find past papers. Return ONLY JSON: `{ found: boolean, subjectName, level, description, suggestedTopics: string[] }`. Parse and return the response."

### Cursor Prompt — Search Page

> **Cursor prompt:**
> "Create `app/papers/search/page.tsx` — a syllabus code search page. Requirements:
>
> - Three inputs: Syllabus Code (required), Year (optional), Paper Number (optional)
> - A 'Search with AI' button that POSTs to `/api/search`
> - Show loading state while waiting
> - On result, show:
>   - Subject name and level as a heading
>   - A description paragraph
>   - Topic tags as badge pills
>   - A 'Where to find this paper' section with 3 clickable links: PapaCambridge (https://papacambridge.com), GCE Guide (https://papers.gceguide.com), Cambridge website (https://www.cambridgeinternational.org)
>   - A tip: 'Once downloaded, upload the PDF on the Upload page to extract questions'
> - Show 8 example syllabus code buttons the student can click to pre-fill the input: 0580 (IGCSE Maths), 0625 (Physics), 0620 (Chemistry), 0610 (Biology), 0500 (English), 0478 (Computer Sci), 9709 (A-Level Maths), 9702 (A-Level Physics)
> - Include the Navbar"

### Day 8 Done Checklist
- [ ] Search page loads at `/papers/search`
- [ ] Entering `0580` and clicking Search returns subject info and topics
- [ ] Example code buttons fill the input when clicked
- [ ] Download links are present and open in a new tab

### Day 8 Commit
```bash
git add . && git commit -m "day 8: syllabus code search with AI subject identification"
git push
```

---

## Day 9 — Achievements + Badges
### Goal: Badges are awarded automatically after qualifying actions; shown on dashboard

**Time estimate: 4–5 hours**

---

### Cursor Prompt — Achievement Logic Utility

> **Cursor prompt:**
> "Create `lib/achievements.ts` — a server-side utility function `checkAndAwardAchievements(userId: string, supabase: any)`. It should:
>
> - Query the `attempts` table to count total attempts for this user
> - Check if any attempt has percentage === 100
> - Query unique topics the user has attempted (group by question topic via joins)
> - Query the user's current level from `profiles`
> - Query already-awarded badges from `achievements` table
> - For each badge condition not yet met, insert a row into `achievements`:
>   - 'first_attempt': awarded when total attempts >= 1, icon 🎯
>   - 'perfect_score': awarded when any attempt has percentage = 100, icon ⭐
>   - 'streak_3': awarded when study_streak >= 3, icon 🔥
>   - 'streak_7': awarded when study_streak >= 7, icon 🏆
>   - 'topic_master': awarded when any topic has >= 10 attempts, icon 🎓
>   - 'level_5': awarded when level >= 5, icon 🌟
>   - 'level_10': awarded when level >= 10, icon 👑
> - Return an array of any newly awarded badge names so the frontend can show a congratulations message"

---

### Wire Achievement Check into the Grade Route

> **Cursor prompt:**
> "Update `app/api/grade/route.ts` to call `checkAndAwardAchievements(user.id, supabase)` after saving the attempt and updating XP. Add the returned `newBadges` array to the API response so the frontend can display a 'You earned a badge!' message."

---

### Update Dashboard to Show Badges

> **Cursor prompt:**
> "Update `app/dashboard/page.tsx` to:
> - Also fetch achievements from the `achievements` table for the current user
> - Show an 'Achievements' section with a grid of earned badges
> - Each badge is a rounded box showing the badge_icon (large emoji) and badge_name below it
> - Show locked badges (grey 🔒 emoji boxes) for badges not yet earned, up to 8 total
> - Show a count: 'X / 8 badges earned'"

### Day 9 Done Checklist
- [ ] After answering your first question, refresh the dashboard — 'First Step' badge appears
- [ ] If you score 100%, the 'Perfect Score' badge appears
- [ ] Locked badges show as grey on the dashboard

### Day 9 Commit
```bash
git add . && git commit -m "day 9: achievement and badge system with automatic award logic"
git push
```

---

## Day 10 — Landing Page + Route Protection
### Goal: Public homepage for non-logged-in users; redirects if not logged in

**Time estimate: 3–4 hours**

---

### Cursor Prompt — Landing Page

> **Cursor prompt:**
> "Create `app/page.tsx` — a public marketing landing page for StudyAI. Requirements:
>
> - Top navbar: logo left, 'Sign in' and 'Get started free' buttons right (linking to /auth/login and /auth/signup)
> - Hero section: large heading 'Study smarter with AI-powered past paper practice', subheading describing the tool, two CTA buttons
> - Features section: 4 feature cards — Search Papers, Upload PDF, AI Grading, Level Up System — each with an icon, title, and 2-sentence description
> - How It Works section: numbered steps 1–4
> - Subject tags section: a row of pill badges for common Cambridge subjects
> - Footer with the logo and 'Built with Next.js, Supabase & Google Gemini'
> - Do not use the Navbar component (this page has its own simpler nav)
> - Style: white background, clean professional look, indigo-600 as accent colour"

### Cursor Prompt — Middleware for Route Protection

> **Cursor prompt:**
> "Create `middleware.ts` at the root of the Next.js project. It should:
> - Use `@supabase/ssr` to check if the user has a valid session
> - If the user is not logged in and tries to access any `/dashboard`, `/papers`, `/upload`, or `/practice` route, redirect them to `/auth/login`
> - If the user is logged in and tries to access `/auth/login` or `/auth/signup`, redirect them to `/dashboard`
> - Allow all `/api/` routes to pass through without redirect
> - Export a `config` with matcher: `['/((?!_next/static|_next/image|favicon.ico).*)']`"

### Day 10 Done Checklist
- [ ] Landing page looks professional at `localhost:3000`
- [ ] Going to `/dashboard` while logged out redirects to `/auth/login`
- [ ] Going to `/auth/login` while logged in redirects to `/dashboard`

### Day 10 Commit
```bash
git add . && git commit -m "day 10: public landing page and route protection middleware"
git push
```

---

## Day 11 — UI Polish + Responsive Design
### Goal: The app looks good on mobile. All pages are consistent and polished.

**Time estimate: 4–5 hours**

---

### How to Check Responsiveness
In your browser, press `F12` (or right-click → Inspect). Click the phone/tablet icon in the top-left of DevTools. This shows how the page looks on a mobile screen.

Go through every page and note what looks broken. Then use Cursor to fix each one.

### Cursor Prompt — Mobile Fixes

> **Cursor prompt (repeat for each broken page):**
> "The `/papers/[id]` page looks broken on mobile. The question cards overflow the screen width and the filter buttons stack messily. Fix the layout to be fully responsive using Tailwind's responsive prefixes (sm:, md:, lg:). The cards should stack vertically on mobile and the filter buttons should wrap."

### Cursor Prompt — Loading States

> **Cursor prompt:**
> "Add a consistent loading skeleton to all data-fetching pages (`/dashboard`, `/papers`, `/papers/[id]`). While data is loading, show grey rounded placeholder blocks (animate-pulse) instead of blank screens. Use Tailwind's `animate-pulse` and `bg-slate-200 rounded` classes."

### Cursor Prompt — Empty States

> **Cursor prompt:**
> "Add proper empty state illustrations to `/papers/page.tsx`. If the user has no papers, show a centred illustration (just a 📄 emoji large, a heading 'No papers yet', a description, and a 'Upload your first paper' button linking to /upload)."

### Day 11 Done Checklist
- [ ] Every page looks acceptable on a 375px wide mobile screen
- [ ] Loading states show skeleton placeholders, not blank pages
- [ ] Empty states have helpful messages and calls to action
- [ ] No horizontal scrollbars appear on mobile

### Day 11 Commit
```bash
git add . && git commit -m "day 11: responsive design, loading skeletons, empty states"
git push
```

---

## Day 12 — Testing Session
### Goal: Document formal test results for the project report

**Time estimate: 4–5 hours**

This day is deliberately light on new code. You are generating evidence for your report's testing chapter.

---

### Step 1 — Create a test log file

Create `TESTING.md` in your project root. Record every test you run:

```markdown
# Test Log

| ID | Feature | Test Action | Expected Result | Actual Result | Pass/Fail | Notes |
|---|---|---|---|---|---|---|
| T01 | Sign up | Valid email + 8 char password | Account created, redirected to dashboard | | | |
| T02 | Sign up | Password under 8 chars | Error message shown | | | |
| T03 | Sign up | Email already in use | Error message shown | | | |
| T04 | Log in | Correct credentials | Redirected to dashboard | | | |
| T05 | Log in | Wrong password | Error message, no redirect | | | |
| T06 | Upload | Valid Cambridge PDF | Questions extracted, success message | | | |
| T07 | Upload | Non-PDF file | Error: must be PDF | | | |
| T08 | Upload | Empty form | Validation error shown | | | |
| T09 | Grade | Type a correct answer | Score > 0, feedback shown | | | |
| T10 | Grade | Type a blank answer | Score 0, feedback shown | | | |
| T11 | Grade | Upload a handwritten image | Score returned, image processed | | | |
| T12 | XP | Answer any question | XP increments in Supabase | | | |
| T13 | XP | Get 100% on a question | +25 XP awarded | | | |
| T14 | Badge | First ever answer | 'First Step' badge appears on dashboard | | | |
| T15 | Search | Enter code 0580 | Returns 'Mathematics' subject info | | | |
| T16 | Middleware | Access /dashboard logged out | Redirected to /auth/login | | | |
| T17 | Middleware | Access /auth/login logged in | Redirected to /dashboard | | | |
```

Execute each test. Fill in the Actual Result and Pass/Fail columns.

---

### Step 2 — AI Grading Accuracy Evaluation

This is critical for your report's evaluation chapter.

1. Pick one Cambridge paper you have the official mark scheme for
2. Choose 5 questions
3. For each question, submit three answers:
   - The model answer from the official mark scheme
   - A partially correct answer (missing 1–2 key points)
   - A completely wrong answer

Record in a table:

```markdown
# AI Grading Accuracy Evaluation

| Q No. | Max Marks | Answer Type | Official Score | AI Score | Match? | Notes |
|---|---|---|---|---|---|---|
| 1a | 4 | Model answer | 4 | ? | ? | |
| 1a | 4 | Partial answer | 2 | ? | ? | |
| 1a | 4 | Wrong answer | 0 | ? | ? | |
```

This table goes directly into your report's critical evaluation section.

---

### Step 3 — Note bugs to fix tomorrow

As you test, write down every bug you find. Do not fix them today — just document them.

### Day 12 Done Checklist
- [ ] `TESTING.md` has all 17 test cases filled in
- [ ] AI grading evaluation table completed for at least 5 questions
- [ ] Bug list documented

### Day 12 Commit
```bash
git add . && git commit -m "day 12: formal test documentation and AI grading evaluation"
git push
```

---

## Day 13 — Bug Fixes + Error Handling
### Goal: Fix all bugs from Day 12. Every edge case handled gracefully.

**Time estimate: 4–5 hours**

Work through your bug list from Day 12. For each bug, describe it to Cursor precisely:

### How to Write Good Bug Fix Prompts

**Bad prompt:** "Fix the upload page"

**Good prompt:** "In `app/api/analyse/route.ts`, when the uploaded PDF is a scanned image (not text-based), Gemini returns an empty questions array. Handle this case by returning a 422 error with message: 'This PDF appears to be a scanned image. Try a text-based PDF, or use a version with selectable text.' Check if `questions.length === 0` after parsing and return the error."

**For each bug, tell Cursor:**
1. Which file has the problem
2. What exact behaviour you see
3. What behaviour you want instead

---

### Add Global Error Handling

> **Cursor prompt:**
> "Add a global error page to the Next.js app. Create `app/error.tsx` — a client component that accepts `error` and `reset` props. Show a friendly error message: 'Something went wrong', the error message in a code block, and a 'Try again' button that calls `reset()`. Style it as a centred card."

> **Cursor prompt:**
> "Add a 404 not found page. Create `app/not-found.tsx`. Show: a large '404', 'Page not found', and a link back to the dashboard."

### Day 13 Done Checklist
- [ ] All bugs from the Day 12 test log are fixed or documented as known limitations
- [ ] Error page renders if something crashes
- [ ] 404 page renders for unknown URLs
- [ ] Re-run the 17 test cases — more should pass now

### Day 13 Commit
```bash
git add . && git commit -m "day 13: bug fixes, error handling, 404 page"
git push
```

---

## Day 14 — Deploy to Vercel
### Goal: The app is live on a public URL you can demonstrate

**Time estimate: 2–3 hours**

---

### Step 1 — Make Sure Everything is Pushed

```bash
git add .
git commit -m "day 14: pre-deployment cleanup"
git push
```

### Step 2 — Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New → Project**
3. Find your `studyai` repository and click **Import**
4. Under **Environment Variables**, add all 4 variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
5. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL (you can update this after deployment)
6. Click **Deploy**

Wait 2–3 minutes. Vercel will show a green checkmark and give you a URL like `studyai-abc123.vercel.app`.

### Step 3 — Test the Live URL

Open the Vercel URL. Sign up with a different email. Upload a paper. Grade a question. Confirm everything works on the live site.

**If the live site has errors that didn't appear locally:**

> **Cursor prompt:**
> "My Next.js app works locally but after deploying to Vercel I get this error: [paste the Vercel build log error or the browser error]. Fix it."

Common deployment-only issues:
- Environment variables not set in Vercel → double-check all 4 are added
- `pdf-parse` package issues → Cursor can suggest the `edge` runtime fix if needed
- Build errors → paste the Vercel build log into Cursor chat

### Step 4 — Update Supabase Auth Settings

In Supabase, go to **Authentication → URL Configuration**. Add your Vercel URL to **Site URL** and **Redirect URLs**.

### Day 14 Done Checklist
- [ ] App is live at a public Vercel URL
- [ ] Sign-up and log-in work on the live site
- [ ] Uploading a PDF and grading a question works on live
- [ ] Vercel URL noted somewhere safe for your viva demo

### Day 14 Commit
```bash
git add . && git commit -m "day 14: production deployment on Vercel"
git push
```

---

## Day 15 — Final Polish + Demo Preparation
### Goal: App is demo-ready. Documentation is complete. You are ready for the viva.

**Time estimate: 3–4 hours**

---

### Morning (1–2 hours) — Last Polish Items

**Add a progress chart to the dashboard:**

> **Cursor prompt:**
> "Add a simple progress summary section to `app/dashboard/page.tsx`. Fetch the user's attempts from Supabase and show:
> - Total questions attempted (count)
> - Average score percentage (average of all attempt percentages)
> - Top 3 topics by number of attempts, shown as small stat cards
> Do not add a chart library — use simple Tailwind bars for the topic stats (a div with bg-indigo-600 and percentage width)."

**Add marks per topic breakdown to the paper detail page:**

> **Cursor prompt:**
> "Update `app/papers/[id]/page.tsx` to show a topic summary at the top: a list of unique topics in this paper, each showing how many questions are in that topic and the total marks available. Display as small horizontal stat rows."

---

### Afternoon (1–2 hours) — Demo Preparation

Go through this demo script to practise for the viva:

**1. Show the landing page**
Explain what the app does in one sentence.

**2. Sign in**
Show the login page. Sign in with your test account.

**3. Show the dashboard**
Point out: level, XP bar, study streak, achievements, quick actions.

**4. Upload a paper**
Upload a Cambridge past paper you have prepared in advance. Watch the success message. Say: "The AI read every question and tagged it by topic."

**5. Browse questions**
Go to the paper. Show the topic filters. Click a filter. Explain: "This lets students focus on weak topics."

**6. Attempt a question**
Click Practice. Type an answer (have one ready that is partially correct). Submit. Show the score, feedback, strengths, and model answer. Point out the XP earned.

**7. Show the database**
Open Supabase in another tab. Show the `attempts` table — the row just saved. Show the `profiles` table — the XP increased.

**8. Show an achievement**
If a badge was just earned, show it on the dashboard.

**9. Search a syllabus code**
Go to Search. Type `0580`. Show the AI response.

---

### Final Commit

```bash
git add .
git commit -m "day 15: final polish, demo preparation, project complete"
git push
```

---

## Quick Cursor Prompt Reference Card

Save these — they are the prompts you will use most often.

| Situation | What to type in Cursor |
|---|---|
| Something is not working | "I see this error: [paste exact error]. Fix it." |
| Page looks wrong on mobile | "Make this component fully responsive for mobile screens using Tailwind sm:/md: prefixes." |
| You want to understand code | "Explain this code to me line by line in plain English." |
| TypeScript is showing a red underline | "Fix this TypeScript error: [paste the underlined code and error message]." |
| A feature needs adding | "Add [feature] to this file. Here is the current code: [paste file]." |
| Supabase query is not working | "This Supabase query is returning null instead of data: [paste query]. Fix it." |
| The AI is returning bad JSON | "Gemini is returning this response instead of valid JSON: [paste response]. Update the prompt and parsing logic to handle this." |

---

## Summary Timeline

| Day | Phase | Key Deliverable |
|---|---|---|
| Day 1 | Setup | Project created, database live, API keys configured |
| Day 2 | Foundation | UI components, Navbar, auth pages |
| Day 3 | Foundation | Student dashboard with XP and level |
| Day 4 | Papers | Upload page frontend |
| Day 5 | Papers | Gemini reads PDF → questions saved to database |
| Day 6 | Papers | Papers list + question browser with filters |
| Day 7 | Practice | AI grading, feedback, XP award, streak tracking |
| Day 8 | Search | Syllabus code search |
| Day 9 | Gamification | Badges and achievements |
| Day 10 | Polish | Landing page + route protection middleware |
| Day 11 | Polish | Mobile responsiveness, loading states, empty states |
| Day 12 | Testing | Formal test log + AI grading accuracy evaluation |
| Day 13 | Fixes | Bug fixes, error pages |
| Day 14 | Deploy | Live on Vercel |
| Day 15 | Demo | Final polish + viva preparation |
