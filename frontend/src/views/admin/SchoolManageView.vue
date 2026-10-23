<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { orgApi, type SchoolRow } from '../../api/org';

const schools = ref<SchoolRow[]>([]);
const loading = ref(true);
const error = ref('');
const tip = ref('');
const acting = ref('');

const form = reactive({ name: '', region: '' });
const creating = ref(false);
const appointInput = reactive<Record<string, string>>({});

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    schools.value = await orgApi.schools();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function createSchool(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!form.name.trim()) {
    error.value = '请填写学校名称';
    return;
  }
  creating.value = true;
  try {
    await orgApi.createSchool({ name: form.name.trim(), region: form.region.trim() || undefined });
    tip.value = '学校已新增';
    form.name = '';
    form.region = '';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    creating.value = false;
  }
}

async function removeSchool(school: SchoolRow): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = school.id;
  try {
    await orgApi.deleteSchool(school.id);
    tip.value = `已删除「${school.name}」`;
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function appoint(school: SchoolRow): Promise<void> {
  error.value = '';
  tip.value = '';
  const username = (appointInput[school.id] ?? '').trim();
  if (!username) {
    error.value = '请输入要任命的管理员账号';
    return;
  }
  acting.value = school.id;
  try {
    await orgApi.appointSchoolAdmin(school.id, username);
    appointInput[school.id] = '';
    tip.value = `已任命 ${username} 为「${school.name}」学校管理员`;
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function dismiss(school: SchoolRow, userId: string): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = school.id;
  try {
    await orgApi.dismissSchoolAdmin(school.id, userId);
    tip.value = '已卸任该学校管理员（账号恢复为教师）';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

onMounted(load);
</script>

<template>
  <div class="stack">
    <h1 class="page-title">学校管理</h1>
    <p class="text-soft text-sm">
      平台管理员负责学校的新增与删除、以及学校管理员的任命与卸任。
      学校管理员再向下管理年级与年级管理员。
    </p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-info">{{ tip }}</div>

    <section class="card stack">
      <h2 class="section-title">新增学校</h2>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="sch-name">学校名称</label>
          <input id="sch-name" v-model.trim="form.name" class="input" type="text" maxlength="64" placeholder="如：会泽县第一中学" />
        </div>
        <div class="field">
          <label class="field-label" for="sch-region">地区（可选）</label>
          <input id="sch-region" v-model.trim="form.region" class="input" type="text" maxlength="64" placeholder="如：云南省曲靖市" />
        </div>
      </div>
      <button class="btn btn-primary self-start" type="button" :disabled="creating" @click="createSchool">
        {{ creating ? '新增中…' : '新增学校' }}
      </button>
    </section>

    <section class="card stack">
      <h2 class="section-title">学校列表（{{ schools.length }}）</h2>
      <p v-if="loading" class="text-sm text-soft">加载中…</p>
      <p v-else-if="schools.length === 0" class="empty">还没有学校，先新增一所。</p>

      <div v-for="s in schools" :key="s.id" class="school-block">
        <div class="row-item">
          <div class="grow">
            <p class="item-title">{{ s.name }}</p>
            <p class="text-xs text-faint">{{ s.region || '未填写地区' }}</p>
          </div>
          <button class="btn btn-sm" type="button" :disabled="acting === s.id" @click="removeSchool(s)">
            删除
          </button>
        </div>

        <div class="admins">
          <span class="text-xs text-soft">学校管理员：</span>
          <span v-if="s.admins.length === 0" class="text-xs text-faint">尚未任命</span>
          <span v-for="a in s.admins" :key="a.id" class="admin-chip">
            {{ a.name || a.username }}
            <button type="button" class="chip-x" title="卸任" @click="dismiss(s, a.id)">×</button>
          </span>
        </div>

        <div class="appoint-row">
          <input
            v-model="appointInput[s.id]"
            class="input"
            type="text"
            placeholder="输入教师账号，任命为学校管理员"
          />
          <button class="btn btn-sm btn-primary" type="button" :disabled="acting === s.id" @click="appoint(s)">
            任命
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.field-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.field-row .field {
  flex: 1;
  min-width: 180px;
}

.self-start {
  align-self: flex-start;
}

.school-block {
  padding: 10px 0;
  border-top: 1px solid var(--c-border);
}

.school-block:first-of-type {
  border-top: none;
}

.row-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
}

.admins {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.admin-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  background: var(--c-primary-soft);
  color: var(--c-primary-dark);
  border-radius: 999px;
}

.chip-x {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
}

.appoint-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.appoint-row .input {
  flex: 1;
  min-width: 0;
}
</style>
