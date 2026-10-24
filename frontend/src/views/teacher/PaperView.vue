<script setup lang="ts">
import { DifficultyLevel, StudyStage, Subject } from '@teachstudy/shared';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { buildNameMap, knowledgeApi } from '../../api/knowledge';
import { paperApi, type PaperDetail, type PaperItem } from '../../api/paper';
import {
  DIFFICULTY_LABELS,
  difficultyLabel,
  ensureSubjectForStage,
  optionLetter,
  questionTypeLabel,
  stageLabel,
  STAGE_OPTIONS,
  subjectLabel,
  subjectOptionsForStage,
} from '../../config/labels';
import { formatTime } from '../../utils/format';

const router = useRouter();

const title = ref('');
const subject = ref<Subject>(Subject.MATH);
const stage = ref<StudyStage>(StudyStage.JUNIOR);
/** 学科随学段收敛：小学只开语数外 */
const subjectOptions = computed(() => subjectOptionsForStage(stage.value));
const difficulty = ref<DifficultyLevel>(DifficultyLevel.MEDIUM);
const count = ref(10);
const selectedKp = ref<string[]>([]);

const kpList = ref<Array<{ id: string; name: string }>>([]);
const nameMap = ref<Record<string, string>>({});

const generating = ref(false);
const error = ref('');
const detail = ref<PaperDetail | null>(null);

const papers = ref<PaperItem[]>([]);
const papersLoading = ref(false);

const difficultyOptions = [
  DifficultyLevel.EASY,
  DifficultyLevel.MEDIUM,
  DifficultyLevel.HARD,
];

const shortages = computed(() => detail.value?.meta?.shortages ?? []);

function kpName(id: string): string {
  return nameMap.value[id] ?? id;
}

async function loadKps(): Promise<void> {
  selectedKp.value = [];
  try {
    const [list, all] = await Promise.all([
      knowledgeApi.list({ subject: subject.value, stage: stage.value }),
      knowledgeApi.list(),
    ]);
    kpList.value = list.map((k) => ({ id: k.id, name: k.name }));
    nameMap.value = buildNameMap(all);
  } catch {
    kpList.value = [];
  }
}

function toggleKp(id: string): void {
  const set = new Set(selectedKp.value);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  selectedKp.value = Array.from(set);
}

async function generate(): Promise<void> {
  error.value = '';
  generating.value = true;
  try {
    detail.value = await paperApi.generate({
      title: title.value.trim() || `${stageLabel(stage.value)}${subjectLabel(subject.value)}练习卷`,
      subject: subject.value,
      stage: stage.value,
      knowledgePoints: selectedKp.value,
      difficulty: difficulty.value,
      count: Number(count.value) || 10,
    });
    void loadPapers();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    generating.value = false;
  }
}

async function loadPapers(): Promise<void> {
  papersLoading.value = true;
  try {
    papers.value = await paperApi.mine();
  } catch {
    papers.value = [];
  } finally {
    papersLoading.value = false;
  }
}

