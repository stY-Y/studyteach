import { http } from './http';

/** 班级通知（班主任发给本班学生的公告） */
export interface ClassNoticeItem {
  id: string;
  classId: string;
  schoolId?: string | null;
  title: string;
  content: string;
  pinned: boolean;
  fromUserId: string;
  fromName?: string | null;
  fromRole: string;
  createdAt: string;
}

export interface ClassNoticeListResult {
  classRoom: { id: string; name: string };
  notices: ClassNoticeItem[];
}

export const classNoticesApi = {
  /** 本班通知（学生需审核通过；置顶优先） */
  list: (classId: string) =>
    http.get<ClassNoticeListResult>(`/classes/${classId}/notices`),

  /** 发布通知（班级管理员及以上） */
  create: (classId: string, body: { title: string; content: string; pinned?: boolean }) =>
    http.post<ClassNoticeItem>(`/classes/${classId}/notices`, body),

  /** 编辑 / 置顶 */
  update: (
    classId: string,
    noticeId: string,
    body: { title?: string; content?: string; pinned?: boolean },
  ) => http.patch<ClassNoticeItem>(`/classes/${classId}/notices/${noticeId}`, body),

  /** 删除 */
  remove: (classId: string, noticeId: string) =>
    http.del<{ deleted: true }>(`/classes/${classId}/notices/${noticeId}`),
};
