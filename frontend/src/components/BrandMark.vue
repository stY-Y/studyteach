<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 32 });
</script>

<template>
  <svg
    class="brand-logo"
    :width="size"
    :height="size"
    viewBox="0 0 48 48"
    role="img"
    aria-label="青禾"
  >
    <!-- 禾苗绿的底：与「青禾」呼应 -->
    <rect width="48" height="48" rx="13" fill="var(--c-brand, #3f7d3a)" />

    <!-- 打开的书本（乡村助学的底色） -->
    <path d="M24 30.4c-3.1-2.2-7.2-2.5-10.6-1.1v9.1c3.4-1.3 7.5-1 10.6 1.2V30.4Z" fill="#fff" />
    <path
      d="M24 30.4c3.1-2.2 7.2-2.5 10.6-1.1v9.1c-3.4-1.3-7.5-1-10.6 1.2V30.4Z"
      fill="#fff"
      opacity=".9"
    />

    <!-- 破土向上的新芽（志向与成长） -->
    <path d="M24 30V13.4" stroke="#fff" stroke-width="2.7" stroke-linecap="round" />
    <path d="M24 18.3c2.9.2 5.2-1.9 5.9-5.1-3.3.1-5.6 2.1-5.9 5.1Z" fill="#fff" />
    <path
      d="M24 21.7c-2.5 0-4.4-1.7-5-4.3 2.9.1 4.7 1.8 5 4.3Z"
      fill="#fff"
      opacity=".78"
    />

    <!-- 一点向上的光 -->
    <circle cx="24" cy="9.4" r="1.7" fill="#fff" opacity=".85" />
  </svg>
</template>

<style scoped>
.brand-logo {
  display: block;
  flex: none;
}
</style>
