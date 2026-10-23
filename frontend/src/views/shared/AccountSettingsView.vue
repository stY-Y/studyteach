<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { UserRole } from '@teachstudy/shared';
import { authApi } from '../../api/auth';
import { schoolsApi, type SchoolItem } from '../../api/schools';
import { usersApi, type MeResult } from '../../api/users';
import { gradeLabel, inferGradeFromText } from '../../config/labels';
import { useAuthStore } from '../../stores/auth';
import { offline } from '../../utils/offline';

const auth = useAuthStore();
const router = useRouter();

const me = ref<MeResult | null>(null);
const loading = ref(true);
const error = ref('');
const tip = ref('');

/** 姓名 */
const name = ref('');
const savingName = ref(false);

/** 手机号换绑 */
const currentPhone = ref('');
const newPhone = ref('');
const code = ref('');
const countdown = ref(0);
const devCode = ref('');
const sending = ref(false);
const changing = ref(false);
let timer: number | null = null;

/** 学生：学校 / 年级（班级通过「我的班级」申请加入） */
const schools = ref<SchoolItem[]>([]);
const schoolId = ref('');
const grade = ref('');
const savingClass = ref(false);
const GRADES = Array.from({ length: 12 }, (_, i) => gradeLabel(i + 1));

/** 注销账号 */
const deletePassword = ref('');
const deleteConfirm = ref('');
const deleting = ref(false);

const isStudent = computed(() => me.value?.role === UserRole.STUDENT);

const PHONE_RE = /^1[3-9]\d{9}$/;

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

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [data, list] = await Promise.all([
      usersApi.me(),
      schoolsApi.list().catch(() => [] as SchoolItem[]),
    ]);
    me.value = data;
    schools.value = list;
    name.value = data.name ?? '';
    currentPhone.value = data.phone ?? '';

    const profile = data.studentProfile;
    if (profile) {
      schoolId.value = profile.schoolId ?? '';
      grade.value = profile.grade ?? '';
    } else if (data.schoolId) {
      schoolId.value = data.schoolId;
    }
    // 年级若不是规范写法，尽量归一
    const inferred = inferGradeFromText(grade.value);
    if (inferred) grade.value = gradeLabel(inferred);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function saveName(): Promise<void> {
  error.value = '';
  tip.value = '';
  const value = name.value.trim();
  if (!value) {
    error.value = '姓名不能为空';
    return;
  }
  savingName.value = true;
  try {
    const updated = await usersApi.updateMe({ name: value });
    me.value = updated;
    if (auth.user) auth.user = { ...auth.user, name: value };
    tip.value = '姓名已更新';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    savingName.value = false;
  }
}

async function sendCode(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!PHONE_RE.test(newPhone.value)) {
    error.value = '请输入正确的 11 位新手机号';
    return;
  }
  sending.value = true;
  try {
    const res = await authApi.sendSmsCode(newPhone.value);
    devCode.value = res.devCode ?? '';
    startCountdown(res.cooldownSeconds || 60);
    tip.value = devCode.value ? '开发模式验证码已生成' : '验证码已发送到新手机号';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    sending.value = false;
  }
}

async function changePhone(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!PHONE_RE.test(newPhone.value)) {
    error.value = '请输入正确的 11 位新手机号';
    return;
  }
  if (!/^\d{6}$/.test(code.value.trim())) {
    error.value = '请输入 6 位验证码';
    return;
  }
  changing.value = true;
  try {
    await authApi.changePhone(newPhone.value, code.value.trim());
    currentPhone.value = newPhone.value;
    newPhone.value = '';
    code.value = '';
    devCode.value = '';
    tip.value = '手机号已换绑，下次请用新手机号登录';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    changing.value = false;
  }
}

async function saveClass(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!schoolId.value || !grade.value) {
    error.value = '请选择学校与年级';
    return;
  }
  savingClass.value = true;
  try {
    await usersApi.saveStudentProfile({
      schoolId: schoolId.value,
      grade: grade.value,
    });
    const fresh = await usersApi.me();
    me.value = fresh;
    try {
      offline.save('GET /users/me', fresh);
    } catch {
      /* 缓存刷新失败不影响保存 */
    }
    tip.value = '学校与班级已更新';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    savingClass.value = false;
  }
}

async function doDelete(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (deleteConfirm.value.trim() !== '注销') {
    error.value = '请输入「注销」两个字以确认';
    return;
  }
  if (!deletePassword.value) {
    error.value = '请输入当前密码';
    return;
  }
  deleting.value = true;
  try {
    await usersApi.deleteAccount(deletePassword.value);
    auth.logout();
    await router.replace({ name: 'login' });
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    deleting.value = false;
  }
}

onMounted(load);
onUnmounted(clearTimer);
</script>

