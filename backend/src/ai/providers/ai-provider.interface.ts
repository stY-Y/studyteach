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

/**
 * 逐层揭示的一层提示。
 *
 * 乡村孩子常常是「没人问」，所以不直接摊答案，而是像老师在旁边陪着：
 * 先点拨一句；学生说还不会，再给一小段答案（不是全部）；还不会再点拨一句……一路递进，
 * 直到实在不会再展示完整答案与解析。
 */
export interface GradeHintLevel {
  /** hint=点拨思路 / partial=给出一部分答案 / answer=完整答案 / analysis=解析 */
  kind: 'hint' | 'partial' | 'answer' | 'analysis';
  content: string;
}

/** 一个解题关键点，内含逐级递进的提示（脚手架） */
export interface GradeKeyPoint {
  /** 关键点小标题，如「找准等量关系」 */
  title: string;
  /** 按「点拨 → 部分答案 → 再点拨 → 再多一点答案」交替排列 */
  levels: GradeHintLevel[];
}

/**
 * 智能批改出参：错因分析 + 关键点逐级提示 + 兜底的完整答案与解析。
 *
 * 完整答案不主动呈现：由前端按关键点逐层解锁，学生主动要到底才给出，
 * 既保留自主思考的空间，也不至于「想不出就看不了答案」把人堵死。
 */
export interface GradeResult {
  /** 归一化得分 0-1 */
  score: number;
  errorAnalysis: string;
  /** 兼容旧结构：每个关键点的第一句点拨（历史记录与旧端仍用它） */
  hints: string[];
  /** 解题关键点（逐层揭示） */
  keyPoints: GradeKeyPoint[];
  /** 完整答案（最后才展示） */
  answer: string;
  /** 完整解析（最后才展示） */
  analysis: string;
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