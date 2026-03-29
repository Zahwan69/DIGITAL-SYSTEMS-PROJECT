# Implementation Guide — AI Past Paper Study Assistant
### Day-by-Day Roadmap for a Beginner Developer

---

## How to Use This Document

This guide is written assuming you have **never built a web application before** but are willing to follow instructions carefully. Every day has:

- A **goal** — what you will have working by the end of the day
- **Exact steps** — what to do in order
- **Commands to run** — copy and paste these into your terminal
- **What to look for** — how you know it worked
- **Common mistakes** — problems most beginners hit and how to fix them

**Total estimated time: 10 weeks** (working roughly 2–3 hours per day on weekdays, lighter on weekends). This lines up well with a university semester project.

Do not skip days or rush ahead. Each day builds on the last. If something does not work, fix it before moving on — a broken foundation causes much bigger problems later.

---

## Tools You Need on Your Computer Before Day 1

Install these first. They are all free.

### 1. Node.js
This is what runs JavaScript code on your computer (outside of a browser).

- Go to https://nodejs.org
- Download the **LTS** version (the one labelled "Recommended For Most Users")
- Run the installer, click Next through everything
- To check it worked: open a terminal and type `node --version` — you should see something like `v20.x.x`

### 2. Visual Studio Code (VS Code)
This is the code editor you will write all your code in.

- Go to https://code.visualstudio.com
- Download and install for your operating system
- Open it once to make sure it works

**Recommended VS Code extensions to install (click the puzzle piece icon on the left sidebar):**
- `Tailwind CSS IntelliSense` — autocompletes Tailwind class names for you
- `Prettier - Code formatter` — automatically formats your code neatly
- `ESLint` — highlights mistakes in your code as you type
- `GitLens` — shows git history inside your editor

### 3. Git
This saves your work history and lets you upload code to GitHub.

- Go to https://git-scm.com
- Download and install
- To check it worked: type `git --version` in a terminal

### 4. Accounts to Create (All Free)

| Service | URL | What It Is |
|---|---|---|
| GitHub | https://github.com | Where your code is stored online |
| Supabase | https://supabase.com | Your database, login system, and file storage |
| Google AI Studio | https://aistudio.google.com | Where you get your free Gemini AI key |
| Vercel | https://vercel.com | Where your finished app will be hosted live |

Create all four accounts before Day 1. You do not need to do anything with them yet.

### What a Terminal Is
A terminal (also called command prompt or shell) is a text window where you type commands. On Windows, search for "Command Prompt" or "PowerShell". On Mac, search for "Terminal". On both, you can also open a terminal inside VS Code by clicking **Terminal → New Terminal** in the top menu bar.

---

## Phase 1 — Project Foundation
### Weeks 1–2 | Days 1–10

**Goal of this phase:** A working Next.js project connected to your database, with a sign-up and log-in page, and a dashboard that shows the user's name.

---

### Day 1 — Create the Project and Understand the Folder Structure

**Goal:** Have a running Next.js app on your own computer.

#### Step 1 — Open your terminal

On Windows: Press `Win + R`, type `cmd`, press Enter.  
On Mac: Press `Cmd + Space`, type `Terminal`, press Enter.

#### Step 2 — Navigate to where you want to put the project

Type this command (it goes to your Desktop so you can find it easily):

**On Windows:**
```
cd Desktop
```

**On Mac:**
```
cd ~/Desktop
```

#### Step 3 — Create the Next.js project

Copy and paste this exactly:

```bash
npx create-next-app@latest studyai --typescript --tailwind --eslint --app --no-src-dir --import-alias="@/*"
```

It will ask you questions. Answer like this:
- `Would you like to use React Compiler?` → press Enter (selects No, the default)
- `Would you like to use Turbopack?` → press Enter (selects No)

Wait about 1–2 minutes for it to finish. You will see: `Success! Created studyai`

#### Step 4 — Open the project in VS Code

```bash
cd studyai
code .
```

This opens your project folder in VS Code.

#### Step 5 — Run the project

In your terminal (or the VS Code terminal), type:

```bash
npm run dev
```

Open your browser and go to: `http://localhost:3000`

You should see a Next.js welcome page. This means it is working.

#### Step 6 — Learn the folder structure

Open VS Code and look at the files on the left side. Here is what each thing is:

```
studyai/
├── app/                  ← Every page of your website lives here
│   ├── layout.tsx        ← The wrapper around every page (where you put the Navbar)
│   ├── page.tsx          ← The homepage (what you see at localhost:3000)
│   └── globals.css       ← Global styles that apply everywhere
├── public/               ← Images and icons (anything you put here is publicly accessible)
├── node_modules/         ← Packages installed by npm (never touch this folder)
├── package.json          ← Lists all packages your project uses
├── tsconfig.json         ← TypeScript configuration
└── next.config.ts        ← Next.js configuration
```

**Do not touch** `node_modules`, `package-lock.json`, or `.next` (if it appears).

#### Today's target
- [ ] `npm run dev` works without errors
- [ ] You can see the Next.js welcome page at `localhost:3000`
- [ ] You understand what the `app/` folder is for

---

### Day 2 — Install Packages and Set Up the Folder Structure