<template>
  <div class="stack">
    <h1 class="page-title">账号与安全</h1>
    <p class="text-soft text-sm">在这里可以修改姓名、换绑手机号、调整学校班级，或注销账号。</p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-info">{{ tip }}</div>

    <div v-if="loading" class="text-soft">加载中…</div>

    <template v-else-if="me">
      <!-- 账号信息 -->
      <section class="card stack">
        <h2 class="section-title">账号信息</h2>
        <div class="info-row"><span class="info-label">登录账号</span><span class="mono">{{ me.username }}</span></div>
        <div class="info-row"><span class="info-label">当前手机号</span><span class="mono">{{ currentPhone || '未绑定' }}</span></div>
        <p class="text-xs text-faint">手机号加密存储，仅你自己可见；列表中一律脱敏展示。</p>
      </section>

      <!-- 姓名 -->
      <section class="card stack">
        <h2 class="section-title">姓名</h2>
        <div class="field">
          <label class="field-label" for="set-name">姓名</label>
          <input id="set-name" v-model.trim="name" class="input" type="text" maxlength="32" placeholder="请输入姓名" />
        </div>
        <button class="btn btn-primary self-start" type="button" :disabled="savingName" @click="saveName">
          {{ savingName ? '保存中…' : '保存姓名' }}
        </button>
      </section>

      <!-- 换绑手机号 -->
      <section class="card stack">
        <h2 class="section-title">换绑手机号</h2>
        <div class="field">
          <label class="field-label" for="set-new-phone">新手机号</label>
          <input
            id="set-new-phone"
            v-model.trim="newPhone"
            class="input"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            placeholder="请输入 11 位新手机号"
          />
        </div>
        <div class="field">
          <label class="field-label" for="set-code">短信验证码</label>
          <div class="code-row">
            <input id="set-code" v-model.trim="code" class="input" type="text" inputmode="numeric" maxlength="6" placeholder="6 位数字" />
            <button class="btn code-btn" type="button" :disabled="sending || countdown > 0" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s 后重发` : sending ? '发送中…' : '获取验证码' }}
            </button>
          </div>
          <p v-if="devCode" class="text-xs text-warn">开发模式验证码：<span class="mono">{{ devCode }}</span></p>
        </div>
        <button class="btn btn-primary self-start" type="button" :disabled="changing" @click="changePhone">
          {{ changing ? '换绑中…' : '确认换绑' }}
        </button>
      </section>

      <!-- 学生：学校与年级 -->
      <section v-if="isStudent" class="card stack">
        <h2 class="section-title">学校与年级</h2>
        <div class="field">
          <label class="field-label" for="set-school">学校</label>
          <select id="set-school" v-model="schoolId" class="input">
            <option value="">请选择学校</option>
            <option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="set-grade">年级</label>
          <select id="set-grade" v-model="grade" class="input">
            <option value="">请选择</option>
            <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <button class="btn btn-primary self-start" type="button" :disabled="savingClass" @click="saveClass">
          {{ savingClass ? '保存中…' : '保存学校与年级' }}
        </button>
        <p class="text-xs text-faint">
          班级由老师创建，需要到「我的班级」申请加入并通过老师审核，才能使用班级聊天与作业。
          <RouterLink :to="{ name: 'myClass' }" class="link">去我的班级</RouterLink>
        </p>
      </section>

      <!-- 注销 -->
      <section class="card stack danger-zone">
        <h2 class="section-title">注销账号</h2>
        <p class="text-sm text-soft">
          注销后账号与个人数据（档案、诊断、批改、作业提交、聊天消息）将被永久删除且无法恢复；
          已上传的教学资源会保留。若只是暂时不用，建议直接退出登录。
        </p>
        <div class="field">
          <label class="field-label" for="del-password">当前密码</label>
          <input id="del-password" v-model="deletePassword" class="input" type="password" autocomplete="current-password" placeholder="请输入当前密码" />
        </div>
        <div class="field">
          <label class="field-label" for="del-confirm">输入「注销」以确认</label>
          <input id="del-confirm" v-model="deleteConfirm" class="input" type="text" placeholder="注销" />
        </div>
        <button class="btn btn-danger self-start" type="button" :disabled="deleting" @click="doDelete">
          {{ deleting ? '注销中…' : '永久注销账号' }}
        </button>
      </section>
    </template>
  </div>
</template>

<style scoped>
.info-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  font-size: 14px;
}

.info-label {
  width: 88px;
  flex: none;
  color: var(--c-text-soft);
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

.field-row {
  display: flex;
  gap: 10px;
}

.field-row .field {
  flex: 1;
  min-width: 0;
}

.self-start {
  align-self: flex-start;
}

.text-warn {
  color: #b45309;
}

.danger-zone {
  border-color: #e6b8ae;
  background: #fdf6f4;
}
</style>
