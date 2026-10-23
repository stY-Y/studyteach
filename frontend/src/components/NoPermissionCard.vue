<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { StaffRole, UserRole } from '@teachstudy/shared';
import { STAFF_LABELS, hasStaff, staffLabelOf } from '../config/staff';
import { useAuthStore } from '../stores/auth';

const props = defineProps<{
  /** 需要的岗位：StaffRole 值，或 'platform'（平台管理员） */
  need?: string;
}>();

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const refreshing = ref(false);
const refreshTip = ref('');

const needLabel = computed(() => {
  if (!props.need) return '';
  if (props.need === 'platform') return '平台管理员';
  return STAFF_LABELS[props.need as StaffRole] ?? props.need;
});

/** 说清「为什么没权限」与「怎么才能有」 */
const reason = computed(() => {
  if (props.need === 'platform') {
    return '「学校管理」是平台级功能，只有平台管理员可以使用：新增/删除学校、任命或卸任学校管理员都由平台统一操作。';
  }
  if (props.need === StaffRole.SCHOOL_ADMIN) {
    return '「年级管理」需要「学校管理员」岗位。学校管理员由平台管理员任命（每校最多 2 名），再由学校管理员向下任命年级管理员。';
  }
  if (props.need === StaffRole.GRADE_ADMIN) {
    return '「班级管理」需要「年级管理员」岗位。年级管理员由学校管理员任命（每个年级最多 2 名），再由年级管理员建班并任命班主任（班级管理员）。';
  }
  return '当前账号身份无法访问该页面。';
});

const ROLE_TEXT: Record<string, string> = {
  [UserRole.STUDENT]: '学生',
  [UserRole.TEACHER]: '教师',
  [UserRole.PARENT]: '家长',
  [UserRole.SCHOOL_ADMIN]: '学校管理员',
  [UserRole.GRADE_ADMIN]: '年级管理员',
  [UserRole.ADMIN]: '平台管理员',
};

const currentRole = computed(() => ROLE_TEXT[auth.user?.role ?? ''] ?? auth.user?.role ?? '未登录');
const currentStaff = computed(() => {
  if (auth.user?.role === UserRole.ADMIN) return '平台管理员（内置）';
  return staffLabelOf(auth.user);
});

/** 当前是否已具备所需权限 */
function satisfied(): boolean {
  if (!props.need) return true;
  if (auth.user?.role === UserRole.ADMIN) return true;
  if (props.need === 'platform') return false;
  return hasStaff(auth.user, props.need as StaffRole);
}

/**
 * 重新拉取岗位：刚被任命但本地缓存还没更新时，点一下即可恢复访问。
 * 成功后回到原本要访问的页面。
 */
async function refreshPermission(): Promise<void> {
  refreshing.value = true;
  refreshTip.value = '';
  try {
    await auth.syncProfile();
    if (!satisfied()) {
      refreshTip.value = '刷新后仍没有该岗位，请联系上级管理员任命。';
      return;
    }
    const from = typeof route.query.from === 'string' ? route.query.from : '';
    await router.replace(from || { name: 'home' });
  } catch (err) {
    refreshTip.value = (err as Error).message || '刷新失败，请稍后重试';
  } finally {
    refreshing.value = false;
  }
}
</script>

<template>
  <section class="card stack no-perm">
    <div class="lock" aria-hidden="true">🔒</div>
    <h1 class="title">您无权限管理</h1>
    <p class="reason">{{ reason }}</p>

    <div class="facts">
      <div class="fact">
        <span class="fact-label">当前身份</span>
        <span class="fact-value">{{ currentRole }}</span>
      </div>
      <div class="fact">
        <span class="fact-label">当前岗位</span>
        <span class="fact-value">{{ currentStaff }}</span>
      </div>
      <div v-if="needLabel" class="fact">
        <span class="fact-label">所需岗位</span>
        <span class="fact-value">{{ needLabel }}</span>
      </div>
    </div>

    <p class="hint text-xs text-faint">
      管理岗位只能由上级任命，不能自行注册或开通。如果你刚被任命，请点「刷新权限」（或退出后重新登录）；
      如果确实需要该权限，请联系上级管理员。
    </p>

    <p v-if="refreshTip" class="alert alert-info">{{ refreshTip }}</p>

    <div class="actions">
      <RouterLink :to="{ name: 'home' }" class="btn btn-primary">返回工作台</RouterLink>
      <button class="btn" type="button" :disabled="refreshing" @click="refreshPermission">
        {{ refreshing ? '刷新中…' : '刷新权限' }}
      </button>
      <RouterLink :to="{ name: 'settings' }" class="btn">账号与安全</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.no-perm {
  max-width: 560px;
  align-items: flex-start;
  gap: 10px;
  padding: 22px 20px;
}

.lock {
  font-size: 30px;
  line-height: 1;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.reason {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--c-text-soft);
}

.facts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: #fdf8ef;
}

.fact {
  display: flex;
  gap: 10px;
  font-size: 13px;
}

.fact-label {
  width: 64px;
  flex: 0 0 auto;
  color: var(--c-text-faint);
}

.fact-value {
  color: var(--c-text);
  font-weight: 500;
  word-break: break-word;
}

.hint {
  margin: 0;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
