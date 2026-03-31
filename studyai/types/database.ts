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
  user_id: string;
  subject_code: string;
  paper_name: string;
  year: number | null;
  session: string | null;
  file_url: string;
  created_at: string;
}

export interface Question {
  id: string;
  paper_id: string;
  question_number: string;
  question_text: string;
  topic: string | null;
  marks: number;
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
  feedback: string | null;
  strengths: string[];
  improvements: string[];
  model_answer: string | null;
  xp_earned: number;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  badge_key: string;
  title: string;
  description: string | null;
  earned_at: string;
}
