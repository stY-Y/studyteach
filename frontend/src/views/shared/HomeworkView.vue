<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { QuestionType, UserRole } from '@teachstudy/shared';
import { classesApi, type ClassWithCounts } from '../../api/classes';
import {
  homeworkApi,
  type Homework,
  type HomeworkQuestionInput,
  type HomeworkSubmission,
} from '../../api/homework';
import { questionsApi, type BankQuestion } from '../../api/questions';
import {
  optionLetter,
  questionTypeLabel,
  SUBJECT_OPTIONS,
  STAGE_OPTIONS,
  subjectLabel,
} from '../../config/labels';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();

const isStudent = computed(() => auth.user?.role === UserRole.STUDENT);
const loading = ref(true);
const error = ref('');
const tip = ref('');

// ---------- 学生 ----------
const myHomework = ref<Homework[]>([]);
const active = ref<Homework | null>(null);
const answers = ref<Record<string, string>>({});
const multi = ref<Record<string, string[]>>({});
const submitting = ref(false);

// ---------- 教师 ----------
const classes = ref<ClassWithCounts[]>([]);
const selectedClass = ref('');
const classHomework = ref<Homework[]>([]);
const showForm = ref(false);
const form = reactive({ title: '', description: '', dueAt: '' });
const draftItems = ref<Array<{ input: HomeworkQuestionInput; label: string }>>([]);
const bankQuery = reactive({ subject: '', stage: '' });
const bankList = ref<BankQuestion[]>([]);
const bankLoading = ref(false);
const custom = reactive({
  content: '',
  type: QuestionType.SINGLE_CHOICE as QuestionType,
  options: '',
  answer: '',
  analysis: '',
});
const creating = ref(false);
const viewing = ref<{ homework: Homework; submissions: HomeworkSubmission[] } | null>(null);

const currentClass = computed(
  () => classes.value.find((c) => c.id === selectedClass.value) ?? null,
);

