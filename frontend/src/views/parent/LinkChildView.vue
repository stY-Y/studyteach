<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { usersApi, type ParentLink } from '../../api/users';
import { formatTime } from '../../utils/format';

const router = useRouter();

const username = ref('');
const binding = ref(false);
const error = ref('');
const tip = ref('');

const links = ref<ParentLink[]>([]);
const loading = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    links.value = await usersApi.children();
  } catch {
    links.value = [];
  } finally {
    loading.value = false;
  }
}

async function bind(): Promise<void> {
  error.value = '';
  tip.value = '';
  const name = username.value.trim();
  if (!name) {
    error.value = '请输入孩子的账号';
    return;
  }
  binding.value = true;
  try {
    await usersApi.linkChild(name);
    tip.value = `已提交绑定「${name}」。绑定成功后就能在「孩子学情」里看到学习情况。`;
    username.value = '';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    binding.value = false;
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

function goChildren(): void {
  void router.push({ name: 'children' });
}

onMounted(load);
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">绑定学生</h1>
      <p class="text-sm text-soft note">
        输入孩子的平台账号，完成后就能随时看到孩子的诊断和练习情况 ——
        在外打工，也能陪着孩子一起长大 🧡
      </p>
      <p class="text-xs text-faint note">一个手机号最多绑定 3 名学生。</p>
    </section>

    <section class="card">
      <div class="field">
        <label class="field-label" for="child-username">孩子的账号</label>
        <input
          id="child-username"
          v-model="username"
          class="input"
          type="text"
          placeholder="如：student"
        />
        <p class="text-xs text-faint">不知道账号？可以问孩子的老师或学校管理员。</p>
      </div>

      <div v-if="error" class="alert alert-warning note">{{ error }}</div>
      <div v-if="tip" class="alert alert-success note">{{ tip }}</div>

      <button class="btn btn-primary btn-block note" type="button" :disabled="binding" @click="bind">
        {{ binding ? '提交中…' : '确认绑定' }}
      </button>
    </section>

    <section class="card">
      <div class="row">
        <h2 class="section-title">已绑定的孩子</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="load">刷新</button>
      </div>

      <p v-if="loading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="links.length === 0" class="empty note">
        还没有绑定孩子。输入孩子的账号就能开始。
      </div>
      <ul v-else class="link-list note">
        <li v-for="l in links" :key="l.studentUserId" class="link-item">
          <span class="link-avatar">👦</span>
          <div class="link-main">
            <p class="link-name">孩子账号 ID：{{ l.studentUserId.slice(0, 8) }}…</p>
            <p class="text-xs text-faint">
              绑定状态：{{ l.status === 'approved' ? '已生效' : l.status }}
              <template v-if="l.createdAt"> · {{ formatTime(l.createdAt) }}</template>
            </p>
          </div>
          <button class="btn btn-sm" type="button" @click="goChildren">看学情</button>
        </li>
      </ul>
    </section>

  </div>
</template>

<style scoped>
.note {
  margin-top: 10px;
  line-height: 1.55;
}

.link-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.link-avatar {
  font-size: 20px;
  flex: none;
}

.link-main {
  flex: 1;
  min-width: 0;
}

.link-name {
  font-size: 15px;
  font-weight: 600;
}
</style>
