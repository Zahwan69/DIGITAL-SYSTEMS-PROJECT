// StudyAI demo seed script
// Usage from the studyai/ directory:
//   pnpm seed
//   node scripts/seed.mjs
//
// Optional:
//   $env:SEED_RESET_ACCOUNTS = "false"
//   $env:SEED_TEACHER_EMAIL = "you@example.com"
//   $env:SEED_TEACHER_NAME = "Your Name"
//   $env:SEED_ADMIN_EMAIL = "admin@example.com"
//   $env:SEED_ADMIN_NAME = "Admin Name"
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
// Re-runnable. It only refreshes generated attempts for seeded test students.

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRIMARY_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@studyai.test";
const PRIMARY_ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";
const PRIMARY_TEACHER_EMAIL = process.env.SEED_TEACHER_EMAIL || "teacher1@studyai.test";
const PRIMARY_TEACHER_NAME = process.env.SEED_TEACHER_NAME || "Teacher1";
const RESET_SEEDED_ACCOUNTS = process.env.SEED_RESET_ACCOUNTS !== "false";

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FAKE_TEACHERS = Array.from({ length: 3 }, (_, index) => {
  const number = index + 2;
  return [`teacher${number}@studyai.test`, `Teacher${number}`];
});

const STUDENTS = Array.from({ length: 26 }, (_, index) => {
  const number = index + 1;
  return [`student${number}@studyai.test`, `Student${number}`];
});

const LEGACY_SEED_EMAILS = [
  "admin@studyai-test.local",
  "teacher@studyai-test.local",
  "ms.ahmed@studyai-test.local",
  "mr.chen@studyai-test.local",
  "ms.kovacs@studyai-test.local",
  "alex@studyai-test.local",
  "bashir@studyai-test.local",
  "cara@studyai-test.local",
  "devi@studyai-test.local",
  "eli@studyai-test.local",
  "fatima@studyai-test.local",
  "gabriel@studyai-test.local",
  "hira@studyai-test.local",
  "ibrahim@studyai-test.local",
  "jasmin@studyai-test.local",
  "kenji@studyai-test.local",
  "lila@studyai-test.local",
  "mateo@studyai-test.local",
  "noor@studyai-test.local",
  "ola@studyai-test.local",
  "priya@studyai-test.local",
  "quinn@studyai-test.local",
  "rashid@studyai-test.local",
  "sana@studyai-test.local",
  "tariq@studyai-test.local",
  "uma@studyai-test.local",
  "vera@studyai-test.local",
  "wei@studyai-test.local",
  "xander@studyai-test.local",
  "yusra@studyai-test.local",
  "zane@studyai-test.local",
];

const GENERATED_SEED_EMAILS = [
  PRIMARY_ADMIN_EMAIL,
  PRIMARY_TEACHER_EMAIL,
  ...FAKE_TEACHERS.map(([email]) => email),
  ...STUDENTS.map(([email]) => email),
];

const SEED_EMAILS_TO_RESET = new Set(
  [...GENERATED_SEED_EMAILS, ...LEGACY_SEED_EMAILS].map((email) => email.toLowerCase())
);

function passwordForEmail(email) {
  return email;
}

function usernameForEmail(email) {
  return email.split("@")[0];
}

const SUBJECTS = [
  { name: "IGCSE Mathematics", syllabus_code: "0580", level: "IGCSE" },
  { name: "IGCSE Biology", syllabus_code: "0610", level: "IGCSE" },
  { name: "IGCSE Physics", syllabus_code: "0625", level: "IGCSE" },
  { name: "IGCSE Chemistry", syllabus_code: "0620", level: "IGCSE" },
  { name: "AS-Level Mathematics", syllabus_code: "9709", level: "AS-Level" },
];

const TEACHER_SUBJECT_INDEXES = {
  0: [0, 1],
  1: [0, 2],
  2: [3, 4],
  3: [1, 2],
};

