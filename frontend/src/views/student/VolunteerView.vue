<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { volunteerApi, type VolunteerCollege, type VolunteerPlanItem } from '../../api/volunteer';
import { formatTime } from '../../utils/format';

const router = useRouter();

const score = ref<number | null>(null);
const rank = ref<number | null>(null);
const subjectsText = ref('');

const matching = ref(false);
const error = ref('');
const tip = ref('');
const active = ref<VolunteerPlanItem | null>(null);
const plans = ref<VolunteerPlanItem[]>([]);
const plansLoading = ref(false);
/** 勾选待对比的方案 id（最多两份） */
const compareIds = ref<string[]>([]);
const compareOpen = ref(false);

const TIER_META: Record<string, { label: string; hint: string; badge: string }> = {
  chong: { label: '冲一冲', hint: '录取分数略高于你的成绩，可以试试', badge: 'badge-danger' },
  wen: { label: '稳一稳', hint: '和你成绩比较匹配，把握较大', badge: 'badge-primary' },
  bao: { label: '保底', hint: '录取把握大，用来兜底', badge: 'badge-success' },
};

const subjects = computed(() =>
  subjectsText.value
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean),
);

const tierOrder = ['chong', 'wen', 'bao'];

function groupByTier(list: VolunteerCollege[]): Array<{ tier: string; items: VolunteerCollege[] }> {
  return tierOrder
    .map((tier) => ({ tier, items: list.filter((c) => c.tier === tier) }))
    .filter((g) => g.items.length > 0);
}

function tierMeta(tier: string) {
  return TIER_META[tier] ?? { label: tier, hint: '', badge: 'badge' };
}

async function match(): Promise<void> {
  error.value = '';
  if (score.value === null || rank.value === null) {
    error.value = '请填写分数和位次';
    return;
  }
  if (subjects.value.length === 0) {
    error.value = '请填写选科（如：物理、化学、生物）';
    return;
  }
  matching.value = true;
  try {
    active.value = await volunteerApi.match({
      score: Number(score.value),
      rank: Number(rank.value),
      subjects: subjects.value,
    });
    void loadPlans();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    matching.value = false;
  }
}

async function loadPlans(): Promise<void> {
  plansLoading.value = true;
  try {
    plans.value = await volunteerApi.plans();
    if (!active.value && plans.value.length > 0) active.value = plans.value[0];
    // 清理已不存在的对比选择
    const ids = new Set(plans.value.map((p) => p.id));
    compareIds.value = compareIds.value.filter((id) => ids.has(id));
  } catch {
    plans.value = [];
  } finally {
    plansLoading.value = false;
  }
}

/** 勾选/取消对比（最多两份） */
function toggleCompare(id: string): void {
  const set = new Set(compareIds.value);
  if (set.has(id)) set.delete(id);
  else if (set.size < 2) set.add(id);
  else toastCompareLimit();
  compareIds.value = Array.from(set);
}

function toastCompareLimit(): void {
  error.value = '一次最多对比两份方案';
  setTimeout(() => { error.value = ''; }, 2500);
}

const comparePair = computed(() =>
  compareIds.value
    .map((id) => plans.value.find((p) => p.id === id))
    .filter((p): p is VolunteerPlanItem => Boolean(p)),
);

