import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserRole } from '@teachstudy/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { StaffService } from '../org/staff.service';

/**
 * 管理看板：按角色返回聚合统计，让工作台"活"起来。
 * 全部是只读 count 查询，无副作用。
 */

const roleOf = (u: string) => u;

export interface Dashboard {
  role: string;
  generatedAt: string;
  [key: string]: unknown;
}

/** 趋势上的一个点：某天有多少人登录 */
export interface ActivityPoint {
  date: string;
  label: string;
  count: number;
}

/** 日活统计：以「登录」为口径，按自然日去重统计人数 */
export interface ActivityStat {
  today: number;
  yesterday: number;
  peak: number;
  /** 近 7 天，从最早到今天 */
  trend: ActivityPoint[];
}

const DAY_MS = 86_400_000;

/** 把数据库取出的时间（sqlite 为 UTC 字符串，mysql 为 Date）统一成时间戳 */
function tsOf(v: string | Date): number {
  if (v instanceof Date) return v.getTime();
  const s = String(v);
  return Date.parse(s.includes('T') ? s : `${s.replace(' ', 'T')}Z`);
}

/** 时间戳 → 与库中 datetime 同格式的字符串（UTC），便于直接做字符串比较 */
function dbStamp(t: number): string {
  return new Date(t).toISOString().slice(0, 19).replace('T', ' ');
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly staff: StaffService,
  ) {}

  private count(sql: string, params: unknown[] = []): Promise<number> {
    return this.ds
      .query(sql, params)
      .then((r: Array<{ c: number }>) => Number(r[0]?.c ?? 0));
  }

  // ---------- 日活统计 ----------

  /**
   * 日活（DAU）统计。
   *
   * 口径：按「自然日 + 登录事件」去重统计人数——同一人一天内登录多次只算 1 人。
   * 只认登录，不采集 IP / 设备 / 位置，够回答「今天有多少人在用」就好。
   *
   * @param whereSql 范围过滤（以 AND 开头；平台管理员传空串表示全平台）
   */
  private async activity(whereSql: string, params: unknown[] = []): Promise<ActivityStat> {
    const now = new Date();
    // 以本地时区的自然日切分（中国无夏令时，直接按 24h 推进即可）
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const start = todayStart - 6 * DAY_MS;

    const rows = (await this.ds.query(
      `SELECT l.user_id AS userId, l.created_at AS createdAt
       FROM login_logs l
       WHERE l.created_at >= ?${whereSql}`,
      [dbStamp(start), ...params],
    )) as Array<{ userId: string; createdAt: string | Date }>;

    const buckets: Array<Set<string>> = Array.from({ length: 7 }, () => new Set<string>());
    rows.forEach((r) => {
      const t = tsOf(r.createdAt);
      if (!Number.isFinite(t) || t < start) return;
      const idx = Math.min(6, Math.max(0, Math.floor((t - start) / DAY_MS)));
      buckets[idx].add(r.userId);
    });

    const trend = buckets.map((set, i) => {
      const d = new Date(start + i * DAY_MS);
      const mm = `${d.getMonth() + 1}`;
      const dd = `${d.getDate()}`;
      return {
        date: `${d.getFullYear()}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`,
        label: `${mm}/${dd}`,
        count: set.size,
      };
    });

    return {
      today: buckets[6].size,
      yesterday: buckets[5].size,
      peak: trend.reduce((m, p) => Math.max(m, p.count), 0),
      trend,
    };
  }

  /** 全平台日活 */
  private activityAll(): Promise<ActivityStat> {
    return this.activity('', []);
  }

  /** 本校日活：本校账号（学生/教师） + 该校任命的管理员 */
  private activityBySchools(schoolIds: string[]): Promise<ActivityStat> {
    if (!schoolIds.length) return this.activity(' AND 1 = 0', []);
    const ph = schoolIds.map(() => '?').join(',');
    return this.activity(
      ` AND (l.user_id IN (SELECT id FROM users WHERE school_id IN (${ph}))
          OR l.user_id IN (SELECT user_id FROM staff_appointments WHERE school_id IN (${ph})))`,
      [...schoolIds, ...schoolIds],
    );
  }

  /** 本班/本年级日活：班级成员（学生） + 该班任命的班主任 */
  private activityByClasses(classIds: string[]): Promise<ActivityStat> {
    if (!classIds.length) return this.activity(' AND 1 = 0', []);
    const ph = classIds.map(() => '?').join(',');
    return this.activity(
      ` AND (l.user_id IN (SELECT student_id FROM class_members WHERE status = 'approved' AND class_id IN (${ph}))
          OR l.user_id IN (SELECT user_id FROM staff_appointments WHERE class_id IN (${ph})))`,
      [...classIds, ...classIds],
    );
  }

  /** 平台管理员：全平台总览（机构与内容资产，不含师生日常活动量） */
  private async platform(): Promise<Dashboard> {
    const [
      schools,
      students,
      teachers,
      parents,
      classes,
      resources,
      questions,
      activity,
    ] = await Promise.all([
      this.count('SELECT COUNT(*) c FROM schools'),
      this.count(`SELECT COUNT(*) c FROM users WHERE role = 'student'`),
      this.count(`SELECT COUNT(*) c FROM users WHERE role = 'teacher'`),
      this.count(`SELECT COUNT(*) c FROM users WHERE role = 'parent'`),
      this.count('SELECT COUNT(*) c FROM class_rooms'),
      this.count(`SELECT COUNT(*) c FROM resources WHERE status = 'approved'`),
      this.count(`SELECT COUNT(*) c FROM questions WHERE status = 'approved'`),
      this.activityAll(),
    ]);
    return {
      role: 'platform',
      generatedAt: new Date().toISOString(),
      schools,
      students,
      teachers,
      parents,
      classes,
      resources,
      questions,
      activity,
    };
  }

  /** 学校管理员 / 年级管理员：本校或本年级视角 */
  private async scoped(actor: AuthUser): Promise<Dashboard> {
    const ctx = await this.staff.contextOf(actor.id);

    // 学校管理员：本校全部；年级管理员：本年级
    const schoolIds = ctx.schoolIds.length ? ctx.schoolIds : [];
    const gradeIds = ctx.gradeIds;

    let students = 0;
    let teachers = 0;
    let classes = 0;
    let gradeCount = 0;
    // 没有任何管理范围时不返回日活（前端据此隐藏卡片）
    let activity: ActivityStat | null = null;

    if (schoolIds.length) {
      [students, teachers, classes, gradeCount, activity] = await Promise.all([
        this.count(
          `SELECT COUNT(*) c FROM student_profiles WHERE school_id IN (${schoolIds
            .map(() => '?')
            .join(',')})`,
          schoolIds,
        ),
        this.count(
          `SELECT COUNT(*) c FROM users WHERE role = 'teacher' AND school_id IN (${schoolIds
            .map(() => '?')
            .join(',')})`,
          schoolIds,
        ),
        this.count(
          `SELECT COUNT(*) c FROM class_rooms WHERE school_id IN (${schoolIds
            .map(() => '?')
            .join(',')})`,
          schoolIds,
        ),
        this.count(
          `SELECT COUNT(*) c FROM grades WHERE school_id IN (${schoolIds.map(() => '?').join(',')})`,
          schoolIds,
        ),
        this.activityBySchools(schoolIds),
      ]);
    } else if (gradeIds.length) {
      gradeCount = gradeIds.length;
      classes = await this.count(
        `SELECT COUNT(*) c FROM class_rooms WHERE grade_id IN (${gradeIds.map(() => '?').join(',')})`,
        gradeIds,
      );
      const roomRows = (await this.ds.query(
        `SELECT id FROM class_rooms WHERE grade_id IN (${gradeIds.map(() => '?').join(',')})`,
        gradeIds,
      )) as Array<{ id: string }>;
      const roomIds = roomRows.map((r) => r.id);
      if (roomIds.length) {
        const ph = roomIds.map(() => '?').join(',');
        [students, teachers, activity] = await Promise.all([
          this.count(
            `SELECT COUNT(*) c FROM class_members WHERE status = 'approved' AND class_id IN (${ph})`,
            roomIds,
          ),
          this.count(
            `SELECT COUNT(DISTINCT user_id) c FROM staff_appointments WHERE role = 'class_admin' AND class_id IN (${ph})`,
            roomIds,
          ),
          this.activityByClasses(roomIds),
        ]);
      }
    }

    return {
      role: actor.role,
      generatedAt: new Date().toISOString(),
      schools: schoolIds.length,
      grades: gradeCount,
      classes,
      students,
      teachers,
      activity,
    };
  }

  /** 班级管理员（班主任）：我带的班 */
  private async classAdmin(actor: AuthUser): Promise<Dashboard> {
    const classIds = await this.staff.classIdsOf(actor.id);
    if (!classIds.length) {
      return {
        role: actor.role,
        generatedAt: new Date().toISOString(),
        classes: 0,
        students: 0,
        pending: 0,
        homeworks: 0,
        notices: 0,
        messages: 0,
        activity: null,
      };
    }
    const ph = classIds.map(() => '?').join(',');
    const [students, pending, homeworks, notices, messages, activity] = await Promise.all([
      this.count(
        `SELECT COUNT(*) c FROM class_members WHERE status = 'approved' AND class_id IN (${ph})`,
        classIds,
      ),
      this.count(
        `SELECT COUNT(*) c FROM class_members WHERE status = 'pending' AND class_id IN (${ph})`,
        classIds,
      ),
      this.count(`SELECT COUNT(*) c FROM homework WHERE class_id IN (${ph})`, classIds),
      this.count(`SELECT COUNT(*) c FROM class_notices WHERE class_id IN (${ph})`, classIds),
      this.count(`SELECT COUNT(*) c FROM chat_messages WHERE class_id IN (${ph})`, classIds),
      this.activityByClasses(classIds),
    ]);
    return {
      role: actor.role,
      generatedAt: new Date().toISOString(),
      classes: classIds.length,
      students,
      pending,
      homeworks,
      notices,
      messages,
      activity,
    };
  }

  /** 学生：我的学习概览 + 所在班级的通知与消息 */
  private async student(actor: AuthUser): Promise<Dashboard> {
    // 学生已加入（审核通过）的班级
    const memberRows = (await this.ds.query(
      `SELECT class_id FROM class_members WHERE student_id = ? AND status = 'approved'`,
      [actor.id],
    )) as Array<{ class_id: string }>;
    const classIds = memberRows.map((r) => r.class_id);

    let notices = 0;
    let messages = 0;
    if (classIds.length) {
      const ph = classIds.map(() => '?').join(',');
      [notices, messages] = await Promise.all([
        this.count(`SELECT COUNT(*) c FROM class_notices WHERE class_id IN (${ph})`, classIds),
        this.count(`SELECT COUNT(*) c FROM chat_messages WHERE class_id IN (${ph})`, classIds),
      ]);
    }

    const [diagnoses, gradings, homeworks, reports] = await Promise.all([
      this.count('SELECT COUNT(*) c FROM diagnosis_records WHERE student_id = ?', [actor.id]),
      this.count('SELECT COUNT(*) c FROM grading_records WHERE student_id = ?', [actor.id]),
      this.count(
        'SELECT COUNT(*) c FROM homework_submissions WHERE student_id = ?',
        [actor.id],
      ),
      this.count('SELECT COUNT(*) c FROM study_reports WHERE student_id = ?', [actor.id]),
    ]);
    return {
      role: actor.role,
      generatedAt: new Date().toISOString(),
      notices,
      messages,
      diagnoses,
      gradings,
      homeworks,
      reports,
    };
  }

  /** 家长：孩子的学习概览（诊断与作业提交，不看批改细节） */
  private async parent(actor: AuthUser): Promise<Dashboard> {
    const rows = (await this.ds.query(
      `SELECT student_user_id FROM parent_student_links WHERE parent_user_id = ? AND status = 'approved'`,
      [actor.id],
    )) as Array<{ student_user_id: string }>;
    const childIds = rows.map((r) => r.student_user_id);
    if (!childIds.length) {
      return { role: actor.role, generatedAt: new Date().toISOString(), children: 0 };
    }
    const ph = childIds.map(() => '?').join(',');
    const [children, diagnoses, homeworks] = await Promise.all([
      this.count(`SELECT COUNT(*) c FROM users WHERE id IN (${ph})`, childIds),
      this.count(`SELECT COUNT(*) c FROM diagnosis_records WHERE student_id IN (${ph})`, childIds),
      this.count(
        `SELECT COUNT(*) c FROM homework_submissions WHERE student_id IN (${ph})`,
        childIds,
      ),
    ]);
    return {
      role: actor.role,
      generatedAt: new Date().toISOString(),
      children,
      diagnoses,
      homeworks,
    };
  }

  async overview(actor: AuthUser): Promise<Dashboard> {
    switch (actor.role) {
      case UserRole.ADMIN:
        return this.platform();
      case UserRole.SCHOOL_ADMIN:
      case UserRole.GRADE_ADMIN:
        return this.scoped(actor);
      case UserRole.TEACHER:
        return this.classAdmin(actor);
      case UserRole.STUDENT:
        return this.student(actor);
      case UserRole.PARENT:
        return this.parent(actor);
      default:
        throw new ForbiddenException('无法识别的角色');
    }
  }
}

/** 保持 roleOf 被使用，避免未用告警（占位，便于后续扩展角色文案） */
void roleOf;
