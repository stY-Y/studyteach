<script setup lang="ts">
import { ResourceScope, ResourceStatus } from '@teachstudy/shared';
import { onMounted, ref } from 'vue';
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

const list = ref<ResourceItem[]>([]);
const loading = ref(false);
const error = ref('');
const tip = ref('');

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    list.value = await resourcesApi.mine();
  } catch (err) {
    error.value = (err as Error).message;
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function toggleScope(item: ResourceItem): Promise<void> {
  tip.value = '';
  const next = item.scope === ResourceScope.PUBLIC ? ResourceScope.SCHOOL_ONLY : ResourceScope.PUBLIC;
  try {
    await resourcesApi.update(item.id, { scope: next });
    tip.value = `「${item.title}」已改为${resourceScopeLabel(next)}`;
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function offline(item: ResourceItem): Promise<void> {
  tip.value = '';
  try {
    await resourcesApi.offline(item.id);
    tip.value = `「${item.title}」已下架`;
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

/** 修改文件简介（写清内容与适用场景，便于分类） */
const editingId = ref('');
const editDesc = ref('');
const savingDesc = ref(false);

function startEditDesc(item: ResourceItem): void {
  error.value = '';
  editingId.value = item.id;
  editDesc.value = item.description ?? '';
}

async function saveDesc(item: ResourceItem): Promise<void> {
  error.value = '';
  const value = editDesc.value.trim();
  if (value.length < 8) {
    error.value = '简介至少 8 个字，写清内容与适用场景';
    return;
  }
  savingDesc.value = true;
  try {
    await resourcesApi.update(item.id, { description: value });
    tip.value = `「${item.title}」的简介已更新`;
    editingId.value = '';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    savingDesc.value = false;
  }
}

function statusBadge(status: string): string {
  if (status === 'approved') return 'badge-success';
  if (status === 'rejected') return 'badge-danger';
  if (status === 'offline') return 'badge';
  return 'badge-warning';
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(load);
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">我的资源</h1>
      <p class="text-sm text-soft note">
        这里是你上传过的所有资源。可切换「仅本校 / 全平台共享」，也可以随时下架。
      </p>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <section class="card">
      <div class="row">
        <h2 class="section-title">共 {{ list.length }} 份</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="load">刷新</button>
      </div>

      <p v-if="loading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="list.length === 0" class="empty note">
        还没有上传过资源。<br />
        可以到「资源上传」传一份导学案或试题，帮到更多孩子。
      </div>

      <ul v-else class="res-list note">
        <li v-for="item in list" :key="item.id" class="res-item">
          <div class="res-main">
            <p class="res-title">{{ item.title }}</p>
            <p v-if="item.description" class="res-desc">{{ item.description }}</p>
            <p v-else class="res-desc text-faint">未填写简介，建议补上内容范围与适用对象，方便分类检索。</p>
            <div class="row wrap">
              <span class="badge">{{ resourceTypeLabel(item.type) }}</span>
              <span class="badge badge-primary">{{ subjectLabel(item.subject) }}</span>
              <span class="badge">{{ gradeLabel(item.grade) }}</span>
              <span class="badge">{{ stageLabel(item.stage) }}</span>
              <span class="badge" :class="statusBadge(item.status)">{{ resourceStatusLabel(item.status) }}</span>
              <span class="badge">{{ resourceScopeLabel(item.scope) }}</span>
            </div>
            <p class="text-xs text-faint res-meta">
              {{ formatSize(item.fileSize) }} · 下载 {{ item.downloads }} 次 · {{ formatTime(item.createdAt) }}
            </p>
          </div>
          <div class="res-actions">
            <button class="btn btn-sm" type="button" @click="startEditDesc(item)">
              改简介
            </button>
            <button class="btn btn-sm" type="button" @click="toggleScope(item)">
              {{ item.scope === ResourceScope.PUBLIC ? '改仅本校' : '改全平台' }}
            </button>
            <button
              class="btn btn-sm"
              type="button"
              :disabled="item.status === ResourceStatus.OFFLINE"
              @click="offline(item)"
            >
              下架
            </button>
          </div>

          <div v-if="editingId === item.id" class="desc-editor">
            <textarea
              v-model="editDesc"
              class="input"
              rows="3"
              maxlength="500"
              placeholder="写清内容范围、适用对象与使用建议"
            />
            <div class="row wrap desc-actions">
              <button class="btn btn-sm btn-primary" type="button" :disabled="savingDesc" @click="saveDesc(item)">
                {{ savingDesc ? '保存中…' : '保存简介' }}
              </button>
              <button class="btn btn-sm" type="button" @click="editingId = ''">取消</button>
              <span class="text-xs text-faint">{{ editDesc.trim().length }} / 500 字</span>
            </div>
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

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.res-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.res-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.res-main {
  flex: 1;
  min-width: 0;
}

.res-title {
  font-size: 15px;
  font-weight: 600;
  word-break: break-all;
}

/* 文件简介：最多两行，超出省略 */
.res-desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--c-text-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.desc-editor {
  flex: 1 0 100%;
  margin-top: 6px;
}

.desc-editor .input {
  width: 100%;
}

.desc-actions {
  margin-top: 6px;
  align-items: center;
}

.res-meta {
  margin-top: 4px;
}

.res-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: none;
}

@media (max-width: 480px) {
  .res-item {
    flex-wrap: wrap;
  }
  .res-actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
