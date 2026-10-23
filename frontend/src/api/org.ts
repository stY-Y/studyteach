import { http } from './http';

export interface SchoolRow {
  id: string;
  name: string;
  region?: string | null;
  admins: Array<{ id: string; username: string; name?: string | null }>;
}

export interface GradeRow {
  id: string;
  schoolId: string;
  name: string;
  gradeAdminId?: string | null;
  gradeAdminName?: string | null;
  classCount: number;
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
  // 学校
  schools: () => http.get<SchoolRow[]>('/org/schools'),
  createSchool: (body: { name: string; region?: string }) =>
    http.post<SchoolRow>('/org/schools', body),
  deleteSchool: (id: string) => http.del<{ deleted: true }>(`/org/schools/${id}`),
  appointSchoolAdmin: (id: string, username: string) =>
    http.post(`/org/schools/${id}/admins`, { username }),
  dismissSchoolAdmin: (id: string, userId: string) =>
    http.del(`/org/schools/${id}/admins/${userId}`),

  // 年级
  grades: (schoolId?: string) =>
    http.get<GradeRow[]>('/org/grades', { query: { schoolId } }),
  createGrade: (body: { schoolId: string; name: string }) =>
    http.post<GradeRow>('/org/grades', body),
  deleteGrade: (id: string) => http.del<{ deleted: true }>(`/org/grades/${id}`),
  appointGradeAdmin: (id: string, username: string) =>
    http.post(`/org/grades/${id}/admin`, { username }),
  dismissGradeAdmin: (id: string) => http.del(`/org/grades/${id}/admin`),

  // 班级
  classes: (gradeId: string) =>
    http.get<OrgClassRow[]>('/org/classes', { query: { gradeId } }),
  createClass: (body: { gradeId: string; className: string; teacherUsername?: string }) =>
    http.post<OrgClassRow>('/org/classes', body),
  updateClass: (id: string, body: { className?: string; teacherUsername?: string }) =>
    http.patch<OrgClassRow>(`/org/classes/${id}`, body),
  deleteClass: (id: string) => http.del<{ deleted: true }>(`/org/classes/${id}`),

  // 通知
  createNotice: (body: {
    toRole: 'grade_admin' | 'teacher';
    gradeId?: string;
    classId?: string;
    title: string;
    content: string;
  }) => http.post<NoticeRow>('/org/notices', body),
  inbox: () => http.get<NoticeRow[]>('/org/notices'),
  sent: () => http.get<NoticeRow[]>('/org/notices/sent'),
};
