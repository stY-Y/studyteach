<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { resourcesApi, type OfflineManifest, type ResourceItem } from '../../api/resources';
import { formatSize, formatTime } from '../../utils/format';
import { isOnline, offline } from '../../utils/offline';

const router = useRouter();

const manifest = ref<OfflineManifest | null>(null);
const resources = ref<Record<string, ResourceItem>>({});
const loading = ref(false);
const error = ref('');
const tip = ref('');
/** 浏览器本地缓存（接口数据 / 诊断记录等）条数 */
const localCached = ref(offline.size());

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    manifest.value = await resourcesApi.manifest();
    // 资源清单只有 id，这里拉一次已审核资源列表用于还原标题（一次请求，不做逐条查询）
    const res = await resourcesApi.list({}, 1, 50);
    const map: Record<string, ResourceItem> = {};
    (res.list ?? []).forEach((r) => {
      map[r.id] = r;
    });
    resources.value = map;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
    localCached.value = offline.size();
    // 汇总已缓存资源体积
    totalBytes.value = (manifest.value?.items ?? []).reduce(
      (sum, i) => sum + (resources.value[i.resourceId]?.fileSize ?? 0),
      0,
    );
  }
}

async function release(resourceId: string): Promise<void> {
  tip.value = '';
  try {
    await resourcesApi.releaseOffline(resourceId);
    tip.value = '已删除该资源的离线缓存，本地空间已释放';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  }}

function clearLocalCache(): void {
  const removed = offline.clear();
  localCached.value = offline.size();
  tip.value = removed > 0 ? `已清理 ${removed} 条本地缓存` : '当前没有本地缓存';
}

/** 已缓存资源的总大小（用于「占用空间」提示与一键清空） */
const totalBytes = ref(0);

/** 一键清空全部离线资源（逐个调接口，逐个失败不阻塞其余） */
async function clearAllOffline(): Promise<void> {
  const ids = manifest.value?.items.map((i) => i.resourceId) ?? [];
  if (ids.length === 0) {
    tip.value = '当前没有离线资源';
    return;
  }
  let done = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await resourcesApi.releaseOffline(id);
      done += 1;
    } catch {
      failed += 1;
    }
  }
  tip.value = failed > 0 ? `已清理 ${done} 份，${failed} 份失败，请重试` : `已清空 ${done} 份离线资源`;
  await load();
}

function itemTitle(id: string): string {
  return resources.value[id]?.title ?? '资源（标题暂不可用）';
}

function itemSize(id: string): string {
  return formatSize(resources.value[id]?.fileSize);
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(load);
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">离线缓存</h1>
      <p class="text-sm text-soft note">
        存到离线的资源，断网也能打开 —— 回家路上、停电时都不耽误学习。
        不需要时可以随时删除，不占着手机空间。
      </p>
      <div class="row wrap note">
        <span class="badge" :class="isOnline ? 'badge-success' : 'badge-warning'">
          {{ isOnline ? '当前在线' : '当前离线' }}
        </span>
        <span class="badge badge-primary">资源缓存 {{ manifest?.count ?? 0 }} 条</span>
        <span class="badge">占用约 {{ formatSize(totalBytes) }}</span>
        <span class="badge">本地缓存 {{ localCached }} 条</span>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" @click="clearAllOffline">一键清空</button>
      </div>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <!-- 已缓存的资源 -->
    <section class="card">
      <div class="row">
        <h2 class="section-title">已缓存的资源</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="load">刷新</button>
      </div>

      <p v-if="loading" class="text-sm text-soft note">正在加载…</p>
      <div v-else-if="!manifest || manifest.items.length === 0" class="empty note">
        还没有缓存任何资源。<br />
        去「学习资源」里点「存离线」，就能把资料带走啦 📥
      </div>

      <ul v-else class="cache-list note">
        <li v-for="item in manifest.items" :key="item.resourceId" class="cache-item">
          <div class="cache-main">
            <p class="cache-title">{{ itemTitle(item.resourceId) }}</p>
            <p class="text-xs text-faint">
              缓存时间 {{ formatTime(new Date(item.cachedAt).toISOString()) }} · {{ itemSize(item.resourceId) }}
            </p>
          </div>
          <button class="btn btn-sm" type="button" @click="release(item.resourceId)">删除</button>
        </li>
      </ul>
    </section>

    <!-- 本地接口缓存 -->
    <section class="card">
      <h2 class="section-title">本地数据缓存</h2>
      <p class="text-sm text-soft note">
        诊断记录、资源列表等会缓存在本机，断网时仍能查看。清理后不影响账号与已下载文件。
      </p>
      <button class="btn btn-sm note" type="button" @click="clearLocalCache">清理本地缓存（{{ localCached }} 条）</button>
    </section>

  </div>
</template>

<style scoped>
.note {
  margin-top: 8px;
  line-height: 1.55;
}

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.cache-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cache-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.cache-main {
  flex: 1;
  min-width: 0;
}

.cache-title {
  font-size: 15px;
  font-weight: 600;
  word-break: break-all;
}
</style>
