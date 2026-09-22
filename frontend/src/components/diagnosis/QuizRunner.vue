<script setup lang="ts">
import { QuestionType } from '@teachstudy/shared';
import { computed, ref } from 'vue';
import type { AnswerItem, DiagnosisQuestion } from '../../api/diagnosis';
import { difficultyLabel, optionLetter, questionTypeLabel } from '../../config/labels';

const props = defineProps<{ questions: DiagnosisQuestion[] }>();
const emit = defineEmits<{ submit: [answers: AnswerItem[]]; cancel: [] }>();

/** 单题单屏：同一时刻只渲染一道题，DOM 节点最少，低配设备更流畅 */
const index = ref(0);
const answers = ref<Record<string, string>>({});

const total = computed(() => props.questions.length);
const current = computed<DiagnosisQuestion | undefined>(() => props.questions[index.value]);
const options = computed(() => current.value?.options ?? []);
const isMultiple = computed(() => current.value?.type === QuestionType.MULTIPLE_CHOICE);

const currentAnswer = computed(() => {
  const q = current.value;
  return q ? answers.value[q.id] ?? '' : '';
});

const selectedLetters = computed(() => currentAnswer.value.split(',').filter(Boolean));

const textAnswer = computed({
  get: () => currentAnswer.value,
  set: (value: string) => {
    const q = current.value;
    if (q) answers.value[q.id] = value;
  },
});

const answeredCount = computed(
  () => props.questions.filter((q) => (answers.value[q.id] ?? '').trim().length > 0).length,
);
const unansweredCount = computed(() => total.value - answeredCount.value);
const progressPercent = computed(() =>
  total.value === 0 ? 0 : Math.round((answeredCount.value / total.value) * 100),
);

function pick(letter: string): void {
  const q = current.value;
  if (!q) return;

  if (isMultiple.value) {
    const set = new Set(selectedLetters.value);
    if (set.has(letter)) set.delete(letter);
    else set.add(letter);
    answers.value[q.id] = Array.from(set).sort().join(',');
  } else {
    answers.value[q.id] = letter;
  }
}

function goto(target: number): void {
  if (target < 0 || target >= total.value) return;
  index.value = target;
}

function next(): void {
  goto(index.value + 1);
}

function prev(): void {
  goto(index.value - 1);
}

function submit(): void {
  const payload: AnswerItem[] = props.questions.map((q) => ({
    questionId: q.id,
    answer: (answers.value[q.id] ?? '').trim(),
  }));
  emit('submit', payload);
}
</script>

<template>
  <div class="stack">
    <!-- 进度 -->
    <section class="card">
      <div class="row">
        <span class="section-title">第 {{ index + 1 }} / {{ total }} 题</span>
        <span v-if="current" class="badge">{{ questionTypeLabel(current.type) }}</span>
        <span v-if="current" class="badge badge-primary">{{ difficultyLabel(current.difficulty) }}</span>
        <div class="spacer" />
        <span class="text-xs text-faint">已答 {{ answeredCount }} / {{ total }}</span>
      </div>
      <div class="bar">
        <div class="bar-fill" :style="{ width: progressPercent + '%' }" />
      </div>
    </section>

    <!-- 题干 -->
    <section v-if="current" class="card">
      <p class="content">{{ current.content }}</p>

      <!-- 选择题 -->
      <div v-if="options.length" class="options">
        <button
          v-for="(opt, i) in options"
          :key="i"
          type="button"
          class="option"
          :class="{ picked: selectedLetters.includes(optionLetter(opt, i)) }"
          @click="pick(optionLetter(opt, i))"
        >
          <span class="option-mark">
            {{ selectedLetters.includes(optionLetter(opt, i)) ? '✓' : optionLetter(opt, i) }}
          </span>
          <span class="option-text">{{ opt }}</span>
        </button>
        <p v-if="isMultiple" class="text-xs text-faint">多选题：可选择多个选项</p>
      </div>

      <!-- 填空 / 简答 -->
      <div v-else class="field">
        <label class="field-label" for="answer">你的作答</label>
        <textarea
          id="answer"
          v-model="textAnswer"
          class="input textarea"
          rows="4"
          placeholder="请写下你的答案"
        />
      </div>
    </section>

    <!-- 翻页 -->
    <section class="row nav">
      <button class="btn" type="button" :disabled="index === 0" @click="prev">上一题</button>
      <button
        v-if="index < total - 1"
        class="btn btn-primary"
        type="button"
        @click="next"
      >
        下一题
      </button>
      <button v-else class="btn btn-primary" type="button" @click="submit">提交诊断</button>
      <div class="spacer" />
      <button class="btn" type="button" @click="emit('cancel')">退出</button>
    </section>

    <!-- 答题卡 -->
    <section class="card">
      <div class="row">
        <span class="section-title">答题卡</span>
        <div class="spacer" />
        <span v-if="unansweredCount > 0" class="badge badge-warning">还有 {{ unansweredCount }} 题未作答</span>
        <span v-else class="badge badge-success">已全部作答</span>
      </div>
      <div class="sheet">
        <button
          v-for="(q, i) in questions"
          :key="q.id"
          type="button"
          class="sheet-item"
          :class="{
            current: i === index,
            done: (answers[q.id] ?? '').trim().length > 0,
          }"
          @click="goto(i)"
        >
          {{ i + 1 }}
        </button>
      </div>
      <p v-if="unansweredCount > 0" class="text-xs text-faint note">
        未作答的题目将按空白计入诊断结果，建议补全后再提交。
      </p>
    </section>
  </div>
</template>

<style scoped>
.bar {
  margin-top: 8px;
  height: 6px;
  background: #eef0f3;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--c-primary);
  transition: width 0.15s;
}

.content {
  font-size: 17px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  min-height: 46px;
  padding: 10px 12px;
  text-align: left;
  font-family: inherit;
  font-size: 16px;
  color: var(--c-text);
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.12s, background-color 0.12s;
}

.option:hover {
  border-color: var(--c-primary);
}

.option.picked {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
}

.option-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-soft);
  border: 1px solid var(--c-border-strong);
  border-radius: 50%;
}

.option.picked .option-mark {
  color: #fff;
  background: var(--c-primary);
  border-color: var(--c-primary);
}

.option-text {
  flex: 1;
  line-height: 1.5;
}

.textarea {
  min-height: 96px;
  padding: 10px 12px;
  line-height: 1.6;
  resize: vertical;
}

.nav {
  gap: 8px;
}

.sheet {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.sheet-item {
  width: 34px;
  height: 34px;
  font-family: inherit;
  font-size: 13px;
  color: var(--c-text-soft);
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.sheet-item.done {
  color: var(--c-primary);
  background: var(--c-primary-soft);
  border-color: #bfdbfe;
}

.sheet-item.current {
  color: #fff;
  background: var(--c-primary);
  border-color: var(--c-primary);
}

.note {
  margin-top: 8px;
}
</style>