<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { orgApi, type GradeRow } from '../../api/org';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const schoolId = computed(() => auth.user?.schoolId ?? '');

const grades = ref<GradeRow[]>([]);
const loading = ref(true);
const error = ref('');
const tip = ref('');
const acting = ref('');

const form = reactive({ name: '' });
const creating = ref(false);
const appointInput = reactive<Record<string, string>>({});

const notice = reactive({ gradeId: '', title: '', content: '' });
const sendingNotice = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    grades.value = await orgApi.grades(schoolId.value || undefined);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function createGrade(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!schoolId.value) {
    error.value = '当前账号未绑定学校，请联系平台管理员';
    return;
  }
  if (!form.name.trim()) {
    error.value = '请填写年级名称';
    return;
  }
  creating.value = true;
  try {
    await orgApi.createGrade({ schoolId: schoolId.value, name: form.name.trim() });
    tip.value = '年级已新增';
    form.name = '';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    creating.value = false;
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
  const username = (appointInput[grade.id] ?? '').trim();
  if (!username) {
    error.value = '请输入教师账号';
    return;
  }
  acting.value = grade.id;
  try {
    await orgApi.appointGradeAdmin(grade.id, username);
    appointInput[grade.id] = '';
    tip.value = `已任命 ${username} 为「${grade.name}」年级管理员`;
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function dismiss(grade: GradeRow): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = grade.id;
  try {
    await orgApi.dismissGradeAdmin(grade.id);
    tip.value = '已卸任该年级管理员（账号恢复为教师）';
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
  sendingNotice.value = true;
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
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    sendingNotice.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="stack">
    <h1 class="page-title">年级管理</h1>
    <p class="text-soft text-sm">
      学校管理员负责本校年级的增删、年级管理员的任命与卸任，并可向年级管理员下发通知。
    </p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-info">{{ tip }}</div>

    <section class="card stack">
      <h2 class="section-title">新增年级</h2>
      <div class="field-row">
        <input v-model.trim="form.name" class="input" type="text" maxlength="32" placeholder="如：八年级" />
        <button class="btn btn-primary" type="button" :disabled="creating" @click="createGrade">
          {{ creating ? '新增中…' : '新增年级' }}
        </button>
      </div>
    </section>

    <section class="card stack">
      <h2 class="section-title">本校年级（{{ grades.length }}）</h2>
      <p v-if="loading" class="text-sm text-soft">加载中…</p>
      <p v-else-if="grades.length === 0" class="empty">还没有年级，先新增一个。</p>

      <div v-for="g in grades" :key="g.id" class="grade-block">
        <div class="row-item">
          <div class="grow">
            <p class="item-title">{{ g.name }}</p>
            <p class="text-xs text-faint">
              年级管理员：{{ g.gradeAdminName || '未任命' }} · 班级 {{ g.classCount }} 个
            </p>
          </div>
          <button v-if="g.gradeAdminId" class="btn btn-sm" type="button" :disabled="acting === g.id" @click="dismiss(g)">
            卸任管理员
          </button>
          <button class="btn btn-sm" type="button" :disabled="acting === g.id" @click="removeGrade(g)">
            删除年级
          </button>
        </div>

        <div v-if="!g.gradeAdminId" class="appoint-row">
          <input v-model="appointInput[g.id]" class="input" type="text" placeholder="输入教师账号，任命为年级管理员" />
          <button class="btn btn-sm btn-primary" type="button" :disabled="acting === g.id" @click="appoint(g)">
            任命
          </button>
        </div>
      </div>
    </section>

    <section class="card stack">
      <h2 class="section-title">向年级管理员下发通知</h2>
      <div class="field">
        <label class="field-label" for="n-grade">目标年级</label>
        <select id="n-grade" v-model="notice.gradeId" class="input">
          <option value="">请选择年级</option>
          <option v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="n-title">标题</label>
        <input id="n-title" v-model.trim="notice.title" class="input" type="text" maxlength="120" placeholder="如：本周教研安排" />
      </div>
      <div class="field">
        <label class="field-label" for="n-content">内容</label>
        <textarea id="n-content" v-model="notice.content" class="input" rows="3" maxlength="2000" placeholder="填写通知内容" />
      </div>
      <button class="btn btn-primary self-start" type="button" :disabled="sendingNotice" @click="sendNotice">
        {{ sendingNotice ? '下发中…' : '下发通知' }}
      </button>
      <p class="text-xs text-faint">年级管理员登录后可在「通知」中查看。</p>
    </section>
  </div>
</template>

<style scoped>
.field-row {
  display: flex;
  gap: 8px;
}

.field-row .input {
  flex: 1;
  min-width: 0;
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
