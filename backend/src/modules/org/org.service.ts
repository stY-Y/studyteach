import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { StaffRole, UserRole } from '@teachstudy/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ClassMember } from '../classes/entities/class-member.entity';
import { ClassRoom } from '../classes/entities/class-room.entity';
import { School } from '../schools/entities/school.entity';
import { User } from '../users/entities/user.entity';
import { StudentProfile } from '../users/entities/student-profile.entity';
import { Grade } from './entities/grade.entity';
import { Notice } from './entities/notice.entity';
import { StaffService } from './staff.service';
import {
  ConfigureGradesDto,
  CreateGradeDto,
  CreateNoticeDto,
  CreateOrgClassDto,
  CreateSchoolDto,
  UpdateOrgClassDto,
} from './dto/org.dto';

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(School) private readonly schools: Repository<School>,
    @InjectRepository(Grade) private readonly grades: Repository<Grade>,
    @InjectRepository(ClassRoom) private readonly classes: Repository<ClassRoom>,
    @InjectRepository(ClassMember) private readonly members: Repository<ClassMember>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(StudentProfile) private readonly profiles: Repository<StudentProfile>,
    @InjectRepository(Notice) private readonly notices: Repository<Notice>,
    private readonly staff: StaffService,
  ) {}

  // ==================== 学校（平台管理员） ====================

  async listSchools(actor: AuthUser) {
    if (actor.role === UserRole.ADMIN) {
      const list = await this.schools.find({ order: { createdAt: 'ASC' } });
      return Promise.all(list.map((s) => this.withSchoolMeta(s)));
    }

    const scope = await this.schoolIdsOf(actor);
    if (scope.length === 0) throw new ForbiddenException('无权查看学校列表');
    const list = await this.schools.find({ where: { id: In(scope) } });
    return Promise.all(list.map((s) => this.withSchoolMeta(s)));
  }

  private async withSchoolMeta(school: School) {
    const [admins, gradeCount, classCount] = await Promise.all([
      this.staff.listAdmins(StaffRole.SCHOOL_ADMIN, school.id),
      this.grades.count({ where: { schoolId: school.id } }),
      this.classes.count({ where: { schoolId: school.id } }),
    ]);
    return {
      ...school,
      admins,
      gradeCount,
      classCount,
      adminLimit: 2,
    };
  }

  async createSchool(actor: AuthUser, dto: CreateSchoolDto) {
    this.assertPlatform(actor);
    return this.schools.save(
      this.schools.create({ name: dto.name.trim(), region: dto.region?.trim() || '' }),
    );
  }

  async deleteSchool(actor: AuthUser, id: string) {
    this.assertPlatform(actor);
    await this.schoolOrThrow(id);

    const gradeCount = await this.grades.count({ where: { schoolId: id } });
    if (gradeCount > 0) throw new BadRequestException('该学校下还有年级，请先删除年级');
    const classCount = await this.classes.count({ where: { schoolId: id } });
    if (classCount > 0) throw new BadRequestException('该学校下还有班级，请先删除班级');

    await this.schools.delete(id);
    return { deleted: true };
  }

  /** 平台管理员任命学校管理员（只能选教师账号，每校最多 2 名） */
  async appointSchoolAdmin(actor: AuthUser, schoolId: string, userId: string) {
    await this.schoolOrThrow(schoolId);
    return this.staff.appointSchoolAdmin(actor, schoolId, userId);
  }

  async dismissSchoolAdmin(actor: AuthUser, schoolId: string, userId: string) {
    await this.schoolOrThrow(schoolId);
    return this.staff.dismissSchoolAdmin(actor, schoolId, userId);
  }

  /**
   * 可任命的教师候选。
   * 平台管理员可看到全部教师（含尚未归属学校的，任命后自动归属该校）；
   * 学校/年级管理员看到本校教师 + 尚未归属学校的教师。
   */
  async listTeachers(actor: AuthUser, schoolId?: string) {
    if (actor.role === UserRole.ADMIN) {
      if (!schoolId) {
        const all = await this.users.find({
          where: { role: In([UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN]) },
          order: { createdAt: 'ASC' },
        });
        const schoolMap = new Map((await this.schools.find()).map((s) => [s.id, s.name]));
        const apps = all.length
          ? await this.staff.listAdminsByUsers(all.map((u) => u.id))
          : new Map<string, string[]>();
        return all.map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name ?? u.username,
          schoolId: u.schoolId,
          schoolName: u.schoolId ? (schoolMap.get(u.schoolId) ?? '') : '',
          roles: apps.get(u.id) ?? [],
        }));
      }
      return this.staff.eligibleTeachers(schoolId);
    }

    const scope = await this.schoolIdsOf(actor);
    const target = schoolId ?? scope[0];
    if (!target || !scope.includes(target)) throw new ForbiddenException('无权查看该学校教师');
    return this.staff.eligibleTeachers(target);
  }

  // ==================== 年级（学校管理员任命年级管理员） ====================

  async listGrades(actor: AuthUser, schoolId?: string) {
    // 纯年级管理员：只看自己管理的年级（可能兼任多个）
    // 学校管理员即使兼任某年级管理员，也应看到本校全部年级，便于统筹
    const staffRoles = actor.staffRoles ?? [];
    if (
      actor.role === UserRole.GRADE_ADMIN &&
      staffRoles.includes(StaffRole.GRADE_ADMIN)
    ) {
      const own = await this.staff.contextOf(actor.id);
      if (own.gradeIds.length === 0) return [];
      const list = await this.grades.find({
        where: { id: In(own.gradeIds) },
        order: { order: 'ASC' },
      });
      return Promise.all(list.map((g) => this.withGradeMeta(g)));
    }

    const scope = await this.schoolIdsOf(actor);
    const where = schoolId
      ? scope.includes(schoolId) || actor.role === UserRole.ADMIN
        ? { schoolId }
        : { id: '__none__' }
      : scope.length > 0
        ? { schoolId: In(scope) }
        : {};

    const list = await this.grades.find({ where, order: { order: 'ASC' } });
    return Promise.all(list.map((g) => this.withGradeMeta(g)));
  }

  private async withGradeMeta(grade: Grade) {
    const [admins, classCount] = await Promise.all([
      this.staff.listAdmins(StaffRole.GRADE_ADMIN, grade.id),
      this.classes.count({ where: { gradeId: grade.id } }),
    ]);
    return {
      ...grade,
      admins,
      gradeAdminName: admins[0]?.name ?? null,
      classCount,
      adminLimit: 2,
    };
  }

  async createGrade(actor: AuthUser, dto: CreateGradeDto) {
    await this.assertSchoolScope(actor, dto.schoolId);
    const name = dto.name.trim();

    const exists = await this.grades.findOne({ where: { schoolId: dto.schoolId, name } });
    if (exists) throw new ConflictException('该学校已有同名年级');

    // order 按标准 12 年级顺序写入，保证前端下拉顺序稳定
    const order = STANDARD_GRADES.indexOf(name);
    return this.grades.save(
      this.grades.create({ schoolId: dto.schoolId, name, order: order < 0 ? 99 : order }),
    );
  }

  async deleteGrade(actor: AuthUser, id: string) {
    const grade = await this.gradeOrThrow(id);
    await this.assertSchoolScope(actor, grade.schoolId);

    const classCount = await this.classes.count({ where: { gradeId: grade.id } });
    if (classCount > 0) throw new BadRequestException('该年级下还有班级，请先删除班级');

    await this.grades.delete(id);
    return { deleted: true };
  }

  /**
   * 设置学校的年级个数（一次性配置年级组合）。
   * 小学只有 6 个年级、初中 3 个、高中 3 个、完全中学 6 个……由学校管理员按本校学段勾选。
   * 已存在班级或学生的年级不允许被移除，避免产生孤儿数据。
   */
  async configureGrades(actor: AuthUser, dto: ConfigureGradesDto) {
    const schoolId = dto.schoolId ?? actor.schoolId;
    if (!schoolId) throw new BadRequestException('缺少学校信息');
    await this.schoolOrThrow(schoolId);
    await this.assertSchoolScope(actor, schoolId);

    const desired = [...new Set(dto.names.map((n) => n.trim()).filter(Boolean))];
    if (desired.length === 0) throw new BadRequestException('请至少选择一个年级');
    for (const name of desired) {
      if (!STANDARD_GRADES.includes(name)) {
        throw new BadRequestException(`不支持的年级：${name}`);
      }
    }

    const existing = await this.grades.find({ where: { schoolId } });
    const existingNames = new Set(existing.map((g) => g.name));

    const toAdd = desired.filter((n) => !existingNames.has(n));
    const toRemove = existing.filter((g) => !desired.includes(g.name));

    // 有班级 / 有学生的年级不能直接删除
    for (const grade of toRemove) {
      const classCount = await this.classes.count({ where: { gradeId: grade.id } });
      if (classCount > 0) {
        throw new BadRequestException(
          `${grade.name}下还有 ${classCount} 个班级，请先删除或转移班级再调整年级`,
        );
      }
      const studentCount = await this.profiles.count({ where: { schoolId, grade: grade.name } });
      if (studentCount > 0) {
        throw new BadRequestException(
          `${grade.name}下还有 ${studentCount} 名学生，请先调整学生年级再调整年级`,
        );
      }
    }

    for (const name of toAdd) {
      await this.grades.save(
        this.grades.create({
          schoolId,
          name,
          order: STANDARD_GRADES.indexOf(name),
        }),
      );
    }
    for (const grade of toRemove) {
      await this.grades.delete(grade.id);
    }

    return {
      added: toAdd.length,
      removed: toRemove.length,
      total: desired.length,
      grades: await this.listGrades(actor, schoolId),
    };
  }

  async appointGradeAdmin(actor: AuthUser, gradeId: string, userId: string) {    const grade = await this.gradeOrThrow(gradeId);
    return this.staff.appointGradeAdmin(actor, grade, userId);
  }

  async dismissGradeAdmin(actor: AuthUser, gradeId: string, userId: string) {
    const grade = await this.gradeOrThrow(gradeId);
    return this.staff.dismissGradeAdmin(actor, grade, userId);
  }

  // ==================== 班级（年级管理员建班 + 任命班级管理员） ====================

  async listClasses(actor: AuthUser, gradeId: string) {
    const grade = await this.assertGradeScope(actor, gradeId);
    const list = await this.classes.find({
      where: { gradeId: grade.id },
      order: { className: 'ASC' },
    });
    return Promise.all(
      list.map(async (room) => {
        const admins = await this.staff.listAdmins(StaffRole.CLASS_ADMIN, room.id);
        const students = await this.members.count({
          where: { classId: room.id, status: 'approved' },
        });
        return { ...room, admins, studentCount: students, adminLimit: 2 };
      }),
    );
  }

  async createClass(actor: AuthUser, dto: CreateOrgClassDto) {
    const grade = await this.assertGradeScope(actor, dto.gradeId);
    const className = dto.className.trim();

    const duplicate = await this.classes.findOne({
      where: { gradeId: grade.id, className },
    });
    if (duplicate) throw new ConflictException(`${grade.name}已有「${className}」`);

    const room = await this.classes.save(
      this.classes.create({
        schoolId: grade.schoolId,
        gradeId: grade.id,
        grade: grade.name,
        className,
        name: `${grade.name} ${className}`,
        teacherId: 'unassigned',
        teacherName: null,
        inviteCode: await this.generateInviteCode(),
        status: 'active',
      }),
    );

    // 建班时可顺带指定班级管理员
    if (dto.teacherUserId) {
      await this.staff.appointClassAdmin(actor, room, dto.teacherUserId);
      return this.classOrThrow(room.id);
    }
    return room;
  }

  async updateClass(actor: AuthUser, id: string, dto: UpdateOrgClassDto) {
    const room = await this.classOrThrow(id);
    await this.assertClassScope(actor, room);

    if (dto.className !== undefined && dto.className.trim()) {
      const className = dto.className.trim();
      const patch: Partial<ClassRoom> = {
        className,
        name: `${room.grade} ${className}`,
      };
      await this.classes.update(id, patch);
    }
    return this.classOrThrow(id);
  }

  async deleteClass(actor: AuthUser, id: string) {
    const room = await this.classOrThrow(id);
    await this.assertClassScope(actor, room);

    const members = await this.members.count({
      where: { classId: room.id, status: 'approved' },
    });
    if (members > 0) throw new BadRequestException('该班级还有已加入的学生，请先移除学生');

    await this.members.delete({ classId: room.id });
    // 班级通知随班级一并清理
    await this.classes.manager.query('DELETE FROM class_notices WHERE class_id = ?', [room.id]);
    await this.classes.delete(room.id);
    return { deleted: true };
  }

  async appointClassAdmin(actor: AuthUser, classId: string, userId: string) {
    const room = await this.classOrThrow(classId);
    return this.staff.appointClassAdmin(actor, room, userId);
  }

  async dismissClassAdmin(actor: AuthUser, classId: string, userId: string) {
    const room = await this.classOrThrow(classId);
    return this.staff.dismissClassAdmin(actor, room, userId);
  }

  // ==================== 通知（逐级下行） ====================

  async createNotice(actor: AuthUser, dto: CreateNoticeDto) {
    const title = dto.title.trim();
    const content = dto.content.trim();
    const staffRoles = actor.staffRoles ?? [];

    // 学校管理员 → 年级管理员
    if (staffRoles.includes(StaffRole.SCHOOL_ADMIN)) {
      if (dto.toRole !== 'grade_admin' || !dto.gradeId) {
        throw new BadRequestException('学校管理员的通知需指定年级');
      }
      const grade = await this.gradeOrThrow(dto.gradeId);
      if (!(await this.staff.isSchoolAdmin(actor.id, grade.schoolId))) {
        throw new ForbiddenException('只能通知本校年级');
      }
      return this.notices.save(
        this.notices.create({
          schoolId: grade.schoolId,
          gradeId: grade.id,
          classId: null,
          fromUserId: actor.id,
          fromRole: StaffRole.SCHOOL_ADMIN,
          fromName: actor.name ?? actor.username,
          toRole: 'grade_admin',
          title,
          content,
        }),
      );
    }

    // 年级管理员 → 班级管理员
    if (staffRoles.includes(StaffRole.GRADE_ADMIN)) {
      if (dto.toRole !== 'class_admin' || !dto.classId) {
        throw new BadRequestException('年级管理员的通知需指定班级');
      }
      const room = await this.classOrThrow(dto.classId);
      if (!room.gradeId) throw new BadRequestException('该班级尚未归属年级');
      await this.assertGradeScope(actor, room.gradeId);
      return this.notices.save(
        this.notices.create({
          schoolId: room.schoolId,
          gradeId: room.gradeId,
          classId: room.id,
          fromUserId: actor.id,
          fromRole: StaffRole.GRADE_ADMIN,
          fromName: actor.name ?? actor.username,
          toRole: 'class_admin',
          title,
          content,
        }),
      );
    }

    throw new ForbiddenException('当前岗位不能下发通知');
  }

  /** 收件箱：年级管理员看发给本年级的；班级管理员看发给本班的 */
  async inbox(actor: AuthUser) {
    const ctx = await this.staff.contextOf(actor.id);
    const results: Notice[] = [];

    if (ctx.gradeIds.length > 0) {
      results.push(
        ...(await this.notices.find({
          where: { toRole: 'grade_admin', gradeId: In(ctx.gradeIds) },
          order: { createdAt: 'DESC' },
          take: 100,
        })),
      );
    }

    if (ctx.classIds.length > 0) {
      results.push(
        ...(await this.notices.find({
          where: { toRole: 'class_admin', classId: In(ctx.classIds) },
          order: { createdAt: 'DESC' },
          take: 100,
        })),
      );
    }

    // 兼容历史数据：旧版本发给 teacher 的通知
    const rooms = await this.classes.find({ where: { teacherId: actor.id } });
    if (rooms.length > 0) {
      results.push(
        ...(await this.notices.find({
          where: { toRole: 'teacher', classId: In(rooms.map((r) => r.id)) },
          order: { createdAt: 'DESC' },
          take: 100,
        })),
      );
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 100);
  }

  /** 我发出的通知 */
  sent(actor: AuthUser) {
    return this.notices.find({
      where: { fromUserId: actor.id },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // ==================== 权限与工具 ====================

  /** 当前用户的学校范围：平台管理员=全部（返回空表示"不限"），其余按岗位 */
  private async schoolIdsOf(actor: AuthUser): Promise<string[]> {
    if (actor.role === UserRole.ADMIN) return [];
    const ctx = await this.staff.contextOf(actor.id);
    const ids = new Set(ctx.schoolIds);
    if (actor.schoolId) ids.add(actor.schoolId);
    return [...ids];
  }

  private assertPlatform(actor: AuthUser): void {
    if (actor.role !== UserRole.ADMIN) throw new ForbiddenException('仅平台管理员可操作');
  }

  private async assertSchoolScope(actor: AuthUser, schoolId: string): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;
    if (await this.staff.isSchoolAdmin(actor.id, schoolId)) return;
    throw new ForbiddenException('无权管理该学校');
  }

  private async assertGradeScope(actor: AuthUser, gradeId: string): Promise<Grade> {
    const grade = await this.gradeOrThrow(gradeId);
    if (actor.role === UserRole.ADMIN) return grade;
    if (await this.staff.isSchoolAdmin(actor.id, grade.schoolId)) return grade;
    if (await this.staff.isGradeAdmin(actor.id, grade.id)) return grade;
    throw new ForbiddenException('无权管理该年级');
  }

  private async assertClassScope(actor: AuthUser, room: ClassRoom): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;
    if (await this.staff.isSchoolAdmin(actor.id, room.schoolId)) return;
    if (room.gradeId && (await this.staff.isGradeAdmin(actor.id, room.gradeId))) return;
    if (await this.staff.isClassAdmin(actor.id, room.id)) return;
    throw new ForbiddenException('无权管理该班级');
  }

  private async schoolOrThrow(id: string): Promise<School> {
    const school = await this.schools.findOne({ where: { id } });
    if (!school) throw new NotFoundException('学校不存在');
    return school;
  }

  private async gradeOrThrow(id: string): Promise<Grade> {
    const grade = await this.grades.findOne({ where: { id } });
    if (!grade) throw new NotFoundException('年级不存在');
    return grade;
  }

  private async classOrThrow(id: string): Promise<ClassRoom> {
    const room = await this.classes.findOne({ where: { id } });
    if (!room) throw new NotFoundException('班级不存在');
    return room;
  }

  private async generateInviteCode(): Promise<string> {
    for (let i = 0; i < 10; i += 1) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.classes.findOne({ where: { inviteCode: code } });
      if (!exists) return code;
    }
    throw new ConflictException('邀请码生成失败，请重试');
  }
}

/** 标准 12 个年级：小学 6 + 初中 3 + 高中 3 */
export const STANDARD_GRADES = [
  '一年级',
  '二年级',
  '三年级',
  '四年级',
  '五年级',
  '六年级',
  '七年级',
  '八年级',
  '九年级',
  '高一',
  '高二',
  '高三',
];
