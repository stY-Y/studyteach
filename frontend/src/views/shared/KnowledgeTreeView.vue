<script setup lang="ts">
import { StudyStage, Subject } from '@teachstudy/shared';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { knowledgeApi, type KnowledgeNode } from '../../api/knowledge';
import { stageLabel, STAGE_OPTIONS, SUBJECT_OPTIONS } from '../../config/labels';

const router = useRouter();

const subject = ref<Subject | undefined>(undefined);
const tree = ref<KnowledgeNode[]>([]);
const loading = ref(false);
const error = ref('');
const tip = ref('');

/** 树扁平化（带层级），避免递归组件与深层嵌套渲染开销 */
interface FlatRow {
  node: KnowledgeNode;
  depth: number;
}

const flat = computed<FlatRow[]>(() => {
  const rows: FlatRow[] = [];
  const walk = (nodes: KnowledgeNode[], depth: number): void => {
    nodes.forEach((n) => {
      rows.push({ node: n, depth });
      if (n.children?.length) walk(n.children, depth + 1);
    });
  };
  walk(tree.value, 0);
  return rows;
});

/* ---------- 新增知识点 ---------- */
const showForm = ref(false);
const creating = ref(false);
const createError = ref('');
const form = ref({
  code: '',
  name: '',
  subject: Subject.MATH,
  stage: StudyStage.JUNIOR as StudyStage | '',
  parentId: '',
  description: '',
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    tree.value = await knowledgeApi.tree(subject.value);
  } catch (err) {
    error.value = (err as Error).message;
    tree.value = [];
  } finally {
    loading.value = false;
  }
}

/** 父节点候选：当前树的全部节点（不含自身新增场景，够用） */
const parentOptions = computed(() => flat.value.map((r) => ({ id: r.node.id, name: r.node.name, depth: r.depth })));

async function create(): Promise<void> {
  createError.value = '';
  if (!form.value.code.trim() || !form.value.name.trim()) {
    createError.value = '请填写编码与名称';
    return;
  }
  creating.value = true;
  try {
    await knowledgeApi.create({
      code: form.value.code.trim(),
      name: form.value.name.trim(),
      subject: form.value.subject,
      stage: form.value.stage || undefined,
      parentId: form.value.parentId || undefined,
      description: form.value.description.trim() || undefined,
    });
    tip.value = `已新增知识点「${form.value.name.trim()}」`;
    form.value = {
      code: '',
      name: '',
      subject: form.value.subject,
      stage: form.value.stage,
      parentId: '',
      description: '',
    };
    showForm.value = false;
    await load();
  } catch (err) {
    createError.value = (err as Error).message;
  } finally {
    creating.value = false;
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

watch(subject, () => {
  void load();
});

onMounted(load);
</script>

<template>
  <div class="stack">
    <section class="card">
      <div class="row wrap">
        <h1 class="page-title">知识图谱</h1>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" @click="showForm = !showForm">
          {{ showForm ? '收起新增' : '＋ 新增知识点' }}
        </button>
      </div>
      <p class="text-sm text-soft note">
        全学段结构化知识树。题目与资源都挂在知识点上，诊断和组卷才能「按点取题」。
      </p>
    </section>

    <!-- 新增 -->
    <section v-if="showForm" class="card">
      <h2 class="section-title">新增知识点</h2>
      <div class="form-grid note">
        <div class="field">
          <label class="field-label" for="kp-code">编码（唯一，如 MATH-8-05）</label>
          <input id="kp-code" v-model="form.code" class="input" type="text" placeholder="MATH-8-05" />
        </div>
        <div class="field">
          <label class="field-label" for="kp-name">名称</label>
          <input id="kp-name" v-model="form.name" class="input" type="text" placeholder="如：一元一次方程" />
        </div>
        <div class="field">
          <label class="field-label">学科</label>
          <select v-model="form.subject" class="input">
            <option v-for="s in SUBJECT_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">学段（可空）</label>
          <select v-model="form.stage" class="input">
            <option value="">不限</option>
            <option v-for="s in STAGE_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">上级知识点（可空＝根节点）</label>
          <select v-model="form.parentId" class="input">
            <option value="">作为根节点</option>
            <option v-for="p in parentOptions" :key="p.id" :value="p.id">
              {{ '　'.repeat(p.depth) }}{{ p.name }}
            </option>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="kp-desc">说明（可空）</label>
          <input id="kp-desc" v-model="form.description" class="input" type="text" placeholder="一句话说明该知识点" />
        </div>
      </div>

      <div v-if="createError" class="alert alert-warning note">{{ createError }}</div>
      <button class="btn btn-primary btn-block note" type="button" :disabled="creating" @click="create">
        {{ creating ? '保存中…' : '保存知识点' }}
      </button>
    </section>

    <!-- 学科筛选 -->
    <section class="card">
      <h2 class="section-title">按学科查看</h2>
      <div class="chips">
        <button type="button" class="chip" :class="{ active: subject === undefined }" @click="subject = undefined">
          全部
        </button>
        <button
          v-for="s in SUBJECT_OPTIONS"
          :key="s.value"
          type="button"
          class="chip"
          :class="{ active: subject === s.value }"
          @click="subject = s.value"
        >
          {{ s.label }}
        </button>
      </div>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <!-- 树 -->
    <section class="card">
      <div class="row">
        <h2 class="section-title">知识点树（{{ flat.length }} 个节点）</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="load">刷新</button>
      </div>

      <p v-if="loading" class="text-sm text-soft note">加载中…</p>
      <div v-else-if="flat.length === 0" class="empty note">
        这个学科还没有知识点，可以点右上角「新增知识点」开始建设。
      </div>

      <ul v-else class="tree note">
        <li
          v-for="row in flat"
          :key="row.node.id"
          class="tree-item"
          :style="{ paddingLeft: 8 + row.depth * 16 + 'px' }"
        >
          <span class="tree-dot" :class="{ root: row.depth === 0 }">{{ row.depth === 0 ? '◆' : '·' }}</span>
          <span class="tree-name" :class="{ root: row.depth === 0 }">{{ row.node.name }}</span>
          <span class="badge">{{ row.node.code }}</span>
          <span v-if="row.node.stage" class="badge">{{ stageLabel(row.node.stage) }}</span>
        </li>
      </ul>
    </section>

    <section class="row">
      <button class="btn" type="button" @click="goHome">返回工作台</button>
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

.tree {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  border-bottom: 1px dashed var(--c-border);
}

.tree-item:last-child {
  border-bottom: none;
}

.tree-dot {
  color: var(--c-text-faint);
  font-size: 13px;
  flex: none;
  width: 12px;
}

.tree-dot.root {
  color: var(--c-primary);
  font-size: 11px;
}

.tree-name {
  font-size: 14px;
  color: var(--c-text-soft);
}

.tree-name.root {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-text);
}
</style>
