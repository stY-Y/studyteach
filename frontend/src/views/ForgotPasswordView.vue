<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import BrandMark from '../components/BrandMark.vue';
import { authApi } from '../api/auth';

const router = useRouter();

const phone = ref('');
const code = ref('');
const password = ref('');
const confirm = ref('');

const error = ref('');
const tip = ref('');
const devCode = ref('');
const sending = ref(false);
const submitting = ref(false);
const countdown = ref(0);
const done = ref(false);
const username = ref('');

let timer: number | null = null;

const PHONE_RE = /^1[3-9]\d{9}$/;
const PWD_RE = /^(?=.*[A-Za-z])(?=.*\d)[\x21-\x7e]{8,32}$/;

const pwdHint = computed(() =>
  password.value && !PWD_RE.test(password.value) ? '密码需 8-32 位，且同时包含字母和数字' : '',
);
const confirmHint = computed(() =>
  confirm.value && confirm.value !== password.value ? '两次输入的密码不一致' : '',
);

function clearTimer(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function startCountdown(seconds: number): void {
  countdown.value = Math.max(1, Math.min(seconds || 60, 120));
  clearTimer();
  timer = window.setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) clearTimer();
  }, 1000);
}

async function sendCode(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!PHONE_RE.test(phone.value)) {
    error.value = '请输入注册时使用的 11 位手机号';
    return;
  }
  sending.value = true;
  try {
    const res = await authApi.sendResetCode(phone.value);
    devCode.value = res.devCode ?? '';
    startCountdown(res.cooldownSeconds || 60);
    tip.value = devCode.value
      ? '开发模式：验证码已生成，见下方提示（生产环境将通过短信下发）'
      : '如果该手机号已注册，验证码将发送到该号码';
  } catch (err) {
    error.value = (err as Error).message || '验证码发送失败，请稍后重试';
  } finally {
    sending.value = false;
  }
}

async function onSubmit(): Promise<void> {
  error.value = '';
  tip.value = '';

  if (!PHONE_RE.test(phone.value)) {
    error.value = '请输入注册时使用的 11 位手机号';
    return;
  }
  if (!/^\d{6}$/.test(code.value.trim())) {
    error.value = '请输入 6 位短信验证码';
    return;
  }
  if (!PWD_RE.test(password.value)) {
    error.value = '密码需 8-32 位，且同时包含字母和数字';
    return;
  }
  if (password.value !== confirm.value) {
    error.value = '两次输入的密码不一致';
    return;
  }

  submitting.value = true;
  try {
    const res = await authApi.resetPasswordByPhone({
      phone: phone.value,
      code: code.value.trim(),
      password: password.value,
    });
    username.value = res.username;
    done.value = true;
    clearTimer();
  } catch (err) {
    error.value = (err as Error).message || '重置失败，请稍后重试';
  } finally {
    submitting.value = false;
  }
}

onUnmounted(clearTimer);
</script>

<template>
  <div class="forgot-page">
    <div class="forgot-box">
      <header class="brand-block">
        <BrandMark :size="48" class="brand-logo" />
        <h1 class="brand-title">找回密码</h1>
        <p class="brand-sub">用注册手机号接收验证码，重设一个新密码</p>
      </header>

      <!-- 重置成功 -->
      <section v-if="done" class="card ok-card">
        <div class="ok-mark" aria-hidden="true">✓</div>
        <h2 class="ok-title">密码已重置</h2>
        <p class="ok-text">
          账号「<b>{{ username }}</b>」的密码已更新。为安全起见，其他设备上的登录状态已全部失效。
        </p>
        <button class="btn btn-primary btn-block" type="button" @click="router.replace({ name: 'login' })">
          用新密码登录
        </button>
      </section>

      <!-- 重置表单 -->
      <form v-else class="card forgot-form" @submit.prevent="onSubmit">
        <div class="field">
          <label class="field-label" for="fp-phone">注册手机号</label>
          <input
            id="fp-phone"
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
          <label class="field-label" for="fp-code">验证码</label>
          <div class="code-row">
            <input
              id="fp-code"
              v-model.trim="code"
              class="input"
              type="text"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              placeholder="6 位验证码"
            />
            <button
              class="btn code-btn"
              type="button"
              :disabled="sending || countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : sending ? '发送中…' : '获取验证码' }}
            </button>
          </div>
          <p v-if="devCode" class="text-xs text-faint">开发模式验证码：{{ devCode }}</p>
        </div>

        <div class="field">
          <label class="field-label" for="fp-pwd">新密码</label>
          <input
            id="fp-pwd"
            v-model="password"
            class="input"
            type="password"
            autocomplete="new-password"
            placeholder="8-32 位，需同时含字母和数字"
          />
          <p v-if="pwdHint" class="text-xs text-warn">{{ pwdHint }}</p>
        </div>

        <div class="field">
          <label class="field-label" for="fp-confirm">确认新密码</label>
          <input
            id="fp-confirm"
            v-model="confirm"
            class="input"
            type="password"
            autocomplete="new-password"
            placeholder="再输入一次新密码"
          />
          <p v-if="confirmHint" class="text-xs text-warn">{{ confirmHint }}</p>
        </div>

        <p v-if="error" class="alert alert-danger">{{ error }}</p>
        <p v-if="tip" class="alert alert-info">{{ tip }}</p>

        <button class="btn btn-primary btn-block" type="submit" :disabled="submitting">
          {{ submitting ? '提交中…' : '重置密码' }}
        </button>

        <p class="switch text-sm text-soft">
          想起来了？<RouterLink :to="{ name: 'login' }" class="link">返回登录</RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.forgot-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 34px 16px 56px;
  background:
    radial-gradient(900px 480px at 50% -12%, #f7e3c1 0%, rgba(247, 227, 193, 0) 70%),
    linear-gradient(180deg, #faf5e9 0%, var(--c-bg) 60%, #eef0e2 100%);
}

.forgot-box {
  width: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.brand-block {
  text-align: center;
  padding-top: 6px;
}

.brand-logo {
  margin: 0 auto 12px;
}

.brand-title {
  font-size: 26px;
  letter-spacing: 0.08em;
  color: var(--c-brand-deep);
}

.brand-sub {
  margin-top: 8px;
  font-size: 13px;
  color: var(--c-text-soft);
}

.forgot-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 24px 22px;
  border-radius: 18px;
}

.code-row {
  display: flex;
  gap: 8px;
}

.code-row .input {
  flex: 1;
  min-width: 0;
}

.code-btn {
  flex: none;
  min-width: 116px;
  white-space: nowrap;
}

.text-warn {
  color: var(--c-primary-dark);
}

.switch {
  text-align: center;
}

.link {
  color: var(--c-primary);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ---------- 成功态 ---------- */
.ok-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 30px 24px;
  border-radius: 18px;
  text-align: center;
}

.ok-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  font-size: 28px;
  color: #fff;
  background: var(--c-brand);
  border-radius: 50%;
}

.ok-title {
  font-size: 21px;
}

.ok-text {
  font-size: 14px;
  line-height: 1.75;
  color: var(--c-text-soft);
}

.ok-card .btn {
  margin-top: 6px;
}
</style>
