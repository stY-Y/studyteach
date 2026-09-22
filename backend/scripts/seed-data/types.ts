import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';

/** 种子题目：知识点用 code 引用，播种时映射为真实 id */
export interface SeedQuestion {
  /** 关联知识点 code（可多个） */
  kpCodes: string[];
  subject: Subject;
  stage: StudyStage;
  type: QuestionType;
  difficulty: DifficultyLevel;
  /** 能力要求（布鲁姆认知层次） */
  ability: AbilityRequirement;
  content: string;
  options?: string[];
  answer: string;
  analysis?: string;
  /** 典型错因（四维标注之一） */
  typicalErrors?: string[];
}