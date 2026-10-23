<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { gradingApi, type GradingRecord } from '../../api/grading';
import { formatTime } from '../../utils/format';

const router = useRouter();

const records = ref<GradingRecord[]>([]);
const loading = ref(false);
const error = ref('');

/** 只看错题（得分低于 100%） */
const onlyWrong = ref(false);

const visible = computed(() =>
  onlyWrong.value ? records.value.filter((r) => r.score < 1) : records.value,
);

const stats = computed(() => ({
  total: records.value.length,
  wrong: records.value.filter((r) => r.score < 1).length,
  avg: records.value.length
    ? Math.round((records.value.reduce((s, r) => s + r.score, 0) / records.value.length) * 100)
    : 0,
}));

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    records.value = await gradingApi.list();
  } catch (err) {
    error.value = (err as Error).message;
    records.value = [];
  } finally {
    loading.value = false;
  }
}

function scoreBadge(score: number): string {
  if (score >= 1) return 'badge-success';
  if (score >= 0.6) return 'badge-warning';
  return 'badge-danger';
}

function goGrading(): void {
  void router.push({ name: 'grading' });
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(load);
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">批改记录</h1>
      <p class="text-sm text-soft note">
        这里汇总你的每一次练习：得分、错因和当时的点拨。
        错题值得再看一遍 —— 看懂错因比做对十道更管用。
      </p>
      <div class="metric-grid">
        <div class="metric"><strong class="metric-num">{{ stats.total }}</strong><em>次练习</em></div>
        <div class="metric"><strong class="metric-num">{{ stats.wrong }}</strong><em>次有错</em></div>
        <div class="metric"><strong class="metric-num">{{ stats.avg }}%</strong><em>平均得分</em></div>
        <div class="metric"><strong class="metric-num">—</strong><em>覆盖知识点见下方</em></div>
      </div>
    </section>

    <section class="card">
      <div class="row wrap">
        <h2 class="section-title">共 {{ visible.length }} 条</h2>
        <div class="spacer" />
        <label class="row text-sm text-soft">
          <input v-model="onlyWrong" type="checkbox" style="width:18px;height:18px;accent-color:var(--c-primary)" />
          只看错题
        </label>
        <button class="btn btn-sm" type="button" :disabled="loading" @click="load">刷新</button>
      </div>

      <p v-if="loading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="records.length === 0" class="empty note">
        还没有练习记录。<br />
        去「智能批改」挑一道题练练手，记录会自动出现在这里。
      </div>
      <div v-else-if="visible.length === 0" class="empty note">没有错题，全部都对，太棒了 🎉</div>

      <ul v-else class="rec-list note">
        <li v-for="r in visible" :key="r.id" class="rec-item">
          <div class="row wrap">
            <span class="badge" :class="scoreBadge(r.score)">得分 {{ Math.round(r.score * 100) }}%</span>
            <span class="text-xs text-faint">{{ formatTime(r.createdAt) }}</span>
            <div class="spacer" />
            <span class="text-xs text-faint">题目 {{ r.questionId.slice(0, 8) }}…</span>
          </div>

          <div v-if="r.errorAnalysis" class="rec-block">
            <p class="rec-label">错因分析</p>
            <p class="text-sm" style="line-height:1.7">{{ r.errorAnalysis }}</p>
          </div>

          <div v-if="r.hints?.length" class="rec-block">
            <p class="rec-label">当时的点拨</p>
            <ol class="text-sm" style="margin:0;padding-left:18px;line-height:1.8">
              <li v-for="(h, i) in r.hints" :key="i">{{ h }}</li>
            </ol>
          </div>

          <p v-if="!r.errorAnalysis && !r.hints?.length" class="text-xs text-faint">
            这条记录没有保存错因（早期版本），重新练一次即可生成。
          </p>
        </li>
      </ul>
    </section>

    <section class="row wrap">
      <button class="btn btn-primary" type="button" @click="goGrading">再练一道</button>
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
  gap: 8px;
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
  border: 1px solid var(--c-border-warm);
  border-radius: var(--radius-sm);
}

.metric em {
  font-style: normal;
  font-size: 12px;
  color: var(--c-text-soft);
  text-align: center;
}

.metric-num {
  font-size: 22px;
  font-weight: 600;
  color: var(--c-primary-dark);
}

.rec-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rec-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.rec-block {
  padding-top: 8px;
  border-top: 1px dashed var(--c-border);
}

.rec-label {
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text-soft);
}
</style>
