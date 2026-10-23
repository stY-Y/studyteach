<script setup lang="ts">
import { StudyStage, Subject } from '@teachstudy/shared';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  diagnosisApi,
  type AnswerItem,
  type DiagnosisQuestion,
  type DiagnosisRecord,
  type SubmitDiagnosisResult,
} from '../../api/diagnosis';
import { buildNameMap, knowledgeApi } from '../../api/knowledge';
import { usersApi } from '../../api/users';
import DiagnosisResult from '../../components/diagnosis/DiagnosisResult.vue';
import QuizRunner from '../../components/diagnosis/QuizRunner.vue';
import {
  inferStageFromGrade,
  stageLabel,
  STAGE_OPTIONS,
  subjectLabel,
  SUBJECT_OPTIONS,
} from '../../config/labels';

const router = useRouter();

type Step = 'setup' | 'quiz' | 'analyzing' | 'result';
const step = ref<Step>('setup');

const stage = ref<StudyStage>(StudyStage.JUNIOR);
const subject = ref<Subject>(Subject.MATH);
/** 学段是否来自档案自动推断（用于界面提示） */
const stageSource = ref('');
const starting = ref(false);
const error = ref('');

const questions = ref<DiagnosisQuestion[]>([]);
const recordId = ref('');
const result = ref<SubmitDiagnosisResult | null>(null);
const elapsedMs = ref(0);
const nameMap = ref<Record<string, string>>({});

const records = ref<DiagnosisRecord[]>([]);
const recordsLoading = ref(false);

const hasResult = computed(() => result.value !== null);

async function start(): Promise<void> {
  error.value = '';
  starting.value = true;
  try {
    const res = await diagnosisApi.start(subject.value, stage.value);
    if (!res.count || res.questions.length === 0) {
      error.value = `「${stageLabel(stage.value)} · ${subjectLabel(subject.value)}」暂时没有可用的检测题。请联系老师录入，或换个学段 / 学科试试（推荐 初中 · 数学）。`;
      return;
    }
    questions.value = res.questions;
    recordId.value = res.recordId;
    result.value = null;
    step.value = 'quiz';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    starting.value = false;
  }
}

async function onSubmit(answers: AnswerItem[]): Promise<void> {
  error.value = '';
  step.value = 'analyzing';
  const startedAt = performance.now();
  try {
    const res = await diagnosisApi.submit(recordId.value, answers);
    elapsedMs.value = Math.round(performance.now() - startedAt);
    result.value = res;
    step.value = 'result';
    void loadRecords();
  } catch (err) {
    error.value = (err as Error).message;
    step.value = 'quiz';
  }
}

function backToSetup(): void {
  step.value = 'setup';
  error.value = '';
}

async function loadNameMap(): Promise<void> {
  try {
    const list = await knowledgeApi.list();
    nameMap.value = buildNameMap(list);
  } catch {
    /* 拿不到名称时退化为展示知识点 id，不影响主流程 */
  }
}

async function loadRecords(): Promise<void> {
  recordsLoading.value = true;
  try {
    records.value = await diagnosisApi.list();
  } catch {
    records.value = [];
  } finally {
    recordsLoading.value = false;
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 按学生档案里的年级自动预选学段（档案是自由文本，推断失败则保留默认值由学生手选） */
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
    /* 读不到档案不影响使用，学生可手动选学段 */
  }
}

onMounted(() => {
  void loadNameMap();
  void loadRecords();
  void loadProfileStage();
});
</script>

