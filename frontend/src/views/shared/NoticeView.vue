<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { UserRole } from '@teachstudy/shared';
import { orgApi, type NoticeRow } from '../../api/org';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();

const tab = ref<'inbox' | 'sent'>('inbox');
const inbox = ref<NoticeRow[]>([]);
const sent = ref<NoticeRow[]>([]);
const loading = ref(true);
const error = ref('');

const canSend = computed(
  () => auth.user?.role === UserRole.SCHOOL_ADMIN || auth.user?.role === UserRole.GRADE_ADMIN,
);

function formatTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function roleLabel(role: string): string {
  if (role === UserRole.SCHOOL_ADMIN) return '学校管理员';
  if (role === UserRole.GRADE_ADMIN) return '年级管理员';
  if (role === UserRole.TEACHER || role === 'class_admin') return '班主任';
  return '平台';
}

async function loadInbox(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    inbox.value = await orgApi.inbox();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function loadSent(): Promise<void> {
  if (!canSend.value) return;
  try {
    sent.value = await orgApi.sent();
  } catch {
    sent.value = [];
  }
}

watch(tab, (value) => {
  if (value === 'sent') void loadSent();
});

onMounted(async () => {
  await loadInbox();
  await loadSent();
});
</script>

<template>
  <div class="stack">
    <h1 class="page-title">通知</h1>
    <p class="text-soft text-sm">
      上级下达的通知会出现在这里：年级管理员接收学校管理员的指令，班主任接收年级管理员的通知。
    </p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div class="tabs">
      <button type="button" class="tab" :class="{ active: tab === 'inbox' }" @click="tab = 'inbox'">
        收到的通知
      </button>
      <button v-if="canSend" type="button" class="tab" :class="{ active: tab === 'sent' }" @click="tab = 'sent'">
        我发出的
      </button>
    </div>

    <section v-if="tab === 'inbox'" class="card stack">
      <p v-if="loading" class="text-sm text-soft">加载中…</p>
      <p v-else-if="inbox.length === 0" class="empty">暂时没有收到通知。</p>
      <article v-for="n in inbox" :key="n.id" class="notice">
        <div class="notice-head">
          <strong>{{ n.title }}</strong>
          <span class="badge badge-primary">{{ roleLabel(n.fromRole) }}</span>
          <span class="text-xs text-faint">{{ n.fromName || '' }} · {{ formatTime(n.createdAt) }}</span>
        </div>
        <p class="notice-body">{{ n.content }}</p>
      </article>
    </section>

    <section v-else class="card stack">
      <p v-if="sent.length === 0" class="empty">还没有发出过通知。</p>
      <article v-for="n in sent" :key="n.id" class="notice">
        <div class="notice-head">
          <strong>{{ n.title }}</strong>
          <span class="text-xs text-faint">{{ formatTime(n.createdAt) }}</span>
        </div>
        <p class="notice-body">{{ n.content }}</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--c-surface-warm);
  border-radius: var(--radius-sm);
  width: fit-content;
}

.tab {
  min-height: 34px;
  padding: 0 16px;
  font-family: inherit;
  font-size: 14px;
  color: var(--c-text-soft);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.tab.active {
  color: var(--c-primary-dark);
  background: var(--c-surface);
  font-weight: 600;
}

.notice {
  padding: 10px 0;
  border-top: 1px solid var(--c-border);
}

.notice:first-of-type {
  border-top: none;
}

.notice-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.notice-body {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--c-text-soft);
  white-space: pre-wrap;
}
</style>
