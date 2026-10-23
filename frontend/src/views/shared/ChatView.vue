<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { UserRole } from '@teachstudy/shared';
import { chatApi, type ChatMessage } from '../../api/chat';
import { classesApi } from '../../api/classes';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();

interface ChatClass {
  id: string;
  name: string;
}

const classes = ref<ChatClass[]>([]);
const classId = ref('');
const messages = ref<ChatMessage[]>([]);
const content = ref('');
const loading = ref(true);
const sending = ref(false);
const error = ref('');
const listEl = ref<HTMLElement | null>(null);

const isStudent = computed(() => auth.user?.role === UserRole.STUDENT);
const canSwitchClass = computed(() => classes.value.length > 1);

let timer: number | null = null;

async function scrollToBottom(): Promise<void> {
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
}

async function loadMessages(silent = false): Promise<void> {
  if (!classId.value) return;
  if (!silent) error.value = '';
  try {
    messages.value = await chatApi.messages({ classId: classId.value, limit: 50 });
    await scrollToBottom();
  } catch (err) {
    if (!silent) error.value = (err as Error).message;
  }
}

async function init(): Promise<void> {
  loading.value = true;
  try {
    const data = await classesApi.mine();
    // 学生：只显示审核通过的班级；教师/管理员：显示自己管理的班级
    classes.value = isStudent.value
      ? data.student
          .filter((s) => s.status === 'approved')
          .map((s) => ({ id: s.classRoom.id, name: s.classRoom.name }))
      : data.teacher.map((c) => ({ id: c.id, name: c.name }));

    if (classes.value.length > 0) {
      classId.value = classes.value[0].id;
      await loadMessages();
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function onSwitchClass(event: Event): Promise<void> {
  classId.value = (event.target as HTMLSelectElement).value;
  messages.value = [];
  await loadMessages();
}

async function send(): Promise<void> {
  error.value = '';
  const text = content.value.trim();
  if (!text || !classId.value) return;
  if (text.length > 500) {
    error.value = '消息最多 500 字';
    return;
  }
  sending.value = true;
  try {
    await chatApi.send({ classId: classId.value, content: text });
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

const myId = computed(() => auth.user?.id);

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
    <p class="text-soft text-sm">
      仅本班已通过审核的同学与班主任可见，不支持私聊；请文明交流，消息会留存以便管理。
    </p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="loading" class="text-soft">加载中…</div>

    <template v-else>
      <!-- 无可用班级 -->
      <section v-if="classes.length === 0" class="card stack">
        <p class="empty">
          {{ isStudent
            ? '你还没有加入任何班级。请先在「我的班级」申请，等老师审核通过后即可聊天。'
            : '你还没有创建班级。请先在「我的班级」创建班级，学生申请通过后即可使用。' }}
        </p>
        <RouterLink :to="{ name: 'myClass' }" class="btn btn-primary self-start">去我的班级</RouterLink>
      </section>

      <template v-else>
        <section v-if="canSwitchClass" class="card">
          <div class="field">
            <label class="field-label" for="chat-class">选择班级</label>
            <select id="chat-class" v-model="classId" class="input" @change="onSwitchClass">
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </section>

        <section v-else class="card class-badge">
          <span class="badge badge-primary">{{ classes[0]?.name }}</span>
          <span class="text-sm text-soft">本班专属频道</span>
        </section>

        <section class="card chat-card">
          <div ref="listEl" class="message-list">
            <p v-if="messages.length === 0" class="empty">还没有消息，来说第一句话吧。</p>
            <div
              v-for="m in messages"
              :key="m.id"
              class="message"
              :class="{ mine: m.senderId === myId }"
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
      </template>
    </template>
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