const QUESTION_BANKS = {
  "IGCSE Mathematics": [
    { topic: "Algebra", difficulty: "easy", marks: 3, text: "Solve 3x + 7 = 22 for x.", scheme: "x = 5. M1 isolate x, A1 answer." },
    { topic: "Algebra", difficulty: "medium", marks: 4, text: "Factorise x^2 - 5x + 6 fully.", scheme: "(x - 2)(x - 3). M1 product/sum check, A1 factors." },
    { topic: "Geometry", difficulty: "medium", marks: 5, text: "A circle has radius 7 cm. Calculate its area, leaving your answer in terms of pi.", scheme: "49 pi cm^2. M1 use pi r^2, A1 substitution, A1 answer." },
    { topic: "Number", difficulty: "easy", marks: 2, text: "Write 0.000327 in standard form.", scheme: "3.27 x 10^-4. M1 decimal shift, A1 exponent." },
    { topic: "Statistics", difficulty: "hard", marks: 6, text: "Find the mean and standard deviation of: 4, 8, 6, 5, 3, 7, 9, 6.", scheme: "Mean 6, standard deviation about 1.94. Award method for mean and variance." },
    { topic: "Trigonometry", difficulty: "medium", marks: 4, text: "Right-angled triangle: opposite 5, adjacent 12. Find the hypotenuse.", scheme: "13 cm. M1 Pythagoras, A1 answer." },
    { topic: "Probability", difficulty: "hard", marks: 5, text: "A bag has 5 red and 7 blue marbles. Two are drawn without replacement. Find P(both red).", scheme: "5/12 x 4/11 = 5/33. Award for first probability, second probability, final simplification." },
  ],
  "IGCSE Biology": [
    { topic: "Cell biology", difficulty: "easy", marks: 3, text: "Name three organelles found in a plant cell but not an animal cell.", scheme: "Chloroplast, cell wall, large permanent vacuole. One mark each." },
    { topic: "Genetics", difficulty: "medium", marks: 5, text: "Explain how genetic variation arises in sexual reproduction.", scheme: "Meiosis, independent assortment, crossing over, random fertilisation, mutation." },
    { topic: "Ecology", difficulty: "medium", marks: 4, text: "Describe the carbon cycle, including roles of decomposers and combustion.", scheme: "Photosynthesis fixes carbon dioxide; respiration releases it; decomposers recycle carbon; combustion releases stored carbon." },
    { topic: "Human physiology", difficulty: "hard", marks: 6, text: "Explain the role of the kidneys in osmoregulation, including the action of ADH.", scheme: "Detect blood water potential; ADH released; collecting ducts become more permeable; more water reabsorbed." },
    { topic: "Plants", difficulty: "easy", marks: 3, text: "Define photosynthesis and give the balanced equation.", scheme: "Light energy converts carbon dioxide and water to glucose and oxygen. 6CO2 + 6H2O -> C6H12O6 + 6O2." },
    { topic: "Cell biology", difficulty: "medium", marks: 4, text: "Describe how the structure of red blood cells is adapted to their function.", scheme: "Biconcave surface area; no nucleus; haemoglobin; flexible shape." },
    { topic: "Genetics", difficulty: "hard", marks: 5, text: "Homozygous tall pea (TT) crossed with homozygous short (tt). Describe F1 and F2 phenotypes.", scheme: "F1 all tall Tt. F2 ratio 3 tall to 1 short. Award for genotype and phenotype reasoning." },
  ],
  "IGCSE Physics": [
    { topic: "Mechanics", difficulty: "easy", marks: 3, text: "A car accelerates from rest to 20 m/s in 8 s. Calculate its acceleration.", scheme: "2.5 m/s^2. M1 a = change in velocity / time, A1 answer." },
    { topic: "Mechanics", difficulty: "medium", marks: 4, text: "A 5 kg object is pushed with 30 N. Calculate acceleration if friction is 5 N.", scheme: "Net force = 25 N, acceleration = 5 m/s^2." },
    { topic: "Waves", difficulty: "medium", marks: 5, text: "A wave has frequency 50 Hz and wavelength 6 m. Find speed and period.", scheme: "v = 300 m/s, T = 0.02 s. Award for formulas and substitutions." },
    { topic: "Electricity", difficulty: "hard", marks: 6, text: "Two 4 ohm resistors in parallel are in series with a 6 ohm resistor across 12 V. Find total current.", scheme: "Parallel resistance = 2 ohm; total = 8 ohm; current = 1.5 A." },
    { topic: "Energy", difficulty: "easy", marks: 3, text: "Define kinetic energy and give the formula.", scheme: "Energy due to motion. KE = 1/2 mv^2." },
    { topic: "Thermal physics", difficulty: "medium", marks: 4, text: "Calculate energy to heat 2 kg of water by 30 C. (c = 4200 J/kg/C)", scheme: "252000 J. Q = mc delta T." },
  ],
  "IGCSE Chemistry": [
    { topic: "Atomic structure", difficulty: "easy", marks: 3, text: "Define an isotope and give an example.", scheme: "Atoms of the same element with the same protons but different neutrons, e.g. carbon-12 and carbon-14." },
    { topic: "Bonding", difficulty: "medium", marks: 4, text: "Explain why sodium chloride has a high melting point.", scheme: "Strong electrostatic attraction between oppositely charged ions in a giant ionic lattice." },
    { topic: "Stoichiometry", difficulty: "hard", marks: 6, text: "Calculate the mass of CO2 produced when 5 g of CaCO3 decomposes. Mr: CaCO3 = 100, CO2 = 44.", scheme: "Moles CaCO3 = 0.05; ratio 1:1; mass CO2 = 2.2 g." },
    { topic: "Acids and bases", difficulty: "easy", marks: 3, text: "Name three properties of acids.", scheme: "Turn litmus red, pH below 7, react with metals/carbonates/bases." },
    { topic: "Organic chemistry", difficulty: "medium", marks: 4, text: "Describe the test for an alkene and the expected result.", scheme: "Add bromine water. Orange/brown turns colourless." },
  ],
  "AS-Level Mathematics": [
    { topic: "Differentiation", difficulty: "medium", marks: 5, text: "Differentiate y = 3x^4 - 2x^2 + 7 with respect to x.", scheme: "dy/dx = 12x^3 - 4x. Award power rule and each term." },
    { topic: "Integration", difficulty: "hard", marks: 6, text: "Evaluate the integral of (2x + 3) dx from 1 to 4.", scheme: "Antiderivative x^2 + 3x. Value = 24." },
    { topic: "Vectors", difficulty: "hard", marks: 5, text: "Find the magnitude of the vector 3i + 4j - 12k.", scheme: "13. Use square root of sum of squares." },
    { topic: "Trigonometry", difficulty: "medium", marks: 4, text: "Solve sin(2x) = 0.5 for x in [0, 360].", scheme: "x = 15, 75, 195, 255 degrees." },
  ],
};

