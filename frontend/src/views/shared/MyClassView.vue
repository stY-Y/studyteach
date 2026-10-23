<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
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
const router = useRouter();

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

/** 转班：学生 id -> 目标班级 id */
const transferTarget = reactive<Record<string, string>>({});
let pollTimer: number | null = null;

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

/** 轮询审核状态：一旦老师通过，自动进入班级聊天 */
function pollApproval(classId: string): void {
  stopPoll();
  pollTimer = window.setInterval(async () => {
    try {
      const data = await classesApi.mine();
      mine.value = data;
      const approved = data.student.some(
        (s) => s.classRoom.id === classId && s.status === 'approved',
      );
      if (approved) {
        stopPoll();
        tip.value = '老师已通过你的申请，正在进入班级聊天…';
        await router.replace({ name: 'chat' });
      }
    } catch {
      /* 轮询失败忽略，等待下一次 */
    }
  }, 5000);
}

function stopPoll(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** 进入指定班级的聊天（班级主页：群聊 + 作业） */
function enterChat(classId?: string): void {
  void router.push({ name: 'chat', query: classId ? { classId } : undefined });
}

/** 进入该班的学情查看（按班级预筛选学生） */
function openReport(item: ClassRoom): void {
  void router.push({
    name: 'students',
    query: { classId: item.id, className: item.className, grade: item.grade },
  });
}

async function applyJoin(classId: string): Promise<void> {
  error.value = '';
  tip.value = '';
  acting.value = classId;
  try {
    await classesApi.join(classId);
    tip.value = '已提交申请，老师审核通过后会自动进入班级聊天';
    await load();
    pollApproval(classId);
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
    const member = await classesApi.joinByCode(code);
    inviteCode.value = '';
    tip.value = '已提交申请，老师审核通过后会自动进入班级聊天';
    await load();
    pollApproval(member.classId);
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

/** 转班可选目标：本人管理的、除当前班以外的班级 */
function transferOptions(currentId: string) {
  return mine.value.teacher.filter((t) => t.id !== currentId);
}

async function doTransfer(classId: string, studentId: string): Promise<void> {
  const target = transferTarget[studentId];
  if (!target) {
    error.value = '请先选择目标班级';
    return;
  }
  error.value = '';
  try {
    await classesApi.transfer(classId, studentId, target);
    transferTarget[studentId] = '';
    memberView.value = await classesApi.members(classId);
    await load();
    tip.value = '已转班：学生档案与班级权限已同步到新班级';
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

onUnmounted(stopPoll);
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
          <button
            v-if="item.status === 'approved'"
            class="btn btn-sm btn-primary"
            type="button"
            @click="enterChat(item.classRoom.id)"
          >
            进入班级聊天
          </button>
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
      <section class="card">
        <p class="text-sm text-soft">
          班级由<b>年级管理员</b>统一创建并任命班主任。若你被任命为某班班主任，该班级会自动出现在下方，
          你可以在班级卡片上直接<b>进班级聊天</b>（群聊 + 作业）或<b>查看本班学情</b>，也可审核学生入班申请、与家长沟通。
        </p>
      </section>

      <section class="card stack">
        <h2 class="section-title">我管理的班级（{{ mine.teacher.length }}）</h2>
        <p v-if="mine.teacher.length === 0" class="empty">
          还没有班级。被年级管理员任命为班级管理员（班主任）后，班级会自动出现在这里。
        </p>

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
            <button class="btn btn-sm btn-primary" type="button" @click="enterChat(c.id)">
              班级聊天
            </button>
            <button class="btn btn-sm" type="button" @click="openReport(c)">
              学情查看
            </button>
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
              <template v-else-if="m.status === 'approved'">
                <select
                  v-if="transferOptions(c.id).length"
                  v-model="transferTarget[m.studentId]"
                  class="input transfer-select"
                >
                  <option value="">转班到…</option>
                  <option v-for="t in transferOptions(c.id)" :key="t.id" :value="t.id">
                    {{ t.name }}
                  </option>
                </select>
                <button
                  v-if="transferOptions(c.id).length"
                  class="btn btn-sm"
                  type="button"
                  @click="doTransfer(c.id, m.studentId)"
                >
                  转班
                </button>
                <button class="btn btn-sm" type="button" @click="removeMember(c.id, m.studentId)">
                  移出班级
                </button>
              </template>
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

.transfer-select {
  width: 132px;
  flex: none;
  min-height: 32px;
  font-size: 13px;
}
</style>
