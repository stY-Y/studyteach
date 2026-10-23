import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { STAFF_LIMITS, StaffRole, UserRole } from '@teachstudy/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ClassRoom } from '../classes/entities/class-room.entity';
import { User } from '../users/entities/user.entity';
import { Grade } from './entities/grade.entity';
import { StaffAppointment } from './entities/staff-appointment.entity';

/** 岗位上下文：随 JWT 一起下发，前端据此决定显示哪些管理入口 */
export interface StaffContext {
  staffRoles: StaffRole[];
  /** 担任班级管理员的班级 id */
  classIds: string[];
  /** 担任年级管理员的年级 id */
  gradeIds: string[];
  /** 担任学校管理员的学校 id */
  schoolIds: string[];
}

/**
 * 任命制管理员体系。
 *
 * 平台管理员 → 学校管理员 → 年级管理员 → 班级管理员（班主任），逐级任命；
 * 名额上限：每校 2 名学校管理员、每校每年级 2 名年级管理员、每班 2 名班级管理员。
 * 任命不改变基础身份（仍是教师账号），只叠加岗位；role 字段按最高岗位派生。
 */
@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffAppointment)
    private readonly appointments: Repository<StaffAppointment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Grade) private readonly grades: Repository<Grade>,
    @InjectRepository(ClassRoom) private readonly classes: Repository<ClassRoom>,
  ) {}

  // ---------- 查询 ----------

  list(userId: string): Promise<StaffAppointment[]> {
    return this.appointments.find({ where: { userId } });
  }

  async contextOf(userId: string): Promise<StaffContext> {
    const list = await this.list(userId);
    return {
      staffRoles: list.map((a) => a.role),
      classIds: list.filter((a) => a.role === StaffRole.CLASS_ADMIN).map((a) => a.classId as string),
      gradeIds: list.filter((a) => a.role === StaffRole.GRADE_ADMIN).map((a) => a.gradeId as string),
      schoolIds: list.filter((a) => a.role === StaffRole.SCHOOL_ADMIN).map((a) => a.schoolId),
    };
  }

  /** 是否担任某个班级的管理员 */
  async isClassAdmin(userId: string, classId: string): Promise<boolean> {
    const hit = await this.appointments.findOne({
      where: { userId, role: StaffRole.CLASS_ADMIN, classId },
    });
    return Boolean(hit);
  }

  async isGradeAdmin(userId: string, gradeId: string): Promise<boolean> {
    const hit = await this.appointments.findOne({
      where: { userId, role: StaffRole.GRADE_ADMIN, gradeId },
    });
    return Boolean(hit);
  }

  async isSchoolAdmin(userId: string, schoolId: string): Promise<boolean> {
    const hit = await this.appointments.findOne({
      where: { userId, role: StaffRole.SCHOOL_ADMIN, schoolId },
    });
    return Boolean(hit);
  }

  /** 某人担任班级管理员的全部班级（含兼任） */
  async classIdsOf(userId: string): Promise<string[]> {
    const list = await this.appointments.find({
      where: { userId, role: StaffRole.CLASS_ADMIN },
    });
    return list.map((a) => a.classId as string);
  }

  async listAdmins(role: StaffRole, scopeId: string) {
    const list = await this.appointments.find({ where: { role, scopeId } });
    if (list.length === 0) return [];
    const users = await this.users.find({ where: { id: In(list.map((a) => a.userId)) } });
    const byId = new Map(users.map((u) => [u.id, u]));
    return list.map((a) => {
      const u = byId.get(a.userId);
      return {
        appointmentId: a.id,
        userId: a.userId,
        username: u?.username ?? '',
        name: u?.name ?? u?.username ?? '未知',
        role: a.role,
        scopeId: a.scopeId,
        createdAt: a.createdAt,
      };
    });
  }

  /** 批量查询用户已有岗位（用于候选列表提示兼任情况） */
  async listAdminsByUsers(userIds: string[]): Promise<Map<string, StaffRole[]>> {
    if (userIds.length === 0) return new Map();
    const list = await this.appointments.find({ where: { userId: In(userIds) } });
    const map = new Map<string, StaffRole[]>();
    for (const a of list) {
      const arr = map.get(a.userId) ?? [];
      arr.push(a.role);
      map.set(a.userId, arr);
    }
    return map;
  }

  /** 可任命对象：本校教师 + 尚未归属学校的教师（刚注册的教师可被上级任命后归属）。
   * 含已任其他岗位的教师，用于支持兼任。
   */
  async eligibleTeachers(schoolId: string) {
    const roles = In([UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN]);
    const users = await this.users.find({
      where: [
        { schoolId, role: roles },
        { schoolId: IsNull(), role: roles },
      ],
      order: { createdAt: 'ASC' },
    });
    if (users.length === 0) return [];
    const apps = await this.appointments.find({
      where: { userId: In(users.map((u) => u.id)) },
    });
    const map = new Map<string, StaffAppointment[]>();
    for (const a of apps) {
      const arr = map.get(a.userId) ?? [];
      arr.push(a);
      map.set(a.userId, arr);
    }
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name ?? u.username,
      schoolId: u.schoolId,
      /** 该教师当前已有的岗位（用于前端提示，避免用户困惑为何出现同名） */
      roles: (map.get(u.id) ?? []).map((a) => a.role),
    }));
  }

  // ---------- 任命 / 卸任 ----------

  async appointSchoolAdmin(actor: AuthUser, schoolId: string, userId: string) {
    this.assertPlatform(actor);
    const user = await this.assertAppointable(userId, schoolId);
    await this.assertQuota(StaffRole.SCHOOL_ADMIN, schoolId, '该学校的学校管理员已满 2 名');

    const saved = await this.create({
      userId: user.id,
      role: StaffRole.SCHOOL_ADMIN,
      scopeId: schoolId,
      schoolId,
      gradeId: null,
      classId: null,
      appointedBy: actor.id,
    });

    await this.users.update(user.id, { schoolId, role: UserRole.SCHOOL_ADMIN });
    return saved;
  }

  async dismissSchoolAdmin(actor: AuthUser, schoolId: string, userId: string) {
    this.assertPlatform(actor);
    await this.remove(StaffRole.SCHOOL_ADMIN, schoolId, userId);
    await this.recalcRole(userId);
    return { dismissed: true };
  }

  /** 学校管理员任命年级管理员（每校每年级最多 2 名） */
  async appointGradeAdmin(actor: AuthUser, grade: Grade, userId: string) {
    await this.assertSchoolScope(actor, grade.schoolId);
    const user = await this.assertAppointable(userId, grade.schoolId);
    await this.assertQuota(StaffRole.GRADE_ADMIN, grade.id, `${grade.name}的年级管理员已满 2 名`);

    const saved = await this.create({
      userId: user.id,
      role: StaffRole.GRADE_ADMIN,
      scopeId: grade.id,
      schoolId: grade.schoolId,
      gradeId: grade.id,
      classId: null,
      appointedBy: actor.id,
    });

    // 兼容旧字段：年级主管理员（第一位）
    if (!grade.gradeAdminId) {
      await this.grades.update(grade.id, { gradeAdminId: user.id });
    }
    await this.syncUserSchool(user.id, grade.schoolId);
    await this.recalcRole(user.id);
    return saved;
  }

  async dismissGradeAdmin(actor: AuthUser, grade: Grade, userId: string) {
    await this.assertSchoolScope(actor, grade.schoolId);
    await this.remove(StaffRole.GRADE_ADMIN, grade.id, userId);

    if (grade.gradeAdminId === userId) {
      const next = await this.appointments.findOne({
        where: { role: StaffRole.GRADE_ADMIN, gradeId: grade.id },
      });
      await this.grades.update(grade.id, { gradeAdminId: next?.userId ?? null });
    }
    await this.recalcRole(userId);
    return { dismissed: true };
  }

  /** 年级管理员任命班级管理员（每班最多 2 名） */
  async appointClassAdmin(actor: AuthUser, room: ClassRoom, userId: string) {
    await this.assertGradeScope(actor, room);
    const user = await this.assertAppointable(userId, room.schoolId);
    await this.assertQuota(StaffRole.CLASS_ADMIN, room.id, `${room.name}的班级管理员已满 2 名`);

    const saved = await this.create({
      userId: user.id,
      role: StaffRole.CLASS_ADMIN,
      scopeId: room.id,
      schoolId: room.schoolId,
      gradeId: room.gradeId,
      classId: room.id,
      appointedBy: actor.id,
    });

    // 兼容旧字段：班级主管理员（第一位）
    if (!room.teacherId || room.teacherId === 'unassigned') {
      await this.classes.update(room.id, { teacherId: user.id, teacherName: user.name });
    }
    await this.syncUserSchool(user.id, room.schoolId);
    await this.recalcRole(user.id);
    return saved;
  }

  async dismissClassAdmin(actor: AuthUser, room: ClassRoom, userId: string) {
    await this.assertGradeScope(actor, room);
    await this.remove(StaffRole.CLASS_ADMIN, room.id, userId);

    if (room.teacherId === userId) {
      const next = await this.appointments.findOne({
        where: { role: StaffRole.CLASS_ADMIN, classId: room.id },
      });
      const nextUser = next ? await this.users.findOne({ where: { id: next.userId } }) : null;
      await this.classes.update(room.id, {
        teacherId: next?.userId ?? 'unassigned',
        teacherName: nextUser?.name ?? null,
      });
    }
    await this.recalcRole(userId);
    return { dismissed: true };
  }

  /** 按剩余岗位重算派生角色（平台管理员不参与） */
  async recalcRole(userId: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.role === UserRole.ADMIN) return;

    const apps = await this.list(userId);
    const has = (role: StaffRole) => apps.some((a) => a.role === role);
    const role = has(StaffRole.SCHOOL_ADMIN)
      ? UserRole.SCHOOL_ADMIN
      : has(StaffRole.GRADE_ADMIN)
        ? UserRole.GRADE_ADMIN
        : UserRole.TEACHER;

    if (user.role !== role) await this.users.update(userId, { role });
  }

  // ---------- 内部工具 ----------

  private async create(data: Partial<StaffAppointment>): Promise<StaffAppointment> {
    const exists = await this.appointments.findOne({
      where: { userId: data.userId as string, role: data.role as StaffRole, scopeId: data.scopeId as string },
    });
    if (exists) throw new ConflictException('该账号已被任命为同一岗位');
    return this.appointments.save(this.appointments.create(data));
  }

  private async remove(role: StaffRole, scopeId: string, userId: string): Promise<void> {
    const hit = await this.appointments.findOne({ where: { userId, role, scopeId } });
    if (!hit) throw new NotFoundException('该任命不存在');
    await this.appointments.delete(hit.id);
  }

  private async assertQuota(role: StaffRole, scopeId: string, message: string): Promise<void> {
    const count = await this.appointments.count({ where: { role, scopeId } });
    if (count >= STAFF_LIMITS[role]) throw new BadRequestException(message);
  }

  /** 目标账号必须可被任命：教师或已在任教师岗位，且属于该学校（本校之外的拒绝） */
  private async assertAppointable(userId: string, schoolId: string): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('目标账号不存在');
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('平台管理员不能被任命为下级管理员');
    }
    if (user.role === UserRole.STUDENT || user.role === UserRole.PARENT) {
      throw new BadRequestException('只能任命教师账号为管理员');
    }
    if (user.schoolId && user.schoolId !== schoolId) {
      throw new BadRequestException('该教师不属于当前学校，无法任命');
    }
    return user;
  }

  /** 教师此前未绑定学校时自动归属（教师注册时无需选学校） */
  private async syncUserSchool(userId: string, schoolId: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (user && !user.schoolId) await this.users.update(userId, { schoolId });
  }

  private assertPlatform(actor: AuthUser): void {
    if (actor.role !== UserRole.ADMIN) throw new ForbiddenException('仅平台管理员可操作');
  }

  private async assertSchoolScope(actor: AuthUser, schoolId: string): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;
    const staffRoles = actor.staffRoles ?? [];
    if (staffRoles.includes(StaffRole.SCHOOL_ADMIN) && actor.schoolId === schoolId) return;
    if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId === schoolId) return;
    throw new ForbiddenException('无权管理该学校');
  }

  private async assertGradeScope(actor: AuthUser, room: ClassRoom): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;
    const staffRoles = actor.staffRoles ?? [];
    if (staffRoles.includes(StaffRole.SCHOOL_ADMIN) && actor.schoolId === room.schoolId) return;
    if (
      staffRoles.includes(StaffRole.GRADE_ADMIN) &&
      room.gradeId &&
      (await this.isGradeAdmin(actor.id, room.gradeId))
    ) {
      return;
    }
    if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId === room.schoolId) return;
    throw new ForbiddenException('无权管理该班级');
  }
}
