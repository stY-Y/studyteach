<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { orgApi, type GradeRow, type OrgClassRow } from '../../api/org';

const grades = ref<GradeRow[]>([]);
const selectedGradeId = ref('');
const classes = ref<OrgClassRow[]>([]);
const loading = ref(true);
const error = ref('');
const tip = ref('');
const acting = ref('');

const form = reactive({ className: '', teacherUsername: '' });
const creating = ref(false);
const teacherInput = reactive<Record<string, string>>({});

const notice = reactive({ classId: '', title: '', content: '' });
const sendingNotice = ref(false);

const currentGrade = computed(
  () => grades.value.find((g) => g.id === selectedGradeId.value) ?? null,
);

async function loadGrades(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    grades.value = await orgApi.grades();
    if (!selectedGradeId.value && grades.value.length > 0) {
      selectedGradeId.value = grades.value[0].id;
    }
    if (selectedGradeId.value) await loadClasses();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function loadClasses(): Promise<void> {
  if (!selectedGradeId.value) return;
  try {
    classes.value = await orgApi.classes(selectedGradeId.value);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function createClass(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!selectedGradeId.value) {
    error.value = '当前账号还未管理任何年级';
    return;
  }
  if (!form.className.trim()) {
    error.value = '请填写班级名';
    return;
  }
  creating.value = true;
  try {
    await orgApi.createClass({
      gradeId: selectedGradeId.value,
      className: form.className.trim(),
      teacherUsername: form.teacherUsername.trim() || undefined,
    });
    tip.value = '班级已创建';
    form.className = '';
    form.teacherUsername = '';
    await loadClasses();
    await loadGrades();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    creating.value = false;
  }
}

async function appointTeacher(item: OrgClassRow): Promise<void> {
  error.value = '';
  tip.value = '';
  const username = (teacherInput[item.id] ?? '').trim();
  if (!username) {
    error.value = '请输入教师账号';
    return;
  }
  acting.value = item.id;
  try {
    await orgApi.updateClass(item.id, { teacherUsername: username });
    teacherInput[item.id] = '';
    tip.value = `已任命 ${username} 为「${item.name}」班主任`;
    await loadClasses();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function dismissTeacher(item: OrgClassRow): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = item.id;
  try {
    await orgApi.updateClass(item.id, { teacherUsername: '' });
    tip.value = '已卸任该班主任';
    await loadClasses();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function removeClass(item: OrgClassRow): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = item.id;
  try {
    await orgApi.deleteClass(item.id);
    tip.value = `已删除「${item.name}」`;
    await loadClasses();
    await loadGrades();
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
  sendingNotice.value = true;
  try {
    await orgApi.createNotice({
      toRole: 'teacher',
      classId: notice.classId,
      title: notice.title.trim(),
      content: notice.content.trim(),
    });
    tip.value = '通知已下发给该班班主任';
    notice.title = '';
    notice.content = '';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    sendingNotice.value = false;
  }
}

watch(selectedGradeId, () => {
  void loadClasses();
});

onMounted(loadGrades);
</script>

<template>
  <div class="stack">
    <h1 class="page-title">班级管理</h1>
    <p class="text-soft text-sm">
      年级管理员负责本年级班级的增删、班主任的任命与卸任，并可向班主任下发通知。
    </p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-info">{{ tip }}</div>

    <div v-if="loading" class="text-soft">加载中…</div>

    <template v-else>
      <section v-if="grades.length === 0" class="card">
        <p class="empty">你还没有被任命为年级管理员，请联系学校管理员。</p>
      </section>

      <template v-else>
        <section v-if="grades.length > 1" class="card">
          <div class="field">
            <label class="field-label" for="cm-grade">选择年级</label>
            <select id="cm-grade" v-model="selectedGradeId" class="input">
              <option v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
        </section>

        <section class="card stack">
          <h2 class="section-title">{{ currentGrade?.name }} · 新增班级</h2>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="cm-name">班级名</label>
              <input id="cm-name" v-model.trim="form.className" class="input" type="text" maxlength="64" placeholder="如：2 班" />
            </div>
            <div class="field">
              <label class="field-label" for="cm-teacher">班主任账号（可选）</label>
              <input id="cm-teacher" v-model.trim="form.teacherUsername" class="input" type="text" placeholder="教师账号，可稍后任命" />
            </div>
          </div>
          <button class="btn btn-primary self-start" type="button" :disabled="creating" @click="createClass">
            {{ creating ? '创建中…' : '创建班级' }}
          </button>
        </section>

        <section class="card stack">
          <h2 class="section-title">本年级班级（{{ classes.length }}）</h2>
          <p v-if="classes.length === 0" class="empty">还没有班级。</p>

          <div v-for="c in classes" :key="c.id" class="class-block">
            <div class="row-item">
              <div class="grow">
                <p class="item-title">{{ c.name }}</p>
                <p class="text-xs text-faint">
                  班主任：{{ c.teacherName || '未任命' }} · 邀请码 <span class="mono">{{ c.inviteCode }}</span>
                </p>
              </div>
              <button v-if="c.teacherName" class="btn btn-sm" type="button" :disabled="acting === c.id" @click="dismissTeacher(c)">
                卸任班主任
              </button>
              <button class="btn btn-sm" type="button" :disabled="acting === c.id" @click="removeClass(c)">
                删除班级
              </button>
            </div>

            <div v-if="!c.teacherName" class="appoint-row">
              <input v-model="teacherInput[c.id]" class="input" type="text" placeholder="输入教师账号，任命为班主任" />
              <button class="btn btn-sm btn-primary" type="button" :disabled="acting === c.id" @click="appointTeacher(c)">
                任命班主任
              </button>
            </div>
          </div>
        </section>

        <section class="card stack">
          <h2 class="section-title">向班主任下发通知</h2>
          <div class="field">
            <label class="field-label" for="cn-class">目标班级</label>
            <select id="cn-class" v-model="notice.classId" class="input">
              <option value="">请选择班级</option>
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}（{{ c.teacherName || '无班主任' }}）</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="cn-title">标题</label>
            <input id="cn-title" v-model.trim="notice.title" class="input" type="text" maxlength="120" placeholder="如：月考安排" />
          </div>
          <div class="field">
            <label class="field-label" for="cn-content">内容</label>
            <textarea id="cn-content" v-model="notice.content" class="input" rows="3" maxlength="2000" placeholder="填写通知内容" />
          </div>
          <button class="btn btn-primary self-start" type="button" :disabled="sendingNotice" @click="sendNotice">
            {{ sendingNotice ? '下发中…' : '下发通知' }}
          </button>
          <p class="text-xs text-faint">班主任登录后可在「通知」中查看，并可转发到班级群。</p>
        </section>
      </template>
    </template>
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

.appoint-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.appoint-row .input {
  flex: 1;
  min-width: 0;
}
</style>
