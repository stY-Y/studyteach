<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  orgApi,
  type GradeRow,
  type NoticeRow,
  type OrgClassRow,
  type TeacherCandidate,
} from '../../api/org';
import { STAFF_LABELS } from '../../config/staff';
import { StaffRole } from '@teachstudy/shared';

const grades = ref<GradeRow[]>([]);
const classes = ref<OrgClassRow[]>([]);
const teachers = ref<TeacherCandidate[]>([]);
const sent = ref<NoticeRow[]>([]);
const gradeId = ref('');
const loading = ref(true);
const error = ref('');
const tip = ref('');
const acting = ref('');

const form = reactive({ className: '', teacherUserId: '' });
const creating = ref(false);
const pick = reactive<Record<string, string>>({});

/** 通知：年级管理员 → 班级管理员 */
const notice = reactive({ classId: '', title: '', content: '' });
const sending = ref(false);

const currentGrade = computed(() => grades.value.find((g) => g.id === gradeId.value) ?? null);

async function loadGrades(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const [g, t, s] = await Promise.all([orgApi.grades(), orgApi.teachers(), orgApi.sent()]);
    grades.value = g;
    teachers.value = t;
    sent.value = s;
    if (!gradeId.value || !g.some((x) => x.id === gradeId.value)) {
      gradeId.value = g[0]?.id ?? '';
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function loadClasses(): Promise<void> {
  if (!gradeId.value) {
    classes.value = [];
    return;
  }
  try {
    classes.value = await orgApi.classes(gradeId.value);
    if (!notice.classId || !classes.value.some((c) => c.id === notice.classId)) {
      notice.classId = classes.value[0]?.id ?? '';
    }
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function candidatesOf(): TeacherCandidate[] {
  return teachers.value;
}

function roleText(roles: string[]): string {
  if (!roles || roles.length === 0) return '';
  return roles.map((r) => STAFF_LABELS[r as StaffRole] ?? r).join(' · ');
}

async function createClass(): Promise<void> {
  error.value = '';
  tip.value = '';
  const className = form.className.trim();
  if (!className) {
    error.value = '请填写班级名，如「2 班」';
    return;
  }
  creating.value = true;
  try {
    await orgApi.createClass({
      gradeId: gradeId.value,
      className,
      teacherUserId: form.teacherUserId || undefined,
    });
    tip.value = `已创建「${currentGrade.value?.name ?? ''} ${className}」`;
    form.className = '';
    form.teacherUserId = '';
    await loadClasses();
    await loadGrades();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    creating.value = false;
  }
}

async function removeClass(room: OrgClassRow): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = room.id;
  try {
    await orgApi.deleteClass(room.id);
    tip.value = `已删除「${room.name}」`;
    await loadClasses();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function appoint(room: OrgClassRow): Promise<void> {
  error.value = '';
  tip.value = '';
  const userId = pick[room.id];
  if (!userId) {
    error.value = '请先选择要任命的教师';
    return;
  }
  acting.value = room.id;
  try {
    await orgApi.appointClassAdmin(room.id, userId);
    const name = teachers.value.find((t) => t.id === userId)?.name ?? '该教师';
    pick[room.id] = '';
    tip.value = `已任命 ${name} 为「${room.name}」班级管理员（班主任）`;
    await loadClasses();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function dismiss(room: OrgClassRow, userId: string): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = room.id;
  try {
    await orgApi.dismissClassAdmin(room.id, userId);
    tip.value = '已卸任该班级管理员';
    await loadClasses();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function sendNotice(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!notice.classId) {
    error.value = '请选择要通知的班级';
    return;
  }
  if (!notice.title.trim() || !notice.content.trim()) {
    error.value = '请填写通知标题与内容';
    return;
  }
  sending.value = true;
  try {
    await orgApi.createNotice({
      toRole: 'class_admin',
      classId: notice.classId,
      title: notice.title.trim(),
      content: notice.content.trim(),
    });
    tip.value = '通知已下发给该班级管理员（班主任）';
    notice.title = '';
    notice.content = '';
    await loadGrades();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    sending.value = false;
  }
}

watch(gradeId, () => {
  void loadClasses();
});

onMounted(async () => {
  await loadGrades();
  await loadClasses();
});
</script>

<template>
  <div class="stack">
    <h1 class="page-title">班级管理</h1>
    <p class="text-soft text-sm">
      建班由<b>年级管理员</b>统一操作。班级管理员即班主任，同样是任命制：
      从教师中选择并任命，每个班级最多 <b>2</b> 名；年级管理员本人也可以被任命为某班班级管理员（兼任）。
    </p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-info">{{ tip }}</div>

    <section v-if="grades.length > 1" class="card">
      <div class="field">
        <label class="field-label" for="cm-grade">管理年级</label>
        <select id="cm-grade" v-model="gradeId" class="input">
          <option v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </div>
    </section>

    <section v-if="!loading && grades.length === 0" class="card">
      <p class="empty">
        你还没有被任命为任何年级的管理员。请让学校管理员在「年级管理」中任命你。
      </p>
    </section>

    <section class="card stack">
      <h2 class="section-title">
        新建班级{{ currentGrade ? ` · ${currentGrade.name}` : '' }}
      </h2>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="cm-name">班级名</label>
          <input id="cm-name" v-model.trim="form.className" class="input" type="text" maxlength="64" placeholder="如 2 班" />
        </div>
        <div class="field">
          <label class="field-label" for="cm-teacher">班级管理员（可选）</label>
          <select id="cm-teacher" v-model="form.teacherUserId" class="input">
            <option value="">稍后任命</option>
            <option v-for="t in candidatesOf()" :key="t.id" :value="t.id">
              {{ t.name }}（{{ t.username }}{{ t.schoolId ? '' : ' · 未归属学校' }}）
            </option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary self-start" type="button" :disabled="creating || !gradeId" @click="createClass">
        {{ creating ? '创建中…' : '创建班级' }}
      </button>
    </section>

    <section class="card stack">
      <h2 class="section-title">班级列表（{{ classes.length }}）</h2>
      <p v-if="loading" class="text-sm text-soft">加载中…</p>
      <p v-else-if="classes.length === 0" class="empty">该年级还没有班级，先建一个。</p>

      <div v-for="c in classes" :key="c.id" class="class-block">
        <div class="row-item">
          <div class="grow">
            <p class="item-title">{{ c.name }}</p>
            <p class="text-xs text-faint">
              邀请码 <span class="mono">{{ c.inviteCode }}</span> · {{ c.studentCount }} 名学生
            </p>
          </div>
          <button class="btn btn-sm" type="button" :disabled="acting === c.id" @click="removeClass(c)">
            删除
          </button>
        </div>

        <div class="admins">
          <span class="text-xs text-soft">班级管理员（{{ c.admins.length }}/{{ c.adminLimit }}）：</span>
          <span v-if="c.admins.length === 0" class="text-xs text-faint">尚未任命</span>
          <span v-for="a in c.admins" :key="a.appointmentId" class="admin-chip">
            {{ a.name || a.username }}
            <button type="button" class="chip-x" title="卸任" @click="dismiss(c, a.userId)">×</button>
          </span>
        </div>

        <div v-if="c.admins.length < c.adminLimit" class="inline-form tight">
          <select v-model="pick[c.id]" class="input">
            <option value="">选择教师…</option>
            <option v-for="t in candidatesOf().filter((x) => !c.admins.some((a) => a.userId === x.id))" :key="t.id" :value="t.id">
              {{ t.name }}（{{ t.username }}{{ t.schoolId ? '' : ' · 未归属学校' }}）
              {{ roleText(t.roles) ? ' · 已是' + roleText(t.roles) : '' }}
            </option>
          </select>
          <button class="btn btn-sm btn-primary" type="button" :disabled="acting === c.id" @click="appoint(c)">
            任命
          </button>
        </div>
        <p v-else class="text-xs text-faint note">
          已满 {{ c.adminLimit }} 名，需先卸任一位才能任命新的班级管理员。
        </p>
      </div>
    </section>

    <section class="card stack">
      <h2 class="section-title">下发通知给班级管理员</h2>
      <div class="field">
        <label class="field-label" for="cn-class">目标班级</label>
        <select id="cn-class" v-model="notice.classId" class="input">
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="cn-title">标题</label>
        <input id="cn-title" v-model.trim="notice.title" class="input" type="text" maxlength="120" placeholder="如：月考安排" />
      </div>
      <div class="field">
        <label class="field-label" for="cn-content">内容</label>
        <textarea id="cn-content" v-model.trim="notice.content" class="input" rows="3" maxlength="2000" placeholder="写清时间与要求，班主任可再转发到班级聊天" />
      </div>
      <button class="btn btn-primary self-start" type="button" :disabled="sending || classes.length === 0" @click="sendNotice">
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
</template>

<style scoped>
.field-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.field-row .field {
  flex: 1;
  min-width: 180px;
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

.class-block {
  padding: 10px 0;
  border-top: 1px solid var(--c-border);
}

.class-block:first-of-type {
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
