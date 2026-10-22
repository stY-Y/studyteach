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
  gap: 8px;
  width: 100%;
  padding: 16px;
  text-align: left;
  font-family: inherit;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);

  cursor: pointer;
  transition: border-color 0.12s, background-color 0.12s;
}

.module-card:hover {
  border-color: var(--c-primary);

}

.module-card:active {
  background: #faf5ea;
}

.module-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-icon {
  font-size: 20px;
  flex: none;
}

.module-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--c-text);
}

.module-desc {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--c-text-soft);
}

.module-api {
  color: var(--c-text-faint);
  word-break: break-all;
}
</style>