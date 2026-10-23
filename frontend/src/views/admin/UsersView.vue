<script setup lang="ts">
import { UserRole } from '@teachstudy/shared';
import { computed, onMounted, reactive, ref } from 'vue';
import {
  usersApi,
  type HierarchyBucket,
  type HierarchyPerson,
  type HierarchyResult,
  type HierarchySchool,
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

/** 通用文本命中：任一字段包含关键词即命中 */
function textHit(...parts: Array<string | null | undefined>): boolean {
  if (!kw.value) return true;
  return parts
    .filter((x): x is string => Boolean(x))
    .join('')
    .toLowerCase()
    .includes(kw.value);
}

function hit(p: HierarchyPerson): boolean {
  return textHit(p.name, p.username, p.phone, p.extra);
}

/** 学校命中：学校名或所在地区（如「会泽」）命中 */
function schoolHit(s: HierarchySchool): boolean {
  return textHit(s.name, s.region);
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

/**
 * 有关键词时的过滤规则（由粗到细）：
 *  - 学校名 / 地区命中 → 整所学校全部保留（按学校搜人）
 *  - 年级名命中 → 整个年级全部保留
 *  - 班级名命中 → 整个班级全部保留
 *  - 否则按人员姓名 / 账号 / 手机号 / 岗位说明匹配
 */
const filteredTree = computed<HierarchyResult | null>(() => {
  const t = tree.value;
  if (!t || !kw.value) return t;

  const schools = t.schools
    .map((s) => {
      if (schoolHit(s)) return s;

      const grades = s.grades
        .map((g) => {
          if (textHit(g.name)) return g;

          const classes = g.classes
            .map((c) => (textHit(c.name) ? c : { ...c, ...filterBucket(c) }))
            .filter((c) => bucketSize(c) > 0);
          return { ...g, classes, unassigned: filterBucket(g.unassigned) };
        })
        .filter((g) => g.classes.length > 0 || bucketSize(g.unassigned) > 0);

      return { ...s, grades, unassigned: filterBucket(s.unassigned) };
    })
    .filter((s) => schoolHit(s) || s.grades.length > 0 || bucketSize(s.unassigned) > 0);

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

/** 按学校名命中的学校数（用于提示「命中 N 人 · M 所学校」） */
const schoolMatches = computed(() => {
  const t = filteredTree.value;
  if (!t || !kw.value) return 0;
  return t.schools.filter((s) => schoolHit(s)).length;
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

/* ---------- 人员管理面板（平台管理员可管理所有人员） ---------- */

const GRADES12 = [
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '七年级', '八年级', '九年级', '高一', '高二', '高三',
];
const EDIT_ROLES = [UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT];

const editing = ref<HierarchyPerson | null>(null);
const editForm = reactive({ name: '', phone: '', schoolId: '', role: '', grade: '' });
const savingEdit = ref(false);
const editError = ref('');
const editTip = ref('');
const tempPassword = ref('');

function openUser(p: HierarchyPerson): void {
  editing.value = p;
  editForm.name = p.name ?? '';
  editForm.phone = '';
  editForm.schoolId = p.schoolId ?? '';
  editForm.role = p.role;
  editForm.grade = p.grade ?? '';
  editError.value = '';
  editTip.value = '';
  tempPassword.value = '';
}

function closeUser(): void {
  editing.value = null;
}

async function saveUser(): Promise<void> {
  const p = editing.value;
  if (!p) return;
  editError.value = '';
  editTip.value = '';
  savingEdit.value = true;
  try {
    const body: { name?: string; phone?: string; schoolId?: string; role?: UserRole } = {};
    if (editForm.name.trim() !== (p.name ?? '')) body.name = editForm.name.trim();
    if (editForm.phone.trim()) body.phone = editForm.phone.trim();
    if (editForm.schoolId !== (p.schoolId ?? '')) body.schoolId = editForm.schoolId;
    if (editForm.role !== p.role) body.role = editForm.role as UserRole;

    if (Object.keys(body).length > 0) await usersApi.adminUpdate(p.id, body);

    // 学生档案（学校 / 年级）单独接口
    if (p.role === 'student' && editForm.grade && editForm.grade !== (p.grade ?? '')) {
      await usersApi.adminStudentProfile(p.id, {
        schoolId: editForm.schoolId || undefined,
        grade: editForm.grade,
      });
    }

    editTip.value = '已保存';
    await Promise.all([loadTree(), load()]);
    editing.value = {
      ...p,
      name: editForm.name.trim() || p.name,
      schoolId: editForm.schoolId || null,
      role: editForm.role,
      grade: editForm.grade || null,
    };
    editForm.phone = '';
  } catch (err) {
    editError.value = (err as Error).message;
  } finally {
    savingEdit.value = false;
  }
}

async function resetPassword(): Promise<void> {
  const p = editing.value;
  if (!p) return;
  if (!window.confirm(`确定重置「${p.name}」的密码？将生成临时密码，只显示这一次。`)) return;
  editError.value = '';
  editTip.value = '';
  try {
    const res = await usersApi.adminResetPassword(p.id);
    tempPassword.value = res.password;
    editTip.value = '密码已重置，请把新密码当面告知本人';
  } catch (err) {
    editError.value = (err as Error).message;
  }
}

async function toggleStatus(): Promise<void> {
  const p = editing.value;
  if (!p) return;
  const next = p.status === 'disabled' ? 'active' : 'disabled';
  const verb = next === 'disabled' ? '停用' : '启用';
  if (!window.confirm(`确定${verb}「${p.name}」的账号？`)) return;
  editError.value = '';
  editTip.value = '';
  try {
    await usersApi.adminSetStatus(p.id, next);
    editing.value = { ...p, status: next };
    editTip.value = next === 'disabled' ? '已停用：该账号立即无法登录' : '已启用：可以正常登录了';
    await Promise.all([loadTree(), load()]);
  } catch (err) {
    editError.value = (err as Error).message;
  }
}

async function deleteUser(): Promise<void> {
  const p = editing.value;
  if (!p) return;
  if (
    !window.confirm(
      `确定删除「${p.name}（${p.username}）」？会级联删除其聊天、作业提交、绑定关系等个人数据，不可恢复。`,
    )
  ) {
    return;
  }
  editError.value = '';
  try {
    await usersApi.adminDelete(p.id);
    editing.value = null;
    await Promise.all([loadTree(), load()]);
  } catch (err) {
    editError.value = (err as Error).message;
  }
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
            <label class="field-label" for="u-search">搜索姓名 / 账号 / 手机号 / 学校</label>
            <input
              id="u-search"
              v-model="keyword"
              class="input"
              type="text"
              placeholder="输入姓名、账号、手机号，或学校名（如「会泽县第一中学」「会泽」）"
            />
            <p v-if="kw" class="text-xs text-faint">
              命中 {{ matchCount }} 人<template v-if="schoolMatches > 0"> · {{ schoolMatches }} 所学校</template>
            </p>
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
          <span v-if="s.region" class="badge">{{ s.region }}</span>
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
                    <button
                      v-for="p in c.students"
                      :key="p.id"
                      class="person person-btn"
                      type="button"
                      title="点击管理该学生"
                      @click="openUser(p)"
                    >
                      <span class="person-name">{{ p.name }}</span>
                      <span class="person-meta mono">{{ p.username }}</span>
                      <span v-if="p.phone" class="person-meta">{{ p.phone }}</span>
                      <span v-if="p.status === 'disabled'" class="badge badge-danger">已停用</span>
                    </button>
                  </div>

                  <div class="identity">
                    <p class="identity-title">家长 <span class="count">{{ c.parents.length }}</span></p>
                    <p v-if="c.parents.length === 0" class="text-xs text-faint">暂无</p>
                    <button
                      v-for="p in c.parents"
                      :key="`p-${p.id}`"
                      class="person person-btn"
                      type="button"
                      title="点击管理该家长"
                      @click="openUser(p)"
                    >
                      <span class="person-name">{{ p.name }}</span>
                      <span class="person-meta mono">{{ p.username }}</span>
                      <span v-if="p.extra" class="person-meta">{{ p.extra }}</span>
                      <span v-if="p.status === 'disabled'" class="badge badge-danger">已停用</span>
                    </button>
                  </div>

                  <div class="identity">
                    <p class="identity-title">教师 <span class="count">{{ c.teachers.length }}</span></p>
                    <p v-if="c.teachers.length === 0" class="text-xs text-faint">暂无</p>
                    <button
                      v-for="p in c.teachers"
                      :key="`t-${p.id}`"
                      class="person person-btn"
                      type="button"
                      title="点击管理该教师"
                      @click="openUser(p)"
                    >
                      <span class="person-name">{{ p.name }}</span>
                      <span class="person-meta mono">{{ p.username }}</span>
                      <span v-if="p.extra" class="badge badge-primary">{{ p.extra }}</span>
                      <span v-if="p.status === 'disabled'" class="badge badge-danger">已停用</span>
                    </button>
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
      <p class="text-xs text-faint note">
        平铺列表按页显示全部账号；需要按学校 / 年级 / 班级筛选，请切换到「分层视图」。
      </p>

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

    <!-- ================= 人员管理面板 ================= -->
    <div v-if="editing" class="modal-mask" @click.self="closeUser">
      <section class="modal-card stack">
        <div class="row wrap">
          <h2 class="section-title">{{ editing.name }}</h2>
          <span class="badge mono">{{ editing.username }}</span>
          <span
            class="badge"
            :class="editing.status === 'disabled' ? 'badge-danger' : 'badge-success'"
          >
            {{ editing.status === 'disabled' ? '已停用' : '正常' }}
          </span>
          <div class="spacer" />
          <button class="btn btn-sm" type="button" @click="closeUser">关闭</button>
        </div>

        <p class="text-xs text-faint">
          {{ roleLabel(editing.role) }}<template v-if="editing.extra"> · {{ editing.extra }}</template>
        </p>

        <div v-if="editError" class="alert alert-danger">{{ editError }}</div>
        <div v-if="editTip" class="alert alert-success">{{ editTip }}</div>

        <div class="field">
          <label class="field-label" for="ed-name">姓名</label>
          <input id="ed-name" v-model="editForm.name" class="input" type="text" maxlength="64" />
        </div>

        <div class="field">
          <label class="field-label" for="ed-phone">手机号</label>
          <input
            id="ed-phone"
            v-model="editForm.phone"
            class="input"
            type="text"
            maxlength="11"
            :placeholder="`当前 ${editing.phone || '未绑定'}；留空表示不修改`"
          />
          <p class="text-xs text-faint">加密存储；填写新号会校验是否已被占用。</p>
        </div>

        <div class="field">
          <label class="field-label" for="ed-school">所属学校</label>
          <select id="ed-school" v-model="editForm.schoolId" class="input">
            <option value="">未设置</option>
            <option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>

        <div class="field">
          <label class="field-label" for="ed-role">身份</label>
          <select id="ed-role" v-model="editForm.role" class="input" :disabled="editing.role === 'admin'">
            <option v-for="r in EDIT_ROLES" :key="r" :value="r">{{ roleLabel(r) }}</option>
          </select>
          <p class="text-xs text-faint">
            有管理岗位的账号需先卸任才能改身份；平台管理员身份不可修改。
          </p>
        </div>

        <div v-if="editing.role === 'student'" class="field">
          <label class="field-label" for="ed-grade">年级</label>
          <select id="ed-grade" v-model="editForm.grade" class="input">
            <option value="">未设置</option>
            <option v-for="g in GRADES12" :key="g" :value="g">{{ g }}</option>
          </select>
          <p class="text-xs text-faint">
            改年级或学校会自动退出原班级，需由学生重新申请入班（避免绕过班级准入）。
          </p>
        </div>

        <div class="row wrap note">
          <button class="btn btn-primary" type="button" :disabled="savingEdit" @click="saveUser">
            {{ savingEdit ? '保存中…' : '保存修改' }}
          </button>
          <button class="btn" type="button" @click="resetPassword">重置密码</button>
          <button class="btn" type="button" @click="toggleStatus">
            {{ editing.status === 'disabled' ? '启用账号' : '停用账号' }}
          </button>
          <div class="spacer" />
          <button class="btn btn-danger" type="button" @click="deleteUser">删除账号</button>
        </div>

        <div v-if="tempPassword" class="alert alert-info">
          临时密码：<span class="mono">{{ tempPassword }}</span>
          <p class="text-xs">只显示这一次，请当面告知本人并提醒尽快修改。</p>
        </div>
      </section>
    </div>
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
  background: var(--c-surface-warm);
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
  background: var(--c-surface-warm);
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
  background: var(--c-surface);
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
  background: var(--c-surface);
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
  background: var(--c-surface-warm);
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
/* ---------- 可点击的人员 ---------- */
.person-btn {
  width: 100%;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
  border-radius: var(--radius-sm);
}

.person-btn:hover {
  background: var(--c-surface);
}

/* ---------- 人员管理面板 ---------- */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 14px 40px;
  background: rgba(31, 26, 18, 0.38);
  overflow: auto;
}

.modal-card {
  width: 100%;
  max-width: 520px;
  padding: 16px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 12px;
}

.btn-danger {
  color: var(--c-danger);
  border-color: var(--c-danger-border);
  background: var(--c-danger-soft);
}
</style>
