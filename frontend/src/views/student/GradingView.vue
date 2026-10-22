<script setup lang="ts">
import { QuestionType, StudyStage, Subject } from '@teachstudy/shared';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { gradingApi, type GradeResult, type GradingRecord } from '../../api/grading';
import { questionsApi, type BankQuestion } from '../../api/questions';
import { usersApi } from '../../api/users';
import {
  difficultyLabel,
  inferStageFromGrade,
  optionLetter,
  questionTypeLabel,
  stageLabel,
  STAGE_OPTIONS,
  subjectLabel,
  SUBJECT_OPTIONS,
} from '../../config/labels';

const router = useRouter();

type Step = 'pick' | 'answer' | 'grading' | 'result';
const step = ref<Step>('pick');

/* ---------- 筛选 ---------- */
const stage = ref<StudyStage>(StudyStage.JUNIOR);
const subject = ref<Subject>(Subject.MATH);
const stageSource = ref('');

/* ---------- 题目列表 ---------- */
const questions = ref<BankQuestion[]>([]);
const total = ref(0);
const page = ref(1);
const PAGE_SIZE = 8;
const searching = ref(false);
const searchError = ref('');

/* ---------- 作答 ---------- */
const current = ref<BankQuestion | null>(null);
const choiceAnswer = ref<string[]>([]);
const textAnswer = ref('');
const answerError = ref('');

/* ---------- 批改结果 ---------- */
const result = ref<GradeResult | null>(null);

/* ---------- 我的批改记录 ---------- */
const records = ref<GradingRecord[]>([]);
const recordsLoading = ref(false);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

const isChoice = computed(() => (current.value?.options?.length ?? 0) > 0);
const isMultiple = computed(() => current.value?.type === QuestionType.MULTIPLE_CHOICE);

const scorePercent = computed(() => {
  if (!result.value) return 0;
  const v = Number(result.value.score);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v * 100)));
});

const encouragement = computed(() => {
  const p = scorePercent.value;
  if (p >= 90) return '太棒了！这个知识点你已经掌握得很好 🎉';
  if (p >= 70) return '做得不错！再留意一下细节就完美了 💪';
  if (p >= 40) return '已经接近了，按点拨的思路再试一次吧 🌱';
  return '别灰心，每一次练习都是进步，慢慢来 🧡';
});

async function search(): Promise<void> {
  searching.value = true;
  searchError.value = '';
  try {
    const res = await questionsApi.search({
      subject: subject.value,
      stage: stage.value,
      page: page.value,
      pageSize: PAGE_SIZE,
    });
    questions.value = res.list ?? [];
    total.value = res.total ?? 0;
    if (questions.value.length === 0 && page.value === 1) {
      searchError.value = `「${stageLabel(stage.value)} · ${subjectLabel(subject.value)}」暂时没有可练的题目，可以换个学科试试（推荐 初中 · 数学）。`;
    }
  } catch (err) {
    searchError.value = (err as Error).message;
    questions.value = [];
    total.value = 0;
  } finally {
    searching.value = false;
  }
}

