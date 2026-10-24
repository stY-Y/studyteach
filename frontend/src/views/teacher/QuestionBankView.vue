<script setup lang="ts">
import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { knowledgeApi } from '../../api/knowledge';
import {
  questionsApi,
  type BankQuestion,
  type ChapterItem,
} from '../../api/questions';
import {
  DIFFICULTY_LABELS,
  difficultyLabel,
  ensureSubjectForStage,
  gradeLabel,
  inferStageFromGrade,
  QUESTION_TYPE_LABELS,
  questionTypeLabel,
  subjectLabel,
  subjectOptionsForStage,
} from '../../config/labels';


const router = useRouter();

/** 三级筛选：年级（第 1 层）→ 科目（第 2 层）→ 章节（第 3 层） */
const grade = ref(8);
const subject = ref<Subject>(Subject.MATH);
const chapter = ref<string | undefined>(undefined);
const chapters = ref<ChapterItem[]>([]);
const stage = computed(
  () => inferStageFromGrade(gradeLabel(grade.value)) ?? StudyStage.JUNIOR,
);
/** 学科随年级收敛：1-6 年级只有语数外 */
const subjectOptions = computed(() => subjectOptionsForStage(stage.value));
const type = ref<QuestionType | undefined>(undefined);
const difficulty = ref<DifficultyLevel | undefined>(undefined);

const list = ref<BankQuestion[]>([]);
const total = ref(0);
const page = ref(1);
const PAGE_SIZE = 10;
const loading = ref(false);
const error = ref('');
const tip = ref('');

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

/* ---------- 新增题目表单 ---------- */
const showForm = ref(false);
const creating = ref(false);
const createError = ref('');
const form = ref({
  content: '',
  type: QuestionType.SINGLE_CHOICE,
  difficulty: DifficultyLevel.MEDIUM,
  ability: AbilityRequirement.UNDERSTAND,
  optionsText: '',
  answer: '',
  analysis: '',
  typicalErrorsText: '',
});
const kpList = ref<Array<{ id: string; name: string }>>([]);
const formKp = ref<string[]>([]);
const formChapter = ref('');

const ABILITY_OPTIONS: Array<{ value: AbilityRequirement; label: string }> = [
  { value: AbilityRequirement.MEMORY, label: '识记' },
  { value: AbilityRequirement.UNDERSTAND, label: '理解' },
  { value: AbilityRequirement.APPLY, label: '应用' },
  { value: AbilityRequirement.ANALYZE, label: '分析' },
  { value: AbilityRequirement.EVALUATE, label: '评价' },
  { value: AbilityRequirement.CREATE, label: '创造' },
];

const TYPE_OPTIONS = Object.values(QuestionType);

const DIFFICULTY_OPTIONS = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD];

