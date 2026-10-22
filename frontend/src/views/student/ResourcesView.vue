<script setup lang="ts">
import { ResourceType, StudyStage, Subject } from '@teachstudy/shared';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { resourcesApi, type ResourceItem } from '../../api/resources';
import { usersApi } from '../../api/users';
import {
  GRADES_BY_STAGE,
  gradeLabel,
  gradesForStage,
  inferGradeFromText,
  inferStageFromGrade,
  STAGE_OPTIONS,
  stageLabel,
  subjectLabel,
  subjectOptionsForStage,
} from '../../config/labels';
import { formatSize, formatTime } from '../../utils/format';

const router = useRouter();

const RESOURCE_TYPES: Array<{ value: ResourceType; label: string; icon: string }> = [
  { value: ResourceType.EXAM_PAPER, label: '试题', icon: '📄' },
  { value: ResourceType.GUIDE_PLAN, label: '导学案', icon: '🗒️' },
  { value: ResourceType.EBOOK, label: '电子书', icon: '📘' },
  { value: ResourceType.VIDEO, label: '视频', icon: '🎬' },
  { value: ResourceType.AUDIO, label: '音频', icon: '🎧' },
];

/* ---------- 逐级筛选：学段 → 年级 → 学科 → 类型 ---------- */
const stage = ref<StudyStage>(StudyStage.JUNIOR);
const grade = ref<number | undefined>(undefined);
const subject = ref<Subject | undefined>(undefined);
const type = ref<ResourceType | undefined>(undefined);

const grades = computed(() => gradesForStage(stage.value));
const subjects = computed(() => subjectOptionsForStage(stage.value));
/** 小学学段（只有语数外三科） */
const isPrimary = computed(() => stage.value === StudyStage.PRIMARY_HIGH);

const list = ref<ResourceItem[]>([]);
const total = ref(0);
const page = ref(1);
const PAGE_SIZE = 12;
const loading = ref(false);
const error = ref('');
const tip = ref('');

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

const filterSummary = computed(() => {
  const parts = [stageLabel(stage.value)];
  if (grade.value) parts.push(gradeLabel(grade.value));
  if (subject.value) parts.push(subjectLabel(subject.value));
  if (type.value) parts.push(RESOURCE_TYPES.find((t) => t.value === type.value)?.label ?? '');
  return parts.filter(Boolean).join(' · ');
});

