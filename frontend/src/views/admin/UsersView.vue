<script setup lang="ts">
import { UserRole } from '@teachstudy/shared';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { usersApi, type UserItem } from '../../api/users';
import { ROLE_CONFIG } from '../../config/modules';
import { formatTime } from '../../utils/format';

const router = useRouter();

const users = ref<UserItem[]>([]);
const total = ref(0);
const page = ref(1);
const PAGE_SIZE = 20;
const loading = ref(false);
const error = ref('');
const tip = ref('');

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

/* ---------- 创建用户 ---------- */
const showForm = ref(false);
const creating = ref(false);
const createError = ref('');
const form = ref({
  username: '',
  password: '',
  role: UserRole.STUDENT,
  name: '',
  phone: '',
});

const CREATABLE_ROLES = [UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT];

function roleLabel(role: string): string {
  return ROLE_CONFIG[role as UserRole]?.label ?? role;
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const res = await usersApi.list(page.value, PAGE_SIZE);
    users.value = res[0] ?? [];
    total.value = res[1] ?? 0;
  } catch (err) {
    error.value = (err as Error).message;
    users.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function create(): Promise<void> {
  createError.value = '';
  if (!form.value.username.trim() || !form.value.password.trim()) {
    createError.value = '请填写账号与密码（密码至少 6 位）';
    return;
  }
  if (form.value.password.trim().length < 6) {
    createError.value = '密码至少 6 位';
    return;
  }
  creating.value = true;
  try {
    await usersApi.create({
      username: form.value.username.trim(),
      password: form.value.password,
      role: form.value.role,
      name: form.value.name.trim() || undefined,
      phone: form.value.phone.trim() || undefined,
    });
    tip.value = `已创建账号「${form.value.username.trim()}」`;
    form.value = { username: '', password: '', role: UserRole.STUDENT, name: '', phone: '' };
    showForm.value = false;
    page.value = 1;
    await load();
  } catch (err) {
    createError.value = (err as Error).message;
  } finally {
    creating.value = false;
  }
}

function prevPage(): void {
  if (page.value > 1) {
    page.value -= 1;
    void load();
  }
}

function nextPage(): void {
  if (page.value < totalPages.value) {
    page.value += 1;
    void load();
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(load);
</script>

<template>
  <div class="stack">
    <section class="card">
      <div class="row wrap">
        <h1 class="page-title">用户管理</h1>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" @click="showForm = !showForm">
          {{ showForm ? '收起创建' : '＋ 创建账号' }}
        </button>
      </div>
      <p class="text-sm text-soft note">
        学生、教师、家长共用一个账号体系。账号密码请通过学校渠道当面告知，不要在群里公开。
      </p>
    </section>

    <!-- 创建账号 -->
    <section v-if="showForm" class="card">
      <h2 class="section-title">创建账号</h2>
      <div class="form-grid note">
        <div class="field">
          <label class="field-label" for="u-username">账号（登录名）</label>
          <input id="u-username" v-model="form.username" class="input" type="text" placeholder="如：zhangsan" />
        </div>
        <div class="field">
          <label class="field-label" for="u-password">初始密码（≥6 位）</label>
          <input id="u-password" v-model="form.password" class="input" type="text" placeholder="至少 6 位" />
        </div>
        <div class="field">
          <label class="field-label">角色</label>
          <select v-model="form.role" class="input">
            <option v-for="r in CREATABLE_ROLES" :key="r" :value="r">{{ roleLabel(r) }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="u-name">姓名（可空）</label>
          <input id="u-name" v-model="form.name" class="input" type="text" placeholder="真实姓名" />
        </div>
        <div class="field">
          <label class="field-label" for="u-phone">手机号（可空）</label>
          <input id="u-phone" v-model="form.phone" class="input" type="text" placeholder="用于家校联系" />
        </div>
      </div>

      <div v-if="createError" class="alert alert-warning note">{{ createError }}</div>
      <button class="btn btn-primary btn-block note" type="button" :disabled="creating" @click="create">
        {{ creating ? '创建中…' : '创建账号' }}
      </button>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <section class="card">
      <div class="row">
        <h2 class="section-title">共 {{ total }} 个账号</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="load">刷新</button>
      </div>

      <p v-if="loading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="users.length === 0" class="empty note">还没有账号数据。</div>

      <ul v-else class="user-list note">
        <li v-for="u in users" :key="u.id" class="user-item">
          <span class="user-avatar">{{ (u.name || u.username).slice(0, 1) }}</span>
          <div class="user-main">
            <p class="user-name">
              {{ u.name || u.username }}
              <span class="badge badge-primary">{{ roleLabel(u.role) }}</span>
            </p>
            <p class="text-xs text-faint">
              账号 {{ u.username }}<template v-if="u.phone"> · 手机 {{ u.phone }}</template>
              · 创建于 {{ formatTime(u.createdAt) }}
            </p>
          </div>
        </li>
      </ul>

      <div v-if="total > PAGE_SIZE" class="row pager">
        <button class="btn btn-sm" type="button" :disabled="page <= 1" @click="prevPage">上一页</button>
        <span class="text-xs text-faint">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="btn btn-sm" type="button" :disabled="page >= totalPages" @click="nextPage">下一页</button>
      </div>
    </section>

    <section class="row">
      <button class="btn" type="button" @click="goHome">返回工作台</button>
    </section>
  </div>
</template>

<style scoped>
.note {
  margin-top: 10px;
  line-height: 1.55;
}

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.user-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.user-avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--c-primary);
  border-radius: 50%;
}

.user-main {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
}

.pager {
  margin-top: 12px;
  justify-content: center;
}
</style>
