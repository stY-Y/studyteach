export * from './types';
export * from './schools';
export type { SeedKnowledgePoint } from './knowledge-points';
import { SEED_KNOWLEDGE_POINTS as KP_BASE } from './knowledge-points';
import { SEED_KNOWLEDGE_POINTS_LOW } from './knowledge-points-low';

/** 全部知识点：原有图谱 + 小学 1-4 年级（低年级）补充 */
export const SEED_KNOWLEDGE_POINTS = [...KP_BASE, ...SEED_KNOWLEDGE_POINTS_LOW];
export * from './users';
export * from './colleges';
export * from './enrollment';
export * from './resources';

// 题库（按学段/学科分文件，便于维护与扩充）
export * from './questions-primary-math';
export * from './questions-primary-english';
export * from './questions-math';
export * from './questions-junior-math-extra';
export * from './questions-junior-english-extra';
export * from './questions-others';

import { SEED_QUESTIONS_PRIMARY_MATH } from './questions-primary-math';
import { SEED_QUESTIONS_PRIMARY_ENGLISH } from './questions-primary-english';
import { SEED_QUESTIONS_MATH } from './questions-math';
import { SEED_QUESTIONS_JUNIOR_MATH_EXTRA } from './questions-junior-math-extra';
import { SEED_QUESTIONS_JUNIOR_ENGLISH_EXTRA } from './questions-junior-english-extra';
import { SEED_QUESTIONS_OTHERS } from './questions-others';
import { SEED_QUESTIONS_PRIMARY_LOW } from './questions-primary-low';

/** 全部种子题目（按 小学低段 → 小学高段 → 初中 → 高中 顺序） */
export const SEED_QUESTIONS = [
  ...SEED_QUESTIONS_PRIMARY_LOW,
  ...SEED_QUESTIONS_PRIMARY_MATH,
  ...SEED_QUESTIONS_PRIMARY_ENGLISH,
  ...SEED_QUESTIONS_MATH,
  ...SEED_QUESTIONS_JUNIOR_MATH_EXTRA,
  ...SEED_QUESTIONS_JUNIOR_ENGLISH_EXTRA,
  ...SEED_QUESTIONS_OTHERS,
];