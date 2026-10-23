import type { UserRole } from '@teachstudy/shared';
import { http } from './http';

export interface StudentProfile {
  id: string;
  userId: string;
  schoolId?: string | null;
  grade?: string | null;
  className?: string | null;
  subjects?: string[] | null;
  guardianPhone?: string | null;
}

/** GET /users/me 返回用户信息并附带对应角色档案 */
export interface MeResult {
  id: string;
  username: string;
  role: UserRole;
  name?: string;
  /** 本人手机号（明文，仅本人可见） */
  phone?: string | null;
  schoolId?: string;
  studentProfile?: StudentProfile | null;
  teacherProfile?: unknown;
  /** 任命制岗位 */
  staffRoles?: string[];
  classIds?: string[];
  gradeIds?: string[];
  schoolIds?: string[];
}

/** 分层视图中的一个人 */
export interface HierarchyPerson {
  id: string;
  username: string;
  name: string;
  role: string;
  /** 脱敏手机号 */
  phone?: string | null;
  /** 附加说明：教师岗位 / 家长的孩子 */
  extra?: string | null;
}

export interface HierarchyBucket {
  students: HierarchyPerson[];
  teachers: HierarchyPerson[];
  parents: HierarchyPerson[];
}

export interface HierarchyClass extends HierarchyBucket {
  id: string;
  name: string;
  inviteCode: string;
}

export interface HierarchyGrade {
  id: string;
  name: string;
  classCount: number;
  classes: HierarchyClass[];
  unassigned: HierarchyBucket;
}

export interface HierarchySchool {
  id: string;
  name: string;
  region?: string | null;
  gradeCount: number;
  grades: HierarchyGrade[];
  unassigned: HierarchyBucket;
  totals: { students: number; teachers: number; parents: number; classes: number };
}

export interface HierarchyResult {
  totals: {
    schools: number;
    grades: number;
    classes: number;
    students: number;
    teachers: number;
    parents: number;
  };
  /** 未归属任何学校的账号（缺学校信息） */
  unassigned: HierarchyBucket;
  /** 平台管理员不属于任何学校 */
  platformAdmins: HierarchyPerson[];
  schools: HierarchySchool[];
}

/** 用户列表项（管理员） */
export interface UserItem {
  id: string;
  username: string;
  role: UserRole;
  name?: string | null;
  phone?: string | null;
  schoolId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 学生列表项（教师/管理员可见，教师限本校） */
export interface StudentListItem {
  id: string;
  username: string;
  name?: string | null;
  schoolId?: string | null;
  grade?: string | null;
  className?: string | null;
  subjects?: string[] | null;
}

/** 家校绑定关系 */
export interface ParentLink {
  id?: string;
  parentUserId: string;
  studentUserId: string;
  status: string;
  createdAt?: string;
}

export type CreateUserBody = {
  username: string;
  password: string;
  role?: UserRole;
  name?: string;
  phone?: string;
  schoolId?: string;
};

/** 学生档案编辑（PUT /users/me/student-profile，后端为 upsert） */
export type StudentProfileInput = {
  /** 所属学校 id（来自 GET /schools） */
  schoolId?: string;
  /** 年级自由文本，建议存规范写法：一年级…六年级 / 七年级…九年级 / 高一…高三 */
  grade?: string;
  className?: string;
  /** 选科，存中文标签（如 物理） */
  subjects?: string[];
  guardianPhone?: string;
};

export const usersApi = {
  /** 当前用户（含学生档案），可离线缓存 */
  me: () => http.get<MeResult>('/users/me', { cache: true }),

  /** 学生：保存本人档案（年级/班级/选科/监护人手机） */
  saveStudentProfile: (body: StudentProfileInput) =>
    http.put<StudentProfile>('/users/me/student-profile', body),

  /** 修改本人密码（需提供原密码） */
  changePassword: (body: { oldPassword: string; newPassword: string }) =>
    http.patch<{ updated: true }>('/users/me/password', body),

  /** 修改姓名（手机号换绑走 authApi.changePhone，需验证码） */
  updateMe: (body: { name?: string }) => http.patch<MeResult>('/users/me', body),

  /** 注销账号（密码二次确认，级联删除个人数据，不可恢复） */
  deleteAccount: (password: string) => http.del<{ deleted: true }>('/users/me', { password }),

  /** 教师/管理员：可见学生列表（教师限本校） */
  students: () => http.get<StudentListItem[]>('/users/students', { cache: true }),

  /** 管理员：用户分层（学校 → 年级 → 班级 → 学生/家长/教师分区） */
  hierarchy: () => http.get<HierarchyResult>('/users/hierarchy'),

  /** 管理员：用户列表（后端返回 [列表, 总数]） */
  list: (page = 1, pageSize = 20) =>
    http.get<[UserItem[], number]>('/users', { query: { page, pageSize } }),

  /** 管理员：创建用户 */
  create: (body: CreateUserBody) => http.post<UserItem>('/users', body),

  /** 家长：绑定学生（学生账号） */
  linkChild: (studentUsername: string) =>
    http.post<ParentLink>('/users/parent/link', { studentUsername }),

  /** 家长：已绑定的孩子 */
  children: () => http.get<ParentLink[]>('/users/parent/children', { cache: true }),
};
