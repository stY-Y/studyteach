<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { UserRole } from '@teachstudy/shared';
import { systemApi, type HealthResult } from '../api/auth';
import { usersApi } from '../api/users';
import ModuleCard from '../components/ModuleCard.vue';
import { ROLE_CONFIG } from '../config/modules';
import { hasStaff, isManagerRole, isStaff, staffLabelOf } from '../config/staff';
import { useAuthStore } from '../stores/auth';
import { isOnline, offline } from '../utils/offline';

const auth = useAuthStore();

const roleConfig = computed(() => (auth.user ? ROLE_CONFIG[auth.user.role] : null));

/** 我的岗位文案（普通教师 / 年级管理员 · 班级管理员…） */
const myStaffLabel = computed(() => (auth.user?.role === UserRole.TEACHER || isManagerRole(auth.user?.role ?? '') ? staffLabelOf(auth.user) : ''));

/** 家长已绑定的孩子数量：未绑定时隐藏学情/报表/沟通入口 */
const childCount = ref<number | null>(null);

const modules = computed(() => {
  if (!auth.user) return [];

  // 管理岗位由「教师 + 任命岗位」叠加而成：基础功能保留教师那套
  const baseRole = isManagerRole(auth.user.role) ? UserRole.TEACHER : auth.user.role;
  const base = ROLE_CONFIG[baseRole] ?? roleConfig.value;
  let list = base?.modules ?? [];

  // 需任命岗位的模块：未担任该岗位时隐藏
  list = list.filter((m) => !m.staff || hasStaff(auth.user, m.staff));

  if (auth.user.role === UserRole.PARENT && (childCount.value ?? 0) === 0) {
    // 未绑定（或还在加载）时只保留「绑定学生」与「账号与安全」
    list = list.filter((m) => m.key === 'link' || m.key === 'settings');
  }
  return list;
});

/** 按时段问候，让工作台更有「家」的温度 */
const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
});

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

onMounted(async () => {
  void checkHealth();
  if (auth.user?.role === UserRole.PARENT) {
    try {
      childCount.value = (await usersApi.children()).length;
    } catch {
      childCount.value = 0;
    }
  }
});
</script>

<template>
  <div class="stack">
    <!-- 角色信息 -->
    <section class="card head">
      <div class="head-text">
        <h1 class="page-title">{{ greeting }}，{{ roleConfig?.label }}工作台</h1>
        <p class="text-sm text-soft">{{ roleConfig?.tagline }}</p>
        <p v-if="myStaffLabel" class="text-xs text-faint">当前岗位：{{ myStaffLabel }}</p>
      </div>
      <span class="badge badge-primary">{{ auth.displayName }}</span>
    </section>

    <p class="welcome-line">欢迎回来，{{ auth.displayName }}。今天也一起加油吧 ☀️</p>

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

      <p v-if="auth.user?.role === UserRole.PARENT && (childCount ?? 0) === 0" class="alert alert-info">
        还没有绑定孩子。绑定成功后，才会出现「孩子学情」「学情报表」「与老师沟通」。
      </p>

      <p v-if="auth.user?.role === UserRole.TEACHER && !isStaff(auth.user)" class="alert alert-info">
        你还没有被任命管理岗位。组卷、题库、资源上传等功能可直接使用；
        如需管理年级或班级，请等待学校管理员 / 年级管理员任命。
      </p>

      <div v-if="roleConfig" class="grid grid-gap">
        <ModuleCard v-for="m in modules" :key="m.key" :module="m" />
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

.welcome-line {
  font-size: 14px;
  color: var(--c-text-soft);
  padding: 0 4px;
}

.grid-gap {
  margin-top: 8px;
}

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}
</style>