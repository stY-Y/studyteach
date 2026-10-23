<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { UserRole } from '@teachstudy/shared';
import {
  classesApi,
  type ClassMemberItem,
  type ClassRoom,
  type MyClassesResult,
} from '../../api/classes';
import { schoolsApi, type SchoolItem } from '../../api/schools';
import { gradeLabel } from '../../config/labels';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();

const loading = ref(true);
const error = ref('');
const tip = ref('');

const mine = ref<MyClassesResult>({ student: [], teacher: [] });
const available = ref<ClassRoom[]>([]);
const inviteCode = ref('');
const acting = ref('');

/** 教师建班 */
const schools = ref<SchoolItem[]>([]);
const form = reactive({ schoolId: '', grade: '', className: '' });
const creating = ref(false);
const GRADES = Array.from({ length: 12 }, (_, i) => gradeLabel(i + 1));

/** 成员管理 */
const expandedId = ref('');
const memberView = ref<{ classRoom: ClassRoom; members: ClassMemberItem[] } | null>(null);

const isStudent = computed(() => auth.user?.role === UserRole.STUDENT);
const isAdmin = computed(() => auth.user?.role === UserRole.ADMIN);

const STATUS_LABELS: Record<string, string> = {
  approved: '已加入',
  pending: '待审核',
  rejected: '已拒绝',
};

