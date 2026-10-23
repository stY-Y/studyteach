import { http } from './http';

/** 岗位任命记录（学校/年级/班级三级） */
export interface StaffAdminRow {
  appointmentId: string;
  userId: string;
  username: string;
  name: string;
  role: 'school_admin' | 'grade_admin' | 'class_admin';
  scopeId: string;
  createdAt: string;
}

/** 可任命的教师候选 */
export interface TeacherCandidate {
  id: string;
  username: string;
  name: string;
  schoolId?: string | null;
  schoolName?: string;
  /** 已有岗位，用于提示兼任 */
  roles: string[];
}

export interface SchoolRow {
  id: string;
  name: string;
  region?: string | null;
  admins: StaffAdminRow[];
  gradeCount: number;
  classCount: number;
  adminLimit: number;
}

export interface GradeRow {
  id: string;
  schoolId: string;
  name: string;
  order: number;
  gradeAdminId?: string | null;
  gradeAdminName?: string | null;
  admins: StaffAdminRow[];
  classCount: number;
  adminLimit: number;
}

export interface OrgClassRow {
  id: string;
  schoolId: string;
  gradeId?: string | null;
  grade: string;
  className: string;
  name: string;
  teacherId: string;
  teacherName?: string | null;
  inviteCode: string;
  status: string;
  admins: StaffAdminRow[];
  studentCount: number;
  adminLimit: number;
}

export interface NoticeRow {
  id: string;
  schoolId: string;
  gradeId?: string | null;
  classId?: string | null;
  fromRole: string;
  fromName?: string | null;
  toRole: string;
  title: string;
  content: string;
  createdAt: string;
}

export const orgApi = {
  // 学校（平台管理员）
  schools: () => http.get<SchoolRow[]>('/org/schools'),
  createSchool: (body: { name: string; region?: string }) =>
    http.post<SchoolRow>('/org/schools', body),
  deleteSchool: (id: string) => http.del<{ deleted: true }>(`/org/schools/${id}`),
  appointSchoolAdmin: (id: string, userId: string) =>
    http.post(`/org/schools/${id}/admins`, { userId }),
  dismissSchoolAdmin: (id: string, userId: string) =>
    http.del(`/org/schools/${id}/admins/${userId}`),

  /** 任命候选人（平台管理员可带 schoolId 过滤；学校/年级管理员只返回本校） */
  teachers: (schoolId?: string) =>
    http.get<TeacherCandidate[]>('/org/teachers', { query: { schoolId } }),

  // 年级
  grades: (schoolId?: string) =>
    http.get<GradeRow[]>('/org/grades', { query: { schoolId } }),
  createGrade: (body: { schoolId: string; name: string }) =>
    http.post<GradeRow>('/org/grades', body),
  deleteGrade: (id: string) => http.del<{ deleted: true }>(`/org/grades/${id}`),
  appointGradeAdmin: (id: string, userId: string) =>
    http.post(`/org/grades/${id}/admins`, { userId }),
  dismissGradeAdmin: (gradeId: string, userId: string) =>
    http.del(`/org/grades/${gradeId}/admins/${userId}`),

  // 班级
  classes: (gradeId: string) =>
    http.get<OrgClassRow[]>('/org/classes', { query: { gradeId } }),
  createClass: (body: { gradeId: string; className: string; teacherUserId?: string }) =>
    http.post<OrgClassRow>('/org/classes', body),
  updateClass: (id: string, body: { className?: string }) =>
    http.patch<OrgClassRow>(`/org/classes/${id}`, body),
  deleteClass: (id: string) => http.del<{ deleted: true }>(`/org/classes/${id}`),
  appointClassAdmin: (id: string, userId: string) =>
    http.post(`/org/classes/${id}/admins`, { userId }),
  dismissClassAdmin: (id: string, userId: string) =>
    http.del(`/org/classes/${id}/admins/${userId}`),

  // 通知（学校→年级管理员 / 年级→班级管理员）
  createNotice: (body: {
    toRole: 'grade_admin' | 'class_admin';
    gradeId?: string;
    classId?: string;
    title: string;
    content: string;
  }) => http.post<NoticeRow>('/org/notices', body),
  inbox: () => http.get<NoticeRow[]>('/org/notices'),
  sent: () => http.get<NoticeRow[]>('/org/notices/sent'),
};