const PAPER_DEFS = [
  { subjectIdx: 0, year: 2023, paper_number: "Paper 2", uploaderIdx: 0 },
  { subjectIdx: 1, year: 2023, paper_number: "Paper 3", uploaderIdx: 0 },
  { subjectIdx: 2, year: 2022, paper_number: "Paper 4", uploaderIdx: 1 },
  { subjectIdx: 3, year: 2023, paper_number: "Paper 4", uploaderIdx: 2 },
  { subjectIdx: 4, year: 2023, paper_number: "Paper 1", uploaderIdx: 2 },
];

const CLASS_DEFS = [
  {
    name: "IGCSE Mathematics 11A",
    join_code: "MATH11",
    subjectIdx: 0,
    paperIndexes: [0],
    studentRange: [0, 16],
  },
  {
    name: "IGCSE Biology 11B",
    join_code: "BIO11B",
    subjectIdx: 1,
    paperIndexes: [1],
    studentRange: [8, 24],
  },
];

function daysAgo(days, hour = 12) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) return users;
    page += 1;
  }
}

async function resetSeededAccounts() {
  const authUsers = await listAllAuthUsers();
  const usersToDelete = authUsers.filter((user) => {
    const email = user.email?.toLowerCase();
    return email ? SEED_EMAILS_TO_RESET.has(email) : false;
  });

  if (usersToDelete.length === 0) {
    process.stdout.write("  no seeded auth users to reset\n");
    return;
  }

  for (const user of usersToDelete) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`deleteUser ${user.email}: ${error.message}`);
    process.stdout.write(`  deleted  ${user.email}\n`);
  }
}

