/**
 * @teachstudy/shared 共享枚举
 * 前后端共用的领域枚举，保证四端入口语义一致。
 */

/** 用户角色：学生端 / 教师端 / 管理员端 / 家长端 */
export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
  PARENT = 'parent',
}

/** 学段：小学 / 初中 / 高中 */
export enum StudyStage {
  PRIMARY_HIGH = 'primary_high',
  JUNIOR = 'junior',
  SENIOR = 'senior',
}

/** 学科 */
export enum Subject {
  CHINESE = 'chinese',
  MATH = 'math',
  ENGLISH = 'english',
  PHYSICS = 'physics',
  CHEMISTRY = 'chemistry',
  BIOLOGY = 'biology',
  POLITICS = 'politics',
  HISTORY = 'history',
  GEOGRAPHY = 'geography',
}

/** 题型（主观/客观统一枚举） */
export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_BLANK = 'fill_blank',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
}

/** 难度层级 */
export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

/** 能力要求（布鲁姆认知层次） */
export enum AbilityRequirement {
  MEMORY = 'memory',
  UNDERSTAND = 'understand',
  APPLY = 'apply',
  ANALYZE = 'analyze',
  EVALUATE = 'evaluate',
  CREATE = 'create',
}

/** 资源类型 */
export enum ResourceType {
  EXAM_PAPER = 'exam_paper',
  GUIDE_PLAN = 'guide_plan',
  EBOOK = 'ebook',
  VIDEO = 'video',
  AUDIO = 'audio',
}

/** 资源开放范围 */
export enum ResourceScope {
  SCHOOL_ONLY = 'school_only',
  PUBLIC = 'public',
}

/** 资源状态（校级审核 + 平台复核 双层机制） */
export enum ResourceStatus {
  PENDING_SCHOOL = 'pending_school',
  PENDING_PLATFORM = 'pending_platform',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  OFFLINE = 'offline',
}

/** 审核层级 */
export enum ReviewLevel {
  SCHOOL = 'school',
  PLATFORM = 'platform',
}

/** 审核结果 */
export enum ReviewResult {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** 志愿梯度：冲 / 稳 / 保 */
export enum VolunteerTier {
  CHONG = 'chong',
  WEN = 'wen',
  BAO = 'bao',
}

/** 知识诊断状态 */
export enum DiagnosisStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  FAILED = 'failed',
}

/** 性别 */
export enum Gender {
  UNKNOWN = 'unknown',
  MALE = 'male',
  FEMALE = 'female',
}