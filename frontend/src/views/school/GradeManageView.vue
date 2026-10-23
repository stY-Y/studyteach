<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { orgApi, type GradeRow, type NoticeRow, type TeacherCandidate } from '../../api/org';
import { usersApi } from '../../api/users';
import { STAFF_LABELS, hasStaff } from '../../config/staff';
import { useAuthStore } from '../../stores/auth';
import { StaffRole, UserRole } from '@teachstudy/shared';
import NoPermissionCard from '../../components/NoPermissionCard.vue';

const auth = useAuthStore();

/** 年级管理需要「学校管理员」岗位（平台管理员可视同具备） */
const allowed = computed(
  () => auth.user?.role === UserRole.ADMIN || hasStaff(auth.user, StaffRole.SCHOOL_ADMIN),
);

const grades = ref<GradeRow[]>([]);
const teachers = ref<TeacherCandidate[]>([]);
const sent = ref<NoticeRow[]>([]);
const loading = ref(true);
const error = ref('');
const tip = ref('');
const acting = ref('');

/** 年级设置：勾选本校实际开设的年级，保存后自动增删 */
const GRADES = [
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '七年级', '八年级', '九年级', '高一', '高二', '高三',
];

/** 常见学段组合，一键套用 */
const PRESETS: Array<{ key: string; label: string; names: string[] }> = [
  { key: 'primary', label: '小学（6 个年级）', names: GRADES.slice(0, 6) },
  { key: 'junior', label: '初中（3 个年级）', names: GRADES.slice(6, 9) },
  { key: 'senior', label: '高中（3 个年级）', names: GRADES.slice(9, 12) },
  { key: 'nine', label: '九年一贯制（9 个）', names: GRADES.slice(0, 9) },
  { key: 'complete', label: '完全中学（6 个）', names: GRADES.slice(6, 12) },
  { key: 'twelve', label: '十二年一贯制（12 个）', names: [...GRADES] },
];

const selected = ref<string[]>([]);
const saving = ref(false);
const canConfigure = computed(() => Boolean(auth.user?.schoolId));
const pick = reactive<Record<string, string>>({});

/** 通知：学校管理员 → 年级管理员 */
const notice = reactive({ gradeId: '', title: '', content: '' });
const sending = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const [g, t, s] = await Promise.all([orgApi.grades(), orgApi.teachers(), orgApi.sent()]);
    grades.value = g;
    teachers.value = t;
    sent.value = s;
    // 勾选状态跟随服务端实际年级，避免本地与服务端不一致
    selected.value = g.map((x) => x.name).sort((a, b) => GRADES.indexOf(a) - GRADES.indexOf(b));
    if (!notice.gradeId && g.length > 0) notice.gradeId = g[0].id;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

function candidatesOf(grade: GradeRow): TeacherCandidate[] {
  const taken = new Set(grade.admins.map((a) => a.userId));
  return teachers.value.filter((t) => !taken.has(t.id));
}

function roleText(roles: string[]): string {
  if (!roles || roles.length === 0) return '';
  return roles.map((r) => STAFF_LABELS[r as StaffRole] ?? r).join(' · ');
}

function toggleGradeName(name: string): void {
  const i = selected.value.indexOf(name);
  if (i >= 0) selected.value.splice(i, 1);
  else selected.value.push(name);
}

function applyPreset(names: string[]): void {
  error.value = '';
  tip.value = '';
  selected.value = [...names];
}

function isPresetActive(names: string[]): boolean {
  if (names.length !== selected.value.length) return false;
  return names.every((n) => selected.value.includes(n));
}

/* ---------- 年级批量升级 ---------- */
const promoteGrade = ref('');
const promoting = ref(false);
const promoteConfirm = ref('');
const GRADES_UPGRADABLE = GRADES.slice(0, -1); // 最高年级（高三）不可升级

async function doPromote(): Promise<void> {
  error.value = '';
  tip.value = '';
  const from = promoteGrade.value;
  if (!from) {
    error.value = '请选择要升级的年级';
    return;
  }
  if (promoteConfirm.value.trim() !== '确认升级') {
    error.value = '请输入「确认升级」以继续（此操作不可撤销）';
    return;
  }
  promoting.value = true;
  try {
    const schoolId = auth.user?.schoolId ?? '';
    const res = await usersApi.promoteGrade({ schoolId, grade: from });
    tip.value = res.promoted > 0
      ? `已将 ${res.promoted} 名学生从「${res.from}」升至「${res.to}」，需重新申请班级`
      : `「${from}」下暂无学生，无需升级`;
    promoteGrade.value = '';
    promoteConfirm.value = '';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    promoting.value = false;
  }
}