async function ensureUser(email, fullName, role) {
  const existing = await findUserByEmail(email);
  let userId;
  let created = false;
  const username = usernameForEmail(email);

  if (existing) {
    userId = existing.id;
    process.stdout.write(`  existing ${email}\n`);
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: passwordForEmail(email),
      email_confirm: true,
      user_metadata: { full_name: fullName, username, role },
    });
    if (error) throw new Error(`updateUser ${email}: ${error.message}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: passwordForEmail(email),
      email_confirm: true,
      user_metadata: { full_name: fullName, username, role },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    userId = data.user.id;
    created = true;
    process.stdout.write(`  created  ${email}\n`);
  }

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    username,
    full_name: fullName,
    role,
  });
  if (error) throw error;

  return { id: userId, created };
}

async function upsertReturningId(table, row, where) {
  let query = supabase.from(table).select("id");
  for (const [key, value] of Object.entries(where)) query = query.eq(key, value);
  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const { error: updateError } = await supabase.from(table).update(row).eq("id", existing.id);
    if (updateError) throw updateError;
    return existing.id;
  }

  const { data, error } = await supabase.from(table).insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

async function ensureQuestions(paperId, subjectName) {
  const bank = QUESTION_BANKS[subjectName] ?? [];
  const { data: existing, error: existingError } = await supabase
    .from("questions")
    .select("id, marks_available, question_number")
    .eq("paper_id", paperId)
    .order("question_number", { ascending: true });
  if (existingError) throw existingError;

  if ((existing ?? []).length > 0) {
    await supabase.from("past_papers").update({ question_count: existing.length }).eq("id", paperId);
    return existing;
  }

  const rows = bank.map((question, index) => ({
    paper_id: paperId,
    question_number: String(index + 1),
    question_text: question.text,
    topic: question.topic,
    marks_available: question.marks,
    difficulty: question.difficulty,
    marking_scheme: question.scheme,
  }));
  const { data, error } = await supabase
    .from("questions")
    .insert(rows)
    .select("id, marks_available, question_number")
    .order("question_number", { ascending: true });
  if (error) throw error;
  await supabase.from("past_papers").update({ question_count: rows.length }).eq("id", paperId);
  return data ?? [];
}

function buildAttemptRows(classIndex, classStudentIds, questionsByPaper, classDef) {
  const rows = [];

  for (const paperIndex of classDef.paperIndexes) {
    const questionRows = questionsByPaper[paperIndex] ?? [];
    for (let studentIndex = 0; studentIndex < classStudentIds.length; studentIndex += 1) {
      const studentId = classStudentIds[studentIndex];
      const completionTarget =
        studentIndex % 5 === 0
          ? questionRows.length
          : Math.max(2, Math.min(questionRows.length, Math.floor(questionRows.length * (0.45 + (studentIndex % 4) * 0.12))));

      for (let qIndex = 0; qIndex < completionTarget; qIndex += 1) {
        const q = questionRows[qIndex];
        const maxScore = Number(q.marks_available ?? 1) || 1;
        const raw = 38 + ((studentIndex * 9 + qIndex * 13 + classIndex * 17) % 60);
        const score = Math.max(0, Math.min(maxScore, Math.round((raw / 100) * maxScore)));
        const percentage = Math.round((score / maxScore) * 100);
        const fullMarks = score === maxScore;
        const xpEarned = 10 + (fullMarks ? 25 : 0) + (completionTarget === questionRows.length && qIndex === questionRows.length - 1 ? 100 : 0);

        rows.push({
          user_id: studentId,
          question_id: q.id,
          answer_text: fullMarks
            ? "I used the correct method and gave the final answer with units."
            : "I wrote a partial answer and missed at least one marking point.",
          answer_image_url: null,
          answer_image_path: null,
          needs_teacher_review: (studentIndex + qIndex + classIndex) % 11 === 0,
          score,
          max_score: maxScore,
          percentage,
          feedback: fullMarks
            ? "Strong answer with the key marking points included."
            : "Some correct ideas are present, but the answer needs clearer working and a more precise final point.",
          strengths: fullMarks ? ["Correct method", "Clear final answer"] : ["Relevant attempt"],
          improvements: fullMarks ? ["Keep showing working"] : ["Add missing method steps", "Check final units or wording"],
          model_answer: "A full answer should state the method, substitute values clearly, and give the final answer with units where needed.",
          xp_earned: xpEarned,
          created_at: daysAgo((studentIndex * 2 + qIndex * 3 + classIndex) % 28, 9 + ((studentIndex + qIndex) % 8)),
        });
      }
    }
  }

  return rows;
}

async function updateStudentProgress(studentIds) {
  for (const studentId of studentIds) {
    const { data: attempts, error } = await supabase
      .from("attempts")
      .select("xp_earned")
      .eq("user_id", studentId);
    if (error) throw error;

    const xp = (attempts ?? []).reduce((sum, attempt) => sum + Number(attempt.xp_earned ?? 0), 0);
    const level = Math.floor(xp / 500) + 1;
    const payload = { xp, level, study_streak: Math.min(7, Math.max(1, Math.floor(xp / 120))) };
    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", studentId);
    if (updateError?.code === "PGRST204" && updateError.message.includes("study_streak")) {
      const { error: fallbackError } = await supabase
        .from("profiles")
        .update({ xp, level })
        .eq("id", studentId);
      if (fallbackError) throw fallbackError;
      continue;
    }
    if (updateError) throw updateError;
  }
}

async function main() {
  console.log("Seeding StudyAI demo data\n");

  console.log("1) Reset seeded accounts");
  if (RESET_SEEDED_ACCOUNTS) {
    await resetSeededAccounts();
  } else {
    console.log("  skipped because SEED_RESET_ACCOUNTS=false");
  }

  console.log("\n2) Users");
  await ensureUser(PRIMARY_ADMIN_EMAIL, PRIMARY_ADMIN_NAME, "admin");

  const teacherUsers = [];
  teacherUsers.push(await ensureUser(PRIMARY_TEACHER_EMAIL, PRIMARY_TEACHER_NAME, "teacher"));
  for (const [email, name] of FAKE_TEACHERS) {
    teacherUsers.push(await ensureUser(email, name, "teacher"));
  }

  const studentUsers = [];
  for (const [email, name] of STUDENTS) {
    studentUsers.push(await ensureUser(email, name, "student"));
  }

  const teacherIds = teacherUsers.map((user) => user.id);
  const studentIds = studentUsers.map((user) => user.id);

  console.log("\n3) Subjects");
  const subjectIds = [];
  for (const subject of SUBJECTS) {
    const id = await upsertReturningId("subjects", subject, {
      name: subject.name,
      syllabus_code: subject.syllabus_code,
    });
    subjectIds.push(id);
    console.log(`  ready ${subject.name}`);
  }

  console.log("\n4) Teacher subject links");
  for (const [teacherIndexText, subjectIndexes] of Object.entries(TEACHER_SUBJECT_INDEXES)) {
    const teacherIndex = Number(teacherIndexText);
    for (const subjectIndex of subjectIndexes) {
      const { error } = await supabase
        .from("teacher_subjects")
        .upsert(
          { teacher_id: teacherIds[teacherIndex], subject_id: subjectIds[subjectIndex] },
          { onConflict: "teacher_id,subject_id" }
        );
      if (error) throw error;
    }
  }
  console.log("  ready teacher_subjects");

  console.log("\n5) Past papers and questions");
  const paperIds = [];
  const questionsByPaperIndex = {};
  for (let index = 0; index < PAPER_DEFS.length; index += 1) {
    const paperDef = PAPER_DEFS[index];
    const subject = SUBJECTS[paperDef.subjectIdx];
    const paperId = await upsertReturningId(
      "past_papers",
      {
        uploaded_by: teacherIds[paperDef.uploaderIdx],
        subject_name: subject.name,
        syllabus_code: subject.syllabus_code,
        year: paperDef.year,
        paper_number: paperDef.paper_number,
        level: subject.level,
      },
      {
        uploaded_by: teacherIds[paperDef.uploaderIdx],
        syllabus_code: subject.syllabus_code,
        year: paperDef.year,
        paper_number: paperDef.paper_number,
      }
    );
    paperIds.push(paperId);
    const questions = await ensureQuestions(paperId, subject.name);
    questionsByPaperIndex[index] = questions;
    console.log(`  ready ${subject.name} ${paperDef.year} ${paperDef.paper_number} (${questions.length} questions)`);
  }

  console.log("\n6) Classes, members, and assignments");
  const seededQuestionIds = Object.values(questionsByPaperIndex).flat().map((question) => question.id);
  if (seededQuestionIds.length > 0) {
    const { error } = await supabase
      .from("attempts")
      .delete()
      .in("user_id", studentIds)
      .in("question_id", seededQuestionIds);
    if (error) throw error;
  }

  const classIds = [];
  for (let classIndex = 0; classIndex < CLASS_DEFS.length; classIndex += 1) {
    const classDef = CLASS_DEFS[classIndex];
    const classId = await upsertReturningId(
      "classes",
      {
        teacher_id: teacherIds[0],
        name: classDef.name,
        join_code: classDef.join_code,
        subject_id: subjectIds[classDef.subjectIdx],
      },
      { teacher_id: teacherIds[0], name: classDef.name }
    );
    classIds.push(classId);

    const [start, end] = classDef.studentRange;
    const classStudentIds = studentIds.slice(start, end);
    for (const studentId of classStudentIds) {
      const { error } = await supabase
        .from("class_members")
        .upsert({ class_id: classId, student_id: studentId }, { onConflict: "class_id,student_id" });
      if (error) throw error;
    }

    for (const paperIndex of classDef.paperIndexes) {
      const subject = SUBJECTS[PAPER_DEFS[paperIndex].subjectIdx];
      await upsertReturningId(
        "assignments",
        {
          class_id: classId,
          paper_id: paperIds[paperIndex],
          title: `${subject.name} ${PAPER_DEFS[paperIndex].paper_number} practice`,
          instructions: "Seeded demo assignment. Students should answer all questions and review feedback.",
          due_date: daysAgo(-7, 17),
          created_by: teacherIds[0],
        },
        {
          class_id: classId,
          paper_id: paperIds[paperIndex],
          title: `${subject.name} ${PAPER_DEFS[paperIndex].paper_number} practice`,
        }
      );
    }

    const attemptRows = buildAttemptRows(classIndex, classStudentIds, questionsByPaperIndex, classDef);
    if (attemptRows.length > 0) {
      const { error } = await supabase.from("attempts").insert(attemptRows);
      if (error) throw error;
    }

    console.log(`  ready ${classDef.name}: ${classStudentIds.length} students, ${attemptRows.length} attempts`);
  }

  console.log("\n7) Student XP and levels");
  await updateStudentProgress(studentIds);
  console.log("  ready progress");

  console.log("\nSeed complete\n");
  console.log("Main test logins:");
  console.log(
    `  Admin:   email ${PRIMARY_ADMIN_EMAIL} / username ${usernameForEmail(PRIMARY_ADMIN_EMAIL)} / password ${passwordForEmail(PRIMARY_ADMIN_EMAIL)}`
  );
  console.log(
    `  Teacher: email ${PRIMARY_TEACHER_EMAIL} / username ${usernameForEmail(PRIMARY_TEACHER_EMAIL)} / password ${passwordForEmail(PRIMARY_TEACHER_EMAIL)}`
  );
  console.log(
    `  Student: email ${STUDENTS[0][0]} / username ${usernameForEmail(STUDENTS[0][0])} / password ${passwordForEmail(STUDENTS[0][0])}`
  );
  console.log(
    `  Student: email ${STUDENTS[8][0]} / username ${usernameForEmail(STUDENTS[8][0])} / password ${passwordForEmail(STUDENTS[8][0])}`
  );
  console.log("  Usernames are the email prefix for every generated test account.");
  console.log("  Passwords are the full email address for every generated test account.");
  console.log("\nClass join codes:");
  CLASS_DEFS.forEach((classDef) => console.log(`  ${classDef.name}: ${classDef.join_code}`));
  console.log("\nSuggested smoke test:");
  console.log("  1. Log in as the teacher and open Teacher Dashboard, Classes, Assignments, Insights, AI Chat.");
  console.log("  2. Log in as student1@studyai.test and open Dashboard, My Papers, then attempt a seeded paper.");
  console.log("  3. In Teacher AI, ask: Which topics are weakest in IGCSE Mathematics 11A?");
}

main().catch((error) => {
  console.error("\nSeed failed:", error);
  process.exit(1);
});
