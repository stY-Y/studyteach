<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { ModuleEntry } from '../config/modules';

const props = defineProps<{ module: ModuleEntry }>();
const router = useRouter();

function open(): void {
  if (props.module.path) {
    void router.push(props.module.path);
    return;
  }
  void router.push({ name: 'module', params: { key: props.module.key } });
}
</script>

<template>
  <button class="module-card" type="button" @click="open">
    <span class="module-head">
      <span class="module-icon">{{ module.icon }}</span>
      <span class="module-name">{{ module.name }}</span>
      <span v-if="!module.ready" class="badge badge-warning">开发中</span>
    </span>
    <span class="module-desc">{{ module.desc }}</span>
    <span class="module-api mono">{{ module.api }}</span>
  </button>
</template>

<style scoped>
.module-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  width: 100%;
  padding: 18px;
  text-align: left;
  font-family: inherit;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(96, 70, 28, 0.05);
  cursor: pointer;
  transition: border-color 0.14s, box-shadow 0.14s, background-color 0.14s;
}

.module-card:hover {
  border-color: #e2cf9f;
  background: #fffbf1;
  box-shadow: 0 3px 8px rgba(96, 70, 28, 0.09);
}

.module-card:active {
  background: var(--c-primary-soft);
}

.module-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 图标放在一枚"徽章"里，卡片立刻有了节奏 */
.module-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: none;
  font-size: 20px;
  background: var(--c-surface-warm);
  border: 1px solid var(--c-border);
  border-radius: 12px;
}

.module-card:hover .module-icon {
  background: var(--c-primary-soft);
  border-color: var(--c-border-warm);
}

.module-name {
  font-family: var(--font-title);
  font-size: 17px;
  font-weight: 600;
  color: var(--c-text);
  letter-spacing: 0.02em;
}

.module-desc {
  font-size: 13px;
  line-height: 1.65;
  color: var(--c-text-soft);
}

.module-api {
  color: var(--c-text-faint);
  word-break: break-all;
}
</style>
