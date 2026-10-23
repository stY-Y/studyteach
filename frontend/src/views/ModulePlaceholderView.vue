<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { ROLE_CONFIG, type ModuleEntry } from '../config/modules';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const auth = useAuthStore();

/** 先在本角色模块里找，找不到再全局找（便于直接访问链接） */
const moduleEntry = computed<ModuleEntry | null>(() => {
  const key = String(route.params.key ?? '');
  const roleModules = auth.user ? ROLE_CONFIG[auth.user.role]?.modules ?? [] : [];
  const local = roleModules.find((m) => m.key === key);
  if (local) return local;
  for (const cfg of Object.values(ROLE_CONFIG)) {
    const found = cfg.modules.find((m) => m.key === key);
    if (found) return found;
  }
  return null;
});

</script>

<template>
  <div class="stack">
    <section v-if="moduleEntry" class="card stack">
      <div class="row">
        <span class="ph-icon">{{ moduleEntry.icon }}</span>
        <h1 class="page-title">{{ moduleEntry.name }}</h1>
        <span class="badge badge-warning">界面开发中</span>
      </div>

      <p class="text-soft">{{ moduleEntry.desc }}</p>

      <div class="alert alert-info">
        <div><strong>对应后端接口</strong>（已实现，可用 Swagger 直接联调）</div>
        <div class="mono" style="margin-top: 4px">{{ moduleEntry.api }}</div>
      </div>

      <p class="text-sm text-faint">
        当前批次仅交付「四端登录入口 + 通用外壳」，本模块的界面将在后续批次实现。
        后端接口已就绪，可在
        <a href="/docs" target="_blank" rel="noopener">Swagger 文档</a>
        中直接调用验证。
      </p>
    </section>

    <section v-else class="card stack">
      <h1 class="page-title">模块不存在</h1>
      <p class="text-soft">未找到标识为 <span class="mono">{{ route.params.key }}</span> 的模块。</p>
    </section>
  </div>
</template>

<style scoped>
.ph-icon {
  font-size: 22px;
}
</style>