import { http } from './http';

export interface ChatMessage {
  id: string;
  classroomKey: string;
  schoolId: string;
  grade: string;
  className: string;
  senderId: string;
  senderName?: string | null;
  senderRole: string;
  content: string;
  createdAt: string;
}

export interface ChatTarget {
  /** 班级 id（需已通过入班审核） */
  classId: string;
}

export const chatApi = {
  /** 拉取本班最近消息（按时间正序） */
  messages: (params: ChatTarget & { limit?: number }) =>
    http.get<ChatMessage[]>('/chat/messages', {
      query: { classId: params.classId, limit: params.limit },
    }),

  /** 发送班级消息 */
  send: (body: ChatTarget & { content: string }) =>
    http.post<ChatMessage>('/chat/messages', body),
};
