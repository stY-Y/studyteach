<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { volunteerApi, type CollegeItem } from '../../api/volunteer';
import { VOLUNTEER_TIER_LABELS } from '../../config/labels';

const router = useRouter();

const year = ref<number | null>(null);
const list = ref<CollegeItem[]>([]);
const loading = ref(false);
const error = ref('');
const tip = ref('');

/** 按地区分组，便于家长和学生浏览 */
const grouped = ref<Array<{ region: string; items: CollegeItem[] }>>([]);

function group(items: CollegeItem[]): Array<{ region: string; items: CollegeItem[] }> {
  const map = new Map<string, CollegeItem[]>();
  items.forEach((c) => {
    const key = c.region || '其他地区';
    const bucket = map.get(key) ?? [];
    bucket.push(c);
    map.set(key, bucket);
  });
  return Array.from(map.entries())
    .map(([region, items]) => ({ region, items }))
    .sort((a, b) => a.region.localeCompare(b.region));
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    list.value = await volunteerApi.colleges(year.value ?? undefined);
    grouped.value = group(list.value);
  } catch (err) {
    error.value = (err as Error).message;
    list.value = [];
    grouped.value = [];
  } finally {
    loading.value = false;
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

function goVolunteer(): void {
  void router.push({ name: 'volunteer' });
}

onMounted(load);
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">院校库</h1>
      <p class="text-sm text-soft note">
        看看有哪些学校可以报：历年最低录取位次、开设专业、报考限制都在这里。
        数据每年由平台同步更新，填报前请以官方发布为准。
      </p>
    </section>

    <section class="card">
      <div class="row wrap">
        <div class="field year-field">
          <label class="field-label" for="col-year">年份（留空＝全部）</label>
          <input
            id="col-year"
            v-model.number="year"
            class="input"
            type="number"
            min="2000"
            max="2100"
            placeholder="如 2024"
          />
        </div>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="load">查询</button>
        <button class="btn btn-sm" type="button" @click="goVolunteer">去生成志愿方案</button>
      </div>
      <p class="text-xs text-faint note">共 {{ list.length }} 所院校 · 按最低录取位次排序</p>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <section class="card">
      <p v-if="loading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="grouped.length === 0" class="empty note">
        还没有院校数据。<br />
        管理员可在「升学数据」里维护，或先运行种子脚本。
      </div>

      <div v-else class="stack">
        <div v-for="g in grouped" :key="g.region" class="region-block">
          <h2 class="region-title">{{ g.region }}</h2>
          <ul class="col-list">
            <li v-for="c in g.items" :key="c.id" class="col-item">
              <div class="row wrap">
                <span class="col-name">{{ c.name }}</span>
                <span v-if="c.type" class="badge">{{ c.type }}</span>
                <span class="badge">{{ c.year }} 年</span>
                <div class="spacer" />
                <span v-if="c.minRank" class="badge badge-primary">最低位次 {{ c.minRank }}</span>
              </div>
              <div v-if="c.majors?.length" class="row wrap note">
                <span class="text-xs text-faint">开设专业</span>
                <span v-for="m in c.majors" :key="m" class="badge">{{ m }}</span>
              </div>
              <div v-if="c.requirements?.length" class="note">
                <p class="text-xs text-faint">报考限制</p>
                <ul class="req-list">
                  <li v-for="(r, i) in c.requirements" :key="i">{{ r }}</li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="card">
      <p class="text-xs text-faint note">
        提示：位次是「全省排名」，比分数更稳定。填志愿时先看位次，再看分数。
        {{ VOLUNTEER_TIER_LABELS.chong }}、{{ VOLUNTEER_TIER_LABELS.wen }}、{{ VOLUNTEER_TIER_LABELS.bao }} 三档可在「志愿匹配」里自动生成。
      </p>
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
  gap: 6px;
}

.year-field {
  max-width: 200px;
}

.region-block {
  margin-top: 12px;
}

.region-block:first-child {
  margin-top: 0;
}

.region-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-primary-dark);
}

.col-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.col-item {
  padding: 10px 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.col-name {
  font-size: 15px;
  font-weight: 600;
}

.req-list {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--c-text-soft);
}
</style>
