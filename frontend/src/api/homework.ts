import type { DifficultyLevel, QuestionType, StudyStage, Subject } from '@teachstudy/shared';
import { http } from './http';

/** 作业题目（学生端不含 answer/analysis） */
export interface HomeworkQuestion {
  key: string;
  questionId?: string;
  content: string;
  type: QuestionType;
  options?: string[];
  answer?: string;
  analysis?: string;
  difficulty?: DifficultyLevel;
  subject: Subject;
  stage: StudyStage;
}

export interface Homework {
  id: string;
  teacherId: string;
  teacherName?: string | null;
  schoolId: string;
  grade: string;
  className: string;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  status: 'open' | 'closed';
  questions: HomeworkQuestion[];
  totalQuestions: number;
  createdAt: string;
  mySubmission?: { score: number | null; submittedAt: string } | null;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName?: string | null;
  answers: Record<string, string>;
  score: number | null;
  submittedAt: string;
}

export interface HomeworkQuestionInput {
  questionId?: string;
  content?: string;
  type?: QuestionType;
  options?: string[];
  answer?: string;
  analysis?: string;
  difficulty?: DifficultyLevel;
  subject?: Subject;
  stage?: StudyStage;
  knowledgePoints?: string[];
}

export interface CreateHomeworkBody {
  schoolId: string;
  grade: string;
  className: string;
  title: string;
  description?: string;
  dueAt?: string;
  questions: HomeworkQuestionInput[];
}

export const homeworkApi = {
  /** 教师：布置作业（自建题会自动写入题库） */
  create: (body: CreateHomeworkBody) => http.post<Homework>('/homework', body),

  /** 学生：本班作业与我的提交状态 */
  mine: () => http.get<Homework[]>('/homework/mine'),

  /** 教师/管理员：按班级查看作业 */
  list: (params: { schoolId: string; grade: string; className: string }) =>
    http.get<Homework[]>('/homework', { query: params }),

  /** 作业详情 */
  detail: (id: string) => http.get<Homework>(`/homework/${id}`),

  /** 学生：提交作业 */
  submit: (id: string, answers: Record<string, string>) =>
    http.post<HomeworkSubmission>(`/homework/${id}/submit`, { answers }),

  /** 教师：查看提交 */
  submissions: (id: string) =>
    http.get<{ homework: Homework; submissions: HomeworkSubmission[] }>(
      `/homework/${id}/submissions`,
    ),

  /** 教师：截止作业 */
  close: (id: string) => http.patch<Homework>(`/homework/${id}/close`),
};
