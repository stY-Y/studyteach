<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { buildNameMap, knowledgeApi } from '../../api/knowledge';
import { reportsApi, type StudyReportItem } from '../../api/reports';
import { schoolHomeApi, type ChildProgress } from '../../api/schoolhome';
import { subjectLabel } from '../../config/labels';

const router = useRouter();

const children = ref<ChildProgress[]>([]);
const loading = ref(false);
const error = ref('');
const nameMap = ref<Record<string, string>>({});

/** 每个孩子展开的学情报表（studentId → 报表列表） */
const childReports = ref<Record<string, StudyReportItem[]>>({});
const reportsLoading = ref<Record<string, boolean>>({});

const hasChildren = computed(() => children.value.length > 0);

function childName(c: ChildProgress): string {
  return c.student?.name || c.student?.username || '孩子';
}

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

/** 薄弱点按掌握度升序：最需要关注的排最前 */
function sortedWeakPoints(c: ChildProgress) {
  return [...(c.latestWeakPoints ?? [])].sort((a, b) => Number(a.mastery) - Number(b.mastery));
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 展开某个孩子的学情报表 */
async function toggleReports(c: ChildProgress): Promise<void> {
  const id = c.student?.id;
  if (!id) return;
  if (childReports.value[id]) {
    delete childReports.value[id];
    return;
  }
  reportsLoading.value[id] = true;
  try {
    childReports.value[id] = await reportsApi.student(id);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    reportsLoading.value[id] = false;
  }
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    children.value = await schoolHomeApi.childrenProgress();
  } catch (err) {
    error.value = (err as Error).message;
    children.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadNameMap(): Promise<void> {
  try {
    const list = await knowledgeApi.list();
    nameMap.value = buildNameMap(list);
  } catch {
    /* 拿不到名称时退化为展示知识点 id */
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(() => {
  void load();
  void loadNameMap();
});
</script>

<template>
  <div class="stack">
    <!-- 温馨引导 -->
    <section class="card">
      <h1 class="page-title">孩子学情</h1>
      <p class="text-sm text-soft note">
        孩子的每一点进步，都值得被看见。这里能看到孩子最近的诊断与练习情况 ——
        不用懂复杂的分数，看懂「薄弱点」就够了 🧡
      </p>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <p v-if="loading" class="text-sm text-soft">正在加载孩子的学习情况…</p>

    <!-- 未绑定孩子 -->
    <div v-else-if="!hasChildren" class="card">
      <div class="empty">
        还没有绑定孩子的账号。<br />
        联系学校管理员，输入孩子的账号完成绑定后，
        就能随时看到孩子的学习情况了。
      </div>
    </div>

    <!-- 孩子卡片 -->
    <template v-else>
      <section v-for="c in children" :key="c.student?.id ?? childName(c)" class="card">
        <div class="row wrap">
          <span class="child-avatar">{{ childName(c).slice(0, 1) }}</span>
          <div class="child-head">
            <h2 class="child-name">{{ childName(c) }}</h2>
            <p v-if="c.updatedAt" class="text-xs text-faint">最近更新：{{ formatTime(c.updatedAt) }}</p>
          </div>
          <div class="spacer" />
          <span class="badge badge-primary">诊断 {{ c.diagnosisCount }} 次</span>
          <span class="badge badge-primary">练习 {{ c.gradingCount }} 次</span>
        </div>

        <!-- 学习总评 -->
        <p class="text-sm text-soft summary">
          {{
            c.diagnosisCount === 0
              ? '孩子还没有做过知识诊断，可以提醒TA从「知识诊断」开始，找到最需要补的地方。'
              : '孩子一直在坚持学习，真棒！下面是最新的诊断情况。'
          }}
        </p>

        <!-- 薄弱点 -->
        <div v-if="sortedWeakPoints(c).length" class="block">
          <p class="block-title">最需要关注的知识点</p>
          <ul class="weak-list">
            <li v-for="wp in sortedWeakPoints(c)" :key="wp.knowledgePointId" class="weak-item">
              <div class="row">
                <span class="weak-name">{{ pointName(wp.knowledgePointId) }}</span>
                <div class="spacer" />
                <span class="badge" :class="masteryBadgeClass(wp.mastery)">
                  掌握 {{ masteryPercent(wp.mastery) }}%
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
          <p class="text-xs text-faint tip">
            💡 多陪孩子聊聊这些知识点，一句「这周补哪个」，比催促更管用。
          </p>
        </div>

        <!-- 补漏路径 -->
        <div v-if="c.latestLearningPath?.length" class="block">
          <p class="block-title">老师建议的补漏顺序</p>
          <ol class="path-list">
            <li v-for="(step, i) in c.latestLearningPath" :key="i" class="path-item">
              <span class="path-index">{{ i + 1 }}</span>
              <span class="path-text">{{ step }}</span>
            </li>
          </ol>
        </div>

        <!-- 学情报表 -->
        <div class="block">
          <button
            class="btn btn-sm"
            type="button"
            @click="toggleReports(c)"
          >
            {{ childReports[c.student?.id ?? ''] ? '收起学情报表' : '查看学情报表' }}
          </button>

          <div v-if="c.student?.id && reportsLoading[c.student.id]" class="text-sm text-soft block-body">
            报表加载中…
          </div>

          <ul v-else-if="c.student?.id && childReports[c.student.id]?.length" class="report-list">
            <li v-for="r in childReports[c.student.id]" :key="r.id" class="report-item">
              <span class="badge badge-primary">{{ subjectLabel(r.subject) }}</span>
              <span class="text-xs text-faint">{{ formatTime(r.createdAt) }}</span>
              <div class="spacer" />
              <span class="text-xs text-soft">
                {{ r.metrics?.weakPointCount ?? 0 }} 个薄弱点
              </span>
            </li>
          </ul>

          <p
            v-else-if="c.student?.id && childReports[c.student.id]"
            class="text-sm text-soft block-body"
          >
            孩子还没有生成过这个学科的报表。
          </p>
        </div>
      </section>
    </template>

    <section class="row">
      <button class="btn" type="button" @click="goHome">返回工作台</button>
    </section>
  </div>
</template>

<style scoped>
.note {
  margin-top: 8px;
  line-height: 1.55;
}

.wrap {
  flex-wrap: wrap;
  gap: 8px;
}

.child-avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: none;
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  background: var(--c-primary);
  border-radius: 50%;
}

.child-head {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.child-name {
  font-size: 17px;
}

.summary {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--c-border);
  line-height: 1.6;
}

.block {
  margin-top: 14px;
}

.block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-soft);
  margin-bottom: 6px;
}

.block-body {
  margin-top: 8px;
}

.tip {
  margin-top: 10px;
}

/* ---------- 薄弱点 ---------- */
.weak-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.weak-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
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

/* ---------- 补漏路径 ---------- */
.path-list {
  margin: 0;
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
  font-size: 14px;
  line-height: 1.6;
  padding-top: 1px;
}

/* ---------- 报表 ---------- */
.report-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.report-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 10px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}
</style>
