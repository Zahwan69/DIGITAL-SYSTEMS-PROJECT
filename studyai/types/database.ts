export interface Profile {
  id: string;
  username: string | null;
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
  created_at: string;
}

export interface Attempt {
  id: string;
  user_id: string;
  question_id: string;
  answer_text: string;
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
