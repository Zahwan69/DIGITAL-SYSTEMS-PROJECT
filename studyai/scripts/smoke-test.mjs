// StudyAI smoke tests
// Usage:
//   pnpm test:smoke
//
// Requires the app to be running, usually with:
//   pnpm dev
//
// Optional:
//   $env:SMOKE_BASE_URL = "http://localhost:3000"
//   $env:SMOKE_ADMIN_EMAIL = "admin@studyai.test"
//   $env:SMOKE_TEACHER_EMAIL = "teacher1@studyai.test"
//   $env:SMOKE_STUDENT_EMAIL = "student1@studyai.test"

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key]) continue;
    process.env[key] = raw.replace(/^["']|["']$/g, "").trim();
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const BASE_URL = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ACCOUNTS = {
  admin: process.env.SMOKE_ADMIN_EMAIL || "admin@studyai.test",
  teacher: process.env.SMOKE_TEACHER_EMAIL || "teacher1@studyai.test",
  student: process.env.SMOKE_STUDENT_EMAIL || "student1@studyai.test",
};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(message) {
  console.log(`[pass] ${message}`);
}

async function signIn(label, email) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: email,
  });
  if (error || !data.session?.access_token) {
    throw new Error(`Could not sign in ${label} (${email}): ${error?.message ?? "missing session"}`);
  }
  pass(`signed in ${label}`);
  return data.session.access_token;
}

async function api(path, { token, method = "GET", body, expected = [200] } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not reach ${BASE_URL}. Start the app with pnpm dev first. ${message}`);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${path} returned ${response.status}: ${text || response.statusText}`);
  }
  return data;
}

async function runAdminSmoke(adminToken) {
  const metrics = await api("/api/admin/metrics", { token: adminToken });
  assert(metrics.totals.admins >= 1, "Expected at least one admin.");
  assert(metrics.totals.teachers >= 1, "Expected at least one teacher.");
  assert(metrics.totals.users >= 3, "Expected seeded users.");
  pass("admin metrics are accessible");

  const directory = await api("/api/admin/users?page=1&pageSize=100", { token: adminToken });
  const usersByEmail = new Map((directory.users ?? []).map((user) => [user.email, user]));
  assert(usersByEmail.has(ACCOUNTS.admin), `Admin directory missing ${ACCOUNTS.admin}.`);
  assert(usersByEmail.has(ACCOUNTS.teacher), `Admin directory missing ${ACCOUNTS.teacher}.`);
  assert(usersByEmail.has(ACCOUNTS.student), `Admin directory missing ${ACCOUNTS.student}.`);
  assert(usersByEmail.get(ACCOUNTS.admin)?.role === "admin", `${ACCOUNTS.admin} is not shown as admin.`);
  assert(usersByEmail.get(ACCOUNTS.teacher)?.role === "teacher", `${ACCOUNTS.teacher} is not shown as teacher.`);
  assert(usersByEmail.get(ACCOUNTS.student)?.role === "student", `${ACCOUNTS.student} is not shown as student.`);
  pass("admin users directory includes seeded accounts");

  const filteredAdmins = await api("/api/admin/users?role=admin&page=99&pageSize=25", { token: adminToken });
  assert(filteredAdmins.users.length >= 1, "Role-filtered admin table returned an empty out-of-range page.");
  assert(
    filteredAdmins.users.every((user) => user.role === "admin"),
    "Role-filtered admin table returned a non-admin row."
  );
  assert(
    filteredAdmins.users.some((user) => user.email === ACCOUNTS.admin),
    `Role-filtered admin table missing ${ACCOUNTS.admin}.`
  );
  pass("admin user role filter paginates after filtering");

  const tempEmail = `student-smoke-${Date.now()}@studyai.test`;
  const created = await api("/api/admin/users", {
    token: adminToken,
    method: "POST",
    body: { email: tempEmail, fullName: "StudentSmoke", role: "student" },
  });
  const tempUserId = created.user?.id;
  assert(tempUserId, "Admin create user did not return a user id.");
  pass("admin can create a user");

  await api(`/api/admin/users/${tempUserId}/role`, {
    token: adminToken,
    method: "POST",
    body: { role: "teacher" },
  });
  pass("admin can update a user role");

  await api(`/api/admin/users/${tempUserId}`, {
    token: adminToken,
    method: "DELETE",
  });
  pass("admin can delete a non-admin user");
}

async function runTeacherSmoke(teacherToken) {
  const overview = await api("/api/teacher/overview", { token: teacherToken });
  assert(overview.kpis.activeStudents >= 1, "Teacher overview has no active students.");
  pass("teacher overview loads");

  const classes = await api("/api/teacher/classes", { token: teacherToken });
  assert(Array.isArray(classes.classes), "Teacher classes response is invalid.");
  assert(classes.classes.length >= 1, "Teacher has no classes.");
  assert(classes.classes[0].member_count >= 1, "First teacher class has no members.");
  pass("teacher classes load with members");

  const assignments = await api("/api/teacher/assignments-list", { token: teacherToken });
  assert(Array.isArray(assignments.assignments), "Teacher assignments response is invalid.");
  assert(assignments.assignments.length >= 1, "Teacher has no assignments.");
  pass("teacher assignments load");

  const chat = await api("/api/teacher/chat", {
    token: teacherToken,
    method: "POST",
    body: { classId: classes.classes[0].id, mode: "class-analytics" },
  });
  assert(chat.id, "Teacher chat create did not return an id.");
  pass("teacher can create a chat");

  const chatDetail = await api(`/api/teacher/chat/${chat.id}`, { token: teacherToken });
  assert(chatDetail.chat?.id === chat.id, "Teacher chat detail did not match created chat.");
  pass("teacher can open a chat");

  await api(`/api/teacher/chat/${chat.id}`, {
    token: teacherToken,
    method: "DELETE",
    expected: [204],
  });
  pass("teacher can delete a chat");
}

async function runStudentSmoke(studentToken) {
  const joinResult = await api("/api/student/join-class", {
    token: studentToken,
    method: "POST",
    body: { joinCode: "MATH11" },
  });
  assert(joinResult.class?.id, "Student join-class did not return a class.");
  pass(joinResult.alreadyMember ? "student is already in seeded class" : "student can join a class");

  const assignments = await api("/api/student/assignments", { token: studentToken });
  assert(Array.isArray(assignments.assignments), "Student assignments response is invalid.");
  assert(assignments.assignments.length >= 1, "Student has no assigned papers.");
  pass("student assignments load");

  const papers = await api("/api/papers", { token: studentToken });
  assert(Array.isArray(papers.assignedPapers), "Student papers response is missing assignedPapers.");
  assert(papers.assignedPapers.length >= 1, "Student has no assigned paper cards.");
  pass("student my-papers data loads");
}

async function main() {
  console.log(`StudyAI smoke tests against ${BASE_URL}\n`);

  await api("/api/health/supabase");
  pass("app server and Supabase health route are reachable");

  const adminToken = await signIn("admin", ACCOUNTS.admin);
  const teacherToken = await signIn("teacher", ACCOUNTS.teacher);
  const studentToken = await signIn("student", ACCOUNTS.student);

  await runAdminSmoke(adminToken);
  await runTeacherSmoke(teacherToken);
  await runStudentSmoke(studentToken);

  console.log("\nSmoke tests passed.");
}

main().catch((error) => {
  console.error("\nSmoke tests failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
