<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';

/**
 * 应用根组件。
 * 启动时先按本地登录态立即渲染（秒开，适配低网速），
 * 再在后台校验令牌有效性，失效则回到登录页。
 */
const auth = useAuthStore();
const router = useRouter();

onMounted(async () => {
  if (!auth.token) return;
  const ok = await auth.restore();
  if (!ok) {
    void router.replace({ name: 'login' });
  }
});
</script>

<template>
  <RouterView />
</template>