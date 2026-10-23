import { http } from './http';

/** 家长-教师会话 */
export interface ParentThread {
  classId: string;
  className: string;
  teacherId: string;
  teacherName?: string | null;
  parentId: string;
  parentName?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  lastMessage?: { content: string; createdAt: string; senderRole: string } | null;
}

export interface ParentMessage {
  id: string;
  classId: string;
  parentId: string;
  studentId?: string | null;
  teacherId: string;
  senderId: string;
  senderRole: 'parent' | 'teacher';
  senderName?: string | null;
  content: string;
  createdAt: string;
}

export const parentChatApi = {
  /** 会话列表：家长=孩子班主任；教师=本班家长 */
  threads: () => http.get<ParentThread[]>('/parent-chat/threads'),

  /** 会话消息（教师需传 parentId） */
  messages: (params: { classId: string; parentId?: string }) =>
    http.get<ParentMessage[]>('/parent-chat/messages', {
      query: { classId: params.classId, parentId: params.parentId },
    }),

  /** 发送消息（家长不需要 parentId；教师回复时必传） */
  send: (body: { classId: string; parentId?: string; studentId?: string; content: string }) =>
    http.post<ParentMessage>('/parent-chat/messages', body),
};