const STATUS_BADGES: Record<string, string> = {
  approved: 'badge-success',
  pending: 'badge-warning',
  rejected: 'badge-danger',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function statusBadge(status: string): string {
  return STATUS_BADGES[status] ?? 'badge-primary';
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    mine.value = await classesApi.mine();
    if (isStudent.value) {
      available.value = await classesApi.available().catch(() => []);
    }
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function applyJoin(classId: string): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = classId;
  try {
    await classesApi.join(classId);
    tip.value = '已提交申请，等待老师审核通过后即可使用班级聊天与作业';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function applyByCode(): Promise<void> {
  error.value = '';
  tip.value = '';
  const code = inviteCode.value.trim();
  if (!code) {
    error.value = '请输入班级邀请码';
    return;
  }
  acting.value = 'code';
  try {
    await classesApi.joinByCode(code);
    inviteCode.value = '';
    tip.value = '已提交申请，请等待老师审核';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    acting.value = '';
  }
}

async function createClass(): Promise<void> {
  error.value = '';
  tip.value = '';
  if (!form.schoolId || !form.grade || !form.className.trim()) {
    error.value = '请选择学校、年级并填写班级名';
    return;
  }
  creating.value = true;
  try {
    const room = await classesApi.create({
      schoolId: form.schoolId,
      grade: form.grade,
      className: form.className.trim(),
    });
    tip.value = `班级「${room.name}」已创建，邀请码 ${room.inviteCode}，学生可凭码申请`;
    form.className = '';
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    creating.value = false;
  }
}

async function toggleMembers(classId: string): Promise<void> {
  if (expandedId.value === classId) {
    expandedId.value = '';
    memberView.value = null;
    return;
  }
  error.value = '';
  try {
    memberView.value = await classesApi.members(classId);
    expandedId.value = classId;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function review(memberId: string, status: 'approved' | 'rejected'): Promise<void> {
  if (!memberView.value) return;
  error.value = '';
  try {
    await classesApi.review(memberView.value.classRoom.id, memberId, status);
    memberView.value = await classesApi.members(memberView.value.classRoom.id);
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function removeMember(classId: string, studentId: string): Promise<void> {
  error.value = '';
  try {
    await classesApi.removeMember(classId, studentId);
    memberView.value = await classesApi.members(classId);
    await load();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

onMounted(async () => {
  if (!isStudent.value) {
    schools.value = await schoolsApi.list().catch(() => []);
    form.schoolId = auth.user?.schoolId ?? schools.value[0]?.id ?? '';
  }
  await load();
});
</script>

<template>
  <div class="stack">
    <h1 class="page-title">我的班级</h1>
    <p class="text-soft text-sm">
      {{ isStudent
        ? '班级由老师创建，申请并经老师审核通过后，才能使用班级聊天与作业。'
        : '创建班级后把邀请码发给学生，学生申请、你审核通过后才能进入班级聊天与作业。' }}
    </p>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="tip" class="alert alert-info">{{ tip }}</div>

    <div v-if="loading" class="text-soft">加载中…</div>

    <!-- ================= 学生 ================= -->
    <template v-else-if="isStudent">
      <section class="card stack">
        <h2 class="section-title">我的班级</h2>
        <p v-if="mine.student.length === 0" class="empty">
          还没有加入任何班级，先在下方申请一个吧。
        </p>
        <div v-for="item in mine.student" :key="item.memberId" class="row-item">
          <div class="grow">
            <p class="item-title">{{ item.classRoom.name }}</p>
            <p class="text-xs text-faint">班主任：{{ item.classRoom.teacherName || '老师' }}</p>
          </div>
          <span class="badge" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span>
          <button
            v-if="item.status === 'rejected'"
            class="btn btn-sm"
            type="button"
            :disabled="acting === item.classRoom.id"
            @click="applyJoin(item.classRoom.id)"
          >
            重新申请
          </button>
          <span v-if="item.status === 'approved'" class="text-xs text-faint">已可使用聊天与作业</span>
        </div>
      </section>

      <section class="card stack">
        <h2 class="section-title">申请加入班级</h2>
        <div class="field">
          <label class="field-label" for="invite-code">班级邀请码</label>
          <div class="inline-row">
            <input id="invite-code" v-model.trim="inviteCode" class="input" type="text" maxlength="12" placeholder="老师提供的邀请码，如 QINGHE01" />
            <button class="btn btn-primary" type="button" :disabled="acting === 'code'" @click="applyByCode">申请</button>
          </div>
        </div>

        <h3 class="sub-title">同校同年级可申请班级</h3>
        <p v-if="available.length === 0" class="text-sm text-faint">
          暂无可申请班级：可能是老师还没建班，或你已申请过。
        </p>
        <div v-for="c in available" :key="c.id" class="row-item">
          <div class="grow">
            <p class="item-title">{{ c.name }}</p>
            <p class="text-xs text-faint">班主任：{{ c.teacherName || '老师' }}</p>
          </div>
          <button class="btn btn-sm" type="button" :disabled="acting === c.id" @click="applyJoin(c.id)">
            申请加入
          </button>
        </div>
      </section>
    </template>

    <!-- ================= 教师 / 管理员 ================= -->
    <template v-else>
      <section class="card stack">
        <h2 class="section-title">创建班级</h2>
        <div class="field">
          <label class="field-label" for="cls-school">学校</label>
          <select id="cls-school" v-model="form.schoolId" class="input" :disabled="!isAdmin">
            <option value="">请选择学校</option>
            <option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="field-row">
          <div class="field">
            <label class="field-label" for="cls-grade">年级</label>
            <select id="cls-grade" v-model="form.grade" class="input">
              <option value="">请选择</option>
              <option v-for="g in GRADES" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="cls-name">班级名</label>
            <input id="cls-name" v-model.trim="form.className" class="input" type="text" maxlength="64" placeholder="如 2 班" />
          </div>
        </div>
        <button class="btn btn-primary self-start" type="button" :disabled="creating" @click="createClass">
          {{ creating ? '创建中…' : '创建班级' }}
        </button>
      </section>

      <section class="card stack">
        <h2 class="section-title">我管理的班级（{{ mine.teacher.length }}）</h2>
        <p v-if="mine.teacher.length === 0" class="empty">还没有创建班级。</p>

        <div v-for="c in mine.teacher" :key="c.id" class="class-block">
          <div class="row-item">
            <div class="grow">
              <p class="item-title">{{ c.name }}</p>
              <p class="text-xs text-faint">
                邀请码 <span class="mono">{{ c.inviteCode }}</span> · 已加入 {{ c.memberCount }} 人
                <template v-if="c.pendingCount > 0"> · <strong class="text-warn">{{ c.pendingCount }} 人待审核</strong></template>
              </p>
            </div>
            <span v-if="c.pendingCount > 0" class="badge badge-warning">待审 {{ c.pendingCount }}</span>
            <button class="btn btn-sm" type="button" @click="toggleMembers(c.id)">
              {{ expandedId === c.id ? '收起' : '成员与审核' }}
            </button>
          </div>

          <div v-if="expandedId === c.id && memberView" class="member-panel">
            <p v-if="memberView.members.length === 0" class="text-sm text-faint">还没有学生申请。</p>
            <div v-for="m in memberView.members" :key="m.id" class="member-row">
              <span class="grow">{{ m.studentName || '学生' }}</span>
              <span class="badge" :class="statusBadge(m.status)">{{ statusLabel(m.status) }}</span>
              <template v-if="m.status === 'pending'">
                <button class="btn btn-sm btn-primary" type="button" @click="review(m.id, 'approved')">通过</button>
                <button class="btn btn-sm" type="button" @click="review(m.id, 'rejected')">拒绝</button>
              </template>
              <button
                v-else-if="m.status === 'approved'"
                class="btn btn-sm"
                type="button"
                @click="removeMember(c.id, m.studentId)"
              >
                移出班级
              </button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.row-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-top: 1px solid var(--c-border);
}

.row-item:first-of-type {
  border-top: none;
}

.grow {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 500;
}

.inline-row {
  display: flex;
  gap: 8px;
}

.inline-row .input {
  flex: 1;
  min-width: 0;
}

.field-row {
  display: flex;
  gap: 10px;
}

.field-row .field {
  flex: 1;
  min-width: 0;
}

.self-start {
  align-self: flex-start;
}

.class-block {
  padding: 4px 0;
  border-top: 1px solid var(--c-border);
}

.class-block:first-of-type {
  border-top: none;
}

.member-panel {
  margin: 6px 0 10px;
  padding: 10px 12px;
  background: #faf6ec;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.member-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-top: 1px dashed var(--c-border);
}

.member-row:first-of-type {
  border-top: none;
}

.text-warn {
  color: #b45309;
}
</style>
