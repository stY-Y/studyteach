<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import BrandMark from '../components/BrandMark.vue';
import { ROLE_CONFIG, type ModuleEntry } from '../config/modules';
import { useAuthStore } from '../stores/auth';
import { isOnline } from '../utils/offline';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const roleConfig = computed(() => (auth.user ? ROLE_CONFIG[auth.user.role] : null));
const isHome = computed(() => route.name === 'home');

/** 已实现界面的模块直接跳转，其余进入占位页 */
function moduleTarget(m: ModuleEntry) {
  return m.path ?? { name: 'module', params: { key: m.key } };
}

function isNavActive(m: ModuleEntry): boolean {
  return m.path ? route.path === m.path : route.params.key === m.key;
}

/** 返回工作台（子页面左上角按钮） */
function goHome(): void {
  void router.push({ name: 'home' });
}

function logout(): void {
  auth.logout();
  void router.replace({ name: 'login' });
}
</script>

<template>
  <div class="shell">
    <header class="header">
      <div class="header-inner">
        <RouterLink :to="{ name: 'home' }" class="brand">
          <BrandMark :size="32" />
          <span class="brand-text">
            <strong>青禾</strong>
            <em>乡村公益助学 · 纯公益</em>
          </span>
        </RouterLink>

        <div class="spacer" />

        <span
          class="badge"
          :class="isOnline ? 'badge-success' : 'badge-warning'"
          :title="isOnline ? '网络正常' : '当前离线，已缓存内容仍可查看'"
        >
          {{ isOnline ? '在线' : '离线' }}
        </span>

        <span v-if="roleConfig" class="badge badge-primary">{{ roleConfig.label }}</span>

        <span class="user">{{ auth.displayName }}</span>

        <button class="btn btn-sm" type="button" @click="logout">退出</button>
      </div>
    </header>

    <!-- 离线提示条 -->
    <div v-if="!isOnline" class="offline-bar">
      当前离线：已缓存的内容仍可查看，联网后会自动恢复
    </div>

    <div class="body">
      <!-- 桌面端侧边导航（手机端隐藏，用首页卡片导航） -->
      <aside v-if="roleConfig" class="aside">
        <RouterLink
          :to="{ name: 'home' }"
          class="nav-item"
          :class="{ active: isHome }"
        >
          <span class="nav-icon">🏠</span>
          <span>工作台</span>
        </RouterLink>

        <RouterLink
          v-for="m in roleConfig.modules"
          :key="m.key"
          :to="moduleTarget(m)"
          class="nav-item"
          :class="{ active: isNavActive(m) }"
        >
          <span class="nav-icon">{{ m.icon }}</span>
          <span>{{ m.name }}</span>
        </RouterLink>
      </aside>

      <main class="main">
        <!-- 全局返回：每个子页面左上角都能一键回工作台（工作台自身不显示） -->
        <div v-if="!isHome" class="page-topbar">
          <button class="btn btn-sm back-home" type="button" @click="goHome">
            <span class="back-arrow" aria-hidden="true">←</span> 返回工作台
          </button>
        </div>
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  box-shadow: 0 1px 3px rgba(96, 70, 28, 0.06);
}

/* 顶部细带：禾苗绿 → 熟橙，像田埂到天光，品牌的"内涵"藏在最上面一线 */
.header::before {
  content: '';
  display: block;
  height: 3px;
  background: linear-gradient(90deg, var(--c-brand) 0%, #7fa35c 45%, var(--c-primary) 100%);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--header-h);
  padding: 0 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--c-text);
  min-width: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}

.brand-text strong {
  font-family: var(--font-title);
  font-size: 18px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.brand-text em {
  font-size: 11px;
  font-style: normal;
  color: var(--c-text-faint);
  letter-spacing: 0.02em;
}

.user {
  font-size: 14px;
  color: var(--c-text-soft);
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.offline-bar {
  background: var(--c-warning-soft);
  border-bottom: 1px solid var(--c-warning-border);
  color: var(--c-warning);
  font-size: 13px;
  padding: 8px 16px;
  text-align: center;
}

.body {
  flex: 1;
  display: flex;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}

.aside {
  display: none;
  flex-direction: column;
  gap: 2px;
  width: 190px;
  flex: none;
  padding: 18px 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px 0 10px;
  border-radius: 10px;
  color: var(--c-text-soft);
  font-size: 15px;
  border-left: 3px solid transparent;
  transition: background-color 0.12s, color 0.12s, border-color 0.12s;
}

.nav-item:hover {
  background: var(--c-surface-warm);
  color: var(--c-text);
}

/* 当前导航：软橙底 + 左侧禾绿细条，"书页上的书签" */
.nav-item.active {
  background: var(--c-primary-soft);
  color: var(--c-primary-dark);
  font-weight: 600;
  border-left-color: var(--c-brand);
}

.nav-icon {
  font-size: 17px;
  flex: none;
}

.main {
  min-width: 0;
  padding: 18px 16px 40px;
}

@media (min-width: 960px) {
  .aside {
    display: flex;
  }
  .main {
    padding: 22px 24px 48px;
  }
}

@media (max-width: 480px) {
  .brand-text em {
    display: none;
  }
  .user {
    display: none;
  }
}

/* 子页面左上角的「返回工作台」 */
.page-topbar {
  margin: -4px 0 10px;
}

.back-home {
  gap: 4px;
}

.back-arrow {
  font-size: 15px;
  line-height: 1;
}
</style>