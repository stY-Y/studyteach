<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { UserRole } from '@teachstudy/shared';
import { systemApi, type HealthResult } from '../api/auth';
import { dashboardApi, type DashboardData } from '../api/dashboard';
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

/* ---------- 工作台看板（按角色聚合，让首页"活"起来） ---------- */
const dash = ref<DashboardData | null>(null);

/** 看板指标定义：字段 → 中文名 + 图标（不同角色字段不同，仅显示存在且有值的） */
const DASH_METRICS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'schools', label: '学校', icon: '🏫' },
  { key: 'grades', label: '年级', icon: '🏷️' },
  { key: 'classes', label: '班级', icon: '🎒' },
  { key: 'students', label: '学生', icon: '👦' },
  { key: 'teachers', label: '教师', icon: '👩‍🏫' },
  { key: 'parents', label: '家长', icon: '👨‍👩‍👧' },
  { key: 'pending', label: '待审核入班', icon: '⏳' },
  { key: 'resources', label: '资源', icon: '📚' },
  { key: 'questions', label: '题目', icon: '🗂️' },
  { key: 'diagnoses', label: '诊断次数', icon: '🧭' },
  { key: 'gradings', label: '批改次数', icon: '✍️' },
  { key: 'homeworks', label: '作业', icon: '📝' },
  { key: 'notices', label: '通知', icon: '📢' },
  { key: 'messages', label: '班级消息', icon: '💬' },
  { key: 'reports', label: '学情报表', icon: '📈' },
  { key: 'children', label: '绑定孩子', icon: '👦' },
];

const dashMetrics = computed(() => {
  const d = dash.value;
  if (!d) return [];
  return DASH_METRICS.filter((m) => typeof d[m.key] === 'number').map((m) => ({
    key: m.key,
    label: m.label,
    icon: m.icon,
    value: d[m.key] as number,
  }));
});

/** 日活统计：只有管理端（平台/学校/年级/班级管理员）的看板会返回 */
const activity = computed(() => dash.value?.activity ?? null);

/** 柱状高度：以 7 日最高值为满格，0 也留一点底色便于看清 */
function barHeight(count: number): string {
  const max = Math.max(1, activity.value?.peak ?? 1);
  return `${Math.max(6, Math.round((count / max) * 100))}%`;
}

async function loadDashboard(): Promise<void> {
  try {
    dash.value = await dashboardApi.overview();
  } catch {
    dash.value = null; // 看板失败不阻塞工作台，静默降级
  }
}

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
  void loadDashboard();
  // 旧缓存可能没有岗位字段（staffRoles），补一次，避免按岗位显示的入口被误隐藏
  if (auth.user && auth.user.staffRoles === undefined) {
    void auth.syncProfile();
  }
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

    <!-- 工作台看板：按角色聚合的实时概览 -->
    <section v-if="dashMetrics.length > 0" class="card">
      <div class="row">
        <span class="section-title">今日概览</span>
        <span class="text-xs text-faint">数据实时统计</span>
      </div>
      <div class="dash-grid">
        <div v-for="m in dashMetrics" :key="m.key" class="dash-item">
          <span class="dash-icon">{{ m.icon }}</span>
          <span class="dash-num">{{ m.value }}</span>
          <span class="dash-label">{{ m.label }}</span>
        </div>
      </div>
    </section>

    <!-- 日活统计：以登录为准，按自然日去重（管理端可见） -->
    <section v-if="activity" class="card">
      <div class="row">
        <span class="section-title">日活统计</span>
        <span class="text-xs text-faint">按登录去重，近 7 天</span>
      </div>

      <div class="act-summary">
        <div class="act-figure">
          <b>{{ activity.today }}</b>
          <span>今日活跃</span>
        </div>
        <div class="act-figure act-figure-plain">
          <b>{{ activity.yesterday }}</b>
          <span>昨日</span>
        </div>
        <div class="act-figure act-figure-plain">
          <b>{{ activity.peak }}</b>
          <span>7 日最高</span>
        </div>
      </div>

      <div class="act-chart">
        <div v-for="p in activity.trend" :key="p.date" class="act-col">
          <span class="act-count">{{ p.count }}</span>
          <div class="act-track">
            <div class="act-bar" :class="{ 'act-bar-zero': p.count === 0 }" :style="{ height: barHeight(p.count) }" />
          </div>
          <span class="act-label">{{ p.label }}</span>
        </div>
      </div>
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

      <p v-if="auth.user?.role === UserRole.PARENT && (childCount ?? 0) === 0" class="alert alert-info">
        还没有绑定孩子。绑定成功后，才会出现「孩子学情」「学情报表」「与老师沟通」。
      </p>

      <p v-if="auth.user?.role === UserRole.TEACHER && !isStaff(auth.user)" class="alert alert-info">
        你还没有被任命管理岗位，组卷、题库、资源上传等功能可直接使用。<br />
        管理功能需要任命后才能使用：<b>学校管理</b>仅平台管理员可用；<b>年级管理</b>需学校管理员岗位；
        <b>班级管理</b>需年级管理员岗位；<b>班主任</b>需班级管理员岗位。直接访问这些页面会提示「您无权限管理」。
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

    <!-- 「青禾」之名，出自荀子《劝学》——这是给每个乡村孩子的祝愿 -->
    <p class="brand-line">「青，取之于蓝，而青于蓝。」—— 荀子 ·《劝学》</p>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 22px 20px;
  border-radius: 18px;
  /* 书页上的一抹晨光：从左到右由暖转淡 */
  background: linear-gradient(120deg, #fdf2dd 0%, var(--c-surface) 60%);
}

.head-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.head .page-title {
  font-size: 22px;
  letter-spacing: 0.03em;
}

.note {
  margin-top: 10px;
  line-height: 1.55;
}

.welcome-line {
  font-size: 14px;
  color: var(--c-text-soft);
  padding: 0 6px;
}

/* ---------- 看板 ---------- */
.dash-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 12px;
}

.dash-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: 12px;
}

.dash-icon {
  font-size: 20px;
  flex: none;
}

.dash-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--c-primary-dark);
  font-variant-numeric: tabular-nums;
}

.dash-label {
  font-size: 13px;
  color: var(--c-text-soft);
}

/* ---------- 日活统计 ---------- */
.act-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.act-figure {
  flex: 1 1 92px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: 12px;
}

.act-figure b {
  font-size: 20px;
  font-weight: 700;
  color: var(--c-primary-dark);
  font-variant-numeric: tabular-nums;
}

.act-figure span {
  font-size: 12px;
  color: var(--c-text-soft);
}

.act-figure-plain b {
  color: var(--c-text);
}

.act-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  margin-top: 14px;
}

.act-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.act-count {
  font-size: 12px;
  color: var(--c-text-soft);
  font-variant-numeric: tabular-nums;
}

.act-track {
  width: 100%;
  height: 78px;
  padding: 3px;
  display: flex;
  align-items: flex-end;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  box-sizing: border-box;
}

.act-bar {
  width: 100%;
  background: var(--c-primary);
  border-radius: 6px;
}

.act-bar-zero {
  background: var(--c-border-strong);
}

.act-label {
  font-size: 11px;
  color: var(--c-text-faint);
  white-space: nowrap;
}

@media (min-width: 640px) {
  .dash-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.grid-gap {
  margin-top: 10px;
}

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.brand-line {
  text-align: center;
  font-family: var(--font-title);
  font-size: 14px;
  color: var(--c-text-faint);
  letter-spacing: 0.06em;
  padding: 16px 0 2px;
}
</style>