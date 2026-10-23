/**
 * @teachstudy/shared 共享枚举
 * 前后端共用的领域枚举，保证四端入口语义一致。
 */

/**
 * 用户角色：学生 / 教师（班主任）/ 平台管理员 / 家长
 * 以及组织管理层：学校管理员 / 年级管理员
 */
export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
  PARENT = 'parent',
  /** 学校管理员：平台任命，管理本校年级与年级管理员 */
  SCHOOL_ADMIN = 'school_admin',
  /** 年级管理员：学校任命，管理本年级班级与班主任 */
  GRADE_ADMIN = 'grade_admin',
}

/**
 * 任命制岗位：全部由上级任命产生，不通过注册获得。
 * 一个教师可以同时担任多个岗位（如年级管理员兼任某班班级管理员）。
 */
export enum StaffRole {
  /** 学校管理员：平台管理员从教师中任命，每校最多 2 名 */
  SCHOOL_ADMIN = 'school_admin',
  /** 年级管理员：学校管理员任命，每校每年级最多 2 名 */
  GRADE_ADMIN = 'grade_admin',
  /** 班级管理员（班主任）：年级管理员任命，每班最多 2 名 */
  CLASS_ADMIN = 'class_admin',
}

/** 各岗位名额上限（任一侧满额即拒绝） */
export const STAFF_LIMITS: Record<StaffRole, number> = {
  [StaffRole.SCHOOL_ADMIN]: 2,
  [StaffRole.GRADE_ADMIN]: 2,
  [StaffRole.CLASS_ADMIN]: 2,
};

/** 岗位中文名 */
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  [StaffRole.SCHOOL_ADMIN]: '学校管理员',
  [StaffRole.GRADE_ADMIN]: '年级管理员',
  [StaffRole.CLASS_ADMIN]: '班级管理员（班主任）',
};

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