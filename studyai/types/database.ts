export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  role: string;
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
  level: string;
  question_count: number;
  created_at: string;
}

export interface Question {
  id: string;
  paper_id: string;
  question_number: string;
  question_text: string;
  topic: string | null;
  marks_available: number;
  difficulty: "easy" | "medium" | "hard";
  marking_scheme: string | null;
  image_url: string | null;
  image_path: string | null;
  has_diagram: boolean;
  created_at: string;
}

export interface Attempt {
  id: string;
  user_id: string;
  question_id: string;
  answer_text: string;
  answer_image_url: string | null;
  answer_image_path: string | null;
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

export interface Subject {
  id: string;
  name: string;
  syllabus_code: string | null;
  level: string | null;
  created_at: string;
}

export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  assigned_at: string;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  join_code: string;
  created_at: string;
  subject_id?: string | null;
}

export interface ClassMember {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  paper_id: string;
  title: string;
  instructions: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
}

export interface ClassInvite {
  id: string;
  class_id: string;
  student_id: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}
