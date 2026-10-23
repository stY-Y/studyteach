import { StaffRole } from '@teachstudy/shared';

/** 岗位中文名（与后端 STAFF_ROLE_LABELS 保持一致） */
export const STAFF_LABELS: Record<StaffRole, string> = {
  [StaffRole.SCHOOL_ADMIN]: '学校管理员',
  [StaffRole.GRADE_ADMIN]: '年级管理员',
  [StaffRole.CLASS_ADMIN]: '班级管理员（班主任）',
};

/** 岗位名额上限 */
export const STAFF_LIMITS: Record<StaffRole, number> = {
  [StaffRole.SCHOOL_ADMIN]: 2,
  [StaffRole.GRADE_ADMIN]: 2,
  [StaffRole.CLASS_ADMIN]: 2,
};

export interface StaffHolder {
  staffRoles?: string[];
  classIds?: string[];
  gradeIds?: string[];
  schoolIds?: string[];
}

/** 是否具备某个岗位（可多个岗位并存） */
export function hasStaff(user: StaffHolder | null | undefined, role: StaffRole): boolean {
  return Boolean(user?.staffRoles?.includes(role));
}

/** 是否担任任一管理岗位 */
export function isStaff(user: StaffHolder | null | undefined): boolean {
  return Boolean(user?.staffRoles && user.staffRoles.length > 0);
}

/** 当前用户的岗位文案，如「年级管理员 · 班级管理员」 */
export function staffLabelOf(user: StaffHolder | null | undefined): string {
  const roles = (user?.staffRoles ?? []) as StaffRole[];
  if (roles.length === 0) return '普通教师';
  return roles.map((r) => STAFF_LABELS[r] ?? r).join(' · ');
}

/** 是否属于管理层角色（用于选择基础模块集） */
export function isManagerRole(role: string): boolean {
  return role === 'school_admin' || role === 'grade_admin';
}