**Goal:** Install all the libraries the project needs and create the folders you will fill in later.

#### Step 1 — Stop the running server

In the terminal, press `Ctrl + C` (on both Windows and Mac). This stops `npm run dev`.

#### Step 2 — Install required packages

Copy and paste each command one at a time. Wait for each to finish before typing the next.

```bash
npm install @supabase/supabase-js @supabase/ssr
```
*This installs Supabase — your database and login system.*

```bash
npm install @google/generative-ai
```
*This installs the Google Gemini AI package.*

```bash
npm install pdf-parse
```
*This installs a tool that can read text out of PDF files.*

```bash
npm install lucide-react
```
*This installs a library of clean icons (search icon, upload icon, etc.).*

```bash
npm install clsx tailwind-merge class-variance-authority
```
*These are helper utilities for writing cleaner Tailwind CSS code.*

```bash
npm install @radix-ui/react-progress @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-tabs
```
*These are accessible UI building blocks.*

#### Step 3 — Create the folder structure

Run these commands one by one to create all the folders you will need:

```bash
mkdir -p app/auth/login
mkdir -p app/auth/signup
mkdir -p app/dashboard
mkdir -p app/papers/search
mkdir -p app/upload
mkdir -p "app/practice/[id]"
mkdir -p app/api/analyse
mkdir -p app/api/grade
mkdir -p app/api/search
mkdir -p components/ui
mkdir -p lib
mkdir -p types
```

#### Step 4 — Create a utility file

In VS Code, click on the `lib` folder. Create a new file called `utils.ts`. Paste this inside:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// This function merges Tailwind classes without conflicts
// You will use cn() throughout the project instead of writing class names manually
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// XP and Level calculation helpers
export function levelFromXp(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

export function xpProgressInLevel(xp: number): number {
  return xp % 500;
}
```

#### Step 5 — Create the types file

Create `types/database.ts` and paste:

```typescript
// These types describe the shape of data in your database
// TypeScript uses these to catch mistakes before your app runs

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  xp: number;
  level: number;
  study_streak: number;
  last_study_date: string | null;
  created_at: string;
}

export interface PastPaper {
  id: string;
  uploaded_by: string;
  subject_name: string;
  syllabus_code: string;
  year: number | null;
  paper_number: string | null;
  level: "O-Level" | "A-Level" | "IGCSE" | "AS-Level";
  file_url: string | null;
  question_count: number;
  created_at: string;
}

export interface Question {
  id: string;
  paper_id: string;
  question_number: string;
  question_text: string;
  topic: string;
  marks_available: number;
  difficulty: "easy" | "medium" | "hard";
  marking_scheme: string | null;
  created_at: string;
}

export interface Attempt {
  id: string;
  user_id: string;
  question_id: string;
  answer_text: string | null;
  answer_image_url: string | null;
  score: number;
  max_score: number;
  percentage: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  model_answer: string;
  xp_earned: number;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  badge_key: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  awarded_at: string;
}
```

#### Today's target
- [ ] All packages installed without errors
- [ ] All folders created
- [ ] `lib/utils.ts` and `types/database.ts` created

---

### Day 3 — Set Up Supabase (Your Database)

**Goal:** Create your database project on Supabase and connect it to your Next.js app.

#### Step 1 — Create a Supabase project

1. Go to https://supabase.com and sign in
2. Click **New Project**
3. Choose a name: `studyai`
4. Set a strong database password (save this somewhere safe)
5. Choose the region closest to you
6. Click **Create new project** and wait ~2 minutes

#### Step 2 — Create your database tables

Once the project is created, click **SQL Editor** in the left sidebar. Click **New Query**. Copy and paste this entire block and click **Run**:

```sql
-- Profiles table: stores each student's data
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

-- Past papers table
create table past_papers (
  id uuid default gen_random_uuid() primary key,
  uploaded_by uuid references profiles(id) on delete cascade not null,
  subject_name text not null,
  syllabus_code text not null,
  year integer,
  paper_number text,
  level text check (level in ('O-Level', 'A-Level', 'IGCSE', 'AS-Level')) not null,
  file_url text,
  question_count integer default 0,
  is_public boolean default false,
  created_at timestamptz default now() not null
);

-- Questions table
create table questions (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references past_papers(id) on delete cascade not null,
  question_number text not null,
  question_text text not null,
  topic text not null,
  marks_available integer not null,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')) not null,
  marking_scheme text,
  created_at timestamptz default now() not null
);

-- Attempts table: every time a student answers a question
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

-- Achievements table
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

-- This automatically creates a profile row when someone signs up
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

-- Security: only logged-in users can read/write their own data
alter table profiles enable row level security;
alter table past_papers enable row level security;
alter table questions enable row level security;
alter table attempts enable row level security;
alter table achievements enable row level security;

create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

create policy "Users can view their own papers" on past_papers for select using (auth.uid() = uploaded_by);
create policy "Users can insert their own papers" on past_papers for insert with check (auth.uid() = uploaded_by);

create policy "Users can view questions on their papers" on questions for select
  using (exists (select 1 from past_papers where past_papers.id = questions.paper_id and past_papers.uploaded_by = auth.uid()));

