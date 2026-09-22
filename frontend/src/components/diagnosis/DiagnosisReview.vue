<script setup lang="ts">
import type { ReviewItem } from '../../api/diagnosis';
import { difficultyLabel, optionLetter, questionTypeLabel } from '../../config/labels';

const props = defineProps<{ review: ReviewItem[]; nameMap?: Record<string, string> }>();

/** 取选项字母（仅当作答/答案本身是字母时才用于高亮选项） */
function lettersOf(text: string | null | undefined): string[] {
  const value = String(text ?? '').toUpperCase().replace(/\s+/g, '');
  return /^[A-Z]+$/.test(value) ? value.split('') : [];
}

function correctLetters(item: ReviewItem): string[] {
  return lettersOf(item.correctAnswer);
}

function chosenLetters(item: ReviewItem): string[] {
  return lettersOf(item.studentAnswer);
}

function pointNames(item: ReviewItem): string {
  const map = props.nameMap ?? {};
  return (item.knowledgePoints ?? []).map((id) => map[id] ?? id).join('、');
}
</script>

<template>
  <section class="card">
    <div class="row">
      <h2 class="section-title">逐题解析</h2>
      <div class="spacer" />
      <span class="badge badge-success">{{ review.filter((r) => r.isCorrect).length }} 题正确</span>
      <span class="badge badge-danger">{{ review.filter((r) => !r.isCorrect).length }} 题错误</span>
    </div>

    <p v-if="review.length === 0" class="text-sm text-soft note">本次没有可展示的题目。</p>

    <div v-else class="list">
      <details
        v-for="(item, i) in review"
        :key="item.questionId"
        class="item"
        :class="{ wrong: !item.isCorrect }"
      >
        <summary class="summary">
          <span class="mark" :class="item.isCorrect ? 'ok' : 'bad'">
            {{ item.isCorrect ? '✓' : '✗' }}
          </span>
          <span class="no">第 {{ i + 1 }} 题</span>
          <span class="badge">{{ questionTypeLabel(item.type) }}</span>
          <span class="badge">{{ difficultyLabel(item.difficulty) }}</span>
          <span class="excerpt">{{ item.content }}</span>
        </summary>

        <div class="detail">
          <p v-if="pointNames(item)" class="points text-xs text-faint">
            考查知识点：{{ pointNames(item) }}
          </p>

          <p class="content">{{ item.content }}</p>

          <!-- 选项：标出正确答案与学生的错误选择 -->
          <ul v-if="item.options && item.options.length" class="options">
            <li
              v-for="(opt, oi) in item.options"
              :key="oi"
              :class="{
                correct: correctLetters(item).includes(optionLetter(opt, oi)),
                chosen: chosenLetters(item).includes(optionLetter(opt, oi)),
              }"
            >
              <span class="opt-text">{{ opt }}</span>
              <span v-if="correctLetters(item).includes(optionLetter(opt, oi))" class="tag tag-ok">
                正确答案
              </span>
              <span
                v-else-if="chosenLetters(item).includes(optionLetter(opt, oi))"
                class="tag tag-bad"
              >
                你的选择
              </span>
            </li>
          </ul>

          <!-- 作答对照 -->
          <div class="answers">
            <p>
              <span class="label">你的作答</span>
              <span :class="item.isCorrect ? 'val ok' : 'val bad'">
                {{ item.studentAnswer || '（未作答）' }}
              </span>
            </p>
            <p>
              <span class="label">正确答案</span>
              <span class="val ok">{{ item.correctAnswer || '—' }}</span>
            </p>
          </div>

          <!-- 解析 -->
          <div class="block">
            <p class="block-title">解析</p>
            <p class="block-body">{{ item.analysis || '（暂无解析）' }}</p>
          </div>

          <!-- 典型错因 -->
          <div v-if="item.typicalErrors && item.typicalErrors.length" class="block">
            <p class="block-title">典型错因</p>
            <ul class="errs">
              <li v-for="(err, ei) in item.typicalErrors" :key="ei">{{ err }}</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  </section>
</template>

<style scoped>
.note {
  margin-top: 8px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.item {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  overflow: hidden;
}

.item.wrong {
  border-color: #fecaca;
}

.summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  font-size: 14px;
}

.summary::-webkit-details-marker {
  display: none;
}

.summary:hover {
  background: #fafbfc;
}

.mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.mark.ok {
  background: var(--c-success);
}

.mark.bad {
  background: var(--c-danger);
}

.no {
  flex: none;
  font-weight: 600;
}

.excerpt {
  flex: 1;
  min-width: 0;
  color: var(--c-text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail {
  padding: 0 12px 12px;
  border-top: 1px solid var(--c-border);
}

.points {
  margin-top: 10px;
}

.content {
  margin-top: 8px;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.options {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.options li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 15px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: #fafbfc;
}

.options li.correct {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.options li.chosen:not(.correct) {
  border-color: #fecaca;
  background: #fef2f2;
}

.opt-text {
  flex: 1;
}

.tag {
  flex: none;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 4px;
}

.tag-ok {
  background: #dcfce7;
  color: var(--c-success);
}

.tag-bad {
  background: #fee2e2;
  color: var(--c-danger);
}

.answers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin-top: 12px;
  font-size: 15px;
}

.answers p {
  display: flex;
  align-items: center;
  gap: 6px;
}

.label {
  color: var(--c-text-soft);
  font-size: 13px;
}

.val {
  font-weight: 600;
}

.val.ok {
  color: var(--c-success);
}

.val.bad {
  color: var(--c-danger);
}

.block {
  margin-top: 12px;
}

.block-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-soft);
  margin-bottom: 4px;
}

.block-body {
  font-size: 14px;
  line-height: 1.7;
  color: var(--c-text);
  white-space: pre-wrap;
}

.errs {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--c-text-soft);
}
</style>
