<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { UserRole } from '@teachstudy/shared';
import BrandMark from '../components/BrandMark.vue';
import { ROLE_CONFIG, ROLE_ENTRANCES } from '../config/modules';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

/** 当前选择的入口（仅作引导；实际进入哪个工作台以账号角色为准） */
const entrance = ref<UserRole>(UserRole.STUDENT);
const username = ref('');
const password = ref('');
const error = ref('');

/** 演示账号（由后端 npm run seed 播种生成，仅供本地开发体验） */
const DEMO_ACCOUNTS: Array<{ role: UserRole; username: string; password: string }> = [
  { role: UserRole.STUDENT, username: 'student', password: 'student123456' },
  { role: UserRole.TEACHER, username: 'teacher', password: 'teacher123456' },
  { role: UserRole.ADMIN, username: 'admin', password: 'admin123456' },
  { role: UserRole.PARENT, username: 'parent', password: 'parent123456' },
];

function selectEntrance(role: UserRole): void {
  entrance.value = role;
  error.value = '';
}

function fillDemo(account: { role: UserRole; username: string; password: string }): void {
  entrance.value = account.role;
  username.value = account.username;
  password.value = account.password;
  error.value = '';
}

async function onSubmit(): Promise<void> {
  error.value = '';
  const name = username.value.trim();
  if (!name || !password.value) {
    error.value = '请输入账号和密码';
    return;
  }

  try {
    const user = await auth.login(name, password.value);
    // 账号角色与所选入口不一致时，自动进入其真实角色工作台
    entrance.value = user.role;
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
    await router.replace(redirect ?? { name: 'home' });
  } catch (err) {
    error.value = (err as Error).message || '登录失败，请稍后重试';
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-box">
      <!-- 品牌区 -->
      <header class="brand-block">
        <BrandMark :size="56" class="brand-logo" />
        <h1 class="brand-title">青禾</h1>
        <p class="brand-sub">乡村公益助学 · 纯公益 · 全免费 · 无广告</p>
        <p class="brand-warm">让每一个乡村孩子，都被好好点亮 🌱</p>
      </header>

      <!-- 四端入口 -->
      <section class="entrances">
        <p class="section-label">请选择你的身份入口</p>
        <div class="entrance-grid">
          <button
            v-for="e in ROLE_ENTRANCES"
            :key="e.role"
            type="button"
            class="entrance"
            :class="{ active: entrance === e.role }"
            @click="selectEntrance(e.role)"
          >
            <span class="entrance-icon">{{ e.icon }}</span>
            <span class="entrance-label">{{ e.label }}</span>
            <span class="entrance-desc">{{ e.desc }}</span>
          </button>
        </div>
      </section>

      <!-- 登录表单 -->
      <form class="card login-form" @submit.prevent="onSubmit">
        <h2 class="form-title">{{ ROLE_CONFIG[entrance].label }}登录</h2>

        <div v-if="error" class="alert alert-danger">{{ error }}</div>

        <div class="field">
          <label class="field-label" for="username">账号</label>
          <input
            id="username"
            v-model="username"
            class="input"
            type="text"
            autocomplete="username"
            placeholder="请输入账号"
          />
        </div>

        <div class="field">
          <label class="field-label" for="password">密码</label>
          <input
            id="password"
            v-model="password"
            class="input"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
          />
        </div>

        <button class="btn btn-primary btn-block" type="submit" :disabled="auth.loading">
          {{ auth.loading ? '登录中…' : '登 录' }}
        </button>

        <p class="hint text-xs text-faint">
          实际进入的工作台以账号角色为准。没有账号？可联系学校管理员创建，或使用下方演示账号体验。<br />
          管理员创建的账号使用随机初始密码，登录后请尽快到「修改密码」里改掉。
        </p>
      </form>

      <!-- 演示账号 -->
      <details class="demo card">
        <summary>演示账号（点击即可填入）</summary>
        <ul class="demo-list">
          <li v-for="d in DEMO_ACCOUNTS" :key="d.username">
            <button type="button" class="demo-item" @click="fillDemo(d)">
              <span class="badge badge-primary">{{ ROLE_CONFIG[d.role].label }}</span>
              <span class="mono">{{ d.username }} / {{ d.password }}</span>
            </button>
          </li>
        </ul>
        <p class="text-xs text-faint">
          以上账号由 <span class="mono">npm run seed</span> 生成，仅用于本地开发体验，请勿用于生产环境。
        </p>
      </details>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 28px 16px 48px;
  background: var(--c-bg);
}

.login-box {
  width: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ---------- 品牌 ---------- */
.brand-block {
  text-align: center;
}

.brand-logo {
  margin: 0 auto 10px;
}

.brand-title {
  font-size: 21px;
}

.brand-sub {
  margin-top: 5px;
  font-size: 13px;
  color: var(--c-text-soft);
}

.brand-warm {
  margin-top: 6px;
  font-size: 14px;
  color: var(--c-primary-dark);
}

/* ---------- 四端入口 ---------- */
.section-label {
  font-size: 13px;
  color: var(--c-text-soft);
  margin-bottom: 8px;
  text-align: center;
}

.entrance-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.entrance {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 13px 8px;
  font-family: inherit;
  background: var(--c-surface);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.12s, background-color 0.12s;
}

.entrance:hover {
  border-color: #e8d3ab;
}

.entrance.active {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
}

.entrance-icon {
  font-size: 22px;
}

.entrance-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-text);
}

.entrance-desc {
  font-size: 11px;
  color: var(--c-text-faint);
}

/* ---------- 表单 ---------- */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-title {
  font-size: 17px;
}

.hint {
  line-height: 1.5;
}

/* ---------- 演示账号 ---------- */
.demo {
  padding: 12px 16px;
}

.demo summary {
  cursor: pointer;
  font-size: 14px;
  color: var(--c-text-soft);
  outline: none;
}

.demo-list {
  list-style: none;
  margin: 10px 0 6px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  font-family: inherit;
  background: #f7f1e3;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
}

.demo-item:hover {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
}

@media (min-width: 480px) {
  .entrance-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>