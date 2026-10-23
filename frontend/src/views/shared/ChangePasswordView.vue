<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const saving = ref(false);
const error = ref('');
const tip = ref('');

const tooShort = computed(() => newPassword.value.length > 0 && newPassword.value.length < 6);
const notMatch = computed(() => confirmPassword.value.length > 0 && confirmPassword.value !== newPassword.value);

async function submit(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!oldPassword.value || !newPassword.value) {
    error.value = '请填写原密码与新密码';
    return;
  }
  if (newPassword.value.length < 6) {
    error.value = '新密码至少 6 位';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的新密码不一致';
    return;
  }
  if (newPassword.value === oldPassword.value) {
    error.value = '新密码不能与原密码相同';
    return;
  }

  saving.value = true;
  try {
    await usersApi.changePassword({ oldPassword: oldPassword.value, newPassword: newPassword.value });
    tip.value = '密码已修改，下次登录请使用新密码。';
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(() => {
  // 未登录时路由守卫会拦，这里兜底提示
  if (!authStore.isLoggedIn) void router.replace({ name: 'login' });
});
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">修改密码</h1>
      <p class="text-sm text-soft note">
        管理员创建的账号使用的是随机初始密码，建议首次登录后立即修改。
        新密码至少 6 位，修改后下次登录生效。
      </p>
    </section>

    <section class="card">
      <div class="field">
        <label class="field-label" for="cp-old">原密码</label>
        <input id="cp-old" v-model="oldPassword" class="input" type="password" autocomplete="current-password" placeholder="请输入当前密码" />
      </div>
      <div class="field note">
        <label class="field-label" for="cp-new">新密码（至少 6 位）</label>
        <input id="cp-new" v-model="newPassword" class="input" type="password" autocomplete="new-password" placeholder="请输入新密码" />
        <p v-if="tooShort" class="text-xs" style="color: var(--c-danger)">密码太短，至少 6 位</p>
      </div>
      <div class="field note">
        <label class="field-label" for="cp-confirm">确认新密码</label>
        <input id="cp-confirm" v-model="confirmPassword" class="input" type="password" autocomplete="new-password" placeholder="再输一次新密码" />
        <p v-if="notMatch" class="text-xs" style="color: var(--c-danger)">两次输入不一致</p>
      </div>

      <div v-if="error" class="alert alert-warning note">{{ error }}</div>
      <div v-if="tip" class="alert alert-success note">{{ tip }}</div>

      <button class="btn btn-primary btn-block note" type="button" :disabled="saving" @click="submit">
        {{ saving ? '提交中…' : '确认修改' }}
      </button>
    </section>

  </div>
</template>

<style scoped>
.note {
  margin-top: 10px;
  line-height: 1.55;
}
</style>
