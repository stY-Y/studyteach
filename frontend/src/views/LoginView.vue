<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { UserRole } from '@teachstudy/shared';
import BrandMark from '../components/BrandMark.vue';
import { ROLE_CONFIG, ROLE_ENTRANCES } from '../config/modules';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

/** 当前选择的入口（仅作引导；实际进入哪个工作台以账号角色为准） */
const entrance = ref<UserRole>(UserRole.STUDENT);
/** 登录方式：账号密码 / 手机号密码 */
const mode = ref<'account' | 'phone'>('account');
const username = ref('');
const phone = ref('');
const password = ref('');
const error = ref('');

const PHONE_RE = /^1[3-9]\d{9}$/;

function switchMode(next: 'account' | 'phone'): void {
  mode.value = next;
  error.value = '';
}

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
  mode.value = 'account';
  username.value = account.username;
  password.value = account.password;
  error.value = '';
}

async function onSubmit(): Promise<void> {
  error.value = '';

  if (mode.value === 'phone') {
    if (!PHONE_RE.test(phone.value)) {
      error.value = '请输入正确的 11 位手机号';
      return;
    }
    if (!password.value) {
      error.value = '请输入密码';
      return;
    }
    try {
      const user = await auth.loginByPhone(phone.value, password.value);
      entrance.value = user.role;
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
      await router.replace(redirect ?? { name: 'home' });
    } catch (err) {
      error.value = (err as Error).message || '登录失败，请稍后重试';
    }
    return;
  }

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
        <p class="brand-warm">十年树木，百年树人。愿每一株乡村的幼苗，都被温柔照亮。</p>
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

        <!-- 登录方式切换 -->
        <div class="mode-tabs">
          <button
            type="button"
            class="mode-tab"
            :class="{ active: mode === 'account' }"
            @click="switchMode('account')"
          >
            账号登录
          </button>
          <button
            type="button"
            class="mode-tab"
            :class="{ active: mode === 'phone' }"
            @click="switchMode('phone')"
          >
            手机号登录
          </button>
        </div>

        <div v-if="error" class="alert alert-danger">{{ error }}</div>

        <div v-if="mode === 'account'" class="field">
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

        <div v-else class="field">
          <label class="field-label" for="phone">手机号</label>
          <input
            id="phone"
            v-model.trim="phone"
            class="input"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            autocomplete="tel"
            placeholder="请输入 11 位手机号"
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
          <template v-if="mode === 'phone'">
            手机号登录使用注册时设置的密码；忘记密码请联系你的学校管理员。
          </template>
          <template v-else>
            进入后显示的功能以你的<b>任命岗位</b>为准：学校/年级/班级管理员都由上级任命，不能注册获得。
          </template>
        </p>

        <p class="register-entry text-sm text-soft">
          还没有账号？<RouterLink :to="{ name: 'register' }" class="link">手机号注册</RouterLink>
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
  padding: 34px 16px 56px;
  /* 天光：顶部一束暖光，底部一线田野。静态渐变，只绘制一次 */
  background:
    radial-gradient(900px 480px at 50% -12%, #f7e3c1 0%, rgba(247, 227, 193, 0) 70%),
    linear-gradient(180deg, var(--c-surface-warm) 0%, #f6f1e5 60%, #eef0e2 100%);
}

.login-box {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ---------- 品牌 ---------- */
.brand-block {
  text-align: center;
  padding-top: 8px;
}

.brand-logo {
  margin: 0 auto 14px;
}

.brand-title {
  font-size: 30px;
  letter-spacing: 0.14em;
  color: var(--c-brand-deep);
}

.brand-sub {
  margin-top: 8px;
  font-size: 13px;
  color: var(--c-text-soft);
  letter-spacing: 0.04em;
}

.brand-warm {
  margin: 14px auto 0;
  font-family: var(--font-title);
  font-size: 15px;
  line-height: 1.9;
  color: var(--c-text-soft);
  max-width: 320px;
  padding-top: 12px;
  /* 书页上的一道细绿线：分隔而不切割 */
  border-top: 1px solid var(--c-border-strong);
}

/* ---------- 四端入口 ---------- */
.section-label {
  font-size: 13px;
  color: var(--c-text-faint);
  margin-bottom: 10px;
  text-align: center;
  letter-spacing: 0.06em;
}

.entrance-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.entrance {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 10px 14px;
  font-family: inherit;
  background: var(--c-surface);
  border: 1.5px solid var(--c-border);
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(96, 70, 28, 0.04);
  transition: border-color 0.14s, background-color 0.14s, box-shadow 0.14s;
}

.entrance:hover {
  border-color: #e2cf9f;
}

.entrance.active {
  border-color: var(--c-brand);
  background: var(--c-brand-soft);
  box-shadow: 0 1px 3px rgba(63, 125, 58, 0.14);
}

.entrance-icon {
  font-size: 24px;
}

.entrance-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-text);
}

.entrance.active .entrance-label {
  color: var(--c-brand-deep);
}

.entrance-desc {
  font-size: 11px;
  color: var(--c-text-faint);
}

/* ---------- 表单 ---------- */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 24px 22px;
  border-radius: 18px;
}

.form-title {
  font-size: 19px;
  color: var(--c-text);
}

.mode-tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: 999px;
}

.mode-tab {
  flex: 1;
  min-height: 38px;
  font-family: inherit;
  font-size: 14px;
  color: var(--c-text-soft);
  background: transparent;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
}

.mode-tab.active {
  color: var(--c-primary-dark);
  background: var(--c-surface);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(96, 70, 28, 0.08);
}

.hint {
  line-height: 1.6;
}

.register-entry {
  text-align: center;
  padding-top: 2px;
}

.link {
  color: var(--c-primary);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ---------- 演示账号 ---------- */
.demo {
  padding: 14px 18px;
  border-radius: 16px;
}

.demo summary {
  cursor: pointer;
  font-size: 14px;
  color: var(--c-text-soft);
  outline: none;
}

.demo-list {
  list-style: none;
  margin: 12px 0 8px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  font-family: inherit;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s, background-color 0.12s;
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