<template>
  <div class="stack">
    <!-- ========== 1. 选科开测 ========== -->
    <template v-if="step === 'setup'">
      <section class="card">
        <h1 class="page-title">知识诊断</h1>
        <p class="text-sm text-soft note">
          抽取 10-15 道检测题，作答后 AI 会在 10 秒内定位你的知识薄弱点，并生成个性化补漏学习路径。
        </p>
      </section>

      <section class="card">
        <h2 class="section-title">选择学段</h2>
        <div class="stages">
          <button
            v-for="s in STAGE_OPTIONS"
            :key="s.value"
            type="button"
            class="stage"
            :class="{ active: stage === s.value }"
            @click="stage = s.value"
          >
            {{ s.label }}
          </button>
        </div>
        <p v-if="stageSource" class="text-xs text-faint note">{{ stageSource }}</p>
        <p v-else class="text-xs text-faint note">不同学段题库相互独立，请选择你当前所在的学段。</p>
      </section>

      <section class="card">
        <h2 class="section-title">选择学科</h2>
        <div class="subjects">
          <button
            v-for="item in SUBJECT_OPTIONS"
            :key="item.value"
            type="button"
            class="subject"
            :class="{ active: subject === item.value }"
            @click="subject = item.value"
          >
            {{ item.label }}
          </button>
        </div>

        <div v-if="error" class="alert alert-warning note">{{ error }}</div>

        <button class="btn btn-primary btn-block start" type="button" :disabled="starting" @click="start">
          {{ starting ? '正在抽题…' : '开始诊断' }}
        </button>
      </section>

      <!-- 历史记录 -->
      <section class="card">
        <div class="row">
          <h2 class="section-title">我的诊断记录</h2>
          <div class="spacer" />
          <button class="btn btn-sm" type="button" :disabled="recordsLoading" @click="loadRecords">
            刷新
          </button>
        </div>

        <p v-if="recordsLoading" class="text-sm text-soft note">加载中…</p>
        <p v-else-if="records.length === 0" class="text-sm text-soft note">还没有诊断记录，先做一次吧。</p>
        <ul v-else class="records">
          <li v-for="item in records" :key="item.id" class="records-item">
            <div class="row wrap">
              <span class="badge badge-primary">{{ stageLabel(item.stage) }} · {{ subjectLabel(item.subject) }}</span>
              <span class="text-xs text-faint">{{ formatTime(item.createdAt) }}</span>
              <div class="spacer" />
              <span v-if="item.weakPoints?.length" class="badge badge-warning">
                {{ item.weakPoints.length }} 个薄弱点
              </span>
              <span v-else class="badge">未分析</span>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- ========== 2. 答题 ========== -->
    <QuizRunner
      v-else-if="step === 'quiz'"
      :questions="questions"
      @submit="onSubmit"
      @cancel="backToSetup"
    />

    <!-- ========== 3. AI 分析中 ========== -->
    <section v-else-if="step === 'analyzing'" class="card analyzing">
      <div class="spinner" />
      <h1 class="page-title">AI 正在分析你的作答</h1>
      <p class="text-sm text-soft">正在定位知识薄弱点并生成补漏学习路径，请稍候…</p>
      <p class="text-xs text-faint">通常几秒内完成；若长时间无响应，请检查网络或 AI 服务配置。</p>
    </section>

    <!-- ========== 4. 结果 ========== -->
    <template v-else-if="step === 'result' && hasResult && result">
      <DiagnosisResult
        :result="result"
        :elapsed-ms="elapsedMs"
        :name-map="nameMap"
        :subject="subject"
        :stage="stage"
        @retry="start"
        @home="goHome"
      />
    </template>

    <section class="row back">
      <button v-if="step !== 'setup'" class="btn btn-sm" type="button" @click="backToSetup">
        ← 返回选科
      </button>
    </section>
  </div>
</template>

<style scoped>
.note {
  margin-top: 8px;
  line-height: 1.55;
}

.stages {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.subjects {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}

@media (min-width: 640px) {
  .subjects {
    grid-template-columns: repeat(5, 1fr);
  }
}

.subject,
.stage {
  min-height: 44px;
  font-family: inherit;
  font-size: 15px;
  color: var(--c-text);
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.12s, background-color 0.12s;
}

.subject:hover,
.stage:hover {
  border-color: var(--c-primary);
}

.subject.active,
.stage.active {
  color: var(--c-primary);
  background: var(--c-primary-soft);
  border-color: var(--c-primary);
  font-weight: 600;
}

.start {
  margin-top: 14px;
}

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

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.analyzing {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 40px 16px;
}

/* 极小的加载指示器：仅 22px 元素做旋转，开销可忽略 */
.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--c-border-strong);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.back {
  gap: 8px;
}
</style>