import { http } from './http';

/** 班级（教师创建，学生申请加入） */
export interface ClassRoom {
  id: string;
  schoolId: string;
  grade: string;
  className: string;
  name: string;
  teacherId: string;
  teacherName?: string | null;
  inviteCode: string;
  status: string;
  createdAt: string;
}

export interface ClassWithCounts extends ClassRoom {
  memberCount: number;
  pendingCount: number;
}

/** 学生视角：班级 + 我的申请状态 */
export interface StudentClassItem {
  classRoom: ClassRoom;
  status: 'pending' | 'approved' | 'rejected';
  memberId: string;
  appliedAt: string;
}

export interface ClassMemberItem {
  id: string;
  classId: string;
  studentId: string;
  studentName?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string | null;
}

export interface MyClassesResult {
  student: StudentClassItem[];
  teacher: ClassWithCounts[];
}

export const classesApi = {
  /** 我的班级：学生=申请/加入状态，教师=我创建的班级 */
  mine: () => http.get<MyClassesResult>('/classes/mine'),

  /** 学生：可申请的班级（同校同年级） */
  available: () => http.get<ClassRoom[]>('/classes/available'),

  /** 教师：创建班级 */
  create: (body: { schoolId: string; grade: string; className: string; name?: string }) =>
    http.post<ClassRoom>('/classes', body),

  /** 学生：申请加入 */
  join: (classId: string) => http.post<ClassMemberItem>(`/classes/${classId}/join`),

  /** 学生：凭邀请码申请 */
  joinByCode: (inviteCode: string) =>
    http.post<ClassMemberItem>('/classes/join-by-code', { inviteCode }),

  /** 教师：班级成员与待审申请 */
  members: (classId: string) =>
    http.get<{ classRoom: ClassRoom; members: ClassMemberItem[] }>(`/classes/${classId}/members`),

  /** 教师：审核通过 / 拒绝 */
  review: (classId: string, memberId: string, status: 'approved' | 'rejected') =>
    http.patch<ClassMemberItem>(`/classes/${classId}/members/${memberId}`, { status }),

  /** 移除成员 / 学生退出 */
  removeMember: (classId: string, studentId: string) =>
    http.del<{ removed: true }>(`/classes/${classId}/members/${studentId}`),

  /** 教师转班：把学生转到自己管理的另一个班级 */
  transfer: (classId: string, studentId: string, targetClassId: string) =>
    http.post<{ transferred: true; classId: string }>(
      `/classes/${classId}/members/${studentId}/transfer`,
      { targetClassId },
    ),
};
