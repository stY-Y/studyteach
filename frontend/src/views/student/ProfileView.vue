<script setup lang="ts">
import { StudyStage } from '@teachstudy/shared';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { usersApi } from '../../api/users';
import { schoolsApi, type SchoolItem } from '../../api/schools';
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
import { offline } from '../../utils/offline';

const router = useRouter();

/** 学段 → 年级，用规范写法落库，资源页与诊断都能直接解析 */
const stage = ref<StudyStage>(StudyStage.JUNIOR);
const grade = ref<number>(8);
const className = ref('');
const subjects = ref<string[]>([]);
const guardianPhone = ref('');

/** 学校（来自 GET /schools；列表为空时学校项留空，不影响其他字段保存） */
const schools = ref<SchoolItem[]>([]);
const schoolId = ref('');

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const tip = ref('');
/** 是否已存在档案（没有则显示“首次填写”提示） */
const hasProfile = ref(false);

const grades = computed(() => gradesForStage(stage.value));
const subjectOptions = computed(() => subjectOptionsForStage(stage.value));

const schoolName = computed(() => schools.value.find((s) => s.id === schoolId.value)?.name ?? '未设置');

function toggleSubject(value: string): void {
  const set = new Set(subjects.value);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  subjects.value = Array.from(set);
}

function applyStage(next: StudyStage): void {
  if (stage.value === next) return;
  stage.value = next;
  const allowed = GRADES_BY_STAGE[next];
  if (!allowed.includes(grade.value)) grade.value = allowed[0];
  // 换学段后学科可能不合法（如小学没有物理），收敛到可用范围
  const allowedLabels = subjectOptionsForStage(next).map((s) => s.label);
  subjects.value = subjects.value.filter((s) => allowedLabels.includes(s));
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const me = await usersApi.me();
    const p = me.studentProfile;
    hasProfile.value = Boolean(p);
    if (!p) return;

    const inferredStage = inferStageFromGrade(p.grade ?? '');
    const inferredGrade = inferGradeFromText(p.grade ?? '');
    if (inferredStage) stage.value = inferredStage;
    if (inferredGrade) grade.value = inferredGrade;

    className.value = p.className ?? '';
    schoolId.value = p.schoolId ?? '';
    subjects.value = p.subjects ? [...p.subjects] : [];
    guardianPhone.value = p.guardianPhone ?? '';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  error.value = '';
  tip.value = '';
  const phone = guardianPhone.value.trim();
  if (phone && !/^1\d{10}$/.test(phone)) {
    error.value = '监护人手机号格式不对，请填 11 位手机号（或留空）';
    return;
  }
  saving.value = true;
  try {
    const saved = await usersApi.saveStudentProfile({
      schoolId: schoolId.value || undefined,
      grade: gradeLabel(grade.value),
      className: className.value.trim() || undefined,
      subjects: subjects.value,
      guardianPhone: phone || undefined,
    });
    hasProfile.value = true;
    tip.value = '档案已保存。学习资源会按新年级自动定位。';

    // 刷新 /users/me 的离线缓存，避免资源页一分钟内仍读旧年级
    try {
      const me = await usersApi.me();
      offline.save('GET /users/me', { ...me, studentProfile: saved });
    } catch {
      /* 刷新失败不影响保存结果 */
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}

function goHome(): void {
  void router.push({ name: 'home' });
}

function goResources(): void {
  void router.push({ name: 'resources' });
}

watch(stage, (next) => applyStage(next));

onMounted(async () => {
  try {
    schools.value = await schoolsApi.list();
  } catch {
    schools.value = [];
  }
  await load();
});
</script>

<template>
  <div class="stack">
    <section class="card">
      <h1 class="page-title">我的档案</h1>
      <p class="text-sm text-soft note">
        年级和选科决定「学习资源」自动定位到哪个年级、知识诊断默认考哪些学科。
        监护人手机只用于家校联系，不对外展示。
      </p>
      <p v-if="!loading && !hasProfile" class="text-xs text-soft note">还没有填过档案，这是第一次填写 🧡</p>
    </section>

    <section class="card">
      <h2 class="section-title">学段</h2>
      <div class="chips">
        <button
          v-for="s in STAGE_OPTIONS"
          :key="s.value"
          type="button"
          class="chip"
          :class="{ active: stage === s.value }"
          @click="applyStage(s.value)"
        >
          {{ stageLabel(s.value) }}
        </button>
      </div>

      <h2 class="section-title chips-title">学校</h2>
      <div v-if="schools.length" class="field">
        <label class="field-label" for="p-school">选择学校</label>
        <select id="p-school" v-model="schoolId" class="input">
          <option value="">请选择学校</option>
          <option v-for="s in schools" :key="s.id" :value="s.id">
            {{ s.name }}<template v-if="s.region">（{{ s.region }}）</template>
          </option>
        </select>
        <p class="text-xs text-faint">决定你能看到哪些「仅本校可见」的资源，选错可随时改。</p>
      </div>
      <p v-else class="text-sm text-soft note">学校列表暂不可用（请联系管理员先录入学校）；其他字段仍可保存。</p>

      <h2 class="section-title chips-title">年级</h2>
      <div class="chips">
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

      <div class="field note">
        <label class="field-label" for="p-class">班级（可空）</label>
        <input id="p-class" v-model="className" class="input" type="text" placeholder="如：2 班" />
      </div>

      <h2 class="section-title note">选科 / 主要学科（可多选）</h2>
      <div class="chips">
        <button
          v-for="s in subjectOptions"
          :key="s.value"
          type="button"
          class="chip"
          :class="{ active: subjects.includes(s.label) }"
          @click="toggleSubject(s.label)"
        >
          {{ s.label }}
        </button>
      </div>

      <div class="field note">
        <label class="field-label" for="p-phone">监护人手机号（可空）</label>
        <input id="p-phone" v-model="guardianPhone" class="input" type="tel" inputmode="numeric" placeholder="11 位手机号" />
        <p class="text-xs text-faint">仅用于家长端绑定与紧急联系，不在任何界面展示。</p>
      </div>

      <div v-if="error" class="alert alert-warning note">{{ error }}</div>
      <div v-if="tip" class="alert alert-success note">{{ tip }}</div>

      <button class="btn btn-primary btn-block note" type="button" :disabled="saving || loading" @click="save">
        {{ saving ? '保存中…' : '保存档案' }}
      </button>
    </section>

    <section class="card">
      <h2 class="section-title">当前档案</h2>
      <div class="row wrap note">
        <span class="badge badge-primary">{{ schoolName }}</span>
        <span class="badge badge-primary">{{ stageLabel(stage) }}</span>
        <span class="badge badge-primary">{{ gradeLabel(grade) }}</span>
        <span v-if="className" class="badge">{{ className }}</span>
        <span v-for="s in subjects" :key="s" class="badge">{{ subjectLabel(s) }}</span>
        <span v-if="subjects.length === 0" class="text-xs text-faint">暂未选科</span>
      </div>
      <div class="row note">
        <button class="btn btn-sm" type="button" @click="goResources">去学习资源看看</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.note {
  margin-top: 10px;
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
</style>