async function openPaper(item: PaperItem): Promise<void> {
  error.value = '';
  try {
    detail.value = await paperApi.detail(item.id);
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

watch(stage, (next) => {
  // 先收敛学科（小学没有物理/化学等），避免带着非法学科去查知识点
  subject.value = ensureSubjectForStage(subject.value, next);
});

watch([subject, stage], () => {
  void loadKps();
});

onMounted(() => {
  void loadKps();
  void loadPapers();
});
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">智能组卷</h1>
      <p class="text-sm text-soft note">
        AI 只负责「考什么、考几道」，题目全部从真实题库抽取 —— 不会编造题目。
        题库不足时会如实提示缺口。
      </p>
    </section>

    <!-- 组卷条件 -->
    <section class="card">
      <div class="field">
        <label class="field-label" for="paper-title">试卷名称（可留空自动生成）</label>
        <input id="paper-title" v-model="title" class="input" type="text" placeholder="如：八年级数学·一元一次方程专练" />
      </div>

      <h2 class="section-title note">学段</h2>
      <div class="chips">
        <button
          v-for="s in STAGE_OPTIONS"
          :key="s.value"
          type="button"
          class="chip"
          :class="{ active: stage === s.value }"
          @click="stage = s.value"
        >
          {{ s.label }}
        </button>
      </div>

      <h2 class="section-title note">学科</h2>
      <div class="chips">
        <button
          v-for="s in subjectOptions"
          :key="s.value"
          type="button"
          class="chip"
          :class="{ active: subject === s.value }"
          @click="subject = s.value"
        >
          {{ s.label }}
        </button>
      </div>

      <h2 class="section-title note">难度</h2>
      <div class="chips">
        <button
          v-for="d in difficultyOptions"
          :key="d"
          type="button"
          class="chip"
          :class="{ active: difficulty === d }"
          @click="difficulty = d"
        >
          {{ DIFFICULTY_LABELS[d] }}
        </button>
      </div>

      <h2 class="section-title note">知识点范围（不选则由 AI 从本学段学科中规划）</h2>
      <div v-if="kpList.length === 0" class="text-sm text-soft note">该学科暂无知识点数据。</div>
      <div v-else class="chips">
        <button
          v-for="kp in kpList"
          :key="kp.id"
          type="button"
          class="chip"
          :class="{ active: selectedKp.includes(kp.id) }"
          @click="toggleKp(kp.id)"
        >
          {{ kp.name }}
        </button>
      </div>

      <div class="field note">
        <label class="field-label" for="paper-count">题量</label>
        <input id="paper-count" v-model.number="count" class="input count-input" type="number" min="1" max="50" />
      </div>

      <div v-if="error" class="alert alert-warning note">{{ error }}</div>

      <button class="btn btn-primary btn-block note" type="button" :disabled="generating" @click="generate">
        {{ generating ? 'AI 规划选题中，请稍候…' : '生成试卷' }}
      </button>
    </section>

    <!-- 生成结果 -->
    <section v-if="detail" class="card">
      <div class="row wrap">
        <h2 class="section-title">{{ detail.title }}</h2>
        <span class="badge badge-primary">{{ stageLabel(detail.stage) }} · {{ subjectLabel(detail.subject) }}</span>
        <span class="badge">{{ difficultyLabel(detail.difficulty) }}</span>
        <span class="badge" :class="detail.meta && detail.meta.actual < detail.meta.requested ? 'badge-warning' : 'badge-success'">
          实得 {{ detail.meta?.actual ?? detail.questions.length }} / 请求 {{ detail.meta?.requested ?? detail.count }} 题
        </span>
      </div>

      <p v-if="detail.summary" class="text-sm text-soft note">{{ detail.summary }}</p>

      <div v-if="shortages.length" class="alert alert-warning note">
        题库题量不足，以下知识点有缺口（未凑数）：
        <ul class="shortage-list">
          <li v-for="s in shortages" :key="s.knowledgePointId">
            {{ kpName(s.knowledgePointId) }}：需要 {{ s.requested }} 道，实际 {{ s.actual }} 道
          </li>
        </ul>
      </div>

      <!-- AI 选题计划 -->
      <details v-if="detail.blueprint?.length" class="plan note">
        <summary>AI 选题计划（{{ detail.blueprint.length }} 项）</summary>
        <ul class="shortage-list">
          <li v-for="(b, i) in detail.blueprint" :key="i">
            {{ kpName(b.knowledgePointId) }} · {{ questionTypeLabel(b.questionType) }} ·
            {{ difficultyLabel(b.difficulty) }} · {{ b.count }} 道
          </li>
        </ul>
      </details>

      <!-- 题目 -->
      <ol class="q-list note">
        <li v-for="(q, i) in detail.questions" :key="q.id" class="q-item">
          <div class="row wrap">
            <span class="q-no">第 {{ i + 1 }} 题</span>
            <span class="badge">{{ questionTypeLabel(q.type) }}</span>
            <span class="badge badge-primary">{{ difficultyLabel(q.difficulty) }}</span>
          </div>
          <p class="q-content">{{ q.content }}</p>
          <ul v-if="q.options?.length" class="q-options">
            <li v-for="(opt, oi) in q.options" :key="oi">{{ optionLetter(opt, oi) }}. {{ opt }}</li>
          </ul>
          <p class="text-sm text-soft answer">
            <span class="answer-label">参考答案</span>{{ q.answer || '—' }}
          </p>
          <p v-if="q.analysis" class="text-sm text-soft answer">
            <span class="answer-label">解析</span>{{ q.analysis }}
          </p>
        </li>
      </ol>
    </section>

    <!-- 历史试卷 -->
    <section class="card">
      <div class="row">
        <h2 class="section-title">我生成的试卷</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="papersLoading" @click="loadPapers">刷新</button>
      </div>

      <p v-if="papersLoading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="papers.length === 0" class="empty note">还没有生成过试卷。</div>
      <ul v-else class="papers note">
        <li v-for="p in papers" :key="p.id" class="paper-item">
          <div class="paper-main">
            <p class="paper-title">{{ p.title }}</p>
            <p class="text-xs text-faint">
              {{ stageLabel(p.stage) }} · {{ subjectLabel(p.subject) }} ·
              {{ difficultyLabel(p.difficulty) }} · {{ p.questionIds?.length ?? 0 }} 题 · {{ formatTime(p.createdAt) }}
            </p>
          </div>
          <button class="btn btn-sm" type="button" @click="openPaper(p)">查看</button>
        </li>
      </ul>
    </section>

  </div>
</template>

<style scoped>
.note {
  margin-top: 10px;
  line-height: 1.55;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.count-input {
  max-width: 140px;
}

.shortage-list {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.7;
}

.plan summary {
  cursor: pointer;
  font-size: 14px;
  color: var(--c-text-soft);
}

.q-list {
  margin: 12px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.q-item {
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--c-border);
}

.q-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.q-no {
  font-size: 14px;
  font-weight: 600;
}

.q-content {
  margin-top: 6px;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.q-options {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-size: 14px;
  line-height: 1.8;
  color: var(--c-text-soft);
}

.answer {
  margin-top: 6px;
  line-height: 1.6;
}

.answer-label {
  display: inline-block;
  margin-right: 6px;
  padding: 0 6px;
  font-size: 12px;
  color: var(--c-primary-dark);
  background: var(--c-primary-soft);
  border-radius: 4px;
}

.papers {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.paper-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.paper-main {
  flex: 1;
  min-width: 0;
}

.paper-title {
  font-size: 15px;
  font-weight: 600;
  word-break: break-all;
}
</style>