const needsOptions = computed(
  () =>
    form.value.type === QuestionType.SINGLE_CHOICE ||
    form.value.type === QuestionType.MULTIPLE_CHOICE,
);

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function search(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const res = await questionsApi.search({
      grade: grade.value,
      subject: subject.value,
      chapter: chapter.value,
      type: type.value,
      difficulty: difficulty.value,
      page: page.value,
      pageSize: PAGE_SIZE,
    });
    list.value = res.list ?? [];
    total.value = res.total ?? 0;
  } catch (err) {
    error.value = (err as Error).message;
    list.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function refresh(): void {
  page.value = 1;
  tip.value = '';
  void search();
}

/** 加载当前年级+科目的章节（第 3 层） */
async function loadChapters(): Promise<void> {
  try {
    chapters.value = await questionsApi.chapters({
      grade: grade.value,
      subject: subject.value,
    });
  } catch {
    chapters.value = [];
  }
}

/** 切年级会换学段/科目内容，章节与分页一起重置 */
function onGradeChange(): void {
  // 年级跨学段时（如六年级 → 七年级）先收敛学科，小学没有物理/化学
  subject.value = ensureSubjectForStage(subject.value, stage.value);
  chapter.value = undefined;
  page.value = 1;
  formKp.value = [];
  void loadChapters();
  void loadKps();
  void search();
}

function onSubjectChange(): void {
  chapter.value = undefined;
  page.value = 1;
  formKp.value = [];
  void loadChapters();
  void loadKps();
  void search();
}

function selectChapter(value?: string): void {
  chapter.value = value;
  page.value = 1;
  void search();
}

async function loadKps(): Promise<void> {
  formKp.value = [];
  try {
    const rows = await knowledgeApi.list({ subject: subject.value, stage: stage.value });
    kpList.value = rows.map((k) => ({ id: k.id, name: k.name }));
  } catch {
    kpList.value = [];
  }
}

function toggleFormKp(id: string): void {
  const set = new Set(formKp.value);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  formKp.value = Array.from(set);
}

async function create(): Promise<void> {
  createError.value = '';
  if (!form.value.content.trim()) {
    createError.value = '请填写题干';
    return;
  }
  if (formKp.value.length === 0) {
    createError.value = '请至少选择一个知识点，便于后续诊断与组卷';
    return;
  }
  creating.value = true;
  try {
    await questionsApi.create({
      subject: subject.value,
      stage: stage.value,
      grade: grade.value,
      chapter: formChapter.value.trim() || chapter.value || undefined,
      type: form.value.type,
      difficulty: form.value.difficulty,
      ability: form.value.ability,
      knowledgePoints: formKp.value,
      content: form.value.content.trim(),
      options: needsOptions.value ? lines(form.value.optionsText) : undefined,
      answer: form.value.answer.trim() || undefined,
      analysis: form.value.analysis.trim() || undefined,
      typicalErrors: lines(form.value.typicalErrorsText),
      source: '教师录入',
    });
    tip.value = '题目已录入。';
    form.value = {
      content: '',
      type: QuestionType.SINGLE_CHOICE,
      difficulty: DifficultyLevel.MEDIUM,
      ability: AbilityRequirement.UNDERSTAND,
      optionsText: '',
      answer: '',
      analysis: '',
      typicalErrorsText: '',
    };
    formKp.value = [];
    formChapter.value = '';
    showForm.value = false;
    await loadChapters();
    await search();
  } catch (err) {
    createError.value = (err as Error).message;
  } finally {
    creating.value = false;
  }
}

function prevPage(): void {
  if (page.value > 1) {
    page.value -= 1;
    void search();
  }
}

function nextPage(): void {
  if (page.value < totalPages.value) {
    page.value += 1;
    void search();
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(() => {
  void loadChapters();
  void loadKps();
  void search();
});
</script>

<template>
  <div class="stack">
    <section class="card">
      <div class="row wrap">
        <h1 class="page-title">题库管理</h1>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" @click="showForm = !showForm">
          {{ showForm ? '收起录入' : '＋ 录入题目' }}
        </button>
      </div>
      <p class="text-sm text-soft note">
        题目按「知识点 / 难度 / 能力要求 / 典型错因」四维标注，诊断与组卷都靠它精准取题。
      </p>
    </section>

    <!-- 录入题目 -->
    <section v-if="showForm" class="card">
      <h2 class="section-title">录入新题目</h2>

      <div class="field note">
        <label class="field-label" for="q-content">题干（必填）</label>
        <textarea id="q-content" v-model="form.content" class="input textarea" rows="3" placeholder="如：解方程 2x + 3 = 11" />
      </div>

      <div class="form-grid note">
        <div class="field">
          <label class="field-label">题型</label>
          <select v-model="form.type" class="input">
            <option v-for="t in TYPE_OPTIONS" :key="t" :value="t">{{ QUESTION_TYPE_LABELS[t] }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">难度</label>
          <select v-model="form.difficulty" class="input">
            <option v-for="d in DIFFICULTY_OPTIONS" :key="d" :value="d">{{ DIFFICULTY_LABELS[d] }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">能力要求</label>
          <select v-model="form.ability" class="input">
            <option v-for="a in ABILITY_OPTIONS" :key="a.value" :value="a.value">{{ a.label }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">年级 / 学科</label>
          <div class="input static-field">{{ gradeLabel(grade) }} · {{ subjectLabel(subject) }}</div>
        </div>
        <div class="field">
          <label class="field-label" for="q-chapter">章节（第 3 层分类）</label>
          <input
            id="q-chapter"
            v-model.trim="formChapter"
            class="input"
            type="text"
            maxlength="64"
            :placeholder="chapter || '如：有理数、一元一次方程'"
          />
        </div>
      </div>

      <h2 class="section-title note">关联知识点（必选，至少 1 个）</h2>
      <div v-if="kpList.length === 0" class="text-sm text-soft">该学科暂无知识点，请先在知识图谱中维护。</div>
      <div v-else class="chips">
        <button
          v-for="kp in kpList"
          :key="kp.id"
          type="button"
          class="chip"
          :class="{ active: formKp.includes(kp.id) }"
          @click="toggleFormKp(kp.id)"
        >
          {{ kp.name }}
        </button>
      </div>

      <div v-if="needsOptions" class="field note">
        <label class="field-label" for="q-options">选项（每行一个，如 A. 0）</label>
        <textarea id="q-options" v-model="form.optionsText" class="input textarea" rows="4" placeholder="A. 0&#10;B. -3&#10;C. 2&#10;D. 5" />
      </div>

      <div class="form-grid note">
        <div class="field">
          <label class="field-label" for="q-answer">答案</label>
          <input id="q-answer" v-model="form.answer" class="input" type="text" placeholder="选择题填字母，如 B" />
        </div>
        <div class="field">
          <label class="field-label" for="q-errors">典型错因（每行一个，可空）</label>
          <input id="q-errors" v-model="form.typicalErrorsText" class="input" type="text" placeholder="如：移项忘记变号" />
        </div>
      </div>

      <div class="field note">
        <label class="field-label" for="q-analysis">解析（可空）</label>
        <textarea id="q-analysis" v-model="form.analysis" class="input textarea" rows="3" placeholder="写清解题思路，学生诊断后可见" />
      </div>

      <div v-if="createError" class="alert alert-warning note">{{ createError }}</div>

      <button class="btn btn-primary btn-block note" type="button" :disabled="creating" @click="create">
        {{ creating ? '保存中…' : '保存题目' }}
      </button>
    </section>

    <!-- 检索 -->
    <section class="card">
      <h2 class="section-title">检索题目</h2>

      <!-- 第 1 层：年级；第 2 层：科目 -->
      <div class="filter-row">
        <label class="filter-item">
          <span class="filter-label">年级</span>
          <select v-model.number="grade" class="input" @change="onGradeChange">
            <option v-for="g in 12" :key="g" :value="g">{{ gradeLabel(g) }}</option>
          </select>
        </label>
        <label class="filter-item">
          <span class="filter-label">科目</span>
          <select v-model="subject" class="input" @change="onSubjectChange">
            <option v-for="s in subjectOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </label>
      </div>

      <!-- 第 3 层：章节 -->
      <div class="chips">
        <button
          type="button"
          class="chip"
          :class="{ active: chapter === undefined }"
          @click="selectChapter(undefined)"
        >
          全部章节
        </button>
        <button
          v-for="c in chapters"
          :key="c.chapter"
          type="button"
          class="chip"
          :class="{ active: chapter === c.chapter }"
          @click="selectChapter(c.chapter)"
        >
          {{ c.chapter }}（{{ c.count }}）
        </button>
      </div>
      <div class="chips">
        <button type="button" class="chip" :class="{ active: type === undefined }" @click="type = undefined; refresh()">全部题型</button>
        <button
          v-for="t in TYPE_OPTIONS"
          :key="t"
          type="button"
          class="chip"
          :class="{ active: type === t }"
          @click="type = t; refresh()"
        >
          {{ QUESTION_TYPE_LABELS[t] }}
        </button>
      </div>
      <div class="chips">
        <button type="button" class="chip" :class="{ active: difficulty === undefined }" @click="difficulty = undefined; refresh()">全部难度</button>
        <button
          v-for="d in DIFFICULTY_OPTIONS"
          :key="d"
          type="button"
          class="chip"
          :class="{ active: difficulty === d }"
          @click="difficulty = d; refresh()"
        >
          {{ DIFFICULTY_LABELS[d] }}
        </button>
      </div>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <!-- 列表 -->
    <section class="card">
      <div class="row">
        <h2 class="section-title">共 {{ total }} 道题</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="search">刷新</button>
      </div>

      <p v-if="loading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="list.length === 0" class="empty note">
        这个条件下还没有题目。<br />
        可以点右上角「录入题目」，或换个学段/学科看看。
      </div>

      <ol v-else class="q-list note">
        <li v-for="(q, i) in list" :key="q.id" class="q-item">
          <div class="row wrap">
            <span class="q-no">{{ (page - 1) * PAGE_SIZE + i + 1 }}</span>
            <span class="badge">{{ questionTypeLabel(q.type) }}</span>
            <span class="badge badge-primary">{{ difficultyLabel(q.difficulty) }}</span>
            <span class="badge">
              {{ q.grade ? gradeLabel(q.grade) : gradeLabel(grade) }} · {{ subjectLabel(q.subject) }}<template v-if="q.chapter"> · {{ q.chapter }}</template>
            </span>
          </div>
          <p class="q-content">{{ q.content }}</p>
          <ul v-if="q.options?.length" class="q-options">
            <li v-for="(opt, oi) in q.options" :key="oi">{{ opt }}</li>
          </ul>
        </li>
      </ol>

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

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 160px;
}

.filter-label {
  flex: none;
  font-size: 13px;
  color: var(--c-text-soft);
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

.textarea {
  min-height: 84px;
  padding: 10px 12px;
  line-height: 1.6;
  resize: vertical;
}

.static-field {
  display: flex;
  align-items: center;
  color: var(--c-text-soft);
  background: var(--c-surface-warm);
}

.q-list {
  margin: 10px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.q-item {
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--c-border);
}

.q-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.q-no {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text-faint);
}

.q-content {
  margin-top: 5px;
  font-size: 15px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.q-options {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  font-size: 14px;
  line-height: 1.8;
  color: var(--c-text-soft);
}

.pager {
  margin-top: 12px;
  justify-content: center;
}
</style>
