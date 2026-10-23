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

  /** 平台管理员：全平台总览 */
  private async platform(): Promise<Dashboard> {
    const [
      schools,
      students,
      teachers,
      parents,
      classes,
      resources,
      questions,
      diagnoses,
      gradings,
      homeworks,
    ] = await Promise.all([
      this.count('SELECT COUNT(*) c FROM schools'),
      this.count(`SELECT COUNT(*) c FROM users WHERE role = 'student'`),
      this.count(`SELECT COUNT(*) c FROM users WHERE role = 'teacher'`),
      this.count(`SELECT COUNT(*) c FROM users WHERE role = 'parent'`),
      this.count('SELECT COUNT(*) c FROM class_rooms'),
      this.count(`SELECT COUNT(*) c FROM resources WHERE status = 'approved'`),
      this.count(`SELECT COUNT(*) c FROM questions WHERE status = 'approved'`),
      this.count('SELECT COUNT(*) c FROM diagnosis_records'),
      this.count('SELECT COUNT(*) c FROM grading_records'),
      this.count('SELECT COUNT(*) c FROM homework'),
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
      diagnoses,
      gradings,
      homeworks,
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

    if (schoolIds.length) {
      [students, teachers, classes, gradeCount] = await Promise.all([
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
        students = await this.count(
          `SELECT COUNT(*) c FROM class_members WHERE status = 'approved' AND class_id IN (${roomIds
            .map(() => '?')
            .join(',')})`,
          roomIds,
        );
      }
      teachers = await this.count(
        `SELECT COUNT(DISTINCT user_id) c FROM staff_appointments WHERE role = 'class_admin' AND class_id IN (${roomIds
          .map(() => '?')
          .join(',')})`,
        roomIds,
      );
    }

    return {
      role: actor.role,
      generatedAt: new Date().toISOString(),
      schools: schoolIds.length,
      grades: gradeCount,
      classes,
      students,
      teachers,
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
      };
    }
    const ph = classIds.map(() => '?').join(',');
    const [students, pending, homeworks, notices, messages] = await Promise.all([
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
    };
  }

  /** 学生：我的学习概览 */
  private async student(actor: AuthUser): Promise<Dashboard> {
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
      diagnoses,
      gradings,
      homeworks,
      reports,
    };
  }

  /** 家长：孩子的学习概览 */
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
    const [children, diagnoses, gradings, homeworks] = await Promise.all([
      this.count(`SELECT COUNT(*) c FROM users WHERE id IN (${ph})`, childIds),
      this.count(`SELECT COUNT(*) c FROM diagnosis_records WHERE student_id IN (${ph})`, childIds),
      this.count(`SELECT COUNT(*) c FROM grading_records WHERE student_id IN (${ph})`, childIds),
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
      gradings,
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