create policy "Users can insert questions" on questions for insert with check (
  exists (select 1 from past_papers where past_papers.id = questions.paper_id and past_papers.uploaded_by = auth.uid())
);

create policy "Users can view their own attempts" on attempts for select using (auth.uid() = user_id);
create policy "Users can insert their own attempts" on attempts for insert with check (auth.uid() = user_id);

create policy "Users can view their own achievements" on achievements for select using (auth.uid() = user_id);
create policy "Users can insert their own achievements" on achievements for insert with check (auth.uid() = user_id);
```

Click **Run**. You should see: `Success. No rows returned.`

#### Step 3 — Set up Supabase Storage

1. Click **Storage** in the left sidebar
2. Click **Create a new bucket**
3. Name it `papers` — make sure **Public bucket** is OFF
4. Create another bucket named `answers` — also keep it private

#### Step 4 — Get your API keys

1. Click **Settings** (gear icon) → **API**
2. You will see:
   - **Project URL** — starts with `https://`
   - **anon public** key — a long string of letters
   - **service_role** key — another long string (keep this one secret)

#### Step 5 — Create your environment variables file

In your project folder (in VS Code), create a new file at the root level called `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=paste_your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=paste_your_service_role_key_here
GEMINI_API_KEY=you_will_add_this_on_day_5
```

**Important:** Add `.env.local` to your `.gitignore` file so it is never uploaded to GitHub. Open `.gitignore` and check that this line exists: `.env.local` (it should already be there in a Next.js project).

#### Step 6 — Create the Supabase connection file

Create `lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This client is used in the browser (for logged-in user actions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// This client is used on the server only (for admin-level actions in API routes)
// Never use this in browser-facing code
export function createServerClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

#### Today's target
- [ ] Supabase project created
- [ ] All 5 database tables created successfully (check in Table Editor)
- [ ] Two storage buckets created (`papers` and `answers`)
- [ ] `.env.local` file created with your keys
- [ ] `lib/supabase.ts` created

---

### Day 4 — Build the Sign-Up and Log-In Pages

**Goal:** A real working sign-up and log-in system.

#### Step 1 — Understand the file structure for pages in Next.js

In the App Router (which is what you are using), every folder inside `/app` is a URL route:
- `app/page.tsx` → `localhost:3000/`
- `app/auth/login/page.tsx` → `localhost:3000/auth/login`
- `app/dashboard/page.tsx` → `localhost:3000/dashboard`

Every route folder needs a file called `page.tsx`.

#### Step 2 — Create a reusable Button component

Create `components/ui/button.tsx`:

```typescript
// This is a reusable button that can look different depending on the "variant" prop
// For example: <Button variant="outline"> gives an outlined button

import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles that apply to every button
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        // Size variations
        size === "sm" && "h-8 px-3 text-xs",
        size === "default" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        // Style variations
        variant === "default" && "bg-indigo-600 text-white hover:bg-indigo-700",
        variant === "outline" && "border border-slate-200 text-slate-700 hover:bg-slate-50",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100",
        className
      )}
      {...props}
    />
  );
}
```

#### Step 3 — Create a reusable Input component

Create `components/ui/input.tsx`:

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm",
        "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
```

#### Step 4 — Create the Log-In page

Create `app/auth/login/page.tsx`:

