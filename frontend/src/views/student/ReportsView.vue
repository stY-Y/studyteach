<script setup lang="ts">
import { Subject } from '@teachstudy/shared';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { buildNameMap, knowledgeApi } from '../../api/knowledge';
import { reportsApi, type StudyReportItem } from '../../api/reports';
import { subjectLabel, SUBJECT_OPTIONS } from '../../config/labels';

const router = useRouter();

const subject = ref<Subject>(Subject.MATH);
const generating = ref(false);
const error = ref('');

/** 最近一次生成 / 选中的报表 */
const active = ref<StudyReportItem | null>(null);

const history = ref<StudyReportItem[]>([]);
const historyLoading = ref(false);
const nameMap = ref<Record<string, string>>({});

const metrics = computed(() => active.value?.metrics ?? null);

const avgScorePercent = computed(() => {
  const v = Number(metrics.value?.avgScore ?? 0);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v * 100)));
});

/** 弱知识点按掌握度升序（最弱的排最前，先补最急的） */
const weakPoints = computed(() => {
  const list = metrics.value?.weakPoints ?? [];
  return [...list].sort((a, b) => Number(a.mastery) - Number(b.mastery));
});

function pointName(id: string): string {
  return nameMap.value[id] ?? id;
}

function masteryPercent(mastery: number): number {
  const v = Number(mastery);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v * 100)));
}

function masteryClass(mastery: number): string {
  const p = masteryPercent(mastery);
  if (p < 40) return 'low';
  if (p < 70) return 'mid';
  return 'high';
}

function masteryBadgeClass(mastery: number): string {
  const level = masteryClass(mastery);
  if (level === 'low') return 'badge-danger';
  if (level === 'mid') return 'badge-warning';
  return 'badge-success';
}

async function generate(): Promise<void> {
  error.value = '';
  generating.value = true;
  try {
    active.value = await reportsApi.generate(subject.value);
    void loadHistory();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    generating.value = false;
  }
}

async function loadHistory(): Promise<void> {
  historyLoading.value = true;
  try {
    history.value = await reportsApi.mine();
    // 没有手动生成过时，直接展示最近一份历史报表
    if (!active.value && history.value.length > 0) {
      active.value = history.value[0];
    }
  } catch {
    history.value = [];
  } finally {
    historyLoading.value = false;
  }
}

function viewReport(item: StudyReportItem): void {
  active.value = item;
}