function typeMeta(t: ResourceType) {
  return RESOURCE_TYPES.find((i) => i.value === t);
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const res = await resourcesApi.list(
      {
        stage: stage.value,
        grade: grade.value,
        subject: subject.value,
        type: type.value,
      },
      page.value,
      PAGE_SIZE,
    );
    list.value = res.list ?? [];
    total.value = res.total ?? 0;
  } catch (err) {
    error.value = (err as Error).message;
    list.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function refresh(): void {
  page.value = 1;
  tip.value = '';
  void load();
}

/** 换学段：年级与学科必须重置（小学只有语数外，年级范围也不同） */
function changeStage(next: StudyStage): void {
  if (stage.value === next) return;
  stage.value = next;
  grade.value = undefined;
  subject.value = undefined;
  refresh();
}

function pickGrade(next?: number): void {
  grade.value = next;
  refresh();
}

function pickSubject(next?: Subject): void {
  subject.value = next;
  refresh();
}

function pickType(next?: ResourceType): void {
  type.value = next;
  refresh();
}

async function download(item: ResourceItem): Promise<void> {
  tip.value = '';
  try {
    await resourcesApi.download(item.id, `${item.title}${item.format || ''}`);
    tip.value = `已开始下载「${item.title}」`;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function cacheOffline(item: ResourceItem): Promise<void> {
  tip.value = '';
  try {
    await resourcesApi.cacheOffline(item.id);
    tip.value = `「${item.title}」已加入离线缓存，断网也能看`;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

/* ---------- 在线预览（点开即看，不强制下载/离线） ---------- */
type PreviewKind = 'text' | 'pdf' | 'image' | 'video' | 'audio' | 'other';

const previewing = ref<ResourceItem | null>(null);
const previewLoading = ref(false);
const previewError = ref('');
const previewText = ref('');
const previewUrl = ref('');
const previewKind = ref<PreviewKind>('other');

function previewKindOf(format?: string | null, mime?: string): PreviewKind {
  const ext = (format || '').toLowerCase();
  if (['.md', '.markdown', '.txt', '.csv', '.json', '.log'].includes(ext)) return 'text';
  if (ext === '.pdf') return 'pdf';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) return 'image';
  if (['.mp4', '.webm', '.mov', '.m4v'].includes(ext)) return 'video';
  if (['.mp3', '.m4a', '.wav', '.ogg', '.aac'].includes(ext)) return 'audio';

  const type = (mime || '').toLowerCase();
  if (type.startsWith('text/')) return 'text';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'other';
}

async function openPreview(item: ResourceItem): Promise<void> {
  closePreview();
  previewing.value = item;
  previewLoading.value = true;
  document.body.classList.add('preview-open');
  try {
    const { blob, mime } = await resourcesApi.preview(item.id);
    const kind = previewKindOf(item.format, mime);
    previewKind.value = kind;
    if (kind === 'text') {
      previewText.value = await blob.text();
    } else {
      previewUrl.value = URL.createObjectURL(blob);
    }
  } catch (err) {
    previewError.value = (err as Error).message;
  } finally {
    previewLoading.value = false;
  }
}

function closePreview(): void {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
  previewing.value = null;
  previewText.value = '';
  previewError.value = '';
  previewLoading.value = false;
  previewKind.value = 'other';
  if (typeof document !== 'undefined') document.body.classList.remove('preview-open');
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && previewing.value) closePreview();
}

function prevPage(): void {
  if (page.value > 1) {
    page.value -= 1;
    void load();
  }
}

function nextPage(): void {
  if (page.value < totalPages.value) {
    page.value += 1;
    void load();
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

/** 按档案年级自动定位（失败则保留「初中 · 全部年级」） */
async function locateFromProfile(): Promise<void> {
  try {
    const me = await usersApi.me();
    const gradeText = me.studentProfile?.grade ?? '';
    const inferredStage = inferStageFromGrade(gradeText);
    const inferredGrade = inferGradeFromText(gradeText);
    if (inferredStage) {
      stage.value = inferredStage;
      if (inferredGrade && GRADES_BY_STAGE[inferredStage]?.includes(inferredGrade)) {
        grade.value = inferredGrade;
      }
    }
  } catch {
    /* 读不到档案不影响使用 */
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown);
  await locateFromProfile();
  await load();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  closePreview();
});
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">学习资源</h1>
      <p class="text-sm text-soft note">
        从小学一年级到高三，按年级找资料最省事 🧡
        电子书、导学案、试题、视频、音频，全部免费下载；先「存离线」，断网也能看。
      </p>
    </section>

    <!-- 逐级筛选 -->
    <section class="card">
      <h2 class="section-title">1. 选择学段</h2>
      <div class="chips">
        <button
          v-for="s in STAGE_OPTIONS"
          :key="s.value"
          type="button"
          class="chip"
          :class="{ active: stage === s.value }"
          @click="changeStage(s.value)"
        >
          {{ stageLabel(s.value) }}
        </button>
      </div>

      <h2 class="section-title chips-title">2. 选择年级</h2>
      <div class="chips">
        <button type="button" class="chip" :class="{ active: grade === undefined }" @click="pickGrade(undefined)">
          全部年级
        </button>
        <button
          v-for="g in grades"
          :key="g"
          type="button"
          class="chip"
          :class="{ active: grade === g }"
          @click="pickGrade(g)"
        >
          {{ gradeLabel(g) }}
        </button>
      </div>

      <h2 class="section-title chips-title">3. 选择学科</h2>
      <div class="chips">
        <button type="button" class="chip" :class="{ active: subject === undefined }" @click="pickSubject(undefined)">
          全部学科
        </button>
        <button
          v-for="s in subjects"
          :key="s.value"
          type="button"
          class="chip"
          :class="{ active: subject === s.value }"
          @click="pickSubject(s.value)"
        >
          {{ s.label }}
        </button>
      </div>

      <h2 class="section-title chips-title">4. 选择资源类型</h2>
      <div class="chips">
        <button type="button" class="chip" :class="{ active: type === undefined }" @click="pickType(undefined)">
          全部类型
        </button>
        <button
          v-for="t in RESOURCE_TYPES"
          :key="t.value"
          type="button"
          class="chip"
          :class="{ active: type === t.value }"
          @click="pickType(t.value)"
        >
          {{ t.icon }} {{ t.label }}
        </button>
      </div>

      <p class="text-xs text-faint note">
        当前筛选：{{ filterSummary }}
        <template v-if="isPrimary">（小学只有语文、数学、英语三科）</template>
      </p>
    </section>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-success">{{ tip }}</div>

    <!-- 列表 -->
    <section class="card">
      <div class="row">
        <h2 class="section-title">共 {{ total }} 份资源</h2>
        <div class="spacer" />
        <button class="btn btn-sm" type="button" :disabled="loading" @click="load">刷新</button>
      </div>
      <p class="text-xs text-faint note">点标题或「打开」即可在线查看，不用先下载。</p>

      <p v-if="loading" class="text-sm text-soft note">正在加载…</p>
      <div v-else-if="list.length === 0" class="empty note">
        这个条件下暂时还没有资源。<br />
        换个年级或学科看看，或者请老师上传共享。
      </div>

      <ul v-else class="res-list note">
        <li v-for="item in list" :key="item.id" class="res-item">
          <span class="res-icon">{{ typeMeta(item.type)?.icon ?? '📦' }}</span>
          <div class="res-main clickable" role="button" tabindex="0" @click="openPreview(item)" @keyup.enter="openPreview(item)">
            <p class="res-title">{{ item.title }}</p>
            <div class="row wrap">
              <span class="badge">{{ typeMeta(item.type)?.label ?? item.type }}</span>
              <span class="badge badge-primary">{{ subjectLabel(item.subject) }}</span>
              <span class="badge">{{ gradeLabel(item.grade) }}</span>
              <span class="badge">{{ stageLabel(item.stage) }}</span>
              <span class="text-xs text-faint">
                {{ formatSize(item.fileSize) }} · 下载 {{ item.downloads }} 次
              </span>
            </div>
            <p class="text-xs text-faint res-time">{{ formatTime(item.createdAt) }}</p>
          </div>
          <div class="res-actions">
            <button class="btn btn-sm btn-primary" type="button" @click="openPreview(item)">打开</button>
            <button class="btn btn-sm" type="button" @click="download(item)">下载</button>
            <button class="btn btn-sm" type="button" @click="cacheOffline(item)">存离线</button>
          </div>
        </li>
      </ul>

      <div v-if="total > PAGE_SIZE" class="row pager">
        <button class="btn btn-sm" type="button" :disabled="page <= 1" @click="prevPage">上一页</button>
        <span class="text-xs text-faint">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="btn btn-sm" type="button" :disabled="page >= totalPages" @click="nextPage">下一页</button>
      </div>
    </section>

    <section class="row">
      <button class="btn" type="button" @click="goHome">返回工作台</button>
    </section>

    <!-- 在线预览弹层：点开即看，下载/离线都不是必须的 -->
    <div v-if="previewing" class="preview-overlay" @click.self="closePreview">
      <section class="preview-panel" role="dialog" aria-modal="true" aria-label="资源预览">
        <header class="preview-head">
          <div class="preview-head-text">
            <p class="preview-title">{{ previewing.title }}</p>
            <div class="row wrap">
              <span class="badge">{{ typeMeta(previewing.type)?.label ?? previewing.type }}</span>
              <span class="badge badge-primary">{{ subjectLabel(previewing.subject) }}</span>
              <span class="badge">{{ gradeLabel(previewing.grade) }}</span>
            </div>
          </div>
          <div class="spacer" />
          <button class="btn btn-sm" type="button" @click="download(previewing)">下载</button>
          <button class="btn btn-sm" type="button" @click="closePreview">关闭</button>
        </header>

        <div class="preview-body">
          <p v-if="previewLoading" class="text-sm text-soft">正在打开…</p>
          <div v-else-if="previewError" class="alert alert-warning">{{ previewError }}</div>
          <pre v-else-if="previewKind === 'text'" class="preview-text">{{ previewText }}</pre>
          <iframe
            v-else-if="previewKind === 'pdf'"
            class="preview-frame"
            :src="previewUrl"
            title="PDF 预览"
          ></iframe>
          <img v-else-if="previewKind === 'image'" class="preview-img" :src="previewUrl" alt="" />
          <video
            v-else-if="previewKind === 'video'"
            class="preview-video"
            :src="previewUrl"
            controls
          ></video>
          <audio v-else-if="previewKind === 'audio'" class="preview-audio" :src="previewUrl" controls></audio>
          <div v-else class="empty">
            该格式暂不支持在网页里直接查看（如 Word / PPT / 压缩包）。<br />
            下载后用本机应用打开即可。
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.note {
  margin-top: 8px;
  line-height: 1.55;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.chips-title {
  margin-top: 16px;
}

.wrap {
  flex-wrap: wrap;
  gap: 6px;
}

.res-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.res-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.res-icon {
  font-size: 22px;
  flex: none;
  line-height: 1.3;
}

.res-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.res-title {
  font-size: 15px;
  font-weight: 600;
  word-break: break-all;
}

.res-main.clickable {
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.res-main.clickable:hover .res-title {
  color: var(--c-primary);
}

.res-time {
  margin-top: 1px;
}

.res-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: none;
}

.pager {
  margin-top: 12px;
  justify-content: center;
}

@media (max-width: 480px) {
  .res-item {
    flex-wrap: wrap;
  }
  .res-actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
}

/* ---------- 在线预览弹层 ---------- */
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(58, 47, 36, 0.35);
}

.preview-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 860px;
  max-height: 88vh;
  background: var(--c-surface);
  border: 1px solid var(--c-border-strong);
  border-radius: var(--radius);
  overflow: hidden;
}

.preview-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border-bottom: 1px solid var(--c-border);
}

.preview-head-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.preview-title {
  font-size: 15px;
  font-weight: 600;
  word-break: break-all;
}

.preview-body {
  flex: 1;
  min-height: 120px;
  padding: 14px;
  overflow: auto;
}

.preview-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.75;
  color: var(--c-text);
}

.preview-frame {
  display: block;
  width: 100%;
  height: 70vh;
  border: 0;
}

.preview-img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}

.preview-video {
  display: block;
  width: 100%;
  max-height: 70vh;
  background: #000;
  border-radius: var(--radius-sm);
}

.preview-audio {
  display: block;
  width: 100%;
}

:global(body.preview-open) {
  overflow: hidden;
}

@media (max-width: 640px) {
  .preview-panel {
    max-height: 92vh;
  }
  .preview-frame {
    height: 62vh;
  }
}
</style>