```typescript
"use client"; // This line tells Next.js this page runs in the browser, not the server

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  // useState creates a variable that, when changed, re-renders the page
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter(); // used to navigate to a different page after login

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); // stops the page from refreshing when you click submit
    setLoading(true);
    setError(null);

    // Call Supabase to check the email and password
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message); // show the error message to the user
      setLoading(false);
    } else {
      router.push("/dashboard"); // go to the dashboard on success
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm mb-6">Sign in to continue studying</p>

          {/* Show error if login fails */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <Input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-center text-slate-600 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-indigo-600 font-medium hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

#### Step 5 — Create the Sign-Up page

Create `app/auth/signup/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // These extra details are passed to the trigger that creates the profile row
        data: { username },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
    } else if (data.session) {
      // If email confirmation is disabled in Supabase, they are logged in immediately
      router.push("/dashboard");
    } else {
      // Email confirmation is required — tell them to check their inbox
      setError("Account created! Check your email to confirm, then sign in.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
          <p className="text-slate-500 text-sm mb-6">Free. No credit card needed.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <Input
                type="text"
                placeholder="e.g. john_student"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <Input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create free account"}
            </Button>
          </form>

          <p className="text-sm text-center text-slate-600 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-indigo-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

#### Step 6 — Test it

Run `npm run dev`. Go to `http://localhost:3000/auth/signup`. Create an account. Then go to `http://localhost:3000/auth/login` and sign in.

Check in Supabase → Table Editor → `profiles` — you should see a row for your new account.

**Common mistake:** If you get "Invalid API key" errors, double-check your `.env.local` file has no spaces around the `=` sign.

#### Today's target
- [ ] Sign-up page works and creates a row in the profiles table
- [ ] Log-in page works and does not show an error for valid credentials
- [ ] Supabase Table Editor shows your new profile row

---

### Day 5 — Get Your Gemini API Key and Build the Dashboard

**Goal:** A dashboard page the student sees after logging in, showing their name and XP.

#### Step 1 — Get your Gemini API key

1. Go to https://aistudio.google.com
2. Sign in with your Google account
3. Click **Get API key** → **Create API key**
4. Copy the key
5. Open `.env.local` and replace `you_will_add_this_on_day_5` with your actual key:
   ```
   GEMINI_API_KEY=AIzaSy...your_actual_key_here
   ```

#### Step 2 — Create the Gemini connection file

Create `lib/gemini.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

// This creates a connection to the Gemini AI using your API key
// The API key is only used on the server (in API routes), never in the browser
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// geminiFlash is the fast, free model we use for most tasks
export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});
```

#### Step 3 — Create the Navbar component

Create `components/Navbar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// These are the navigation links shown in the top bar
const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/papers", label: "My Papers" },
  { href: "/upload", label: "Upload" },
  { href: "/papers/search", label: "Search" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="font-bold text-indigo-600 text-lg">
          StudyAI ⚡
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
```

#### Step 4 — Create the Dashboard page

Create `app/dashboard/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { levelFromXp, xpProgressInLevel } from "@/lib/utils";
import type { Profile } from "@/types/database";
import Link from "next/link";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // useEffect runs after the page loads
    // Here we fetch the logged-in user's profile from Supabase
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/auth/login"; // redirect if not logged in
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data as Profile);
      setLoading(false);
    }

    loadProfile();
  }, []); // the [] means "only run this once, when the page first loads"

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const level = levelFromXp(profile.xp);
  const xpInLevel = xpProgressInLevel(profile.xp);
  const progressPercent = (xpInLevel / 500) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">

        {/* Welcome message */}
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Welcome back, {profile.username}! 👋
        </h1>
        <p className="text-slate-500 mb-8">
          Ready to study? You are on a {profile.study_streak}-day streak!
        </p>

        {/* Level and XP card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-bold text-slate-900">Level {level}</p>
              <p className="text-slate-500 text-sm">{profile.xp} XP total</p>
            </div>
            <div className="text-right">
              <p className="text-2xl">🔥</p>
              <p className="text-sm text-orange-600 font-semibold">{profile.study_streak} day streak</p>
            </div>
          </div>

          {/* XP progress bar */}
          <div className="mb-1">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 text-right">
            {xpInLevel} / 500 XP to Level {level + 1}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
          <Link
            href="/papers/search"
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <p className="text-2xl mb-2">🔍</p>
            <p className="font-semibold text-slate-800">Search Papers</p>
            <p className="text-xs text-slate-500 mt-0.5">Find by syllabus code</p>
          </Link>

          <Link
            href="/upload"
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <p className="text-2xl mb-2">📤</p>
            <p className="font-semibold text-slate-800">Upload Paper</p>
            <p className="text-xs text-slate-500 mt-0.5">Upload a PDF</p>
          </Link>

          <Link
            href="/papers"
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <p className="text-2xl mb-2">📚</p>
            <p className="font-semibold text-slate-800">My Papers</p>
            <p className="text-xs text-slate-500 mt-0.5">Browse saved papers</p>
          </Link>
        </div>

      </main>
    </div>
  );
}
```

#### Step 5 — Test everything

Run `npm run dev`. Go to `localhost:3000/auth/login`, sign in, and you should be redirected to the dashboard. You should see your username and Level 1 with 0 XP.

#### Today's target
- [ ] Gemini API key added to `.env.local`
- [ ] Dashboard shows logged-in user's username, level, and XP bar
- [ ] Navbar appears with working navigation links
- [ ] Sign out button works and returns to login page

---

### Days 6–7 — Buffer Days

Use these two days to:

1. Fix anything from Days 1–5 that is not working
2. Read the Next.js App Router documentation: https://nextjs.org/docs/app
3. Read the Supabase JavaScript documentation: https://supabase.com/docs/reference/javascript
4. Practise: try changing colours in `globals.css` and the dashboard. Break things. Fix them. This is how you learn.
5. Commit your work to GitHub (instructions below)

#### How to Save Your Work to GitHub

1. Go to https://github.com and create a new repository called `studyai`
2. In your terminal:
```bash
git init
git add .
git commit -m "Phase 1: foundation, auth, and dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/studyai.git
git push -u origin main
```
Replace `YOUR_USERNAME` with your GitHub username.

---

## Phase 2 — Paper Ingestion
### Weeks 3–4 | Days 8–17

**Goal of this phase:** A working upload page that sends a PDF to Gemini and saves the extracted questions to the database.

---

### Day 8 — Understand How API Routes Work in Next.js

**Goal:** Build your first API route — a simple one that just returns "Hello" — so you understand the concept before building the real ones.

#### What is an API Route?

An API Route is a piece of server-side code. When your browser sends a request to it, it runs on the server (not the browser), does something (talk to the AI, save to the database), and sends back a response.

Think of it like a waiter: the browser (customer) places an order, the API route (waiter) takes the order to the kitchen (Gemini or Supabase), and brings back the result.

#### Step 1 — Create a test API route

Create a file at `app/api/test/route.ts`:

```typescript
import { NextResponse } from "next/server";

// This function runs when someone makes a GET request to /api/test
export async function GET() {
  return NextResponse.json({ message: "API is working!" });
}

// This function runs when someone makes a POST request to /api/test
export async function POST(request: Request) {
  const body = await request.json(); // read what was sent
  return NextResponse.json({ received: body });
}
```

#### Step 2 — Test it

Make sure `npm run dev` is running. Open your browser and go to:
`http://localhost:3000/api/test`

You should see: `{"message":"API is working!"}`

This confirms your API routes are set up correctly. Now you are ready to build real ones.

#### Today's target
- [ ] Test API route works and returns JSON
- [ ] You understand the difference between a page file (`page.tsx`) and a route file (`route.ts`)

---

### Day 9 — Build the Paper Upload Page (Frontend)

**Goal:** A page with a file picker and a form. No AI yet — just the UI.

Create `app/upload/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// These are the options for exam level shown in the dropdown
const LEVELS = ["IGCSE", "O-Level", "AS-Level", "A-Level"] as const;

export default function UploadPage() {
  // Form state
  const [subjectName, setSubjectName] = useState("");
  const [syllabusCode, setSyllabusCode] = useState("");
  const [year, setYear] = useState("");
  const [level, setLevel] = useState<string>("IGCSE");
  const [file, setFile] = useState<File | null>(null);

  // Status state
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      setError(null);
    } else {
      setError("Please select a PDF file.");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a PDF file first.");
      return;
    }

    setLoading(true);
    setStatus("Uploading your paper...");
    setError(null);

    // We use FormData to send a file alongside other text fields
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subjectName", subjectName);
    formData.append("syllabusCode", syllabusCode);
    formData.append("year", year);
    formData.append("level", level);

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed.");
      }

      const data = await res.json();
      setStatus(`Done! ${data.questionCount} questions extracted and saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Upload a Past Paper</h1>
        <p className="text-slate-500 mb-8">
          Upload a PDF and the AI will extract and organise every question by topic.
        </p>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}
          {status && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
              {status}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subject Name
              </label>
              <Input
                placeholder="e.g. Mathematics, Physics, Biology"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Syllabus Code
                </label>
                <Input
                  placeholder="e.g. 0580"
                  value={syllabusCode}
                  onChange={(e) => setSyllabusCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Year (optional)
                </label>
                <Input
                  placeholder="e.g. 2023"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Exam Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                PDF File
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100"
              />
              {file && (
                <p className="text-xs text-slate-500 mt-1">Selected: {file.name}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? status || "Processing..." : "Upload and analyse with AI"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
```

#### Today's target
- [ ] Upload page renders at `localhost:3000/upload`
- [ ] Form shows all fields and file picker
- [ ] Selecting a non-PDF file shows an error message
- [ ] Submit button exists (it will fail since the API route does not exist yet — that is expected)

---

### Day 10 — Build the Paper Analysis API Route

**Goal:** The backend that receives the PDF, sends it to Gemini, and saves questions to the database.

Create `app/api/analyse/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { geminiFlash } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    // Read the uploaded form data (the PDF and the text fields)
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const subjectName = formData.get("subjectName") as string;
    const syllabusCode = formData.get("syllabusCode") as string;
    const year = formData.get("year") as string;
    const level = formData.get("level") as string;

    if (!file || !subjectName || !syllabusCode) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Convert the PDF file into a format Gemini can read
    const pdfBytes = await file.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // This is the instruction we send to Gemini alongside the PDF
    const prompt = `You are an expert at analysing Cambridge O-Level and A-Level past examination papers.

Read this ${subjectName} past paper PDF and extract every question.

For each question, return this exact JSON format (return ONLY the JSON, no extra text):
{
  "questions": [
    {
      "questionNumber": "1",
      "questionText": "Full text of the question exactly as written",
      "topic": "Specific topic name (e.g. Quadratic Equations, Cell Division, Causes of WW1)",
      "marksAvailable": 4,
      "difficulty": "easy",
      "markingScheme": "The expected answer points if you can infer them from context, or null"
    }
  ]
}

Rules:
- difficulty must be exactly "easy" (1-2 marks), "medium" (3-6 marks), or "hard" (7+ marks)
- topic must be a specific syllabus topic, not a generic label like "Question 1"
- Include every question including sub-parts
- If you cannot determine a marking scheme, set markingScheme to null
- Return ONLY valid JSON`;

    // Send the PDF and the prompt to Gemini
    const result = await geminiFlash.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      },
    ]);

    const responseText = result.response.text().trim();

    // Parse Gemini's JSON response
    let questions;
    try {
      const parsed = JSON.parse(responseText);
      questions = parsed.questions;
    } catch {
      // If Gemini added text around the JSON, find the JSON part
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "AI could not extract questions. Try a clearer PDF." },
          { status: 422 }
        );
      }
      const parsed = JSON.parse(jsonMatch[0]);
      questions = parsed.questions;
    }

    // Get the logged-in user
    const supabase = createServerClient();
    // Note: for a real app you would get the user from the session cookie
    // For now we get it from the request (simplified)
    const authHeader = request.headers.get("authorization");

    // Save the paper record to the database
    const { data: paper, error: paperError } = await supabase
      .from("past_papers")
      .insert({
        uploaded_by: "00000000-0000-0000-0000-000000000000", // placeholder — fix on Day 12
        subject_name: subjectName,
        syllabus_code: syllabusCode,
        year: year ? parseInt(year) : null,
        level: level,
        question_count: questions.length,
      })
      .select()
      .single();

    if (paperError) throw paperError;

    // Save all the extracted questions
    const questionRows = questions.map((q: any) => ({
      paper_id: paper.id,
      question_number: q.questionNumber,
      question_text: q.questionText,
      topic: q.topic,
      marks_available: q.marksAvailable,
      difficulty: q.difficulty,
      marking_scheme: q.markingScheme || null,
    }));

    const { error: questionsError } = await supabase
      .from("questions")
      .insert(questionRows);

    if (questionsError) throw questionsError;

    return NextResponse.json({
      success: true,
      paperId: paper.id,
      questionCount: questions.length,
    });

  } catch (err) {
    console.error("Analyse error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Check the server logs." },
      { status: 500 }
    );
  }
}
```

**Note:** This is a simplified version. On Day 12 you will fix the user authentication so the paper is saved against the actual logged-in user.

#### Today's target
- [ ] API route created at `app/api/analyse/route.ts`
- [ ] When you upload a PDF through the upload page, you see a success message
- [ ] Check Supabase Table Editor → `questions` table and see the extracted rows

---

### Days 11–12 — Fix User Authentication in API Routes and Build the Papers List Page

**Goal:** Connect the real logged-in user to the papers they upload, and build a page that lists all their papers.

These two days cover fixing the placeholder user ID, building the papers list page (`app/papers/page.tsx`), and understanding Supabase Row Level Security.

Full detailed instructions for these days follow the same pattern as above. The key code to add is:

**In your API route, get the actual user:**
```typescript
// Get the user's token from cookies (requires @supabase/ssr for production)
// Simplified approach for learning: use the anon client with the user's session
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: "Not logged in." }, { status: 401 });
}
// Then use user.id instead of the placeholder
```

**Papers list page structure:**
```typescript
// Fetch all papers for the current user, display as a grid of cards
// Each card links to /papers/[id] where the questions are listed
```

---

### Days 13–15 — Paper Detail Page and Question List

**Goal:** Click on a paper and see all its questions, filtered by topic and difficulty.

Create `app/papers/page.tsx` (list of papers) and `app/papers/[id]/page.tsx` (individual paper with question list).

Key concepts to learn on these days:
- **Dynamic routes** — the `[id]` in the folder name means the URL can be anything (`/papers/abc123`). You read the `id` from the URL using `params.id`.
- **Filtering** — use `useState` to filter the displayed questions by topic or difficulty without re-fetching from the database.

---

### Days 16–17 — Buffer Days

- Fix any bugs from this phase
- Test uploading 3 different Cambridge papers (Maths, Physics, Biology)
- Evaluate: are the AI's topic labels sensible? Are the extracted questions complete?
- Document any problems with the AI extraction in your project notes (this is content for your report's critical evaluation section)
- Commit and push to GitHub

---

## Phase 3 — Practice Mode (Answer & Grade)
### Weeks 5–6 | Days 18–27

**Goal of this phase:** A student can click on a question, type their answer, and receive AI-generated feedback with a score.

---

### Day 18 — Build the Practice Page (Frontend)

**Goal:** A page that shows one question and accepts a text answer.

Create `app/practice/[id]/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import type { Question } from "@/types/database";