async function loadNameMap(): Promise<void> {
  try {
    const list = await knowledgeApi.list();
    nameMap.value = buildNameMap(list);
  } catch {
    /* 拿不到名称时退化为展示知识点 id */
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(() => {
  void loadNameMap();
  void loadHistory();
});
</script>

<template>
  <div class="stack">
    <!-- 选择学科并生成 -->
    <section class="card">
      <h1 class="page-title">我的学情</h1>
      <p class="text-sm text-soft note">
        汇总你的诊断与练习记录，生成一份简单好懂的学情小结 ——
        不打分、不排名，只为帮你看到自己的进步 📈
      </p>

      <h2 class="section-title chips-title">选择学科</h2>
      <div class="chips">
        <button
          v-for="item in SUBJECT_OPTIONS"
          :key="item.value"
          type="button"
          class="chip"
          :class="{ active: subject === item.value }"
          @click="subject = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-if="error" class="alert alert-warning note">{{ error }}</div>

      <button class="btn btn-primary btn-block gen" type="button" :disabled="generating" @click="generate">
        {{ generating ? '正在生成…' : '生成最新学情' }}
      </button>
    </section>

    <!-- 学情小结 -->
    <section v-if="active" class="card">
      <div class="row wrap">
        <h2 class="section-title">{{ subjectLabel(active.subject) }} · 学情小结</h2>
        <span class="badge badge-primary">{{ formatTime(active.createdAt) }}</span>
      </div>

      <!-- 指标卡 -->
      <div class="metric-grid">
        <div class="metric">
          <strong class="metric-num">{{ metrics?.diagnosisCount ?? 0 }}</strong>
          <em>次知识诊断</em>
        </div>
        <div class="metric">
          <strong class="metric-num">{{ metrics?.gradingCount ?? 0 }}</strong>
          <em>次智能批改</em>
        </div>
        <div class="metric">
          <strong class="metric-num">{{ metrics?.weakPointCount ?? 0 }}</strong>
          <em>个薄弱知识点</em>
        </div>
        <div class="metric">
          <strong class="metric-num">{{ avgScorePercent }}%</strong>
          <em>练习平均得分</em>
        </div>
      </div>

      <p class="text-sm text-soft metric-note">
        {{
          (metrics?.diagnosisCount ?? 0) === 0 && (metrics?.gradingCount ?? 0) === 0
            ? '这个学科还没有学习记录，先去做一次知识诊断或练一道题吧。'
            : '每一份数据都是你努力的痕迹，坚持就能看到变化。'
        }}
      </p>
    </section>

    <!-- 薄弱知识点 -->
    <section v-if="active" class="card">
      <h2 class="section-title">建议优先补的知识点</h2>

      <div v-if="weakPoints.length === 0" class="empty note">
        暂无薄弱知识点 —— 要么掌握得不错，要么还没开始这个学科的诊断，都很好 🌟
      </div>

      <ul v-else class="weak-list">
        <li v-for="wp in weakPoints" :key="wp.id" class="weak-item">
          <div class="row">
            <span class="weak-name">{{ pointName(wp.id) }}</span>
            <div class="spacer" />
            <span class="badge" :class="masteryBadgeClass(wp.mastery)">
              掌握度 {{ masteryPercent(wp.mastery) }}%
            </span>
          </div>
          <div class="bar">
            <div
              class="bar-fill"
              :class="masteryClass(wp.mastery)"
              :style="{ width: masteryPercent(wp.mastery) + '%' }"
            />
          </div>
        </li>
      </ul>
    </section>

    <!-- 历史报表 -->
    <section class="card">
      <div class="row">
        <h2 class="section-title">历史报表</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="historyLoading" @click="loadHistory">
          刷新
        </button>
      </div>

      <p v-if="historyLoading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="history.length === 0" class="empty note">
        还没有报表。选好学科后点「生成最新学情」，几秒钟就好。
      </div>
      <ul v-else class="history note">
        <li
          v-for="item in history"
          :key="item.id"
          class="history-item"
          :class="{ active: active?.id === item.id }"
        >
          <button class="history-btn" type="button" @click="viewReport(item)">
            <span class="badge badge-primary">{{ subjectLabel(item.subject) }}</span>
            <span class="text-xs text-faint">{{ formatTime(item.createdAt) }}</span>
            <div class="spacer" />
            <span class="text-xs text-soft">
              {{ item.metrics?.weakPointCount ?? 0 }} 个薄弱点
            </span>
          </button>
        </li>
      </ul>
    </section>

  </div>
</template>

<style scoped>
.note {
  margin-top: 8px;
  line-height: 1.55;
}

.chips-title {
  margin-top: 14px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.gen {
  margin-top: 14px;
}

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

/* ---------- 指标 ---------- */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 12px;
}

@media (min-width: 640px) {
  .metric-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 8px;
  background: var(--c-primary-soft);
  border: 1px solid #eed7b5;
  border-radius: var(--radius-sm);
}

.metric-num {
  font-size: 22px;
  color: var(--c-primary-dark);
}

.metric em {
  font-style: normal;
  font-size: 12px;
  color: var(--c-text-soft);
}

.metric-note {
  margin-top: 10px;
}

/* ---------- 薄弱点 ---------- */
.weak-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weak-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.weak-name {
  font-size: 15px;
  font-weight: 600;
}

.bar {
  height: 8px;
  background: #f3ecdc;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.2s;
}

.bar-fill.low {
  background: var(--c-danger);
}

.bar-fill.mid {
  background: var(--c-primary);
}

.bar-fill.high {
  background: var(--c-success);
}

/* ---------- 历史 ---------- */
.history {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.history-item.active {
  border-color: var(--c-primary);
}

.history-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 0 10px;
  font-family: inherit;
  background: var(--c-surface);
  cursor: pointer;
  text-align: left;
}

.history-item.active .history-btn {
  background: var(--c-primary-soft);
}
</style>
