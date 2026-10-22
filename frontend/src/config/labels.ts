import { DifficultyLevel, QuestionType, StudyStage, Subject } from '@teachstudy/shared';

/** 学段（题目与知识点都按学段隔离，诊断/组卷必须指定） */
export const STAGE_OPTIONS: Array<{ value: StudyStage; label: string }> = [
  { value: StudyStage.PRIMARY_HIGH, label: '小学' },
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

/** 年级：1-6 小学，7-9 初中，10-12 高中（高一/高二/高三） */
export const GRADE_LABELS: Record<number, string> = {
  1: '一年级',
  2: '二年级',
  3: '三年级',
  4: '四年级',
  5: '五年级',
  6: '六年级',
  7: '七年级',
  8: '八年级',
  9: '九年级',
  10: '高一',
  11: '高二',
  12: '高三',
};

export function gradeLabel(grade?: number | null): string {
  if (grade === null || grade === undefined) return '跨年级';
  return GRADE_LABELS[grade] ?? `${grade} 年级`;
}

/** 学段 → 可选年级（小学 1-6 / 初中 7-9 / 高中 10-12） */
export const GRADES_BY_STAGE: Record<StudyStage, number[]> = {
  [StudyStage.PRIMARY_HIGH]: [1, 2, 3, 4, 5, 6],
  [StudyStage.JUNIOR]: [7, 8, 9],
  [StudyStage.SENIOR]: [10, 11, 12],
};

export function gradesForStage(stage: StudyStage): number[] {
  return GRADES_BY_STAGE[stage] ?? [];
}

/** 学科范围：小学只有语数外；初中/高中为语数英物化生政史地 */
const PRIMARY_SUBJECTS = [Subject.CHINESE, Subject.MATH, Subject.ENGLISH];
const SECONDARY_SUBJECTS = [
  Subject.CHINESE,
  Subject.MATH,
  Subject.ENGLISH,
  Subject.PHYSICS,
  Subject.CHEMISTRY,
  Subject.BIOLOGY,
  Subject.POLITICS,
  Subject.HISTORY,
  Subject.GEOGRAPHY,
];

export const SUBJECTS_BY_STAGE: Record<StudyStage, Subject[]> = {
  [StudyStage.PRIMARY_HIGH]: PRIMARY_SUBJECTS,
  [StudyStage.JUNIOR]: SECONDARY_SUBJECTS,
  [StudyStage.SENIOR]: SECONDARY_SUBJECTS,
};

/** 当前学段可选的学科（带标签，顺序即界面顺序） */
export function subjectOptionsForStage(
  stage: StudyStage,
): Array<{ value: Subject; label: string }> {
  return (SUBJECTS_BY_STAGE[stage] ?? []).map((value) => ({
    value,
    label: SUBJECT_LABELS[value] ?? value,
  }));
}

/** 从档案年级文本大胆推断年级数字（如「八年级」「初二」「高一年级」） */
export function inferGradeFromText(text?: string | null): number | null {
  if (!text) return null;
  const g = text.trim();

  // 必须先判高中：否则「高一年级」里的「一年级」会被误判
  const senior = g.match(/高([一二三])/);
  if (senior) return 9 + ['一', '二', '三'].indexOf(senior[1]);
  if (/高三/.test(g)) return 12;
  if (/高中/.test(g)) return 10;

  const junior = g.match(/初([一二三])/);
  if (junior) return 6 + ['一', '二', '三'].indexOf(junior[1]);

  const numeric = g.match(/([一二三四五六七八九]|\d{1,2})\s*年级/);
  if (numeric) {
    const raw = numeric[1];
    if (/^\d+$/.test(raw)) {
      const n = Number(raw);
      return n >= 1 && n <= 12 ? n : null;
    }
    const idx = '一二三四五六七八九'.indexOf(raw);
    return idx >= 0 ? idx + 1 : null;
  }

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

/** 资源类型 / 状态 / 开放范围 */
export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  exam_paper: '试题',
  guide_plan: '导学案',
  ebook: '电子书',
  video: '视频',
  audio: '音频',
};

export const RESOURCE_STATUS_LABELS: Record<string, string> = {
  pending_school: '待校级审核',
  pending_platform: '待平台复核',
  approved: '已通过',
  rejected: '已驳回',
  offline: '已下架',
};

export const RESOURCE_SCOPE_LABELS: Record<string, string> = {
  school_only: '仅本校可见',
  public: '全平台共享',
};

export function resourceTypeLabel(type?: string | null): string {
  if (!type) return '资源';
  return RESOURCE_TYPE_LABELS[type] ?? type;
}

export function resourceStatusLabel(status?: string | null): string {
  if (!status) return '';
  return RESOURCE_STATUS_LABELS[status] ?? status;
}

export function resourceScopeLabel(scope?: string | null): string {
  if (!scope) return '';
  return RESOURCE_SCOPE_LABELS[scope] ?? scope;
}

/** 升学数据分类 */
export const ENROLLMENT_CATEGORY_LABELS: Record<string, string> = {
  policy: '招生政策',
  score_line: '投档线',
  subject_requirement: '选科要求',
};

/** 志愿梯度 */
export const VOLUNTEER_TIER_LABELS: Record<string, string> = {
  chong: '冲一冲',
  wen: '稳一稳',
  bao: '保底',
};


/** 选项字母：优先取选项自身前缀（如 "A. 0"），否则按序号推导 */
export function optionLetter(option: string, index: number): string {
  const matched = option.match(/^\s*([A-Za-z])\s*[.、．)。)]/);
  if (matched) return matched[1].toUpperCase();
  return String.fromCharCode(65 + index);
}