async function removePlan(item: VolunteerPlanItem): Promise<void> {
  error.value = '';
  try {
    await volunteerApi.removePlan(item.id);
    tip.value = `已删除 ${item.score} 分的方案`;
    compareIds.value = compareIds.value.filter((id) => id !== item.id);
    if (active.value?.id === item.id) active.value = null;
    await loadPlans();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function viewPlan(item: VolunteerPlanItem): void {
  active.value = item;
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(loadPlans);
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">志愿匹配</h1>
      <p class="text-sm text-soft note">
        填上分数、位次和选科，帮你排一份「冲一冲、稳一稳、保底」的方案，
        并标出报考限制。方案仅供参考，最终请以官方招生政策为准 🎓
      </p>
    </section>

    <!-- 表单 -->
    <section class="card">
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="score">高考分数（或模考分数）</label>
          <input id="score" v-model.number="score" class="input" type="number" min="0" placeholder="如 520" />
        </div>
        <div class="field">
          <label class="field-label" for="rank">位次（全省排名）</label>
          <input id="rank" v-model.number="rank" class="input" type="number" min="1" placeholder="如 58000" />
        </div>
      </div>
      <div class="field note">
        <label class="field-label" for="subjects">选科（用顿号或逗号分隔）</label>
        <input id="subjects" v-model="subjectsText" class="input" type="text" placeholder="物理、化学、生物" />
      </div>

      <div v-if="error" class="alert alert-warning note">{{ error }}</div>
      <div v-if="tip" class="alert alert-success note">{{ tip }}</div>

      <button class="btn btn-primary btn-block note" type="button" :disabled="matching" @click="match">
        {{ matching ? '正在生成方案…' : '生成「冲稳保」方案' }}
      </button>
    </section>

    <!-- 方案结果 -->
    <section v-if="active" class="card">
      <div class="row wrap">
        <h2 class="section-title">志愿方案</h2>
        <span class="badge badge-primary">{{ active.score }} 分</span>
        <span class="badge">位次 {{ active.rank }}</span>
        <span class="badge">{{ active.subjects.join(' / ') }}</span>
        <span class="text-xs text-faint">{{ formatTime(active.createdAt) }}</span>
      </div>

      <div v-if="active.plans.length === 0" class="empty note">这次没有生成推荐院校。</div>

      <div v-for="group in groupByTier(active.plans)" :key="group.tier" class="tier-block">
        <div class="row">
          <span class="badge" :class="tierMeta(group.tier).badge">{{ tierMeta(group.tier).label }}</span>
          <span class="text-xs text-faint">{{ tierMeta(group.tier).hint }}</span>
        </div>
        <ul class="college-list">
          <li v-for="(c, i) in group.items" :key="`${group.tier}-${i}`" class="college-item">
            <p class="college-name">{{ c.name }}</p>
            <p v-if="c.restrictions?.length" class="text-xs text-soft">
              报考限制：{{ c.restrictions.join('；') }}
            </p>
            <p v-else class="text-xs text-faint">暂无特殊限制</p>
          </li>
        </ul>
      </div>

      <p class="text-xs text-faint note">
        ⚠️ 院校与分数为演示数据，填报前请务必核对当年官方招生计划与投档线。
      </p>
    </section>

    <!-- 历史 -->
    <section class="card">
      <div class="row wrap">
        <h2 class="section-title">历史方案</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="plansLoading" @click="loadPlans">刷新</button>
        <button
          class="btn btn-sm"
          type="button"
          :disabled="compareIds.length !== 2"
          @click="compareOpen = true"
        >
          对比所选（{{ compareIds.length }}/2）
        </button>
      </div>

      <p v-if="plansLoading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="plans.length === 0" class="empty note">还没有生成过方案，填好上面的信息试试看。</div>
      <ul v-else class="history note">
        <li v-for="p in plans" :key="p.id" class="history-item" :class="{ active: active?.id === p.id }">
          <div class="history-row">
            <label class="history-pick" :title="compareIds.includes(p.id) ? '取消选择' : '选入对比'">
              <input
                type="checkbox"
                style="width:18px;height:18px;accent-color:var(--c-primary)"
                :checked="compareIds.includes(p.id)"
                @change="toggleCompare(p.id)"
              />
            </label>
            <button class="history-btn" type="button" @click="viewPlan(p)">
              <span class="badge badge-primary">{{ p.score }} 分</span>
              <span class="text-xs text-soft">位次 {{ p.rank }}</span>
              <div class="spacer" />
              <span class="text-xs text-faint">{{ formatTime(p.createdAt) }}</span>
            </button>
            <button class="btn btn-sm history-del" type="button" @click="removePlan(p)">删除</button>
          </div>
        </li>
      </ul>
      <p class="text-xs text-faint note">勾选两份方案后点「对比所选」，可并排查看冲稳保差异。</p>
    </section>

    <!-- 对比弹层 -->
    <div v-if="compareOpen" class="preview-overlay" @click.self="compareOpen = false">
      <section class="preview-panel" role="dialog" aria-modal="true" aria-label="志愿方案对比">
        <header class="preview-head">
          <p class="preview-title">志愿方案对比</p>
          <div class="spacer" />
          <button class="btn btn-sm" type="button" @click="compareOpen = false">关闭</button>
        </header>
        <div class="preview-body">
          <div v-if="comparePair.length !== 2" class="empty">请选择两份方案。</div>
          <div v-else class="compare-grid">
            <div v-for="p in comparePair" :key="p.id" class="compare-col">
              <div class="row wrap">
                <span class="badge badge-primary">{{ p.score }} 分</span>
                <span class="badge">位次 {{ p.rank }}</span>
                <span class="text-xs text-faint">{{ formatTime(p.createdAt) }}</span>
              </div>
              <div v-for="group in groupByTier(p.plans)" :key="group.tier" class="tier-block">
                <div class="row">
                  <span class="badge" :class="tierMeta(group.tier).badge">{{ tierMeta(group.tier).label }}</span>
                  <span class="text-xs text-faint">{{ group.items.length }} 所</span>
                </div>
                <ul class="college-list">
                  <li v-for="(c, i) in group.items" :key="i" class="college-item">
                    <p class="college-name">{{ c.name }}</p>
                    <p v-if="c.restrictions?.length" class="text-xs text-soft">
                      限制：{{ c.restrictions.join('；') }}
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

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

.tier-block {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--c-border);
}

.college-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.college-item {
  padding: 10px 12px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.college-name {
  font-size: 15px;
  font-weight: 600;
}

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

.history-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-pick {
  display: grid;
  place-items: center;
  width: 34px;
  height: 44px;
  flex: none;
  cursor: pointer;
}

.history-del {
  flex: none;
  margin-right: 8px;
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 720px) {
  .compare-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.compare-col {
  padding: 12px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(58, 47, 36, 0.35);
}

.preview-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 860px;
  max-height: 88vh;
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius);
  overflow: hidden;
}

.preview-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--c-border);
}

.preview-title {
  font-size: 15px;
  font-weight: 600;
}

.preview-body {
  flex: 1;
  min-height: 120px;
  padding: 14px;
  overflow: auto;
}
</style>
