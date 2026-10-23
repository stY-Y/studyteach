<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { UserRole } from '@teachstudy/shared';
import {
  parentChatApi,
  type ParentMessage,
  type ParentThread,
} from '../../api/parentchat';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();

const threads = ref<ParentThread[]>([]);
const selected = ref<ParentThread | null>(null);
const messages = ref<ParentMessage[]>([]);
const content = ref('');
const loading = ref(true);
const sending = ref(false);
const error = ref('');
const listEl = ref<HTMLElement | null>(null);

const isParent = computed(() => auth.user?.role === UserRole.PARENT);
// 回复方：所有教师侧身份（含被任命为管理员的教师）
const isTeacher = computed(
  () => !isParent.value && auth.user?.role !== UserRole.STUDENT,
);
const myId = computed(() => auth.user?.id);

let timer: number | null = null;

function threadTitle(t: ParentThread): string {
  if (isParent.value) {
    return `${t.teacherName || '老师'}（${t.className}）`;
  }
  return `${t.parentName || '家长'}${t.studentName ? ` · ${t.studentName}` : ''}`;
}

function threadSubtitle(t: ParentThread): string {
  if (isParent.value) {
    return t.studentName ? `关于 ${t.studentName}` : '与班主任沟通';
  }
  return t.className;
}

function formatTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function scrollToBottom(): Promise<void> {
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
}

async function loadMessages(silent = false): Promise<void> {
  const t = selected.value;
  if (!t) return;
  if (!silent) error.value = '';
  try {
    messages.value = await parentChatApi.messages({
      classId: t.classId,
      parentId: isParent.value ? undefined : t.parentId,
    });
    await scrollToBottom();
  } catch (err) {
    if (!silent) error.value = (err as Error).message;
  }
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    threads.value = await parentChatApi.threads();
    if (!selected.value && threads.value.length > 0) {
      selected.value = threads.value[0];
    }
    await loadMessages(true);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function selectThread(t: ParentThread): Promise<void> {
  selected.value = t;
  messages.value = [];
  await loadMessages();
}

async function send(): Promise<void> {
  const t = selected.value;
  if (!t) return;
  const text = content.value.trim();
  if (!text) return;
  if (text.length > 500) {
    error.value = '消息最多 500 字';
    return;
  }

  sending.value = true;
  error.value = '';
  try {
    await parentChatApi.send({
      classId: t.classId,
      parentId: isParent.value ? undefined : t.parentId,
      studentId: isParent.value ? t.studentId ?? undefined : undefined,
      content: text,
    });
    content.value = '';
    await loadMessages(true);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    sending.value = false;
  }
}

watch(
  () => selected.value?.classId,
  () => {
    void loadMessages();
  },
);

onMounted(async () => {
  await load();
  timer = window.setInterval(() => void loadMessages(true), 15000);
});

onUnmounted(() => {
  if (timer !== null) clearInterval(timer);
});
</script>

<template>
  <div class="stack">
    <h1 class="page-title">{{ isParent ? '与老师沟通' : '家长沟通' }}</h1>
    <p class="text-soft text-sm">
      {{ isParent
        ? '这里可以直接和孩子的班主任沟通，仅你与老师可见，不支持其他家长查看。'
        : '这里可以查看并回复本班家长的留言（仅本班创建教师可见）。' }}
    </p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="loading" class="text-soft">加载中…</div>

    <template v-else>
      <!-- 家长未绑定 -->
      <section v-if="isParent && threads.length === 0" class="card stack">
        <p class="empty">
          还没有可沟通的家长会话。请先绑定孩子，且孩子已加入班级并通过老师审核。
        </p>
        <RouterLink :to="{ name: 'link' }" class="btn btn-primary self-start">去绑定学生</RouterLink>
      </section>

      <!-- 教师暂无家长 -->
      <section v-else-if="isTeacher && threads.length === 0" class="card">
        <p class="empty">本班还没有已通过审核且家长已绑定的学生，暂时没有家长留言。</p>
      </section>

      <div v-else class="chat-layout">
        <aside class="thread-list">
          <button
            v-for="t in threads"
            :key="`${t.classId}:${t.parentId}`"
            type="button"
            class="thread"
            :class="{ active: selected?.classId === t.classId && selected?.parentId === t.parentId }"
            @click="selectThread(t)"
          >
            <span class="thread-title">{{ threadTitle(t) }}</span>
            <span class="thread-sub">{{ threadSubtitle(t) }}</span>
            <span v-if="t.lastMessage" class="thread-last">{{ t.lastMessage.content }}</span>
            <span v-else class="thread-last faint">还没有消息</span>
          </button>
        </aside>

        <section class="chat-card">
          <header class="chat-head">
            <strong>{{ selected ? threadTitle(selected) : '' }}</strong>
            <span class="text-xs text-faint">{{ selected ? threadSubtitle(selected) : '' }}</span>
          </header>

          <div ref="listEl" class="message-list">
            <p v-if="messages.length === 0" class="empty">还没有消息，先打个招呼吧。</p>
            <div
              v-for="m in messages"
              :key="m.id"
              class="message"
              :class="{ mine: m.senderId === myId }"
            >
              <div class="message-head">
                <span class="sender">{{ m.senderName || (m.senderRole === 'teacher' ? '老师' : '家长') }}</span>
                <span v-if="m.senderRole === 'teacher'" class="badge badge-primary">老师</span>
                <span class="time">{{ formatTime(m.createdAt) }}</span>
              </div>
              <p class="bubble">{{ m.content }}</p>
            </div>
          </div>

          <form class="composer" @submit.prevent="send">
            <input
              v-model="content"
              class="input"
              type="text"
              maxlength="500"
              placeholder="输入消息…（最多 500 字）"
            />
            <button class="btn btn-primary" type="submit" :disabled="sending || !content.trim()">
              {{ sending ? '发送中…' : '发送' }}
            </button>
          </form>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.self-start {
  align-self: flex-start;
}

.chat-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.thread-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.thread {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 9px 12px;
  font-family: inherit;
  text-align: left;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.thread.active {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
}

.thread-title {
  font-size: 14px;
  font-weight: 600;
}

.thread-sub {
  font-size: 12px;
  color: var(--c-text-faint);
}

.thread-last {
  font-size: 12px;
  color: var(--c-text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thread-last.faint {
  color: var(--c-text-faint);
}

.chat-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
}

.chat-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--c-border);
}

.message-list {
  height: 46vh;
  min-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 6px 4px;
}

.message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 82%;
  align-self: flex-start;
}

.message.mine {
  align-self: flex-end;
  align-items: flex-end;
}

.message-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--c-text-faint);
}

.sender {
  color: var(--c-text-soft);
  font-weight: 500;
}

.bubble {
  margin: 0;
  padding: 9px 12px;
  background: #f4ecdc;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  font-size: 15px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.message.mine .bubble {
  background: var(--c-primary-soft);
  border-color: #ecd0b4;
}

.composer {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--c-border);
}

.composer .input {
  flex: 1;
  min-width: 0;
}

@media (min-width: 760px) {
  .chat-layout {
    flex-direction: row;
    align-items: flex-start;
  }

  .thread-list {
    width: 240px;
    flex: none;
    max-height: 60vh;
  }

  .chat-card {
    flex: 1;
    min-width: 0;
  }
}
</style>
