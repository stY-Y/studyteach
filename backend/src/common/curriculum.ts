import { StudyStage, Subject } from '@teachstudy/shared';

/**
 * 课程范围规则：小学（1-6 年级）只学语文、数学、英语三门课。
 * 初中、高中才是语数英 + 理化生政史地九科。
 *
 * 前端 `config/labels.ts` 的 SUBJECTS_BY_STAGE 是同一份规则的界面侧实现，
 * 这里负责接口侧兜底：防止绕过界面直接用接口写入「一年级 + 物理」这类脏数据。
 */
export const PRIMARY_SUBJECTS: Subject[] = [Subject.CHINESE, Subject.MATH, Subject.ENGLISH];

/** 年级是否属于小学（1-6） */
export function isPrimaryGrade(grade?: number | null): boolean {
  return typeof grade === 'number' && grade >= 1 && grade <= 6;
}

/** 学段是否小学 */
export function isPrimaryStage(stage?: StudyStage | null): boolean {
  return stage === StudyStage.PRIMARY_HIGH;
}

/** 该学科是否属于小学课程 */
export function isPrimarySubject(subject: Subject): boolean {
  return PRIMARY_SUBJECTS.includes(subject);
}

/**
 * 小学课程校验：判断「学科 + 年级/学段」组合是否越界。
 * 返回 null 表示合法，返回字符串表示不合法的原因。
 */
export function primaryCurriculumViolation(
  subject: Subject,
  stage?: StudyStage | null,
  grade?: number | null,
): string | null {
  const primary = isPrimaryGrade(grade) || isPrimaryStage(stage);
  if (!primary || isPrimarySubject(subject)) return null;
  return '小学阶段（1-6 年级）只有语文、数学、英语三门课，请调整学科或学段';
}
