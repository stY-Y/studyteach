<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { buildNameMap, knowledgeApi } from '../../api/knowledge';
import { reportsApi, type StudyReportItem } from '../../api/reports';
import { usersApi, type StudentListItem } from '../../api/users';
import { subjectLabel } from '../../config/labels';
import { formatTime } from '../../utils/format';

const router = useRouter();
const route = useRoute();

/** 从「我的班级」进入时按班级预筛选（className + grade 共同定位） */
const classNameFilter = computed(() =>
  typeof route.query.className === 'string' ? route.query.className : '',
);
const gradeFilter = computed(() =>
  typeof route.query.grade === 'string' ? route.query.grade : '',
);
const scopedStudents = computed(() => {
  const cn = classNameFilter.value;
  const gr = gradeFilter.value;
  if (!cn) return students.value;
  return students.value.filter((s) => s.className === cn && (!gr || s.grade === gr));
});

const students = ref<StudentListItem[]>([]);
const keyword = ref('');
const loading = ref(false);
const error = ref('');
const tip = ref('');

const selectedId = ref('');
const reports = ref<StudyReportItem[]>([]);
const detailLoading = ref(false);
const kpNames = ref<Record<string, string>>({});

const visibleStudents = computed(() => {
  const kw = keyword.value.trim();
  const base = scopedStudents.value;
  if (!kw) return base;
  return base.filter((s) => (s.name || s.username).includes(kw));
});

/** 清除班级筛选，回到全部学生 */
function clearClassFilter(): void {
  void router.replace({ name: 'students' });
}

const latest = computed<StudyReportItem | null>(() => reports.value[0] ?? null);

function masteryClass(mastery: number): string {
  if (mastery < 40) return 'low';
  if (mastery < 70) return 'mid';
  return 'high';
}

function masteryBadge(mastery: number): string {
  if (mastery < 40) return 'badge-danger';
  if (mastery < 70) return 'badge-warning';
  return 'badge-success';
}

async function loadStudents(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    students.value = await usersApi.students();
  } catch (err) {
    error.value = (err as Error).message;
    students.value = [];
  } finally {
    loading.value = false;
  }
}

async function selectStudent(item: StudentListItem): Promise<void> {
  selectedId.value = item.id;
  detailLoading.value = true;
  error.value = '';
  try {
    reports.value = await reportsApi.student(item.id);
  } catch (err) {
    error.value = (err as Error).message;
    reports.value = [];
  } finally {
    detailLoading.value = false;
  }
}

async function loadKpNames(): Promise<void> {
  try {
    kpNames.value = buildNameMap(await knowledgeApi.list());
  } catch {
    kpNames.value = {};
  }
}

