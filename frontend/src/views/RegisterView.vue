<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { UserRole } from '@teachstudy/shared';
import BrandMark from '../components/BrandMark.vue';
import { authApi } from '../api/auth';
import { schoolsApi, type SchoolItem } from '../api/schools';
import { gradeLabel } from '../config/labels';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const phone = ref('');
const code = ref('');
const password = ref('');
const confirm = ref('');
const name = ref('');
const role = ref<UserRole>(UserRole.STUDENT);
const agree = ref(false);

/** 学生注册必填：学校 / 年级（班级改为注册后申请加入，需老师审核） */
const schools = ref<SchoolItem[]>([]);
const schoolId = ref('');
const grade = ref('');
const GRADES = Array.from({ length: 12 }, (_, i) => gradeLabel(i + 1));

const error = ref('');
const tip = ref('');
const devCode = ref('');
const countdown = ref(0);
const sending = ref(false);
let timer: number | null = null;

const PHONE_RE = /^1[3-9]\d{9}$/;
const PWD_RE = /^(?=.*[A-Za-z])(?=.*\d)[\x21-\x7e]{8,32}$/;

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; icon: string }> = [
  { value: UserRole.STUDENT, label: '学生', icon: '🎒' },
  { value: UserRole.PARENT, label: '家长', icon: '👨‍👩‍👧' },
  { value: UserRole.TEACHER, label: '教师', icon: '📖' },
];

/** 密码强度提示：不通过规则时才提示，避免一进来就报错 */
const pwdHint = computed(() => (password.value && !PWD_RE.test(password.value) ? '密码需 8-32 位，且同时包含字母和数字' : ''));
const confirmHint = computed(() => (confirm.value && confirm.value !== password.value ? '两次输入的密码不一致' : ''));

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
    error.value = '请输入正确的 11 位手机号';
    return;
  }
  sending.value = true;
  try {
    const res = await authApi.sendSmsCode(phone.value);
    devCode.value = res.devCode ?? '';
    startCountdown(res.cooldownSeconds || 60);
    tip.value = devCode.value
      ? '开发模式：验证码已生成，见下方提示（生产环境将通过短信下发）'
      : '验证码已发送，请查看短信';
  } catch (err) {
    error.value = (err as Error).message || '验证码发送失败，请稍后重试';
  } finally {
    sending.value = false;
  }
}

