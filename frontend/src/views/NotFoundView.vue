<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goHome(): void {
  void router.replace({ name: 'home' });
}
</script>

<template>
  <div class="nf">
    <div class="card stack">
      <h1 class="page-title">页面不存在</h1>
      <p class="text-soft">你访问的地址不存在，可能是链接输入有误。</p>
      <button class="btn btn-primary" type="button" @click="goHome">返回首页</button>
    </div>
  </div>
</template>

<style scoped>
.nf {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
}

.card {
  max-width: 360px;
  width: 100%;
}
</style>