<script setup lang="ts">
import type { StudyStage, Subject } from '@teachstudy/shared';
import { computed } from 'vue';
import type { SubmitDiagnosisResult, WeakPoint } from '../../api/diagnosis';
import { stageLabel, subjectLabel } from '../../config/labels';
import DiagnosisReview from './DiagnosisReview.vue';

const props = defineProps<{
  result: SubmitDiagnosisResult;
  elapsedMs: number;
  /** 知识点 id → 名称 */
  nameMap: Record<string, string>;
  subject: Subject;
  /** 学段（用于展示） */
  stage?: StudyStage | null;
}>();

const emit = defineEmits<{ retry: []; home: [] }>();

const weakPoints = computed<WeakPoint[]>(() => props.result.weakPoints ?? []);
const stats = computed(
  () => props.result.stats ?? { total: 0, correct: 0, wrong: 0, unanswered: 0, accuracy: 0 },
);
const review = computed(() => props.result.review ?? []);
const accuracyPercent = computed(() => Math.round(stats.value.accuracy * 100));
const learningPath = computed<string[]>(() => props.result.learningPath ?? []);

/** 需求要求「10 秒内输出精准知识薄弱点清单」 */
const withinTenSeconds = computed(() => props.elapsedMs <= 10000);
const elapsedText = computed(() =>
  props.elapsedMs < 1000
    ? `${props.elapsedMs} 毫秒`
    : `${(props.elapsedMs / 1000).toFixed(1)} 秒`,
);

function pointName(id: string): string {
  return props.nameMap[id] ?? id;
}

function masteryPercent(wp: WeakPoint): number {
  const value = Number(wp.mastery);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function masteryBadge(wp: WeakPoint): string {
  const level = masteryClass(wp);
  if (level === 'low') return 'badge-danger';
  if (level === 'mid') return 'badge-warning';
  return 'badge-success';
}

function masteryClass(wp: WeakPoint): string {
  const p = masteryPercent(wp);
  if (p < 40) return 'low';
  if (p < 70) return 'mid';
  return 'high';
}
</script>

<template>
  <div class="stack">
    <!-- 概览 -->
    <section class="card">
      <div class="row wrap">
        <h1 class="page-title">诊断完成</h1>
        <span class="badge badge-primary">{{ stageLabel(stage) }} · {{ subjectLabel(subject) }}</span>
        <span class="badge" :class="withinTenSeconds ? 'badge-success' : 'badge'">
          耗时 {{ elapsedText }}
        </span>
        <div class="spacer" />
        <span class="badge badge-warning">{{ weakPoints.length }} 个薄弱点</span>
      </div>
      <!-- 成绩概览 -->
      <div class="stats">
        <span class="stat">
          <strong>{{ stats.correct }}</strong>
          <em>/ {{ stats.total }} 题正确</em>
        </span>
        <span class="stat">
          <strong>{{ accuracyPercent }}%</strong>
          <em>正确率</em>
        </span>
        <span v-if="stats.unanswered > 0" class="stat">
          <strong>{{ stats.unanswered }}</strong>
          <em>题未作答</em>
        </span>
      </div>

      <p class="text-sm text-soft note">
        {{
          withinTenSeconds
            ? '已在你要求的 10 秒内完成诊断分析。'
            : '本次分析耗时较长，可尝试更换更快的模型（如 glm-4-flash）。'
        }}
      </p>
    </section>

    <!-- 薄弱点清单 -->
    <section class="card">
      <h2 class="section-title">知识薄弱点清单</h2>

      <div v-if="weakPoints.length === 0" class="alert alert-success note">
        本次未发现明显薄弱点，掌握情况良好，可以挑战更高难度的题目。
      </div>

      <ul v-else class="weak-list">
        <li v-for="wp in weakPoints" :key="wp.knowledgePointId" class="weak-item">
          <div class="row">
            <span class="weak-name">{{ pointName(wp.knowledgePointId) }}</span>
            <div class="spacer" />
            <span class="badge" :class="masteryBadge(wp)">
              掌握度 {{ masteryPercent(wp) }}%
            </span>
          </div>
          <div class="bar">
            <div class="bar-fill" :class="masteryClass(wp)" :style="{ width: masteryPercent(wp) + '%' }" />
          </div>
          <p v-if="wp.reason" class="text-sm text-soft reason">{{ wp.reason }}</p>
        </li>
      </ul>
    </section>

    <!-- 补漏学习路径 -->
    <section class="card">
      <h2 class="section-title">个性化补漏学习路径</h2>

      <div v-if="learningPath.length === 0" class="text-sm text-soft note">
        暂无补漏建议。
      </div>

      <ol v-else class="path-list">
        <li v-for="(step, i) in learningPath" :key="i" class="path-item">
          <span class="path-index">{{ i + 1 }}</span>
          <span class="path-text">{{ step }}</span>
        </li>
      </ol>
    </section>

    <!-- 逐题解析：正确答案与解析 -->
    <DiagnosisReview :review="review" :name-map="nameMap" />

    <!-- 操作 -->
    <section class="row wrap">
      <button class="btn btn-primary" type="button" @click="emit('retry')">再测一次</button>
      <button class="btn" type="button" @click="emit('home')">返回工作台</button>
    </section>
  </div>
</template>

<style scoped>
.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--c-border);
}

.stat {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.stat strong {
  font-size: 22px;
  color: var(--c-primary);
}

.stat em {
  font-style: normal;
  font-size: 13px;
  color: var(--c-text-soft);
}

.note {
  margin-top: 8px;
  line-height: 1.55;
}

.weak-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  background: #eef0f3;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.2s;
}

.bar-fill.low {
  background: #dc2626;
}

.bar-fill.mid {
  background: #d97706;
}

.bar-fill.high {
  background: #16a34a;
}

.reason {
  line-height: 1.55;
}

.path-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.path-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.path-index {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: var(--c-primary);
  border-radius: 50%;
}

.path-text {
  flex: 1;
  line-height: 1.6;
  padding-top: 1px;
}
</style>