<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { classNoticesApi, type ClassNoticeItem } from '../../api/classNotices';
import { useAuthStore } from '../../stores/auth';
import { storage } from '../../utils/storage';

const props = defineProps<{
  classId: string;
  /** 教师/管理员：可发布、编辑、置顶、删除；学生：只读 */
  isTeacher: boolean;
}>();

const auth = useAuthStore();

const notices = ref<ClassNoticeItem[]>([]);
const loading = ref(false);
const error = ref('');
const tip = ref('');
const expanded = ref(false);
const unread = ref(0);
/** 长通知的展开状态（默认只显示摘要） */
const openIds = ref<Record<string, boolean>>({});

const formOpen = ref(false);
const editingId = ref('');
const form = reactive({ title: '', content: '', pinned: false });
const saving = ref(false);
const actingId = ref('');

const myId = computed(() => auth.user?.id ?? '');
const readKey = computed(() => `noticeRead:${myId.value}:${props.classId}`);

function formatTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isLong(n: ClassNoticeItem): boolean {
  return n.content.length > 90 || n.content.includes('\n');
}

async function load(): Promise<void> {
  if (!props.classId) return;
  loading.value = true;
  error.value = '';
  try {
    const res = await classNoticesApi.list(props.classId);
    notices.value = res.notices;
    syncUnread();
    // 教师默认展开，方便随手发布；学生有未读时自动展开，避免错过放假、考试这类安排
    if (props.isTeacher || unread.value > 0) expanded.value = true;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

/** 未读数按「本地记录的最后阅读时间」比对，换设备不影响使用（只是重新算未读） */
function syncUnread(): void {
  if (props.isTeacher) {
    unread.value = 0;
    return;
  }
  const last = storage.get<string>(readKey.value);
  const since = last ? new Date(last).getTime() : 0;
  unread.value = notices.value.filter((n) => new Date(n.createdAt).getTime() > since).length;
}

function markRead(): void {
  if (props.isTeacher || unread.value === 0) return;
  storage.set(readKey.value, new Date().toISOString());
  unread.value = 0;
}

function toggle(): void {
  expanded.value = !expanded.value;
  if (expanded.value) syncUnread();
}

function openForm(): void {
  editingId.value = '';
  form.title = '';
  form.content = '';
  form.pinned = false;
  formOpen.value = true;
  expanded.value = true;
}

function startEdit(n: ClassNoticeItem): void {
  editingId.value = n.id;
  form.title = n.title;
  form.content = n.content;
  form.pinned = n.pinned;
  formOpen.value = true;
  expanded.value = true;
}

function cancelForm(): void {
  formOpen.value = false;
  editingId.value = '';
  form.title = '';
  form.content = '';
  form.pinned = false;
}

async function submit(): Promise<void> {
  error.value = '';
  tip.value = '';
  const title = form.title.trim();
  const content = form.content.trim();
  if (!title) {
    error.value = '请填写通知标题';
    return;
  }
  if (!content) {
    error.value = '请填写通知内容';
    return;
  }

  saving.value = true;
  try {
    if (editingId.value) {
      await classNoticesApi.update(props.classId, editingId.value, {
        title,
        content,
        pinned: form.pinned,
      });
      tip.value = '通知已更新';
    } else {
      await classNoticesApi.create(props.classId, { title, content, pinned: form.pinned });
      tip.value = '通知已发布，本班学生进入班级即可看到';
    }
    cancelForm();
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}

async function togglePin(n: ClassNoticeItem): Promise<void> {
  actingId.value = n.id;
  error.value = '';
  tip.value = '';
  try {
    await classNoticesApi.update(props.classId, n.id, { pinned: !n.pinned });
    tip.value = n.pinned ? '已取消置顶' : '已置顶';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    actingId.value = '';
  }
}

async function remove(n: ClassNoticeItem): Promise<void> {
  if (!window.confirm(`确定删除通知「${n.title}」吗？`)) return;
  actingId.value = n.id;
  error.value = '';
  tip.value = '';
  try {
    await classNoticesApi.remove(props.classId, n.id);
    tip.value = '通知已删除';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    actingId.value = '';
  }
}

function toggleOpen(id: string): void {
  openIds.value = { ...openIds.value, [id]: !openIds.value[id] };
}

watch(
  () => props.classId,
  () => {
    notices.value = [];
    expanded.value = false;
    formOpen.value = false;
    editingId.value = '';
    openIds.value = {};
    void load();
  },
);

onMounted(load);
</script>

<template>
  <section class="card notice-card">
    <header class="notice-head">
      <button class="head-main" type="button" @click="toggle">
        <span class="notice-icon" aria-hidden="true">📢</span>
        <span class="notice-title">班级通知</span>
        <span v-if="unread > 0" class="badge badge-warning">{{ unread }} 条新通知</span>
        <span v-else-if="notices.length > 0" class="text-xs text-faint">共 {{ notices.length }} 条</span>
        <span class="chev">{{ expanded ? '▾' : '▸' }}</span>
      </button>
      <button
        v-if="isTeacher"
        class="btn btn-sm btn-primary"
        type="button"
        @click="formOpen ? cancelForm() : openForm()"
      >
        {{ formOpen ? '取消' : '发布通知' }}
      </button>
    </header>

    <div v-if="expanded" class="notice-body" @click="markRead">
      <p v-if="error" class="alert alert-danger">{{ error }}</p>
      <p v-if="tip" class="alert alert-info">{{ tip }}</p>

      <!-- 发布 / 编辑 -->
      <form v-if="formOpen && isTeacher" class="stack-sm form-box" @submit.prevent="submit">
        <div class="field">
          <label class="field-label" for="notice-title">通知标题</label>
          <input
            id="notice-title"
            v-model="form.title"
            class="input"
            type="text"
            maxlength="80"
            placeholder="如：下周三上午月考，请提前复习"
          />
        </div>
        <div class="field">
          <label class="field-label" for="notice-content">通知内容</label>
          <textarea
            id="notice-content"
            v-model="form.content"
            class="input"
            rows="4"
            maxlength="2000"
            placeholder="写清时间、地点、需要带的东西等，学生一看就明白"
          />
          <span class="text-xs text-faint">{{ form.content.length }} / 2000 字</span>
        </div>
        <label class="pin-toggle">
          <input v-model="form.pinned" type="checkbox" />
          <span>置顶（重要通知排在最前面）</span>
        </label>
        <div class="row gap">
          <button class="btn btn-primary" type="submit" :disabled="saving">
            {{ saving ? '保存中…' : editingId ? '保存修改' : '发布通知' }}
          </button>
          <button class="btn" type="button" :disabled="saving" @click="cancelForm">取消</button>
        </div>
      </form>

      <p v-if="loading" class="text-soft text-sm">加载中…</p>
      <p v-else-if="notices.length === 0" class="empty">
        {{ isTeacher ? '还没有班级通知，点右上角「发布通知」写下第一条吧。' : '老师还没有发布通知。' }}
      </p>

      <article
        v-for="n in notices"
        :key="n.id"
        class="notice-item"
        :class="{ pinned: n.pinned }"
      >
        <div class="item-head">
          <span v-if="n.pinned" class="badge badge-primary">置顶</span>
          <strong class="item-title">{{ n.title }}</strong>
          <span class="spacer" />
          <span class="text-xs text-faint">{{ formatTime(n.createdAt) }}</span>
        </div>
        <p class="item-content">
          {{ openIds[n.id] || !isLong(n) ? n.content : `${n.content.slice(0, 90)}…` }}
        </p>
        <div class="item-foot">
          <button
            v-if="isLong(n)"
            class="link-btn"
            type="button"
            @click="toggleOpen(n.id)"
          >
            {{ openIds[n.id] ? '收起' : '展开全文' }}
          </button>
          <span class="spacer" />
          <span class="text-xs text-faint">{{ n.fromName || '老师' }} 发布</span>
          <template v-if="isTeacher">
            <button class="btn btn-sm" type="button" :disabled="actingId === n.id" @click="togglePin(n)">
              {{ n.pinned ? '取消置顶' : '置顶' }}
            </button>
            <button class="btn btn-sm" type="button" @click="startEdit(n)">编辑</button>
            <button class="btn btn-sm" type="button" :disabled="actingId === n.id" @click="remove(n)">
              删除
            </button>
          </template>
        </div>
      </article>

      <div v-if="!isTeacher && unread > 0" class="row">
        <button class="btn btn-sm self-start" type="button" @click="markRead">标记为已读</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.notice-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
}

.notice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.head-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 44px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}

.notice-icon {
  font-size: 17px;
  line-height: 1;
}

.notice-title {
  font-size: 16px;
  font-weight: 600;
}

.chev {
  color: var(--c-text-faint);
  font-size: 12px;
}

.notice-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid var(--c-border);
  padding-top: 10px;
}

.form-box {
  padding: 12px;
  border: 1px dashed var(--c-border);
  border-radius: 10px;
  background: #fdf8ef;
}

.stack-sm {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pin-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--c-text-soft);
}

.row.gap {
  gap: 8px;
}

.notice-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: #fffdf8;
}

.notice-item.pinned {
  border-color: #ecd0b4;
  background: var(--c-primary-soft);
}

.item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.item-title {
  font-size: 15px;
  word-break: break-word;
}

.spacer {
  flex: 1;
}

.item-content {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--c-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.item-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.link-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--c-primary);
  font-size: 13px;
  cursor: pointer;
}

@media (max-width: 480px) {
  .notice-head {
    align-items: flex-start;
  }

  .item-foot {
    gap: 6px;
  }
}
</style>