function resetFilters(): void {
  page.value = 1;
  void search();
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

/* ---------- 作答交互 ---------- */
function startQuestion(q: BankQuestion): void {
  current.value = q;
  choiceAnswer.value = [];
  textAnswer.value = '';
  answerError.value = '';
  result.value = null;
  step.value = 'answer';
}

function pickOption(opt: string, index: number): void {
  const letter = optionLetter(opt, index);
  if (isMultiple.value) {
    const set = new Set(choiceAnswer.value);
    if (set.has(letter)) set.delete(letter);
    else set.add(letter);
    choiceAnswer.value = Array.from(set).sort();
  } else {
    choiceAnswer.value = [letter];
  }
}

function isPicked(opt: string, index: number): boolean {
  return choiceAnswer.value.includes(optionLetter(opt, index));
}

async function submitAnswer(): Promise<void> {
  if (!current.value) return;
  const answer = isChoice.value ? choiceAnswer.value.join(',') : textAnswer.value.trim();
  if (!answer) {
    answerError.value = isChoice.value ? '请选择一个选项' : '请写下你的答案再提交';
    return;
  }
  answerError.value = '';
  step.value = 'grading';
  try {
    result.value = await gradingApi.grade(current.value.id, answer);
    step.value = 'result';
    void loadRecords();
  } catch (err) {
    answerError.value = (err as Error).message;
    step.value = 'answer';
  }
}

function backToPick(): void {
  step.value = 'pick';
  result.value = null;
  current.value = null;
}

function goHome(): void {
  void router.push({ name: 'home' });
}

/* ---------- 记录 ---------- */
async function loadRecords(): Promise<void> {
  recordsLoading.value = true;
  try {
    records.value = await gradingApi.list();
  } catch {
    records.value = [];
  } finally {
    recordsLoading.value = false;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function scoreBadgeClass(score: number): string {
  if (score >= 0.7) return 'badge-success';
  if (score >= 0.4) return 'badge-warning';
  return 'badge-danger';
}

/** 按学生档案年级自动预选学段（与知识诊断保持一致） */
async function loadProfileStage(): Promise<void> {
  try {
    const me = await usersApi.me();
    const grade = me.studentProfile?.grade ?? '';
    const inferred = inferStageFromGrade(grade);
    if (inferred) {
      stage.value = inferred;
      stageSource.value = `已按你的档案年级「${grade}」自动选择，可手动修改`;
    }
  } catch {
    /* 读不到档案不影响使用 */
  }
}

onMounted(() => {
  void loadProfileStage().then(search);
  void loadRecords();
});
</script>

<template>
  <div class="stack">
    <!-- ========== 1. 挑选题目 ========== -->
    <template v-if="step === 'pick'">
      <section class="card">
        <h1 class="page-title">智能批改</h1>
        <p class="text-sm text-soft note">
          挑一道题来练练手吧。提交后 AI 会帮你批改，告诉你错在哪里、下一步怎么想
          —— 不直接给答案，让你自己找到它 💡
        </p>
      </section>

      <section class="card">
        <h2 class="section-title">选择学段</h2>
        <div class="chips">
          <button
            v-for="s in STAGE_OPTIONS"
            :key="s.value"
            type="button"
            class="chip"
            :class="{ active: stage === s.value }"
            @click="stage = s.value; resetFilters()"
          >
            {{ s.label }}
          </button>
        </div>
        <p class="text-xs text-faint note">{{ stageSource || '不同学段题库相互独立，请选择你当前所在的学段。' }}</p>
      </section>

      <section class="card">
        <h2 class="section-title">选择学科</h2>
        <div class="chips">
          <button
            v-for="item in SUBJECT_OPTIONS"
            :key="item.value"
            type="button"
            class="chip"
            :class="{ active: subject === item.value }"
            @click="subject = item.value; resetFilters()"
          >
            {{ item.label }}
          </button>
        </div>

        <div v-if="searchError" class="alert alert-warning note">{{ searchError }}</div>

        <!-- 题目列表 -->
        <p v-if="searching" class="text-sm text-soft note">正在找题…</p>
        <ul v-else-if="questions.length" class="q-list note">
          <li v-for="q in questions" :key="q.id" class="q-item">
            <p class="q-content">{{ q.content }}</p>
            <div class="row wrap">
              <span class="badge">{{ questionTypeLabel(q.type) }}</span>
              <span class="badge badge-primary">{{ difficultyLabel(q.difficulty) }}</span>
              <div class="spacer" />
              <button class="btn btn-sm" type="button" @click="startQuestion(q)">练这道</button>
            </div>
          </li>
        </ul>

        <!-- 翻页 -->
        <div v-if="total > PAGE_SIZE" class="row pager">
          <button class="btn btn-sm" type="button" :disabled="page <= 1" @click="prevPage">上一页</button>
          <span class="text-xs text-faint">第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 题</span>
          <button class="btn btn-sm" type="button" :disabled="page >= totalPages" @click="nextPage">下一页</button>
        </div>
      </section>

      <!-- 我的批改记录 -->
      <section class="card">
        <div class="row">
          <h2 class="section-title">我的批改记录</h2>
          <div class="spacer" />
          <button class="btn btn-sm" type="button" :disabled="recordsLoading" @click="loadRecords">
            刷新
          </button>
        </div>

        <p v-if="recordsLoading" class="text-sm text-soft note">加载中…</p>
        <div v-else-if="records.length === 0" class="empty note">
          还没有批改记录。从上面挑一道题开始，AI 老师在等你 ✏️
        </div>
        <ul v-else class="records note">
          <li v-for="item in records" :key="item.id" class="records-item">
            <div class="row wrap">
              <span class="badge" :class="scoreBadgeClass(item.score)">
                得分 {{ Math.round(item.score * 100) }}%
              </span>
              <span class="text-xs text-faint">{{ formatTime(item.createdAt) }}</span>
              <div class="spacer" />
              <span v-if="item.errorAnalysis" class="text-xs text-soft record-excerpt">
                {{ item.errorAnalysis }}
              </span>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- ========== 2. 作答 ========== -->
    <template v-else-if="step === 'answer' || step === 'grading'">
      <section v-if="current" class="card">
        <div class="row wrap">
          <span class="badge">{{ questionTypeLabel(current.type) }}</span>
          <span class="badge badge-primary">{{ difficultyLabel(current.difficulty) }}</span>
          <span class="badge">{{ stageLabel(current.stage) }} · {{ subjectLabel(current.subject) }}</span>
        </div>

        <p class="q-full">{{ current.content }}</p>

        <!-- 选择题 -->
        <div v-if="isChoice" class="options">
          <button
            v-for="(opt, i) in current.options ?? []"
            :key="i"
            type="button"
            class="option"
            :class="{ picked: isPicked(opt, i) }"
            :disabled="step === 'grading'"
            @click="pickOption(opt, i)"
          >
            <span class="option-mark">
              {{ isPicked(opt, i) ? '✓' : optionLetter(opt, i) }}
            </span>
            <span class="option-text">{{ opt }}</span>
          </button>
          <p v-if="isMultiple" class="text-xs text-faint">多选题：可选择多个选项</p>
        </div>

        <!-- 填空 / 简答 -->
        <div v-else class="field">
          <label class="field-label" for="grade-answer">你的作答</label>
          <textarea
            id="grade-answer"
            v-model="textAnswer"
            class="input textarea"
            rows="5"
            :disabled="step === 'grading'"
            placeholder="把你的思路和答案写下来，写多细都可以"
          />
        </div>

        <div v-if="answerError" class="alert alert-warning note">{{ answerError }}</div>

        <button
          class="btn btn-primary btn-block submit"
          type="button"
          :disabled="step === 'grading'"
          @click="submitAnswer"
        >
          {{ step === 'grading' ? 'AI 老师正在批改…' : '提交批改' }}
        </button>
      </section>
    </template>

    <!-- ========== 3. 批改结果 ========== -->
    <template v-else-if="step === 'result' && result">
      <section class="card result-card">
        <div class="score-ring">
          <strong>{{ scorePercent }}%</strong>
        </div>
        <h1 class="page-title">{{ encouragement }}</h1>

        <div class="result-blocks">
          <div class="block">
            <p class="block-title">错因分析</p>
            <p class="block-body">{{ result.errorAnalysis || '本次作答没有发现明显错误。' }}</p>
          </div>

          <div v-if="result.hints?.length" class="block">
            <p class="block-title">思路点拨</p>
            <ol class="hints">
              <li v-for="(h, i) in result.hints" :key="i">{{ h }}</li>
            </ol>
          </div>
        </div>

        <p class="text-xs text-faint note">
          平台不直接给出完整答案 —— 按点拨的思路再想一步，你一定能自己找到它。
        </p>
      </section>

      <section class="row wrap">
        <button class="btn btn-primary" type="button" @click="backToPick">再练一道</button>
        <button class="btn" type="button" @click="goHome">返回工作台</button>
      </section>
    </template>
  </div>
</template>

<style scoped>
.note {
  margin-top: 8px;
  line-height: 1.55;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

/* ---------- 题目列表 ---------- */
.q-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.q-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.q-content {
  font-size: 15px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.pager {
  margin-top: 12px;
  justify-content: center;
}

/* ---------- 记录 ---------- */
.records {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.records-item {
  padding: 8px 10px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.record-excerpt {
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 作答 ---------- */
.q-full {
  margin-top: 12px;
  font-size: 17px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  min-height: 46px;
  padding: 10px 12px;
  text-align: left;
  font-family: inherit;
  font-size: 16px;
  color: var(--c-text);
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.12s, background-color 0.12s;
}

.option:hover:not(:disabled) {
  border-color: var(--c-primary);
}

.option.picked {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
}

.option-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-soft);
  border: 1px solid var(--c-border-strong);
  border-radius: 50%;
}

.option.picked .option-mark {
  color: #fff;
  background: var(--c-primary);
  border-color: var(--c-primary);
}

.option-text {
  flex: 1;
  line-height: 1.5;
}

.textarea {
  min-height: 110px;
  padding: 10px 12px;
  line-height: 1.6;
  resize: vertical;
}

.submit {
  margin-top: 14px;
}

/* ---------- 结果 ---------- */
.result-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.score-ring {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  margin: 4px auto 10px;
  border: 3px solid var(--c-primary);
  border-radius: 50%;
  background: var(--c-primary-soft);
}

.score-ring strong {
  font-size: 24px;
  color: var(--c-primary-dark);
}

.result-blocks {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--c-border);
}

.block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-soft);
  margin-bottom: 4px;
}

.block-body {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.hints {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--c-text);
}
</style>