/** 保存年级设置：新增缺少的、删除多余的（有班级/学生的年级后端会拒绝） */
async function saveGrades(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (selected.value.length === 0) {
    error.value = '请至少保留一个年级';
    return;
  }
  saving.value = true;
  try {
    const res = await orgApi.configureGrades(selected.value);
    tip.value = `已保存：共 ${res.total} 个年级（新增 ${res.added}，移除 ${res.removed}）`;
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}

async function removeGrade(grade: GradeRow): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = grade.id;
  try {
    await orgApi.deleteGrade(grade.id);
    tip.value = `已删除「${grade.name}」`;
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function appoint(grade: GradeRow): Promise<void> {
  error.value = '';
  tip.value = '';
  const userId = pick[grade.id];
  if (!userId) {
    error.value = '请先选择要任命的教师';
    return;
  }
  acting.value = grade.id;
  try {
    await orgApi.appointGradeAdmin(grade.id, userId);
    const name = teachers.value.find((t) => t.id === userId)?.name ?? '该教师';
    pick[grade.id] = '';
    tip.value = `已任命 ${name} 为${grade.name}年级管理员`;
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function dismiss(grade: GradeRow, userId: string): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = grade.id;
  try {
    await orgApi.dismissGradeAdmin(grade.id, userId);
    tip.value = '已卸任该年级管理员';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function sendNotice(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!notice.gradeId) {
    error.value = '请选择要通知的年级';
    return;
  }
  if (!notice.title.trim() || !notice.content.trim()) {
    error.value = '请填写通知标题与内容';
    return;
  }
  sending.value = true;
  try {
    await orgApi.createNotice({
      toRole: 'grade_admin',
      gradeId: notice.gradeId,
      title: notice.title.trim(),
      content: notice.content.trim(),
    });
    tip.value = '通知已下发给该年级管理员';
    notice.title = '';
    notice.content = '';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  if (allowed.value) void load();
});
</script>

<template>
  <div v-if="allowed" class="stack">
    <h1 class="page-title">年级管理</h1>
    <p class="text-soft text-sm">
      学校下设 12 个年级（小学 6 + 初中 3 + 高中 3）。年级管理员同样是<b>任命</b>制：
      从本校教师中选择并任命，每个年级最多 <b>2</b> 名；班级管理员由年级管理员继续任命。
    </p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-info">{{ tip }}</div>

    <section class="card stack">
      <div class="row wrap">
        <h2 class="section-title">年级设置</h2>
        <span class="badge badge-primary">当前 {{ grades.length }} 个年级</span>
      </div>
      <p class="text-xs text-faint">
        按本校实际学段勾选年级：小学只有 6 个、初中 3 个、高中 3 个；保存后自动新增缺少的、移除多余的。
        已有班级或学生的年级不会被移除（会提示先处理）。
      </p>

      <template v-if="canConfigure">
        <div class="chips">
          <button
            v-for="p in PRESETS"
            :key="p.key"
            class="chip"
            :class="{ active: isPresetActive(p.names) }"
            type="button"
            @click="applyPreset(p.names)"
          >
            {{ p.label }}
          </button>
        </div>
        <div class="chips">
          <button
            v-for="g in GRADES"
            :key="g"
            class="chip"
            :class="{ active: selected.includes(g) }"
            type="button"
            @click="toggleGradeName(g)"
          >
            {{ g }}
          </button>
        </div>
        <button class="btn btn-primary self-start" type="button" :disabled="saving" @click="saveGrades">
          {{ saving ? '保存中…' : `保存年级设置（${selected.length} 个）` }}
        </button>
      </template>
      <p v-else class="alert alert-info">
        年级设置由学校管理员按本校学段配置；平台管理员可查看各校年级，但需用对应学校管理员账号修改。
      </p>
    </section>

    <section class="card stack">
      <h2 class="section-title">年级列表（{{ grades.length }}）</h2>
      <p v-if="loading" class="text-sm text-soft">加载中…</p>
      <p v-else-if="grades.length === 0" class="empty">还没有年级。</p>

      <div v-for="g in grades" :key="g.id" class="grade-block">
        <div class="row-item">
          <div class="grow">
            <p class="item-title">{{ g.name }}</p>
            <p class="text-xs text-faint">{{ g.classCount }} 个班级</p>
          </div>
          <button class="btn btn-sm" type="button" :disabled="acting === g.id" @click="removeGrade(g)">
            删除
          </button>
        </div>

        <div class="admins">
          <span class="text-xs text-soft">年级管理员（{{ g.admins.length }}/{{ g.adminLimit }}）：</span>
          <span v-if="g.admins.length === 0" class="text-xs text-faint">尚未任命</span>
          <span v-for="a in g.admins" :key="a.appointmentId" class="admin-chip">
            {{ a.name || a.username }}
            <button type="button" class="chip-x" title="卸任" @click="dismiss(g, a.userId)">×</button>
          </span>
        </div>

        <div v-if="g.admins.length < g.adminLimit" class="inline-form tight">
          <select v-model="pick[g.id]" class="input">
            <option value="">选择教师…</option>
            <option v-for="t in candidatesOf(g)" :key="t.id" :value="t.id">
              {{ t.name }}（{{ t.username }}{{ t.schoolId ? '' : ' · 未归属学校' }}）
              {{ roleText(t.roles) ? ' · 已是' + roleText(t.roles) : '' }}
            </option>
          </select>
          <button class="btn btn-sm btn-primary" type="button" :disabled="acting === g.id" @click="appoint(g)">
            任命
          </button>
        </div>
        <p v-else class="text-xs text-faint note">
          已满 {{ g.adminLimit }} 名，需先卸任一位才能任命新的年级管理员。
        </p>
      </div>
    </section>

    <section v-if="canConfigure" class="card stack">
      <div class="row wrap">
        <h2 class="section-title">年级升级（开学季批量升一级）</h2>
        <span class="badge badge-warning">需二次确认</span>
      </div>
      <p class="text-xs text-faint">
        把某个年级的所有学生升到下一级。升级后学生<b>自动退出原班级</b>，需重新申请新年级的班级；
        最高年级（高三）不可升级。
      </p>
      <div class="inline-form">
        <select v-model="promoteGrade" class="input">
          <option value="">选择要升级的年级…</option>
          <option v-for="g in GRADES_UPGRADABLE" :key="g" :value="g">{{ g }} → {{ GRADES[GRADES.indexOf(g) + 1] }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="promote-confirm">输入「确认升级」以继续</label>
        <input id="promote-confirm" v-model.trim="promoteConfirm" class="input" type="text" placeholder="确认升级" />
      </div>
      <button class="btn btn-primary self-start" type="button" :disabled="promoting || !promoteGrade" @click="doPromote">
        {{ promoting ? '升级中…' : '执行年级升级' }}
      </button>
    </section>

    <section class="card stack">
      <h2 class="section-title">下发通知给年级管理员</h2>
      <div class="field">
        <label class="field-label" for="nt-grade">目标年级</label>
        <select id="nt-grade" v-model="notice.gradeId" class="input">
          <option v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="nt-title">标题</label>
        <input id="nt-title" v-model.trim="notice.title" class="input" type="text" maxlength="120" placeholder="如：本周教研安排" />
      </div>
      <div class="field">
        <label class="field-label" for="nt-content">内容</label>
        <textarea id="nt-content" v-model.trim="notice.content" class="input" rows="3" maxlength="2000" placeholder="写清时间、地点与要做的事" />
      </div>
      <button class="btn btn-primary self-start" type="button" :disabled="sending" @click="sendNotice">
        {{ sending ? '发送中…' : '发送通知' }}
      </button>

      <div v-if="sent.length > 0" class="stack">
        <p class="text-xs text-soft">我发出的通知（{{ sent.length }}）</p>
        <div v-for="n in sent.slice(0, 5)" :key="n.id" class="sent-item">
          <p class="item-title">{{ n.title }}</p>
          <p class="text-xs text-faint">{{ new Date(n.createdAt).toLocaleString() }}</p>
        </div>
      </div>
    </section>
  </div>
  <NoPermissionCard v-else need="school_admin" />
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.inline-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.inline-form .input {
  flex: 1;
  min-width: 0;
}

.inline-form.tight {
  margin-top: 8px;
}

.self-start {
  align-self: flex-start;
}

.grade-block {
  padding: 10px 0;
  border-top: 1px solid var(--c-border);
}

.grade-block:first-of-type {
  border-top: none;
}

.row-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
}

.admins {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.admin-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  background: var(--c-primary-soft);
  color: var(--c-primary-dark);
  border-radius: 999px;
}

.chip-x {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
}

.note {
  margin-top: 8px;
}

.sent-item {
  padding: 6px 0;
  border-top: 1px dashed var(--c-border);
}
</style>
