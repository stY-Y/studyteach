<script setup lang="ts">
import { UserRole } from '@teachstudy/shared';
import { computed, onMounted, ref } from 'vue';
import {
  usersApi,
  type HierarchyBucket,
  type HierarchyPerson,
  type HierarchyResult,
  type UserItem,
} from '../../api/users';
import { schoolsApi, type SchoolItem } from '../../api/schools';
import { ROLE_CONFIG } from '../../config/modules';
import { formatTime } from '../../utils/format';

const users = ref<UserItem[]>([]);
const schools = ref<SchoolItem[]>([]);
const total = ref(0);
const page = ref(1);
const PAGE_SIZE = 20;
const loading = ref(false);
const error = ref('');
const tip = ref('');

/** 视图：分层（默认）/ 平铺 */
const view = ref<'hierarchy' | 'list'>('hierarchy');
const tree = ref<HierarchyResult | null>(null);
const treeLoading = ref(false);
const keyword = ref('');

/** 展开状态：学校 / 年级 / 班级 */
const openSchools = ref<Record<string, boolean>>({});
const openGrades = ref<Record<string, boolean>>({});
const openClasses = ref<Record<string, boolean>>({});

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
  schoolId: '',
});

const CREATABLE_ROLES = [UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT];

function roleLabel(role: string): string {
  return ROLE_CONFIG[role as UserRole]?.label ?? role;
}