function studentLabel(s: StudentListItem): string {
  return s.name || s.username;
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(() => {
  void loadStudents();
  void loadKpNames();
});
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">学情查看</h1>
      <p class="text-sm text-soft note">
        选择本班学生，查看诊断与练习汇总。数据不排名、不打分，只为及时拉一把需要帮助的孩子。
      </p>
      <div v-if="classNameFilter" class="row wrap note">
        <span class="badge badge-primary">
          当前班级：{{ gradeFilter }} {{ classNameFilter }}
        </span>
        <span class="text-xs text-faint">共 {{ scopedStudents.length }} 名学生</span>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" @click="clearClassFilter">查看全部学生</button>
      </div>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <!-- 学生列表 -->
    <section class="card">
      <div class="row">
        <h2 class="section-title">学生（{{ scopedStudents.length }}）</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="loadStudents">刷新</button>
      </div>

      <div class="field note">
        <input v-model="keyword" class="input" type="search" placeholder="按姓名搜索" />
      </div>

      <p v-if="loading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="students.length === 0" class="empty note">
        还没有看到学生。<br />
        教师账号需要先绑定学校（schoolId），且学校下已有学生账号。
      </div>
      <div v-else-if="visibleStudents.length === 0" class="empty note">没有匹配的学生。</div>

      <ul v-else class="stu-list note">
        <li
          v-for="s in visibleStudents"
          :key="s.id"
          class="stu-item"
          :class="{ active: selectedId === s.id }"
        >
          <button class="stu-btn" type="button" @click="selectStudent(s)">
            <span class="stu-avatar">{{ studentLabel(s).slice(0, 1) }}</span>
            <span class="stu-main">
              <span class="stu-name">{{ studentLabel(s) }}</span>
              <span class="text-xs text-faint">
                {{ s.grade || '未填年级' }}<template v-if="s.className"> · {{ s.className }}</template>
              </span>
            </span>
            <span class="text-xs text-faint">查看</span>
          </button>
        </li>
      </ul>
    </section>

    <!-- 学情详情 -->
    <section v-if="selectedId" class="card">
      <div class="row wrap">
        <h2 class="section-title">学情报表</h2>
        <span class="badge badge-primary">共 {{ reports.length }} 份</span>
        <div class="spacer" />
        <span class="text-xs text-faint">只看最近一次汇总</span>
      </div>

      <p v-if="detailLoading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="reports.length === 0" class="empty note">
        这个学生还没有生成过学情报表。<br />
        让学生在自己的「我的学情」里点一次「生成最新学情」即可。
      </div>

      <template v-else-if="latest">
        <div class="row wrap note">
          <span class="badge badge-primary">{{ subjectLabel(latest.subject) }}</span>
          <span class="text-xs text-faint">{{ formatTime(latest.createdAt) }}</span>
        </div>

        <div class="metric-grid">
          <div class="metric">
            <strong class="metric-num">{{ latest.metrics?.diagnosisCount ?? 0 }}</strong>
            <em>次知识诊断</em>
          </div>
          <div class="metric">
            <strong class="metric-num">{{ latest.metrics?.gradingCount ?? 0 }}</strong>
            <em>次智能批改</em>
          </div>
          <div class="metric">
            <strong class="metric-num">{{ latest.metrics?.weakPointCount ?? 0 }}</strong>
            <em>个薄弱知识点</em>
          </div>
          <div class="metric">
            <strong class="metric-num">{{
              latest.metrics?.avgScore !== undefined
                ? `${Math.round(latest.metrics.avgScore * 100)}%`
                : '—'
            }}</strong>
            <em>练习平均得分</em>
          </div>
        </div>

        <p class="section-title note">薄弱知识点（按掌握度升序）</p>
        <ul v-if="latest.metrics?.weakPoints?.length" class="weak-list">
          <li
            v-for="w in [...latest.metrics.weakPoints].sort((a, b) => a.mastery - b.mastery)"
            :key="w.id"
            class="weak-item"
          >
            <div class="row">
              <span class="weak-name">{{ kpNames[w.id] ?? w.id }}</span>
              <div class="spacer" />
              <span class="badge" :class="masteryBadge(w.mastery)">掌握度 {{ w.mastery }}%</span>
            </div>
            <div class="bar">
              <div class="bar-fill" :class="masteryClass(w.mastery)" :style="{ width: w.mastery + '%' }"></div>
            </div>
          </li>
        </ul>
        <p v-else class="text-sm text-soft note">暂无薄弱点数据。</p>

        <p class="text-xs text-faint note">
          更早的报表共 {{ reports.length }} 份，可按学科在学生端「我的学情」查看趋势。
        </p>
      </template>
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

.stu-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stu-item {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.stu-item.active {
  border-color: var(--c-primary);
}

.stu-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 15px;
  color: var(--c-text);
  background: var(--c-surface);
  cursor: pointer;
  text-align: left;
}

.stu-item.active .stu-btn {
  background: var(--c-primary-soft);
}

.stu-avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--c-primary);
  border-radius: 50%;
}

.stu-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.stu-name {
  font-weight: 600;
}

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
  font-weight: 600;
  color: var(--c-primary-dark);
}

.metric em {
  font-style: normal;
  font-size: 12px;
  color: var(--c-text-soft);
}

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
</style>
