import { DifficultyLevel, QuestionType, StudyStage, Subject, VolunteerTier } from '@teachstudy/shared';

/** 知识诊断入参 */
export interface DiagnoseInput {
  subject: Subject;
  /** 学生作答 [{ questionId, answer }] */
  answers: Array<{ questionId: string; answer: string }>;
  /** 检测题覆盖的知识点 id */
  knowledgePoints: string[];
}

export interface WeakPointResult {
  knowledgePointId: string;
  /** 掌握度 0-1 */
  mastery: number;
  reason: string;
}

/** 知识诊断出参：薄弱点清单 + 补漏学习路径 */
export interface DiagnoseResult {
  weakPoints: WeakPointResult[];
  learningPath: string[];
}

/** 智能批改入参 */
export interface GradeInput {
  question: {
    id: string;
    type: string;
    content: string;
    answer: string;
    knowledgePointId?: string;
  };
  answer: string;
}

/** 智能批改出参：错因分析 + 启发式点拨（不输出完整答案） */
export interface GradeResult {
  /** 归一化得分 0-1 */
  score: number;
  errorAnalysis: string;
  hints: string[];
}

/** 智能组卷入参 */
export interface PaperGenInput {
  subject: Subject;
  stage: StudyStage;
  knowledgePoints: string[];
  difficulty: DifficultyLevel;
  count: number;
}

/**
 * 选题计划条目：AI 只负责「考什么知识点、什么题型、什么难度、各几道」，
 * 具体题目由服务层据此从题库真实抽取。
 */
export interface PaperBlueprintItem {
  knowledgePointId: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  count: number;
}

/** 智能组卷出参：选题计划（不含具体题目） */
export interface PaperGenResult {
  blueprint: PaperBlueprintItem[];
  summary: string;
}

/** 志愿匹配入参 */
export interface VolunteerInput {
  score: number;
  rank: number;
  subjects: string[];
}

export interface VolunteerCollege {
  name: string;
  tier: VolunteerTier;
  restrictions: string[];
}

/** 志愿匹配出参：冲稳保梯度方案 + 报考限制 */
export interface VolunteerResult {
  plans: VolunteerCollege[];
}

/** AI 服务提供方抽象：接入真实模型时实现本接口 */
export interface AiProvider {
  readonly name: string;
  diagnose(input: DiagnoseInput): Promise<DiagnoseResult>;
  grade(input: GradeInput): Promise<GradeResult>;
  generatePaper(input: PaperGenInput): Promise<PaperGenResult>;
  matchVolunteer(input: VolunteerInput): Promise<VolunteerResult>;
  /** 上传资源知识点标签自动匹配 */
  extractKnowledgeTags(title: string, content: string): Promise<string[]>;
}