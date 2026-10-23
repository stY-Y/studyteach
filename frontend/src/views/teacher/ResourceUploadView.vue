<script setup lang="ts">
import {
  ResourceScope,
  ResourceType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { resourcesApi, type ResourceItem } from '../../api/resources';
import {
  gradeLabel,
  gradesForStage,
  RESOURCE_SCOPE_LABELS,
  RESOURCE_TYPE_LABELS,
  resourceStatusLabel,
  stageLabel,
  STAGE_OPTIONS,
  subjectOptionsForStage,
} from '../../config/labels';

const router = useRouter();

const TYPES = Object.values(ResourceType);
const SCOPES = Object.values(ResourceScope);

const title = ref('');
/** 文件简介：必填，写清内容与适用场景，便于分类与检索 */
const description = ref('');
const type = ref<ResourceType>(ResourceType.EXAM_PAPER);
const subject = ref<Subject>(Subject.MATH);
const stage = ref<StudyStage>(StudyStage.JUNIOR);
/** 年级：留空表示跨年级通用 */
const grade = ref<number | undefined>(undefined);
const scope = ref<ResourceScope>(ResourceScope.SCHOOL_ONLY);
const file = ref<File | null>(null);

const uploading = ref(false);
const error = ref('');
const done = ref<ResourceItem | null>(null);

const grades = computed(() => gradesForStage(stage.value));
const subjectOptions = computed(() => subjectOptionsForStage(stage.value));

/** 切换学段后，年级与学科可能不再合法，自动收敛到可用范围 */
watch(stage, (next) => {
  const allowedGrades = gradesForStage(next);
  if (grade.value && !allowedGrades.includes(grade.value)) grade.value = undefined;
  const allowedSubjects = subjectOptionsForStage(next).map((s) => s.value);
  if (!allowedSubjects.includes(subject.value)) {
    subject.value = allowedSubjects[0] ?? Subject.MATH;
  }
});

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  file.value = input.files && input.files[0] ? input.files[0] : null;
  if (file.value && !title.value) {
    // 默认用文件名（去扩展名）作为标题，减少输入负担
    title.value = file.value.name.replace(/\.[^.]+$/, '');
  }
}

async function submit(): Promise<void> {
  error.value = '';
  done.value = null;
  if (!file.value) {
    error.value = '请选择要上传的文件';
    return;
  }
  if (!title.value.trim()) {
    error.value = '请填写资源标题';
    return;
  }
  const intro = description.value.trim();
  if (intro.length < 8) {
    error.value = '请填写至少 8 个字的文件简介，写清内容与适用场景';
    return;
  }
  if (intro.length > 500) {
    error.value = '文件简介最多 500 字';
    return;
  }
  uploading.value = true;
  try {
    const form = new FormData();
    form.append('file', file.value);
    form.append('title', title.value.trim());
    form.append('description', intro);
    form.append('type', type.value);
    form.append('subject', subject.value);
    form.append('stage', stage.value);
    if (grade.value) form.append('grade', String(grade.value));
    form.append('scope', scope.value);
    done.value = await resourcesApi.upload(form);
    file.value = null;
    title.value = '';
    description.value = '';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    uploading.value = false;
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">资源上传</h1>
      <p class="text-sm text-soft note">
        上传后会先经学校审核、再由平台复核，通过后自动公开给需要的学生。
        文件会压缩后存储，尽量省流量。
      </p>
      <p class="text-xs text-faint note">
        体积上限：试题 / 导学案 / 电子书 / 音频 50MB，视频 200MB。建议视频先压缩再上传。
      </p>
    </section>

    <section class="card">
      <div class="field note">
        <label class="field-label" for="up-file">选择文件</label>
        <input id="up-file" class="input file-input" type="file" @change="onFileChange" />
        <p v-if="file" class="text-xs text-soft">已选择：{{ file.name }}</p>
      </div>

      <div class="field note">
        <label class="field-label" for="up-title">资源标题</label>
        <input id="up-title" v-model="title" class="input" type="text" placeholder="如：八年级上册数学期末复习提纲" />
      </div>

      <div class="field note">
        <label class="field-label" for="up-desc">
          文件简介<span class="req">*</span>
        </label>
        <textarea
          id="up-desc"
          v-model="description"
          class="input"
          rows="4"
          maxlength="500"
          placeholder="写清三点：① 内容范围（如「第一章到第三章，含 20 道典型题」）② 适用对象（如「八年级上学期，基础中等学生」）③ 使用建议（如「配合课本例题使用」）"
        />
        <p class="text-xs text-faint desc-meta">
          {{ description.trim().length }} / 500 字 · 简介会显示在资源清单里，帮助学生和老师判断是否合用
        </p>
      </div>

      <div class="form-grid note">
        <div class="field">
          <label class="field-label">资源类型</label>
          <select v-model="type" class="input">
            <option v-for="t in TYPES" :key="t" :value="t">{{ RESOURCE_TYPE_LABELS[t] }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">学段</label>
          <select v-model="stage" class="input">
            <option v-for="s in STAGE_OPTIONS" :key="s.value" :value="s.value">{{ stageLabel(s.value) }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">学科</label>
          <select v-model="subject" class="input">
            <option v-for="s in subjectOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">开放范围</label>
          <select v-model="scope" class="input">
            <option v-for="s in SCOPES" :key="s" :value="s">{{ RESOURCE_SCOPE_LABELS[s] }}</option>
          </select>
        </div>
      </div>

      <h2 class="section-title note">年级（不选＝跨年级通用）</h2>
      <div class="chips">
        <button type="button" class="chip" :class="{ active: grade === undefined }" @click="grade = undefined">
          跨年级通用
        </button>
        <button
          v-for="g in grades"
          :key="g"
          type="button"
          class="chip"
          :class="{ active: grade === g }"
          @click="grade = g"
        >
          {{ gradeLabel(g) }}
        </button>
      </div>

      <div v-if="error" class="alert alert-warning note">{{ error }}</div>
      <div v-if="done" class="alert alert-success note">
        已提交「{{ done.title }}」，当前状态：{{ resourceStatusLabel(done.status) }}。
        审核通过后学生即可下载。
      </div>

      <button class="btn btn-primary btn-block note" type="button" :disabled="uploading" @click="submit">
        {{ uploading ? '上传中，请勿关闭页面…' : '提交上传' }}
      </button>
    </section>

  </div>
</template>

<style scoped>
.note {
  margin-top: 10px;
  line-height: 1.55;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.file-input {
  padding: 10px 12px;
  min-height: 46px;
  line-height: 1.4;
}

.req {
  color: var(--c-primary-dark);
  margin-left: 2px;
}

.desc-meta {
  margin-top: 4px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
</style>
