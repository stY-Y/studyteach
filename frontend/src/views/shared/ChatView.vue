<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { UserRole } from '@teachstudy/shared';
import { chatApi, type ChatMessage } from '../../api/chat';
import { classesApi, type ClassSummary } from '../../api/classes';
import { usersApi, type MeResult } from '../../api/users';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();

const me = ref<MeResult | null>(null);
const classes = ref<ClassSummary[]>([]);
const messages = ref<ChatMessage[]>([]);
const content = ref('');
const loading = ref(true);
const sending = ref(false);
const error = ref('');
const listEl = ref<HTMLElement | null>(null);

/** 当前班级（学校 + 年级 + 班级名） */
const schoolId = ref('');
const grade = ref('');
const className = ref('');

const isStudent = computed(() => auth.user?.role === UserRole.STUDENT);
const isTeacher = computed(() => auth.user?.role === UserRole.TEACHER);
const isAdmin = computed(() => auth.user?.role === UserRole.ADMIN);
const hasClass = computed(() => Boolean(schoolId.value && grade.value && className.value));

/** 教师/管理员可切换班级 */
const canSwitchClass = computed(() => isTeacher.value || isAdmin.value);

let timer: number | null = null;

function classLabel(c: ClassSummary): string {
  return `${c.grade} ${c.className}（${c.studentCount} 人）`;
}

function sameClass(c: ClassSummary): boolean {
  return c.schoolId === schoolId.value && c.grade === grade.value && c.className === className.value;
}

async function scrollToBottom(): Promise<void> {
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
}

async function loadMessages(silent = false): Promise<void> {
  if (!hasClass.value) return;
  if (!silent) error.value = '';
  try {
    messages.value = await chatApi.messages({
      schoolId: schoolId.value,
      grade: grade.value,
      className: className.value,
      limit: 50,
    });
    await scrollToBottom();
  } catch (err) {
    if (!silent) error.value = (err as Error).message;
  }
}

async function init(): Promise<void> {
  loading.value = true;
  try {
    me.value = await usersApi.me();

    if (isStudent.value) {
      const profile = me.value.studentProfile;
      if (!profile || !profile.schoolId || !profile.grade || !profile.className) {
        error.value = '请先在「账号与安全」里补全学校、年级与班级，才能进入班级聊天';
        return;
      }
      schoolId.value = profile.schoolId;
      grade.value = profile.grade;
      className.value = profile.className;
      await loadMessages();
    } else {
      const sid = auth.user?.schoolId ?? '';
      classes.value = await classesApi.list(sid || undefined);
      if (classes.value.length > 0) {
        const first = classes.value[0];
        schoolId.value = first.schoolId;
        grade.value = first.grade;
        className.value = first.className;
        await loadMessages();
      }
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function onSelectClass(event: Event): Promise<void> {
  const value = (event.target as HTMLSelectElement).value;
  const found = classes.value.find((c) => `${c.schoolId}::${c.grade}::${c.className}` === value);
  if (!found) return;
  schoolId.value = found.schoolId;
  grade.value = found.grade;
  className.value = found.className;
  messages.value = [];
  await loadMessages();
}

async function send(): Promise<void> {
  error.value = '';
  const text = content.value.trim();
  if (!text) return;
  if (text.length > 500) {
    error.value = '消息最多 500 字';
    return;
  }
  sending.value = true;
  try {
    await chatApi.send({
      schoolId: schoolId.value,
      grade: grade.value,
      className: className.value,
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

function formatTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(async () => {
  await init();
  timer = window.setInterval(() => void loadMessages(true), 15000);
});

onUnmounted(() => {
  if (timer !== null) clearInterval(timer);
});
</script>

<template>
  <div class="stack">
    <h1 class="page-title">班级聊天</h1>
    <p class="text-soft text-sm">仅本班同学与老师可见，不支持私聊；请文明交流，消息会留存以便管理。</p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <section v-if="canSwitchClass" class="card stack">
      <div class="field">
        <label class="field-label" for="chat-class">选择班级</label>
        <select id="chat-class" class="input" :value="`${schoolId}::${grade}::${className}`" @change="onSelectClass">
          <option value="" disabled>请选择班级</option>
          <option v-for="c in classes" :key="`${c.schoolId}::${c.grade}::${c.className}`" :value="`${c.schoolId}::${c.grade}::${c.className}`">
            {{ classLabel(c) }}
          </option>
        </select>
      </div>
      <p v-if="classes.length === 0" class="text-sm text-faint">还没有班级数据：学生补全档案后，这里会自动出现班级。</p>
    </section>

    <section v-else-if="hasClass" class="card class-badge">
      <span class="badge badge-primary">{{ grade }} {{ className }}</span>
      <span class="text-sm text-soft">本班专属频道</span>
    </section>

    <section v-if="hasClass" class="card chat-card">
      <div ref="listEl" class="message-list">
        <p v-if="messages.length === 0" class="empty">还没有消息，来说第一句话吧。</p>
        <div
          v-for="m in messages"
          :key="m.id"
          class="message"
          :class="{ mine: m.senderId === me?.id }"
        >
          <div class="message-head">
            <span class="sender">{{ m.senderName || '同学' }}</span>
            <span v-if="m.senderRole === UserRole.TEACHER" class="badge badge-primary">老师</span>
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
          placeholder="说点什么…（最多 500 字）"
        />
        <button class="btn btn-primary" type="submit" :disabled="sending || !content.trim()">
          {{ sending ? '发送中…' : '发送' }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.class-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
}

.chat-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.message-list {
  height: 52vh;
  min-height: 280px;
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
</style>
