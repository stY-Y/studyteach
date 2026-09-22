<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { systemApi, type HealthResult } from '../api/auth';
import ModuleCard from '../components/ModuleCard.vue';
import { ROLE_CONFIG } from '../config/modules';
import { useAuthStore } from '../stores/auth';
import { isOnline, offline } from '../utils/offline';

const auth = useAuthStore();

const roleConfig = computed(() => (auth.user ? ROLE_CONFIG[auth.user.role] : null));

type HealthState = 'checking' | 'ok' | 'fail';
const health = ref<HealthState>('checking');
const healthInfo = ref<HealthResult | null>(null);
const healthError = ref('');
const cacheCount = ref(offline.size());
const cacheTip = ref('');

async function checkHealth(): Promise<void> {
  health.value = 'checking';
  healthError.value = '';
  try {
    healthInfo.value = await systemApi.health();
    health.value = 'ok';
  } catch (err) {
    health.value = 'fail';
    healthError.value = (err as Error).message;
  }
  cacheCount.value = offline.size();
}

/** 清空离线缓存，释放本地空间（需求：不强制占用本地存储） */
function clearCache(): void {
  const removed = offline.clear();
  cacheCount.value = offline.size();
  cacheTip.value = removed > 0 ? `已清理 ${removed} 条离线缓存` : '当前没有离线缓存';
}

onMounted(checkHealth);
</script>

<template>
  <div class="stack">
    <!-- 角色信息 -->
    <section class="card head">
      <div class="head-text">
        <h1 class="page-title">{{ roleConfig?.label }}工作台</h1>
        <p class="text-sm text-soft">{{ roleConfig?.tagline }}</p>
      </div>
      <span class="badge badge-primary">{{ auth.displayName }}</span>
    </section>

    <!-- 后端连通性 -->
    <section class="card">
      <div class="row">
        <span class="section-title">后端服务</span>
        <span
          class="badge"
          :class="{
            'badge-success': health === 'ok',
            'badge-warning': health === 'checking',
            'badge-danger': health === 'fail',
          }"
        >
          {{ health === 'ok' ? '正常' : health === 'checking' ? '检测中' : '失败' }}
        </span>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="health === 'checking'" @click="checkHealth">
          重新检测
        </button>
      </div>

      <p v-if="health === 'ok' && healthInfo" class="text-sm text-soft note">
        服务 {{ healthInfo.service }}
      </p>
      <p v-else-if="health === 'fail'" class="alert alert-danger note">
        {{ healthError }}<br />
        请确认后端已启动（<span class="mono">npm run dev:backend</span>）。
      </p>
    </section>

    <!-- 功能入口 -->
    <section>
      <h2 class="section-title">功能入口</h2>
      <div v-if="roleConfig" class="grid grid-gap">
        <ModuleCard v-for="m in roleConfig.modules" :key="m.key" :module="m" />
      </div>
    </section>

    <!-- 平台说明与本地存储 -->
    <section class="card">
      <div class="row wrap">
        <span class="badge badge-success">纯公益</span>
        <span class="badge badge-success">全免费</span>
        <span class="badge badge-success">无广告</span>
        <span class="badge" :class="isOnline ? 'badge-primary' : 'badge-warning'">
          {{ isOnline ? '在线' : '离线' }}
        </span>
        <span class="badge">缓存 {{ cacheCount }} 条</span>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" @click="clearCache">清理缓存</button>
      </div>
      <p v-if="cacheTip" class="text-sm text-soft note">{{ cacheTip }}</p>
      <p class="text-sm text-soft note">
        所有功能与资源全免费开放；核心内容支持离线缓存，适配低带宽与网络不稳定场景。
      </p>
    </section>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.note {
  margin-top: 8px;
  line-height: 1.55;
}

.grid-gap {
  margin-top: 8px;
}

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}
</style>