export default function PracticePage() {
  const { id } = useParams(); // gets the question ID from the URL
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    score: number;
    maxScore: number;
    percentage: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    modelAnswer: string;
  }>(null);

  useEffect(() => {
    async function loadQuestion() {
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("id", id)
        .single();
      if (data) setQuestion(data as Question);
    }
    loadQuestion();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question || !answer.trim()) return;

    setLoading(true);

    const res = await fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        questionText: question.question_text,
        markingScheme: question.marking_scheme,
        maxMarks: question.marks_available,
        answerText: answer,
      }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  if (!question) return <div className="p-8 text-slate-500">Loading question...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">

        {/* Question card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {question.topic}
            </span>
            <span className="text-xs text-slate-500">
              {question.marks_available} marks · {question.difficulty}
            </span>
          </div>
          <p className="text-slate-800 leading-relaxed">{question.question_text}</p>
        </div>

        {/* Answer form — only show if not yet submitted */}
        {!result && (
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your answer
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write your answer here..."
                rows={6}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "The AI is marking your answer..." : "Submit answer"}
            </Button>
          </form>
        )}

        {/* Results — show after grading */}
        {result && (
          <div className="space-y-4">
            {/* Score */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-4xl font-bold text-slate-900 mb-1">
                {result.score} / {result.maxScore}
              </p>
              <p className="text-lg text-slate-600">{result.percentage}%</p>

              {/* Score colour bar */}
              <div className="mt-3 h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    result.percentage >= 80 ? "bg-green-500" :
                    result.percentage >= 50 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${result.percentage}%` }}
                />
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-2">AI Feedback</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{result.feedback}</p>
            </div>

            {/* Strengths */}
            {result.strengths.length > 0 && (
              <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                <h3 className="font-semibold text-green-800 mb-2">✅ What you did well</h3>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-green-700 text-sm">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {result.improvements.length > 0 && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
                <h3 className="font-semibold text-amber-800 mb-2">📝 What to improve</h3>
                <ul className="space-y-1">
                  {result.improvements.map((imp, i) => (
                    <li key={i} className="text-amber-700 text-sm">• {imp}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Model answer */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-2">📖 Model Answer</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{result.modelAnswer}</p>
            </div>

            <Button
              onClick={() => { setResult(null); setAnswer(""); }}
              variant="outline"
              className="w-full"
            >
              Try again
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
```

#### Today's target
- [ ] Practice page renders when you go to `/practice/[any-question-id]`
- [ ] The question text, topic, and marks are displayed correctly
- [ ] Answer textarea works

---

### Day 19 — Build the Grading API Route

**Goal:** The backend that receives a student's answer, sends it to Gemini with the marking scheme, and returns a score and feedback.

Create `app/api/grade/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const {
      questionId,
      questionText,
      markingScheme,
      maxMarks,
      answerText,
    } = await request.json();

    if (!questionText || !answerText || !maxMarks) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const prompt = `You are an experienced Cambridge examiner marking a student's answer.

QUESTION:
${questionText}

MARKING SCHEME / EXPECTED ANSWER:
${markingScheme || "No marking scheme available. Use your knowledge of Cambridge standards for this type of question."}

MAXIMUM MARKS: ${maxMarks}

STUDENT'S ANSWER:
${answerText}

Grade this answer as a Cambridge examiner would. Return ONLY this JSON (no extra text):
{
  "score": 3,
  "maxScore": ${maxMarks},
  "percentage": 75,
  "feedback": "One paragraph of overall feedback",
  "strengths": ["Specific point they got right", "Another correct point"],
  "improvements": ["What they missed", "What needs more detail"],
  "modelAnswer": "The ideal complete answer a top student would write"
}

Be fair but rigorous. Award marks only for points that match the marking scheme.`;

    const result = await geminiFlash.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse the JSON response
    let gradingResult;
    try {
      gradingResult = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "AI could not grade this answer. Please try again." },
          { status: 422 }
        );
      }
      gradingResult = JSON.parse(jsonMatch[0]);
    }

    // Calculate XP earned
    const xpEarned = gradingResult.percentage === 100 ? 25 : 10;

    // Save the attempt to the database
    const supabase = createServerClient();
    await supabase.from("attempts").insert({
      user_id: "00000000-0000-0000-0000-000000000000", // placeholder — fix when auth is wired up
      question_id: questionId,
      answer_text: answerText,
      score: gradingResult.score,
      max_score: gradingResult.maxScore,
      percentage: gradingResult.percentage,
      feedback: gradingResult.feedback,
      strengths: gradingResult.strengths,
      improvements: gradingResult.improvements,
      model_answer: gradingResult.modelAnswer,
      xp_earned: xpEarned,
    });

    return NextResponse.json(gradingResult);

  } catch (err) {
    console.error("Grade error:", err);
    return NextResponse.json({ error: "Grading failed." }, { status: 500 });
  }
}
```

#### Today's target
- [ ] Submit a typed answer on the practice page and see a score
- [ ] Feedback, strengths, improvements, and model answer are all shown
- [ ] A row appears in the `attempts` table in Supabase

---

### Days 20–22 — Add Image Upload for Handwritten Answers

**Goal:** Allow students to photograph their handwritten answer and have Gemini read it.

Key addition to the practice page — an image upload option:
```typescript
// Add a tab: "Type answer" vs "Upload image"
// For image upload: use an <input type="file" accept="image/*">
// Convert the image to base64 and send it to /api/grade
// In the API route: send the base64 image as an inlineData part to Gemini
```

---

### Days 23–24 — Award XP and Update the User's Level

**Goal:** After a student submits an answer, their XP goes up and their level updates on the dashboard.

Create a helper function that updates the profile XP in Supabase after each attempt. Then on the dashboard, the new XP appears next time they visit.

---

### Days 25–27 — Buffer Days

- Fix any AI grading bugs
- Test with at least 10 different questions across 3 subjects
- Evaluate: is the AI grading consistent? Does it handle wrong answers correctly?
- Note 3 cases where the AI graded incorrectly — these go in your report's critical evaluation
- Commit and push to GitHub

---

## Phase 4 — Syllabus Code Search
### Week 7 | Days 28–32

**Goal of this phase:** A page where the student types a syllabus code and the AI tells them what subject it is and what topics it covers.

---

### Day 28 — Build the Search API Route

Create `app/api/search/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";

export async function POST(request: Request) {
  const { syllabusCode, year, paperNumber } = await request.json();

  const prompt = `A student is looking for a Cambridge examination paper with syllabus code: ${syllabusCode}${year ? `, year ${year}` : ""}${paperNumber ? `, paper ${paperNumber}` : ""}.

Based on your knowledge of Cambridge International Examinations:
1. What subject does this code correspond to?
2. What are the main topic areas covered?
3. What level is it (IGCSE, O-Level, AS-Level, A-Level)?

Return ONLY this JSON:
{
  "found": true,
  "subjectName": "Mathematics",
  "level": "IGCSE",
  "description": "This is Cambridge IGCSE Mathematics (0580)...",
  "suggestedTopics": ["Number", "Algebra", "Geometry", "Statistics"]
}`;

  const result = await geminiFlash.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return NextResponse.json(JSON.parse(jsonMatch[0]));
    return NextResponse.json({ found: false, description: "Could not identify this syllabus code.", suggestedTopics: [] });
  }
}
```

### Days 29–32 — Build the Search Page Frontend and Test

Build `app/papers/search/page.tsx` with a search form, results display, and links to download sites (PapaCambridge, etc.).

---

## Phase 5 — Gamification
### Weeks 8–9 | Days 33–42

**Goal of this phase:** Achievements, badges, and study streaks are displayed and awarded correctly.

### Days 33–35 — Achievement System

Build the logic that checks whether a badge should be awarded after each attempt:

```typescript
// After saving an attempt, check these conditions:
// - First ever attempt → award "First Step" badge
// - Score is 100% → award "Perfect Score" badge
// - User now has 10+ attempts on the same topic → award "Topic Master" badge
// - User is at Level 5 → award "Rising Star" badge
```

### Days 36–38 — Study Streak Logic

Update the profile's `study_streak` after each attempt:
- If `last_study_date` was yesterday → increment streak
- If `last_study_date` was today → no change
- If `last_study_date` was more than 1 day ago → reset streak to 1
- Award streak bonus XP at 3 and 7 days

### Days 39–40 — Display Achievements on Dashboard

Show earned badges on the dashboard using a grid. Show locked badges as grey padlocks.

### Days 41–42 — Buffer Days

Test the full gamification loop end to end. Fix any XP calculation bugs.

---

## Phase 6 — Final Polish, Testing, and Report Writing
### Week 10 | Days 43–50

### Day 43 — Landing Page

Build `app/page.tsx` — a public homepage that describes the app and links to sign up and sign in. This is what non-logged-in users see.

### Day 44 — Responsive Design Check

Open the app on your phone or use browser DevTools (F12 → phone icon). Fix any layout issues that appear on small screens.

### Day 45 — Formal Testing

Write down and execute at least 15 test cases. Format them as a table:

| Test ID | What I tested | Expected result | Actual result | Pass/Fail |
|---|---|---|---|---|
| T01 | Sign up with valid email and password | Account created, redirected to dashboard | Account created, redirected to dashboard | Pass |
| T02 | Upload a valid Cambridge PDF | Questions extracted and displayed | ... | ... |

### Day 46 — AI Grading Accuracy Evaluation

Take 5 questions from a paper you have the official mark scheme for. Submit the model answer, a partially correct answer, and a blank answer. Record the AI's scores. Compare to what you would expect. Write up any discrepancies — this is your critical evaluation for the report.

### Day 47 — Deploy to Vercel

1. Push all your code to GitHub
2. Go to https://vercel.com and sign in with GitHub
3. Click **New Project** → import your `studyai` repository
4. Add your environment variables in Vercel's **Environment Variables** section
5. Click **Deploy**
6. Your app is now live at `your-project.vercel.app`

### Days 48–50 — Report and Poster Writing

By this point you have a working application and test results. Use the report structure from the README:

- Write the implementation chapter based on the decisions you made and the problems you solved
- Write the testing chapter using your test table from Day 45
- Write the critical reflection using your AI grading evaluation from Day 46
- Start the literature review using the references in the README

---

## Quick Reference: What to Do When Things Break

| Problem | Most Likely Cause | Fix |
|---|---|---|
| `npm run dev` crashes immediately | Syntax error in a file you just edited | Read the error message — it tells you the filename and line number |
| "Cannot find module '@/lib/supabase'" | File doesn't exist or is misnamed | Check the file exists at exactly `lib/supabase.ts` |
| Supabase "Invalid API key" error | Wrong key in `.env.local`, or a space in the value | Copy the key again from Supabase settings. No spaces before or after `=` |
| AI returns garbled text instead of JSON | Gemini added text around the JSON | The route's JSON parsing fallback should catch this. If not, log the raw response and add better parsing |
| "Not authorised" when reading from database | Row Level Security is blocking you | Make sure the user is logged in before querying. Check your RLS policies in Supabase |
| Page shows blank / white screen | JavaScript error in the component | Open browser DevTools (F12) → Console tab — the error is shown there |
| `hydration error` in the console | A component is trying to use browser APIs on the server | Add `"use client"` at the top of the file |

---

## Daily Habit

Every time you sit down to work, do these three things before you write a single line of code:

1. `git pull` — get the latest version of your code (important if you work on multiple computers)
2. `npm run dev` — start the development server
3. Read yesterday's code for 5 minutes — remind yourself where you left off

Every time you finish a session, do:

1. `git add .`
2. `git commit -m "describe what you just built"`
3. `git push`

This means you can always go back to a working version if you break something.
