<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import NoPermissionCard from '../../components/NoPermissionCard.vue';

const route = useRoute();

/** 由路由守卫带过来：需要的岗位（StaffRole 或 platform） */
const need = computed(() => (typeof route.query.need === 'string' ? route.query.need : ''));
</script>

<template>
  <div class="stack">
    <h1 class="page-title">权限提示</h1>
    <NoPermissionCard :need="need" />
  </div>
</template>