async function onSubmit(): Promise<void> {
  error.value = '';

  if (!PHONE_RE.test(phone.value)) {
    error.value = '请输入正确的 11 位手机号';
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
  // 学生与教师都必须绑定学校（教师入职某校后才能被该校任命为管理员）
  if (role.value === UserRole.STUDENT || role.value === UserRole.TEACHER) {
    if (!schoolId.value) {
      error.value = '请选择所在学校';
      return;
    }
  }
  if (role.value === UserRole.STUDENT && !grade.value) {
    error.value = '请选择年级';
    return;
  }

  if (!agree.value) {
    error.value = '请先阅读并同意隐私说明';
    return;
  }

  try {
    await auth.registerByPhone({
      phone: phone.value,
      code: code.value.trim(),
      password: password.value,
      name: name.value.trim() || undefined,
      role: role.value,
      // 学生、教师都绑定学校；年级仅学生需要
      schoolId:
        role.value === UserRole.STUDENT || role.value === UserRole.TEACHER
          ? schoolId.value
          : undefined,
      grade: role.value === UserRole.STUDENT ? grade.value : undefined,
    });
    await router.replace({ name: 'home' });
  } catch (err) {
    error.value = (err as Error).message || '注册失败，请稍后重试';
  }
}

onMounted(async () => {
  try {
    schools.value = await schoolsApi.list();
  } catch {
    /* 学校列表拉取失败不阻塞注册，学生可稍后在设置里补 */
  }
});

onUnmounted(clearTimer);
</script>

<template>
  <div class="register-page">
    <div class="register-box">
      <header class="brand-block">
        <BrandMark :size="52" class="brand-logo" />
        <h1 class="brand-title">注册青禾账号</h1>
        <p class="brand-sub">手机号注册 · 账号数据加密保存 · 纯公益全免费</p>
      </header>

      <form class="card register-form" @submit.prevent="onSubmit">
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-if="tip" class="alert alert-info">{{ tip }}</div>
        <div v-if="devCode" class="alert alert-warning">
          开发模式验证码：<span class="mono">{{ devCode }}</span>
        </div>

        <!-- 手机号 -->
        <div class="field">
          <label class="field-label" for="reg-phone">手机号</label>
          <input
            id="reg-phone"
            v-model.trim="phone"
            class="input"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            autocomplete="tel"
            placeholder="请输入 11 位手机号"
          />
          <p class="text-xs text-faint">手机号仅用于登录与家校联系，加密存储、不对外展示</p>
        </div>

        <!-- 验证码 -->
        <div class="field">
          <label class="field-label" for="reg-code">短信验证码</label>
          <div class="code-row">
            <input
              id="reg-code"
              v-model.trim="code"
              class="input"
              type="text"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              placeholder="6 位数字"
            />
            <button
              class="btn code-btn"
              type="button"
              :disabled="sending || countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s 后重发` : sending ? '发送中…' : '获取验证码' }}
            </button>
          </div>
        </div>

        <!-- 密码 -->
        <div class="field">
          <label class="field-label" for="reg-password">设置密码</label>
          <input
            id="reg-password"
            v-model="password"
            class="input"
            type="password"
            autocomplete="new-password"
            placeholder="8-32 位，需含字母和数字"
          />
          <p v-if="pwdHint" class="text-xs text-warn">{{ pwdHint }}</p>
        </div>

        <div class="field">
          <label class="field-label" for="reg-confirm">确认密码</label>
          <input
            id="reg-confirm"
            v-model="confirm"
            class="input"
            type="password"
            autocomplete="new-password"
            placeholder="请再次输入密码"
          />
          <p v-if="confirmHint" class="text-xs text-warn">{{ confirmHint }}</p>
        </div>

        <!-- 姓名（可选） -->
        <div class="field">
          <label class="field-label" for="reg-name">姓名（可选）</label>
          <input
            id="reg-name"
            v-model.trim="name"
            class="input"
            type="text"
            maxlength="32"
            autocomplete="name"
            placeholder="用于老师/家长识别，可稍后在档案里补充"
          />
        </div>

        <!-- 身份 -->
        <div class="field">
          <span class="field-label">我的身份</span>
          <div class="role-row">
            <button
              v-for="r in ROLE_OPTIONS"
              :key="r.value"
              type="button"
              class="chip role-chip"
              :class="{ active: role === r.value }"
              @click="role = r.value"
            >
              <span>{{ r.icon }}</span>
              {{ r.label }}
            </button>
          </div>
          <p class="text-xs text-faint">
            管理员不开放注册：教师注册后由平台/学校管理员逐级任命学校、年级、班级管理员岗位。
          </p>
        </div>

        <!-- 学生 / 教师必填：学校；学生另需年级 -->
        <div
          v-if="role === UserRole.STUDENT || role === UserRole.TEACHER"
          class="class-block"
        >
          <div class="field">
            <label class="field-label" for="reg-school">
              所在学校<span class="req">*</span>
            </label>
            <select id="reg-school" v-model="schoolId" class="input">
              <option value="">请选择学校</option>
              <option v-for="s in schools" :key="s.id" :value="s.id">
                {{ s.name }}<template v-if="s.region">（{{ s.region }}）</template>
              </option>
            </select>
          </div>
          <div v-if="role === UserRole.STUDENT" class="field">
            <label class="field-label" for="reg-grade">年级</label>
            <select id="reg-grade" v-model="grade" class="input">
              <option value="">请选择</option>
              <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <p v-if="role === UserRole.STUDENT" class="text-xs text-faint">
            注册后请在「我的班级」申请加入班级，老师审核通过后即可使用班级聊天与作业
          </p>
          <p v-else class="text-xs text-faint">
            绑定学校后，该校的学校管理员才能任命你为年级/班级管理员；注册后仍为普通教师
          </p>
          <p v-if="schools.length === 0" class="text-xs text-faint">
            暂无可选学校：请联系平台管理员先创建学校，再回来注册。
          </p>
        </div>

        <!-- 隐私同意 -->
        <label class="agree">
          <input v-model="agree" type="checkbox" />
          <span class="text-sm">
            我已阅读并同意
            <strong>隐私说明</strong>
            ：平台仅采集手机号、姓名等必要信息用于账号登录与教学管理；
            手机号加密存储、列表脱敏展示，不会对外提供或用于商业用途。
          </span>
        </label>

        <button class="btn btn-primary btn-block" type="submit" :disabled="auth.loading">
          {{ auth.loading ? '注册中…' : '注册并登录' }}
        </button>

        <p class="switch text-sm text-soft">
          已有账号？<RouterLink :to="{ name: 'login' }" class="link">去登录</RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.req {
  color: var(--c-primary-dark);
  margin-left: 2px;
}

.register-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px 56px;
  background:
    radial-gradient(900px 480px at 50% -12%, #f7e3c1 0%, rgba(247, 227, 193, 0) 70%),
    linear-gradient(180deg, #faf5e9 0%, var(--c-bg) 60%, #eef0e2 100%);
}

.register-box {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.brand-block {
  text-align: center;
  padding-top: 4px;
}

.brand-logo {
  margin: 0 auto 10px;
}

.brand-title {
  font-size: 24px;
  letter-spacing: 0.06em;
  color: var(--c-brand-deep);
}

.brand-sub {
  margin-top: 8px;
  font-size: 13px;
  color: var(--c-text-soft);
  letter-spacing: 0.03em;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 24px 22px;
  border-radius: 18px;
}

.class-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.field-row {
  display: flex;
  gap: 10px;
}

.field-row .field {
  flex: 1;
  min-width: 0;
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
  min-width: 108px;
  white-space: nowrap;
}

.role-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.role-chip {
  flex: 1;
  min-width: 88px;
  justify-content: center;
}

.agree {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  line-height: 1.55;
}

.agree input {
  margin-top: 3px;
  flex: none;
}

.text-warn {
  color: var(--c-primary-dark);
}

.switch {
  text-align: center;
}

.link {
  color: var(--c-primary);
  text-decoration: underline;
}
</style>
