<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { QuestionType } from '@teachstudy/shared';
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

const props = defineProps<{
  classId: string;
  /** 教师/管理员：可发布作业、查看提交；学生：只能作答 */
  isTeacher: boolean;
}>();

const list = ref<Homework[]>([]);
const loading = ref(false);
const error = ref('');
const tip = ref('');
const expanded = ref(false);

/** 学生作答 */
const active = ref<Homework | null>(null);
const answers = ref<Record<string, string>>({});
const multi = ref<Record<string, string[]>>({});
const submitting = ref(false);

/** 教师发布 */
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

const openCount = computed(() => list.value.filter((h) => h.status === 'open').length);

function formatDate(value?: string | null): string {
  if (!value) return '不限';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '不限';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function load(): Promise<void> {
  if (!props.classId) return;
  loading.value = true;
  error.value = '';
  try {
    if (props.isTeacher) {
      list.value = await homeworkApi.list({ classId: props.classId });
    } else {
      const all = await homeworkApi.mine();
      list.value = all.filter((h) => h.classId === props.classId);
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

// ---------- 学生 ----------
function openHomework(hw: Homework): void {
  active.value = hw;
  answers.value = {};
  multi.value = {};
  error.value = '';
  tip.value = '';
}

function toggleMulti(key: string, value: string): void {
  const current = multi.value[key] ?? [];
  multi.value[key] = current.includes(value)
    ? current.filter((x) => x !== value)
    : [...current, value];
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
    tip.value =
      result.score === null ? '已提交，老师会尽快批阅' : `已提交，客观题得分 ${result.score} 分`;
    active.value = null;
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    submitting.value = false;
  }
}

// ---------- 教师 ----------
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
    label: `【题库】${q.content.slice(0, 30)}${q.content.length > 30 ? '…' : ''}`,
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
    label: `【自建】${content.slice(0, 30)}${content.length > 30 ? '…' : ''}`,
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
      classId: props.classId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      questions: draftItems.value.map((d) => d.input),
    });
    tip.value = '作业已发布到班级聊天；自行上传的题目已同步写入题库';
    form.title = '';
    form.description = '';
    form.dueAt = '';
    draftItems.value = [];
    showForm.value = false;
    await load();
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
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function answerText(sub: HomeworkSubmission, key: string): string {
  return sub.answers[key] ?? '（未作答）';
}

watch(
  () => props.classId,
  () => {
    expanded.value = false;
    active.value = null;
    viewing.value = null;
    void load();
  },
);

onMounted(load);
</script>

<template>
  <section class="hw-panel">
    <div class="panel-head">
      <button class="panel-toggle" type="button" @click="expanded = !expanded">
        <span class="panel-title">📚 本班作业</span>
        <span class="badge badge-primary">{{ list.length }} 项</span>
        <span v-if="openCount > 0" class="badge badge-warning">{{ openCount }} 项进行中</span>
        <span class="arrow">{{ expanded ? '收起' : '展开' }}</span>
      </button>
      <button
        v-if="isTeacher"
        class="btn btn-sm btn-primary"
        type="button"
        @click="expanded = true; showForm = !showForm"
      >
        {{ showForm ? '收起发布' : '发布作业' }}
      </button>
    </div>

    <div v-if="expanded" class="panel-body">
      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <div v-if="tip" class="alert alert-info">{{ tip }}</div>

      <p v-if="loading" class="text-soft text-sm">加载中…</p>

      <!-- 列表 -->
      <div v-if="!loading && list.length === 0" class="empty">
        {{ isTeacher ? '还没有布置作业，点右上角「发布作业」。' : '老师还没有布置作业。' }}
      </div>
      <div v-for="hw in list" :key="hw.id" class="hw-item">
        <div class="hw-row">
          <div class="grow">
            <p class="hw-title">{{ hw.title }}</p>
            <p class="text-xs text-faint">
              {{ hw.totalQuestions }} 题 · 截止 {{ formatDate(hw.dueAt) }}
              · {{ hw.status === 'open' ? '进行中' : '已截止' }}
              <template v-if="!isTeacher && hw.mySubmission">
                · 已提交<template v-if="hw.mySubmission.score !== null">（{{ hw.mySubmission.score }} 分）</template>
              </template>
            </p>
          </div>

          <!-- 学生 -->
          <template v-if="!isTeacher">
            <button
              v-if="hw.status === 'open'"
              class="btn btn-sm btn-primary"
              type="button"
              @click="openHomework(hw)"
            >
              {{ hw.mySubmission ? '重新作答' : '作答' }}
            </button>
          </template>

          <!-- 教师 -->
          <template v-else>
            <button class="btn btn-sm" type="button" @click="viewSubmissions(hw)">提交情况</button>
            <button v-if="hw.status === 'open'" class="btn btn-sm" type="button" @click="closeHomework(hw)">
              截止
            </button>
          </template>
        </div>

        <!-- 学生答题 -->
        <div v-if="active?.id === hw.id" class="answer-box">
          <div v-for="(q, index) in hw.questions" :key="q.key" class="question">
            <p class="q-title">{{ index + 1 }}. {{ q.content }}</p>
            <p class="text-xs text-faint">
              {{ questionTypeLabel(q.type) }}<template v-if="q.subject"> · {{ subjectLabel(q.subject) }}</template>
            </p>

            <template v-if="q.type === QuestionType.SINGLE_CHOICE">
              <label v-for="(opt, oi) in q.options ?? []" :key="oi" class="option">
                <input v-model="answers[q.key]" type="radio" :name="`${hw.id}-${q.key}`" :value="optionLetter(opt, oi)" />
                <span>{{ optionLetter(opt, oi) }}. {{ opt }}</span>
              </label>
            </template>

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

            <template v-else-if="q.type === QuestionType.TRUE_FALSE">
              <label class="option">
                <input v-model="answers[q.key]" type="radio" :name="`${hw.id}-${q.key}`" value="正确" /><span>正确</span>
              </label>
              <label class="option">
                <input v-model="answers[q.key]" type="radio" :name="`${hw.id}-${q.key}`" value="错误" /><span>错误</span>
              </label>
            </template>

            <textarea v-else v-model="answers[q.key]" class="input" rows="2" placeholder="在这里作答" />
          </div>

          <div class="row-actions">
            <button class="btn btn-primary btn-sm" type="button" :disabled="submitting" @click="submitHomework">
              {{ submitting ? '提交中…' : '提交作业' }}
            </button>
            <button class="btn btn-sm" type="button" @click="active = null">取消</button>
          </div>
        </div>

        <!-- 教师提交情况 -->
        <div v-if="viewing?.homework.id === hw.id" class="answer-box">
          <p v-if="viewing.submissions.length === 0" class="text-sm text-faint">还没有学生提交。</p>
          <div v-for="sub in viewing.submissions" :key="sub.id" class="sub-item">
            <div class="sub-head">
              <strong>{{ sub.studentName || '学生' }}</strong>
              <span class="badge badge-primary">
                {{ sub.score === null ? '主观题待批' : `${sub.score} 分` }}
              </span>
              <span class="text-xs text-faint">{{ formatDate(sub.submittedAt) }}</span>
            </div>
            <details>
              <summary class="text-xs text-soft">查看作答</summary>
              <div v-for="q in viewing.homework.questions" :key="q.key" class="text-sm">
                {{ q.content }} —— 作答：<span class="mono">{{ answerText(sub, q.key) }}</span>
                <template v-if="q.answer">（参考：{{ q.answer }}）</template>
              </div>
            </details>
          </div>
        </div>
      </div>

      <!-- 教师发布表单 -->
      <div v-if="isTeacher && showForm" class="publish-box">
        <h3 class="sub-title">发布新作业</h3>
        <div class="field">
          <label class="field-label" for="hp-title">标题</label>
          <input id="hp-title" v-model="form.title" class="input" type="text" maxlength="120" placeholder="如：一元一次方程练习" />
        </div>
        <div class="field">
          <label class="field-label" for="hp-desc">说明（可选）</label>
          <textarea id="hp-desc" v-model="form.description" class="input" rows="2" placeholder="作业要求、提示等" />
        </div>
        <div class="field">
          <label class="field-label" for="hp-due">截止时间（可选）</label>
          <input id="hp-due" v-model="form.dueAt" class="input" type="datetime-local" />
        </div>

        <div class="sub-block">
          <h4 class="sub-title">从题库选题</h4>
          <div class="filter-row">
            <select v-model="bankQuery.stage" class="input">
              <option value="">全部学段</option>
              <option v-for="s in STAGE_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
            <select v-model="bankQuery.subject" class="input">
              <option value="">全部学科</option>
              <option v-for="s in SUBJECT_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
            <button class="btn btn-sm" type="button" :disabled="bankLoading" @click="searchBank">
              {{ bankLoading ? '检索中…' : '检索' }}
            </button>
          </div>
          <ul v-if="bankList.length" class="pick-list">
            <li v-for="q in bankList" :key="q.id">
              <span class="pick-text">{{ q.content }}</span>
              <button class="btn btn-sm" type="button" @click="addFromBank(q)">加入</button>
            </li>
          </ul>
        </div>

        <div class="sub-block">
          <h4 class="sub-title">自行上传题目（会写入题库）</h4>
          <textarea v-model="custom.content" class="input" rows="2" placeholder="题干" />
          <div class="filter-row">
            <select v-model="custom.type" class="input">
              <option :value="QuestionType.SINGLE_CHOICE">单选题</option>
              <option :value="QuestionType.MULTIPLE_CHOICE">多选题</option>
              <option :value="QuestionType.TRUE_FALSE">判断题</option>
              <option :value="QuestionType.FILL_BLANK">填空题</option>
              <option :value="QuestionType.SHORT_ANSWER">简答题</option>
            </select>
            <input v-model="custom.answer" class="input" type="text" placeholder="参考答案，如 A / 正确" />
          </div>
          <textarea v-model="custom.options" class="input" rows="2" placeholder="选项（每行一个，选择题填写）" />
          <textarea v-model="custom.analysis" class="input" rows="1" placeholder="解析（可选）" />
          <button class="btn btn-sm" type="button" @click="addCustom">加入作业</button>
        </div>

        <div class="sub-block">
          <h4 class="sub-title">已加入 {{ draftItems.length }} 题</h4>
          <ul v-if="draftItems.length" class="pick-list">
            <li v-for="(d, i) in draftItems" :key="i">
              <span class="pick-text">{{ i + 1 }}. {{ d.label }}</span>
              <button class="btn btn-sm" type="button" @click="removeDraft(i)">移除</button>
            </li>
          </ul>
          <p v-else class="text-xs text-faint">还没有题目。</p>
        </div>

        <button class="btn btn-primary btn-sm" type="button" :disabled="creating" @click="publish">
          {{ creating ? '发布中…' : '发布到班级聊天' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hw-panel {
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  padding: 10px 12px;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 4px 0;
  font-family: inherit;
  font-size: 15px;
  color: var(--c-text);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.panel-title {
  font-weight: 600;
}

.arrow {
  margin-left: auto;
  font-size: 12px;
  color: var(--c-text-faint);
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--c-border);
  margin-top: 8px;
}

.hw-item {
  border-top: 1px dashed var(--c-border);
  padding-top: 8px;
}

.hw-item:first-of-type {
  border-top: none;
}

.hw-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.hw-title {
  font-size: 15px;
  font-weight: 500;
}

.answer-box {
  margin-top: 8px;
  padding: 10px 12px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.question {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 0;
  border-top: 1px dashed var(--c-border);
}

.question:first-of-type {
  border-top: none;
}

.q-title {
  font-size: 14px;
  line-height: 1.6;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 5px 8px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  cursor: pointer;
}

.row-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.sub-item {
  padding: 6px 0;
  border-top: 1px dashed var(--c-border);
}

.sub-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.publish-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.sub-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.sub-title {
  font-size: 14px;
  font-weight: 600;
}

.filter-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-row .input {
  flex: 1;
  min-width: 110px;
}

.pick-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 200px;
  overflow-y: auto;
}

.pick-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 7px;
  background: #f7f1e3;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.pick-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