function formatDate(value?: string | null): string {
  if (!value) return '不限';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '不限';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ================= 学生 =================
async function loadStudent(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    myHomework.value = await homeworkApi.mine();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

function openHomework(hw: Homework): void {
  active.value = hw;
  answers.value = {};
  multi.value = {};
  error.value = '';
  tip.value = '';
}

function toggleMulti(key: string, value: string): void {
  const list = multi.value[key] ?? [];
  multi.value[key] = list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

function isChosen(key: string, value: string): boolean {
  return (multi.value[key] ?? []).includes(value);
}

async function submitHomework(): Promise<void> {
  if (!active.value) return;
  const payload: Record<string, string> = { ...answers.value };
  Object.entries(multi.value).forEach(([k, v]) => {
    if (v.length) payload[k] = v.join(',');
  });

  const answered = active.value.questions.filter((q) => Boolean(payload[q.key]?.trim()));
  if (answered.length === 0) {
    error.value = '请至少作答一道题';
    return;
  }

  submitting.value = true;
  error.value = '';
  try {
    const result = await homeworkApi.submit(active.value.id, payload);
    tip.value = result.score === null ? '已提交，老师会尽快批阅' : `已提交，客观题得分 ${result.score} 分`;
    active.value = null;
    await loadStudent();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    submitting.value = false;
  }
}

// ================= 教师 =================
async function loadClasses(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const data = await classesApi.mine();
    classes.value = data.teacher;
    if (classes.value.length > 0) {
      selectedClass.value = classes.value[0].id;
      await loadClassHomework();
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function loadClassHomework(): Promise<void> {
  const c = currentClass.value;
  if (!c) return;
  try {
    classHomework.value = await homeworkApi.list({ classId: c.id });
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function onSwitchClass(): Promise<void> {
  viewing.value = null;
  await loadClassHomework();
}

async function searchBank(): Promise<void> {
  bankLoading.value = true;
  error.value = '';
  try {
    const result = await questionsApi.search({
      subject: (bankQuery.subject || undefined) as never,
      stage: (bankQuery.stage || undefined) as never,
      page: 1,
      pageSize: 20,
    });
    bankList.value = result.list;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    bankLoading.value = false;
  }
}

function addFromBank(q: BankQuestion): void {
  if (draftItems.value.some((d) => d.input.questionId === q.id)) return;
  draftItems.value.push({
    input: { questionId: q.id },
    label: `【题库】${q.content.slice(0, 34)}${q.content.length > 34 ? '…' : ''}`,
  });
}

function addCustom(): void {
  error.value = '';
  const content = custom.content.trim();
  if (!content) {
    error.value = '请填写题干';
    return;
  }
  const options = custom.options
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  if (
    (custom.type === QuestionType.SINGLE_CHOICE ||
      custom.type === QuestionType.MULTIPLE_CHOICE) &&
    options.length < 2
  ) {
    error.value = '选择题至少需要 2 个选项（每行一个）';
    return;
  }

  draftItems.value.push({
    input: {
      content,
      type: custom.type,
      options: options.length ? options : undefined,
      answer: custom.answer.trim() || undefined,
      analysis: custom.analysis.trim() || undefined,
      subject: (bankQuery.subject || undefined) as never,
      stage: (bankQuery.stage || undefined) as never,
    },
    label: `【自建】${content.slice(0, 34)}${content.length > 34 ? '…' : ''}`,
  });

  custom.content = '';
  custom.options = '';
  custom.answer = '';
  custom.analysis = '';
}

function removeDraft(index: number): void {
  draftItems.value.splice(index, 1);
}

async function publish(): Promise<void> {
  error.value = '';
  tip.value = '';
  const c = currentClass.value;
  if (!c) {
    error.value = '请先选择班级';
    return;
  }
  if (!form.title.trim()) {
    error.value = '请填写作业标题';
    return;
  }
  if (draftItems.value.length === 0) {
    error.value = '请至少加入一道题';
    return;
  }

  creating.value = true;
  try {
    await homeworkApi.create({
      classId: c.id,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      questions: draftItems.value.map((d) => d.input),
    });
    tip.value = '作业已发布；自行上传的题目已同步写入题库';
    form.title = '';
    form.description = '';
    form.dueAt = '';
    draftItems.value = [];
    showForm.value = false;
    await loadClassHomework();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    creating.value = false;
  }
}

async function viewSubmissions(hw: Homework): Promise<void> {
  error.value = '';
  try {
    viewing.value = await homeworkApi.submissions(hw.id);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function closeHomework(hw: Homework): Promise<void> {
  try {
    await homeworkApi.close(hw.id);
    await loadClassHomework();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function answerText(sub: HomeworkSubmission, key: string): string {
  return sub.answers[key] ?? '（未作答）';
}

onMounted(() => {
  if (isStudent.value) void loadStudent();
  else void loadClasses();
});
</script>

<template>
  <div class="stack">
    <h1 class="page-title">{{ isStudent ? '我的作业' : '布置作业' }}</h1>
    <p class="text-soft text-sm">
      {{ isStudent
        ? '本班老师布置的作业都在这里，客观题提交后自动判分。'
        : '可按班级布置作业：从题库选题，或自行上传题目（自建题会同步写入题库，持续扩充题量）。' }}
    </p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-info">{{ tip }}</div>

    <!-- ================= 学生 ================= -->
    <template v-if="isStudent">
      <div v-if="loading" class="text-soft">加载中…</div>

      <template v-else>
        <section v-if="myHomework.length === 0" class="card">
          <p class="empty">暂时还没有作业，先把今天的功课复习一遍吧。</p>
        </section>

        <section v-for="hw in myHomework" :key="hw.id" class="card stack">
          <div class="hw-head">
            <h2 class="section-title">{{ hw.title }}</h2>
            <span class="badge" :class="hw.status === 'open' ? 'badge-success' : 'badge-warning'">
              {{ hw.status === 'open' ? '进行中' : '已截止' }}
            </span>
            <span v-if="hw.mySubmission" class="badge badge-primary">
              已提交<template v-if="hw.mySubmission.score !== null"> · {{ hw.mySubmission.score }} 分</template>
            </span>
          </div>
          <p class="text-sm text-soft">
            {{ hw.teacherName || '老师' }} · 共 {{ hw.totalQuestions }} 题 · 截止 {{ formatDate(hw.dueAt) }}
          </p>
          <p v-if="hw.description" class="text-sm">{{ hw.description }}</p>
          <button
            v-if="hw.status === 'open'"
            class="btn btn-primary self-start"
            type="button"
            @click="openHomework(hw)"
          >
            {{ hw.mySubmission ? '重新作答' : '开始作答' }}
          </button>
        </section>
      </template>

      <!-- 答题面板 -->
      <section v-if="active" class="card stack answer-panel">
        <div class="hw-head">
          <h2 class="section-title">{{ active.title }}</h2>
          <button class="btn btn-sm" type="button" @click="active = null">收起</button>
        </div>

        <div v-for="(q, index) in active.questions" :key="q.key" class="question">
          <p class="q-title">{{ index + 1 }}. {{ q.content }}</p>
          <p class="text-xs text-faint">{{ questionTypeLabel(q.type) }}<template v-if="q.subject"> · {{ subjectLabel(q.subject) }}</template></p>

          <!-- 单选 -->
          <template v-if="q.type === QuestionType.SINGLE_CHOICE">
            <label v-for="(opt, oi) in q.options ?? []" :key="oi" class="option">
              <input v-model="answers[q.key]" type="radio" :name="q.key" :value="optionLetter(opt, oi)" />
              <span>{{ optionLetter(opt, oi) }}. {{ opt }}</span>
            </label>
          </template>

          <!-- 多选 -->
          <template v-else-if="q.type === QuestionType.MULTIPLE_CHOICE">
            <label v-for="(opt, oi) in q.options ?? []" :key="oi" class="option">
              <input
                type="checkbox"
                :checked="isChosen(q.key, optionLetter(opt, oi))"
                @change="toggleMulti(q.key, optionLetter(opt, oi))"
              />
              <span>{{ optionLetter(opt, oi) }}. {{ opt }}</span>
            </label>
          </template>

          <!-- 判断 -->
          <template v-else-if="q.type === QuestionType.TRUE_FALSE">
            <label class="option">
              <input v-model="answers[q.key]" type="radio" :name="q.key" value="正确" /><span>正确</span>
            </label>
            <label class="option">
              <input v-model="answers[q.key]" type="radio" :name="q.key" value="错误" /><span>错误</span>
            </label>
          </template>

          <!-- 填空 / 简答 -->
          <textarea
            v-else
            v-model="answers[q.key]"
            class="input q-textarea"
            rows="3"
            placeholder="请在这里作答"
          />
        </div>

        <button class="btn btn-primary self-start" type="button" :disabled="submitting" @click="submitHomework">
          {{ submitting ? '提交中…' : '提交作业' }}
        </button>
      </section>
    </template>

    <!-- ================= 教师 ================= -->
    <template v-else>
      <section class="card stack">
        <div class="field">
          <label class="field-label" for="hw-class">班级</label>
          <select id="hw-class" v-model="selectedClass" class="input" @change="onSwitchClass">
            <option value="" disabled>请选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">
            {{ c.name }}（已加入 {{ c.memberCount }} 人）
          </option>
        </select>
        </div>
        <p v-if="classes.length === 0" class="text-sm text-faint">
          你还没有创建班级，请先到「我的班级」创建并等待学生申请。
        </p>
        <button v-if="currentClass" class="btn btn-primary self-start" type="button" @click="showForm = !showForm">
          {{ showForm ? '收起布置表单' : '布置新作业' }}
        </button>
      </section>

      <!-- 布置表单 -->
      <section v-if="showForm && currentClass" class="card stack">
        <h2 class="section-title">布置作业 · {{ currentClass.name }}</h2>

        <div class="field">
          <label class="field-label" for="hw-title">作业标题</label>
          <input id="hw-title" v-model="form.title" class="input" type="text" maxlength="120" placeholder="如：一元一次方程练习" />
        </div>
        <div class="field">
          <label class="field-label" for="hw-desc">说明（可选）</label>
          <textarea id="hw-desc" v-model="form.description" class="input" rows="2" placeholder="作业要求、提示等" />
        </div>
        <div class="field">
          <label class="field-label" for="hw-due">截止时间（可选）</label>
          <input id="hw-due" v-model="form.dueAt" class="input" type="datetime-local" />
        </div>

        <!-- 题库选题 -->
        <div class="sub-block">
          <h3 class="sub-title">从题库选题</h3>
          <div class="field-row">
            <select v-model="bankQuery.stage" class="input">
              <option value="">全部学段</option>
              <option v-for="s in STAGE_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
            <select v-model="bankQuery.subject" class="input">
              <option value="">全部学科</option>
              <option v-for="s in SUBJECT_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
            <button class="btn" type="button" :disabled="bankLoading" @click="searchBank">
              {{ bankLoading ? '检索中…' : '检索' }}
            </button>
          </div>

          <ul v-if="bankList.length" class="bank-list">
            <li v-for="q in bankList" :key="q.id" class="bank-item">
              <span class="bank-text">{{ q.content }}</span>
              <button class="btn btn-sm" type="button" @click="addFromBank(q)">加入</button>
            </li>
          </ul>
          <p v-else class="text-xs text-faint">点「检索」加载题库题目。</p>
        </div>

        <!-- 自建题 -->
        <div class="sub-block">
          <h3 class="sub-title">自行上传题目（会写入题库）</h3>
          <div class="field">
            <label class="field-label" for="custom-content">题干</label>
            <textarea id="custom-content" v-model="custom.content" class="input" rows="2" placeholder="请输入题目内容" />
          </div>
          <div class="field">
            <label class="field-label" for="custom-type">题型</label>
            <select id="custom-type" v-model="custom.type" class="input">
              <option :value="QuestionType.SINGLE_CHOICE">单选题</option>
              <option :value="QuestionType.MULTIPLE_CHOICE">多选题</option>
              <option :value="QuestionType.TRUE_FALSE">判断题</option>
              <option :value="QuestionType.FILL_BLANK">填空题</option>
              <option :value="QuestionType.SHORT_ANSWER">简答题</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="custom-options">选项（每行一个，选择题填写）</label>
            <textarea id="custom-options" v-model="custom.options" class="input" rows="3" placeholder="选项 A 内容&#10;选项 B 内容" />
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="custom-answer">参考答案</label>
              <input id="custom-answer" v-model="custom.answer" class="input" type="text" placeholder="如 A / 正确" />
            </div>
            <div class="field">
              <label class="field-label" for="custom-analysis">解析（可选）</label>
              <input id="custom-analysis" v-model="custom.analysis" class="input" type="text" placeholder="解题思路" />
            </div>
          </div>
          <button class="btn self-start" type="button" @click="addCustom">加入作业</button>
        </div>

        <!-- 已加入题目 -->
        <div class="sub-block">
          <h3 class="sub-title">已加入 {{ draftItems.length }} 题</h3>
          <ul v-if="draftItems.length" class="draft-list">
            <li v-for="(d, i) in draftItems" :key="i" class="draft-item">
              <span>{{ i + 1 }}. {{ d.label }}</span>
              <button class="btn btn-sm" type="button" @click="removeDraft(i)">移除</button>
            </li>
          </ul>
          <p v-else class="text-xs text-faint">还没有题目，可从题库选择或自行上传。</p>
        </div>

        <button class="btn btn-primary self-start" type="button" :disabled="creating" @click="publish">
          {{ creating ? '发布中…' : '发布作业' }}
        </button>
      </section>

      <!-- 作业列表 -->
      <section v-if="currentClass" class="card stack">
        <h2 class="section-title">本班作业（{{ classHomework.length }}）</h2>
        <p v-if="classHomework.length === 0" class="empty">本班还没有布置过作业。</p>
        <div v-for="hw in classHomework" :key="hw.id" class="hw-row">
          <div class="grow">
            <p class="hw-title">{{ hw.title }}</p>
            <p class="text-xs text-faint">
              {{ hw.totalQuestions }} 题 · 截止 {{ formatDate(hw.dueAt) }} · {{ hw.status === 'open' ? '进行中' : '已截止' }}
            </p>
          </div>
          <button class="btn btn-sm" type="button" @click="viewSubmissions(hw)">查看提交</button>
          <button v-if="hw.status === 'open'" class="btn btn-sm" type="button" @click="closeHomework(hw)">截止</button>
        </div>
      </section>

      <!-- 提交情况 -->
      <section v-if="viewing" class="card stack">
        <div class="hw-head">
          <h2 class="section-title">提交情况 · {{ viewing.homework.title }}</h2>
          <button class="btn btn-sm" type="button" @click="viewing = null">关闭</button>
        </div>
        <p v-if="viewing.submissions.length === 0" class="empty">还没有学生提交。</p>
        <div v-for="sub in viewing.submissions" :key="sub.id" class="sub-row">
          <div class="sub-head">
            <strong>{{ sub.studentName || '学生' }}</strong>
            <span class="badge badge-primary">
              {{ sub.score === null ? '主观题待批' : `${sub.score} 分` }}
            </span>
            <span class="text-xs text-faint">{{ formatDate(sub.submittedAt) }}</span>
          </div>
          <details>
            <summary class="text-sm text-soft">查看作答</summary>
            <div v-for="q in viewing.homework.questions" :key="q.key" class="answer-row">
              <p class="text-sm">{{ q.content }}</p>
              <p class="text-sm">
                作答：<span class="mono">{{ answerText(sub, q.key) }}</span>
                <template v-if="q.answer"> ｜ 参考答案：<span class="mono">{{ q.answer }}</span></template>
              </p>
            </div>
          </details>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.hw-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.self-start {
  align-self: flex-start;
}

.question {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  border-top: 1px solid var(--c-border);
}

.q-title {
  font-size: 15px;
  line-height: 1.6;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
}

.q-textarea {
  resize: vertical;
}

.answer-panel {
  border-color: var(--c-border-warm);
}

.sub-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.sub-title {
  font-size: 14px;
  font-weight: 600;
}

.field-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.field-row .field,
.field-row .input {
  flex: 1;
  min-width: 120px;
}

.bank-list,
.draft-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
}

.bank-item,
.draft-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.bank-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-item {
  justify-content: space-between;
}

.hw-row,
.sub-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--c-border);
}

.sub-row {
  flex-direction: column;
  align-items: stretch;
}

.sub-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.grow {
  flex: 1;
  min-width: 0;
}

.hw-title {
  font-size: 15px;
  font-weight: 500;
}

.answer-row {
  padding: 6px 0;
  border-bottom: 1px dashed var(--c-border);
}
</style>
