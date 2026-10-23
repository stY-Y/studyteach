<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { enrollmentApi, type EnrollmentItem, type UpsertEnrollmentBody } from '../../api/enrollment';
import { formatDate } from '../../utils/format';

const router = useRouter();

const CATEGORIES: Array<{ value: UpsertEnrollmentBody['category']; label: string }> = [
  { value: 'policy', label: '招生政策' },
  { value: 'score_line', label: '投档线' },
  { value: 'subject_requirement', label: '选科要求' },
];

const filterCategory = ref<string>('');
const filterYear = ref<number | null>(null);

const list = ref<EnrollmentItem[]>([]);
const loading = ref(false);
const error = ref('');
const tip = ref('');

/* ---------- 新增 / 更新 ---------- */
const showForm = ref(false);
const saving = ref(false);
const saveError = ref('');
const form = ref({
  year: new Date().getFullYear(),
  region: '',
  category: 'policy' as UpsertEnrollmentBody['category'],
  title: '',
  content: '',
});

function categoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    list.value = await enrollmentApi.list({
      year: filterYear.value ?? undefined,
      category: filterCategory.value || undefined,
    });
  } catch (err) {
    error.value = (err as Error).message;
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  saveError.value = '';
  if (!form.value.title.trim() || !form.value.content.trim()) {
    saveError.value = '请填写标题与内容';
    return;
  }
  saving.value = true;
  try {
    await enrollmentApi.upsert({
      year: Number(form.value.year) || new Date().getFullYear(),
      region: form.value.region.trim() || undefined,
      category: form.value.category,
      title: form.value.title.trim(),
      content: form.value.content.trim(),
    });
    tip.value = '已保存。';
    form.value = {
      year: form.value.year,
      region: form.value.region,
      category: form.value.category,
      title: '',
      content: '',
    };
    showForm.value = false;
    await load();
  } catch (err) {
    saveError.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

onMounted(load);
</script>

<template>
  <div class="stack">
    <section class="card">
      <div class="row wrap">
        <h1 class="page-title">升学数据</h1>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" @click="showForm = !showForm">
          {{ showForm ? '收起录入' : '＋ 录入 / 更新' }}
        </button>
      </div>
      <p class="text-sm text-soft note">
        招生政策、投档线、选科要求每年同步一次。请以官方发布为准，避免学生按旧数据填报。
      </p>
    </section>

    <!-- 录入 -->
    <section v-if="showForm" class="card">
      <h2 class="section-title">录入 / 更新数据</h2>
      <div class="form-grid note">
        <div class="field">
          <label class="field-label" for="e-year">年份</label>
          <input id="e-year" v-model.number="form.year" class="input" type="number" min="2000" max="2100" />
        </div>
        <div class="field">
          <label class="field-label">分类</label>
          <select v-model="form.category" class="input">
            <option v-for="c in CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="e-region">地区（可空＝全国）</label>
          <input id="e-region" v-model="form.region" class="input" type="text" placeholder="如：云南省" />
        </div>
        <div class="field">
          <label class="field-label" for="e-title">标题</label>
          <input id="e-title" v-model="form.title" class="input" type="text" placeholder="如：2026 年普通高校招生工作规定" />
        </div>
      </div>

      <div class="field note">
        <label class="field-label" for="e-content">内容</label>
        <textarea
          id="e-content"
          v-model="form.content"
          class="input textarea"
          rows="5"
          placeholder="粘贴官方原文要点，便于学生和家长直接查看"
        />
      </div>

      <div v-if="saveError" class="alert alert-warning note">{{ saveError }}</div>
      <button class="btn btn-primary btn-block note" type="button" :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </section>

    <!-- 筛选 -->
    <section class="card">
      <h2 class="section-title">筛选</h2>
      <div class="chips">
        <button type="button" class="chip" :class="{ active: filterCategory === '' }" @click="filterCategory = ''; load()">
          全部分类
        </button>
        <button
          v-for="c in CATEGORIES"
          :key="c.value"
          type="button"
          class="chip"
          :class="{ active: filterCategory === c.value }"
          @click="filterCategory = c.value; load()"
        >
          {{ c.label }}
        </button>
      </div>
      <div class="field note year-field">
        <label class="field-label" for="e-filter-year">年份（留空＝全部）</label>
        <input id="e-filter-year" v-model.number="filterYear" class="input" type="number" placeholder="如 2026" />
      </div>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <section class="card">
      <div class="row">
        <h2 class="section-title">共 {{ list.length }} 条</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="load">刷新</button>
      </div>

      <p v-if="loading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="list.length === 0" class="empty note">
        还没有升学数据。点右上角「录入 / 更新」添加，学生端与志愿匹配都会用到。
      </div>

      <ul v-else class="data-list note">
        <li v-for="item in list" :key="item.id" class="data-item">
          <div class="row wrap">
            <span class="badge badge-primary">{{ item.year }} 年</span>
            <span class="badge">{{ categoryLabel(item.category) }}</span>
            <span v-if="item.region" class="badge">{{ item.region }}</span>
            <span class="text-xs text-faint">{{ formatDate(item.createdAt) }}</span>
          </div>
          <p class="data-title">{{ item.title }}</p>
          <p class="data-content text-sm text-soft">{{ item.content }}</p>
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

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
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

.textarea {
  min-height: 110px;
  padding: 10px 12px;
  line-height: 1.6;
  resize: vertical;
}

.year-field {
  max-width: 200px;
}

.data-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-item {
  padding: 10px 12px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.data-title {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
}

.data-content {
  margin-top: 4px;
  line-height: 1.65;
  white-space: pre-wrap;
}
</style>
