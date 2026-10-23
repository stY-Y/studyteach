<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { resourcesApi, type ResourceItem } from '../../api/resources';
import {
  gradeLabel,
  resourceScopeLabel,
  resourceStatusLabel,
  resourceTypeLabel,
  stageLabel,
  subjectLabel,
} from '../../config/labels';
import { formatSize, formatTime } from '../../utils/format';

const router = useRouter();

type Tab = 'all' | 'pending_school' | 'pending_platform';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'all', label: '全部待审' },
  { value: 'pending_school', label: '待校级审核' },
  { value: 'pending_platform', label: '待平台复核' },
];

const tab = ref<Tab>('all');
const list = ref<ResourceItem[]>([]);
const loading = ref(false);
const error = ref('');
const tip = ref('');
/** 每条资源的审核意见（按资源 id 暂存） */
const comments = ref<Record<string, string>>({});
const acting = ref('');

const visible = computed(() =>
  tab.value === 'all' ? list.value : list.value.filter((r) => r.status === tab.value),
);

const counts = computed(() => ({
  school: list.value.filter((r) => r.status === 'pending_school').length,
  platform: list.value.filter((r) => r.status === 'pending_platform').length,
}));

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    list.value = await resourcesApi.pending();
  } catch (err) {
    error.value = (err as Error).message;
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function review(item: ResourceItem, level: 'school' | 'platform', result: 'approved' | 'rejected'): Promise<void> {
  acting.value = `${item.id}-${level}-${result}`;
  error.value = '';
  try {
    const updated = await resourcesApi.review(item.id, {
      level,
      result,
      comment: comments.value[item.id]?.trim() || undefined,
    });
    tip.value =
      result === 'approved'
        ? `「${item.title}」已${level === 'school' ? '通过校级审核，进入平台复核' : '通过平台复核，正式入库'}`
        : `「${item.title}」已${level === 'school' ? '校级驳回' : '平台驳回'}`;
    list.value = list.value.filter((r) => r.id !== updated.id);
    delete comments.value[item.id];
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

function statusBadge(status: string): string {
  if (status === 'pending_platform') return 'badge-warning';
  return 'badge';
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(load);
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">资源复核</h1>
      <p class="text-sm text-soft note">
        双层审核：先校级审核（把好学校这一关），再平台复核（校验版权与合规性）。
        通过后学生即可在线查看与下载。
      </p>
      <div class="row wrap note">
        <span class="badge badge-warning">待校级 {{ counts.school }}</span>
        <span class="badge">待平台 {{ counts.platform }}</span>
      </div>
    </section>

    <!-- 状态筛选 -->
    <section class="card">
      <div class="chips">
        <button
          v-for="t in TABS"
          :key="t.value"
          type="button"
          class="chip"
          :class="{ active: tab === t.value }"
          @click="tab = t.value"
        >
          {{ t.label }}
        </button>
      </div>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <section class="card">
      <div class="row">
        <h2 class="section-title">队列（{{ visible.length }}）</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="load">刷新</button>
      </div>

      <p v-if="loading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="visible.length === 0" class="empty note">
        没有待审核的资源。<br />
        老师上传的资源会先进入「待校级审核」。
      </div>

      <ul v-else class="rev-list note">
        <li v-for="item in visible" :key="item.id" class="rev-item">
          <div class="row wrap">
            <span class="badge" :class="statusBadge(item.status)">{{ resourceStatusLabel(item.status) }}</span>
            <span class="badge">{{ resourceTypeLabel(item.type) }}</span>
            <span class="badge badge-primary">{{ subjectLabel(item.subject) }}</span>
            <span class="badge">{{ stageLabel(item.stage) }}</span>
            <span class="badge">{{ gradeLabel(item.grade) }}</span>
            <span class="badge">{{ resourceScopeLabel(item.scope) }}</span>
          </div>

          <p class="rev-title">{{ item.title }}</p>
          <p class="text-xs text-faint">
            {{ formatSize(item.fileSize) }} · 上传于 {{ formatTime(item.createdAt) }} · 上传者
            {{ item.ownerId.slice(0, 8) }}…
          </p>

          <textarea
            v-model="comments[item.id]"
            class="input textarea"
            rows="2"
            placeholder="审核意见（可选）：通过原因 / 驳回理由，会告知上传者"
          ></textarea>

          <div class="row wrap rev-actions">
            <template v-if="item.status === 'pending_school'">
              <button
                class="btn btn-sm btn-primary"
                type="button"
                :disabled="acting === `${item.id}-school-approved`"
                @click="review(item, 'school', 'approved')"
              >
                校级通过
              </button>
              <button
                class="btn btn-sm"
                type="button"
                :disabled="acting === `${item.id}-school-rejected`"
                @click="review(item, 'school', 'rejected')"
              >
                校级驳回
              </button>
            </template>
            <template v-else-if="item.status === 'pending_platform'">
              <button
                class="btn btn-sm btn-primary"
                type="button"
                :disabled="acting === `${item.id}-platform-approved`"
                @click="review(item, 'platform', 'approved')"
              >
                平台通过
              </button>
              <button
                class="btn btn-sm"
                type="button"
                :disabled="acting === `${item.id}-platform-rejected`"
                @click="review(item, 'platform', 'rejected')"
              >
                平台驳回
              </button>
            </template>
          </div>
        </li>
      </ul>
    </section>

  </div>
</template>

<style scoped>
.note {
  margin-top: 10px;
  line-height: 1.55;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.rev-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rev-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.rev-title {
  font-size: 15px;
  font-weight: 600;
  word-break: break-all;
}

.textarea {
  min-height: 56px;
  padding: 8px 10px;
  line-height: 1.5;
  resize: vertical;
}

.rev-actions {
  gap: 8px;
}
</style>