function schoolName(id?: string | null): string {
  if (!id) return '未设置';
  return schools.value.find((s) => s.id === id)?.name ?? id.slice(0, 8) + '…';
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

async function loadTree(): Promise<void> {
  treeLoading.value = true;
  error.value = '';
  try {
    const data = await usersApi.hierarchy();
    tree.value = data;
    // 默认展开第一所学校与其第一个年级，其余按需展开
    const first = data.schools[0];
    if (first) {
      openSchools.value[first.id] = true;
      const g = first.grades[0];
      if (g) openGrades.value[g.id] = true;
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    treeLoading.value = false;
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
      schoolId: form.value.schoolId || undefined,
    });
    tip.value = `已创建账号「${form.value.username.trim()}」`;
    form.value = { username: '', password: '', role: UserRole.STUDENT, name: '', phone: '', schoolId: '' };
    showForm.value = false;
    page.value = 1;
    await Promise.all([load(), loadTree()]);
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

/* ---------- 分层：搜索过滤与展开 ---------- */

const kw = computed(() => keyword.value.trim().toLowerCase());

function hit(p: HierarchyPerson): boolean {
  if (!kw.value) return true;
  return `${p.name}${p.username}${p.phone ?? ''}${p.extra ?? ''}`
    .toLowerCase()
    .includes(kw.value);
}

function filterBucket(b: HierarchyBucket): HierarchyBucket {
  return {
    students: b.students.filter(hit),
    teachers: b.teachers.filter(hit),
    parents: b.parents.filter(hit),
  };
}

function bucketSize(b: HierarchyBucket): number {
  return b.students.length + b.teachers.length + b.parents.length;
}

/** 有关键词时只保留命中的人员，并隐藏空的分支 */
const filteredTree = computed<HierarchyResult | null>(() => {
  const t = tree.value;
  if (!t || !kw.value) return t;

  const schools = t.schools
    .map((s) => {
      const grades = s.grades
        .map((g) => {
          const classes = g.classes
            .map((c) => ({ ...c, ...filterBucket(c) }))
            .filter((c) => bucketSize(c) > 0);
          return { ...g, classes, unassigned: filterBucket(g.unassigned) };
        })
        .filter((g) => g.classes.length > 0 || bucketSize(g.unassigned) > 0);
      return { ...s, grades, unassigned: filterBucket(s.unassigned) };
    })
    .filter((s) => s.grades.length > 0 || bucketSize(s.unassigned) > 0);

  return { ...t, schools, unassigned: filterBucket(t.unassigned) };
});

const matchCount = computed(() => {
  const t = filteredTree.value;
  if (!t || !kw.value) return 0;
  let n = 0;
  for (const s of t.schools) {
    for (const g of s.grades) {
      for (const c of g.classes) n += bucketSize(c);
      n += bucketSize(g.unassigned);
    }
    n += bucketSize(s.unassigned);
  }
  n += bucketSize(t.unassigned);
  return n;
});

function isOpen(map: Record<string, boolean>, id: string): boolean {
  // 搜索时强制展开，便于直接看到命中结果
  return Boolean(kw.value) || Boolean(map[id]);
}

function toggleSchool(id: string): void {
  openSchools.value[id] = !openSchools.value[id];
}
function toggleGrade(id: string): void {
  openGrades.value[id] = !openGrades.value[id];
}
function toggleClass(id: string): void {
  openClasses.value[id] = !openClasses.value[id];
}

function switchView(next: 'hierarchy' | 'list'): void {
  view.value = next;
  if (next === 'hierarchy' && !tree.value) void loadTree();
  if (next === 'list' && users.value.length === 0) void load();
}

onMounted(async () => {
  try {
    schools.value = await schoolsApi.list();
  } catch {
    schools.value = [];
  }
  await Promise.all([load(), loadTree()]);
});
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
        按 <b>学校 → 年级 → 班级</b> 分层查看，班级内再分 <b>学生 / 家长 / 教师</b> 三个身份区。
        学生按档案班级归位，家长按孩子所在班级归位，教师按班级管理员任命归位。
      </p>
      <div class="row wrap note">
        <button
          class="btn btn-sm"
          :class="{ 'btn-primary': view === 'hierarchy' }"
          type="button"
          @click="switchView('hierarchy')"
        >
          分层视图
        </button>
        <button
          class="btn btn-sm"
          :class="{ 'btn-primary': view === 'list' }"
          type="button"
          @click="switchView('list')"
        >
          平铺列表
        </button>
      </div>
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
        <div class="field">
          <label class="field-label" for="u-school">所属学校（学生/教师必填）</label>
          <select id="u-school" v-model="form.schoolId" class="input">
            <option value="">暂不设置</option>
            <option v-for="s in schools" :key="s.id" :value="s.id">
              {{ s.name }}<template v-if="s.region">（{{ s.region }}）</template>
            </option>
          </select>
          <p class="text-xs text-faint">决定资源「仅本校可见」范围与教师的任命归属。</p>
        </div>
      </div>

      <div v-if="createError" class="alert alert-warning note">{{ createError }}</div>
      <button class="btn btn-primary btn-block note" type="button" :disabled="creating" @click="create">
        {{ creating ? '创建中…' : '创建账号' }}
      </button>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <!-- ================= 分层视图 ================= -->
    <template v-if="view === 'hierarchy'">
      <section class="card">
        <div class="row wrap">
          <h2 class="section-title">组织总览</h2>
          <div class="spacer" />
          <button class="btn btn-sm" type="button" :disabled="treeLoading" @click="loadTree">刷新</button>
        </div>

        <p v-if="treeLoading" class="text-sm text-soft note">加载中…</p>
        <template v-else-if="tree">
          <div class="stats note">
            <span class="stat"><b>{{ tree.totals.schools }}</b> 学校</span>
            <span class="stat"><b>{{ tree.totals.grades }}</b> 年级</span>
            <span class="stat"><b>{{ tree.totals.classes }}</b> 班级</span>
            <span class="stat"><b>{{ tree.totals.students }}</b> 学生</span>
            <span class="stat"><b>{{ tree.totals.parents }}</b> 家长</span>
            <span class="stat"><b>{{ tree.totals.teachers }}</b> 教师</span>
          </div>

          <div class="field note">
            <label class="field-label" for="u-search">搜索姓名 / 账号 / 手机号</label>
            <input
              id="u-search"
              v-model="keyword"
              class="input"
              type="text"
              placeholder="输入关键词，自动展开命中的班级"
            />
            <p v-if="kw" class="text-xs text-faint">命中 {{ matchCount }} 人</p>
          </div>
        </template>
      </section>

      <section v-if="filteredTree && filteredTree.schools.length === 0" class="card">
        <p class="empty">没有匹配的学校 / 班级 / 人员。</p>
      </section>

      <!-- 学校 -->
      <section v-for="s in filteredTree?.schools ?? []" :key="s.id" class="card school-card">
        <button class="layer-head school-head" type="button" @click="toggleSchool(s.id)">
          <span class="caret">{{ isOpen(openSchools, s.id) ? '▾' : '▸' }}</span>
          <span class="layer-title">{{ s.name }}</span>
          <span class="badge">{{ s.gradeCount }} 年级</span>
          <span class="badge">{{ s.totals.classes }} 班级</span>
          <span class="badge badge-primary">{{ s.totals.students }} 学生</span>
          <span class="badge">{{ s.totals.parents }} 家长</span>
          <span class="badge">{{ s.totals.teachers }} 教师</span>
        </button>

        <div v-if="isOpen(openSchools, s.id)" class="layer-body">
          <!-- 年级 -->
          <div v-for="g in s.grades" :key="g.id" class="grade-block">
            <button class="layer-head grade-head" type="button" @click="toggleGrade(g.id)">
              <span class="caret">{{ isOpen(openGrades, g.id) ? '▾' : '▸' }}</span>
              <span class="layer-title">{{ g.name }}</span>
              <span class="badge">{{ g.classCount }} 个班级</span>
            </button>

            <div v-if="isOpen(openGrades, g.id)" class="layer-body">
              <!-- 班级 -->
              <div v-for="c in g.classes" :key="c.id" class="class-card">
                <button class="layer-head class-head" type="button" @click="toggleClass(c.id)">
                  <span class="caret">{{ isOpen(openClasses, c.id) ? '▾' : '▸' }}</span>
                  <span class="layer-title">{{ c.name }}</span>
                  <span class="badge">{{ c.students.length }} 学生</span>
                  <span class="badge">{{ c.parents.length }} 家长</span>
                  <span class="badge">{{ c.teachers.length }} 教师</span>
                  <span class="text-xs text-faint mono code">{{ c.inviteCode }}</span>
                </button>

                <div v-if="isOpen(openClasses, c.id)" class="identity-grid">
                  <div class="identity">
                    <p class="identity-title">学生 <span class="count">{{ c.students.length }}</span></p>
                    <p v-if="c.students.length === 0" class="text-xs text-faint">暂无</p>
                    <div v-for="p in c.students" :key="p.id" class="person">
                      <span class="person-name">{{ p.name }}</span>
                      <span class="person-meta mono">{{ p.username }}</span>
                      <span v-if="p.phone" class="person-meta">{{ p.phone }}</span>
                    </div>
                  </div>

                  <div class="identity">
                    <p class="identity-title">家长 <span class="count">{{ c.parents.length }}</span></p>
                    <p v-if="c.parents.length === 0" class="text-xs text-faint">暂无</p>
                    <div v-for="p in c.parents" :key="`p-${p.id}`" class="person">
                      <span class="person-name">{{ p.name }}</span>
                      <span class="person-meta mono">{{ p.username }}</span>
                      <span v-if="p.extra" class="person-meta">{{ p.extra }}</span>
                    </div>
                  </div>

                  <div class="identity">
                    <p class="identity-title">教师 <span class="count">{{ c.teachers.length }}</span></p>
                    <p v-if="c.teachers.length === 0" class="text-xs text-faint">暂无</p>
                    <div v-for="p in c.teachers" :key="`t-${p.id}`" class="person">
                      <span class="person-name">{{ p.name }}</span>
                      <span class="person-meta mono">{{ p.username }}</span>
                      <span v-if="p.extra" class="badge badge-primary">{{ p.extra }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <p v-if="g.classes.length === 0" class="text-xs text-faint">
                该年级还没有班级（由年级管理员在「班级管理」中创建）。
              </p>

              <!-- 年级未入班 -->
              <div v-if="bucketSize(g.unassigned) > 0" class="unassigned">
                <p class="text-xs text-soft">未入班 · {{ g.name }}</p>
                <div class="person-wrap">
                  <span v-for="p in g.unassigned.students" :key="`gs-${p.id}`" class="chip">
                    学生 · {{ p.name }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 学校级未分配 -->
          <div v-if="bucketSize(s.unassigned) > 0" class="unassigned">
            <p class="text-xs text-soft">未分配（未入班学生 / 未带班教师 / 未绑定孩子的家长）</p>
            <div class="person-wrap">
              <span v-for="p in s.unassigned.students" :key="`ss-${p.id}`" class="chip">
                学生 · {{ p.name }} <span class="mono">{{ p.username }}</span>
              </span>
              <span v-for="p in s.unassigned.teachers" :key="`st-${p.id}`" class="chip">
                教师 · {{ p.name }}
                <span v-if="p.extra" class="text-faint">（{{ p.extra }}）</span>
              </span>
              <span v-for="p in s.unassigned.parents" :key="`sp-${p.id}`" class="chip">
                家长 · {{ p.name }}
                <span class="text-faint">（{{ p.extra }}）</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 未归属学校 -->
      <section v-if="filteredTree && bucketSize(filteredTree.unassigned) > 0" class="card">
        <h2 class="section-title">
          未归属学校（{{ bucketSize(filteredTree.unassigned) }}）
        </h2>
        <p class="text-xs text-faint">
          这些账号缺少学校信息，无法参与管理员任命与班级，建议尽快补全所属学校。
        </p>
        <div class="person-wrap note">
          <span v-for="p in filteredTree.unassigned.students" :key="`us-${p.id}`" class="chip">
            学生 · {{ p.name }} <span class="mono">{{ p.username }}</span>
          </span>
          <span v-for="p in filteredTree.unassigned.teachers" :key="`ut-${p.id}`" class="chip">
            教师 · {{ p.name }}
            <span v-if="p.extra" class="text-faint">（{{ p.extra }}）</span>
          </span>
          <span v-for="p in filteredTree.unassigned.parents" :key="`up-${p.id}`" class="chip">
            家长 · {{ p.name }}
          </span>
        </div>
      </section>

      <!-- 平台管理员 -->
      <section v-if="filteredTree && filteredTree.platformAdmins.length > 0" class="card">
        <h2 class="section-title">平台管理员（不属于任何学校）</h2>
        <div class="person-wrap note">
          <span v-for="p in filteredTree.platformAdmins.filter(hit)" :key="p.id" class="chip">
            {{ p.name }} <span class="mono">{{ p.username }}</span>
          </span>
        </div>
      </section>
    </template>

    <!-- ================= 平铺列表 ================= -->
    <section v-else class="card">
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
              · {{ schoolName(u.schoolId) }} · 创建于 {{ formatTime(u.createdAt) }}
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

/* ---------- 统计 ---------- */
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stat {
  padding: 4px 10px;
  font-size: 13px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  color: var(--c-text-soft);
}

.stat b {
  color: var(--c-text);
}

/* ---------- 层级 ---------- */
.school-card {
  padding-bottom: 6px;
}

.layer-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.caret {
  width: 14px;
  color: var(--c-text-soft);
  font-size: 12px;
}

.layer-title {
  font-weight: 600;
}

.school-head .layer-title {
  font-size: 16px;
}

.grade-head {
  margin-top: 4px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
}

.grade-head .layer-title {
  font-size: 14px;
}

.layer-body {
  padding-left: 12px;
  border-left: 2px dashed var(--c-border);
  margin: 4px 0 6px 8px;
}

/* ---------- 班级 ---------- */
.class-card {
  margin-top: 6px;
}

.class-head {
  background: #fff;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
}

.class-head .layer-title {
  font-size: 14px;
}

.code {
  margin-left: auto;
}

.identity-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin: 6px 0 2px 20px;
}

@media (min-width: 720px) {
  .identity-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.identity {
  padding: 8px 10px;
  background: #fdfaf3;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.identity-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-soft);
  margin-bottom: 4px;
}

.count {
  display: inline-block;
  min-width: 18px;
  padding: 0 5px;
  margin-left: 2px;
  font-size: 11px;
  text-align: center;
  color: #fff;
  background: var(--c-primary);
  border-radius: 999px;
}

.person {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 13px;
  border-top: 1px dashed var(--c-border);
}

.person:first-of-type {
  border-top: none;
}

.person-name {
  font-weight: 500;
}

.person-meta {
  font-size: 11px;
  color: var(--c-text-faint);
}

/* ---------- 未分配 ---------- */
.unassigned {
  margin: 8px 0 4px 20px;
  padding: 8px 10px;
  background: #fbf7ef;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-sm);
}

.person-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  font-size: 12px;
  background: #fff;
  border: 1px solid var(--c-border);
  border-radius: 999px;
}

/* ---------- 平铺列表 ---------- */
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
