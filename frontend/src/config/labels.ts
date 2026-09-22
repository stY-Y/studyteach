import { DifficultyLevel, QuestionType, StudyStage, Subject } from '@teachstudy/shared';

/** 学段（题目与知识点都按学段隔离，诊断/组卷必须指定） */
export const STAGE_OPTIONS: Array<{ value: StudyStage; label: string }> = [
  { value: StudyStage.PRIMARY_HIGH, label: '小学高段' },
  { value: StudyStage.JUNIOR, label: '初中' },
  { value: StudyStage.SENIOR, label: '高中' },
];

export const STAGE_LABELS: Record<string, string> = STAGE_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

export function stageLabel(stage?: string | null): string {
  if (!stage) return '未指定学段';
  return STAGE_LABELS[stage] ?? stage;
}

/**
 * 从学生档案的年级文本推断学段。
 * 档案里的 grade 是自由文本（如「八年级」「初二」「高一年级」），因此做一个容错映射。
 * 注意判断顺序：必须先判高中，否则「高一年级」会被「一年级」误判为小学。
 */
export function inferStageFromGrade(grade?: string | null): StudyStage | null {
  if (!grade) return null;
  const g = grade.trim();
  if (/高[一二三]|高中/.test(g)) return StudyStage.SENIOR;
  if (/初[一二三]|初中|[七八九]年级/.test(g)) return StudyStage.JUNIOR;
  if (/[一二三四五六]年级|小学/.test(g)) return StudyStage.PRIMARY_HIGH;
  return null;
}

/** 学科展示标签与可选顺序（顺序即界面顺序） */
export const SUBJECT_OPTIONS: Array<{ value: Subject; label: string }> = [
  { value: Subject.MATH, label: '数学' },
  { value: Subject.CHINESE, label: '语文' },
  { value: Subject.ENGLISH, label: '英语' },
  { value: Subject.PHYSICS, label: '物理' },
  { value: Subject.CHEMISTRY, label: '化学' },
  { value: Subject.BIOLOGY, label: '生物' },
  { value: Subject.POLITICS, label: '政治' },
  { value: Subject.HISTORY, label: '历史' },
  { value: Subject.GEOGRAPHY, label: '地理' },
];

export const SUBJECT_LABELS: Record<string, string> = SUBJECT_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

export function subjectLabel(subject?: string | null): string {
  if (!subject) return '未知学科';
  return SUBJECT_LABELS[subject] ?? subject;
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  [DifficultyLevel.EASY]: '简单',
  [DifficultyLevel.MEDIUM]: '中等',
  [DifficultyLevel.HARD]: '较难',
};

export function difficultyLabel(difficulty?: string | null): string {
  if (!difficulty) return '';
  return DIFFICULTY_LABELS[difficulty] ?? difficulty;
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  [QuestionType.SINGLE_CHOICE]: '单选题',
  [QuestionType.MULTIPLE_CHOICE]: '多选题',
  [QuestionType.TRUE_FALSE]: '判断题',
  [QuestionType.FILL_BLANK]: '填空题',
  [QuestionType.SHORT_ANSWER]: '简答题',
  [QuestionType.ESSAY]: '论述题',
};

export function questionTypeLabel(type?: string | null): string {
  if (!type) return '';
  return QUESTION_TYPE_LABELS[type] ?? type;
}

/** 诊断记录状态 */
export const DIAGNOSIS_STATUS_LABELS: Record<string, string> = {
  pending: '待作答',
  running: '进行中',
  done: '已完成',
  failed: '失败',
};

/** 选项字母：优先取选项自身前缀（如 "A. 0"），否则按序号推导 */
export function optionLetter(option: string, index: number): string {
  const matched = option.match(/^\s*([A-Za-z])\s*[.、．)。)]/);
  if (matched) return matched[1].toUpperCase();
  return String.fromCharCode(65 + index);
}
