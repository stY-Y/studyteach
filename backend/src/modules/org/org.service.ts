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
import { UserRole } from '@teachstudy/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ClassMember } from '../classes/entities/class-member.entity';
import { ClassRoom } from '../classes/entities/class-room.entity';
import { School } from '../schools/entities/school.entity';
import { User } from '../users/entities/user.entity';
import { Grade } from './entities/grade.entity';
import { Notice } from './entities/notice.entity';
import {
  AppointUserDto,
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
    @InjectRepository(Notice) private readonly notices: Repository<Notice>,
  ) {}

  // ==================== 学校（平台管理员） ====================

  async listSchools(actor: AuthUser) {
    if (actor.role === UserRole.ADMIN) {
      const list = await this.schools.find({ order: { createdAt: 'ASC' } });
      return Promise.all(list.map((s) => this.withAdmins(s)));
    }
    if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId) {
      const list = await this.schools.find({ where: { id: actor.schoolId } });
      return Promise.all(list.map((s) => this.withAdmins(s)));
    }
    throw new ForbiddenException('无权查看学校列表');
  }

  private async withAdmins(school: School) {
    const admins = await this.users.find({
      where: { schoolId: school.id, role: UserRole.SCHOOL_ADMIN },
    });
    return {
      ...school,
      admins: admins.map((u) => ({ id: u.id, username: u.username, name: u.name })),
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

  async appointSchoolAdmin(actor: AuthUser, schoolId: string, dto: AppointUserDto) {
    this.assertPlatform(actor);
    await this.schoolOrThrow(schoolId);
    const user = await this.userByUsername(dto.username);
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('平台管理员账号不能被任命为学校管理员');
    }
    await this.users.update(user.id, {
      role: UserRole.SCHOOL_ADMIN,
      schoolId,
    });
    return { id: user.id, username: user.username, name: user.name, role: UserRole.SCHOOL_ADMIN };
  }

  async dismissSchoolAdmin(actor: AuthUser, schoolId: string, userId: string) {
    this.assertPlatform(actor);
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.role !== UserRole.SCHOOL_ADMIN || user.schoolId !== schoolId) {
      throw new NotFoundException('该学校管理员不存在');
    }
    await this.users.update(userId, { role: UserRole.TEACHER });
    return { dismissed: true };
  }

  // ==================== 年级（学校管理员） ====================

  async listGrades(actor: AuthUser, schoolId?: string) {
    if (actor.role === UserRole.GRADE_ADMIN) {
      const list = await this.grades.find({ where: { gradeAdminId: actor.id } });
      return Promise.all(list.map((g) => this.withGradeMeta(g)));
    }

    const scope =
      actor.role === UserRole.ADMIN
        ? schoolId
          ? { schoolId }
          : {}
        : { schoolId: actor.schoolId ?? '__none__' };

    const list = await this.grades.find({ where: scope, order: { order: 'ASC' } });
    return Promise.all(list.map((g) => this.withGradeMeta(g)));
  }

  private async withGradeMeta(grade: Grade) {
    const admin = grade.gradeAdminId
      ? await this.users.findOne({ where: { id: grade.gradeAdminId } })
      : null;
    const classCount = await this.classes.count({ where: { gradeId: grade.id } });
    return {
      ...grade,
      gradeAdminName: admin?.name ?? admin?.username ?? null,
      classCount,
    };
  }

  async createGrade(actor: AuthUser, dto: CreateGradeDto) {
    await this.assertSchoolScope(actor, dto.schoolId);
    const name = dto.name.trim();

    const exists = await this.grades.findOne({
      where: { schoolId: dto.schoolId, name },
    });
    if (exists) throw new ConflictException('该学校已有同名年级');

    return this.grades.save(
      this.grades.create({ schoolId: dto.schoolId, name, order: 0 }),
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

  async appointGradeAdmin(actor: AuthUser, gradeId: string, dto: AppointUserDto) {
    const grade = await this.gradeOrThrow(gradeId);
    await this.assertSchoolScope(actor, grade.schoolId);

    const user = await this.userByUsername(dto.username);
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('平台管理员账号不能被任命为年级管理员');
    }
    const other = await this.grades.findOne({ where: { gradeAdminId: user.id } });
    if (other && other.id !== grade.id) {
      throw new ConflictException('该账号已是其他年级的管理员，请先卸任');
    }

    await this.users.update(user.id, {
      role: UserRole.GRADE_ADMIN,
      schoolId: grade.schoolId,
    });
    await this.grades.update(grade.id, { gradeAdminId: user.id });

    return { id: user.id, username: user.username, name: user.name };
  }

  async dismissGradeAdmin(actor: AuthUser, gradeId: string) {
    const grade = await this.gradeOrThrow(gradeId);
    await this.assertSchoolScope(actor, grade.schoolId);
    if (!grade.gradeAdminId) throw new BadRequestException('该年级尚未任命管理员');

    await this.users.update(grade.gradeAdminId, { role: UserRole.TEACHER });
    await this.grades.update(grade.id, { gradeAdminId: null });
    return { dismissed: true };
  }

  // ==================== 班级（年级管理员） ====================

  async listClasses(actor: AuthUser, gradeId: string) {
    const grade = await this.assertGradeScope(actor, gradeId);
    return this.classes.find({
      where: { gradeId: grade.id },
      order: { className: 'ASC' },
    });
  }

  async createClass(actor: AuthUser, dto: CreateOrgClassDto) {
    const grade = await this.assertGradeScope(actor, dto.gradeId);
    const className = dto.className.trim();

    const teacher = dto.teacherUsername
      ? await this.resolveTeacher(dto.teacherUsername)
      : null;

    return this.classes.save(
      this.classes.create({
        schoolId: grade.schoolId,
        gradeId: grade.id,
        grade: grade.name,
        className,
        name: `${grade.name} ${className}`,
        teacherId: teacher?.id ?? 'unassigned',
        teacherName: teacher?.name ?? null,
        inviteCode: await this.generateInviteCode(),
        status: 'active',
      }),
    );
  }

  async updateClass(actor: AuthUser, id: string, dto: UpdateOrgClassDto) {
    const room = await this.classOrThrow(id);
    await this.assertClassScope(actor, room);

    const patch: Partial<ClassRoom> = {};
    if (dto.className !== undefined && dto.className.trim()) {
      patch.className = dto.className.trim();
      patch.name = `${room.grade} ${patch.className}`;
    }
    if (dto.teacherUsername !== undefined) {
      if (!dto.teacherUsername) {
        patch.teacherId = 'unassigned';
        patch.teacherName = null;
      } else {
        const teacher = await this.resolveTeacher(dto.teacherUsername);
        patch.teacherId = teacher.id;
        patch.teacherName = teacher.name;
      }
    }

    await this.classes.update(id, patch);
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
    await this.classes.delete(room.id);
    return { deleted: true };
  }

  // ==================== 通知 ====================

  async createNotice(actor: AuthUser, dto: CreateNoticeDto) {
    const title = dto.title.trim();
    const content = dto.content.trim();

    if (actor.role === UserRole.SCHOOL_ADMIN) {
      if (dto.toRole !== 'grade_admin' || !dto.gradeId) {
        throw new BadRequestException('学校管理员的通知需指定年级');
      }
      const grade = await this.gradeOrThrow(dto.gradeId);
      if (grade.schoolId !== actor.schoolId) throw new ForbiddenException('只能通知本校年级');

      return this.notices.save(
        this.notices.create({
          schoolId: grade.schoolId,
          gradeId: grade.id,
          classId: null,
          fromUserId: actor.id,
          fromRole: actor.role,
          fromName: actor.name ?? actor.username,
          toRole: 'grade_admin',
          title,
          content,
        }),
      );
    }

    if (actor.role === UserRole.GRADE_ADMIN) {
      if (dto.toRole !== 'teacher' || !dto.classId) {
        throw new BadRequestException('年级管理员的通知需指定班级');
      }
      const room = await this.classOrThrow(dto.classId);
      await this.assertClassScope(actor, room);

      return this.notices.save(
        this.notices.create({
          schoolId: room.schoolId,
          gradeId: room.gradeId,
          classId: room.id,
          fromUserId: actor.id,
          fromRole: actor.role,
          fromName: actor.name ?? actor.username,
          toRole: 'teacher',
          title,
          content,
        }),
      );
    }

    throw new ForbiddenException('当前角色不能下发通知');
  }

  /** 收件箱：年级管理员看发给本年级的；班主任看发给本班的 */
  async inbox(actor: AuthUser) {
    if (actor.role === UserRole.GRADE_ADMIN) {
      const grades = await this.grades.find({ where: { gradeAdminId: actor.id } });
      if (grades.length === 0) return [];
      return this.notices.find({
        where: { toRole: 'grade_admin', gradeId: In(grades.map((g) => g.id)) },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    }

    if (actor.role === UserRole.TEACHER) {
      const rooms = await this.classes.find({ where: { teacherId: actor.id } });
      if (rooms.length === 0) return [];
      return this.notices.find({
        where: { toRole: 'teacher', classId: In(rooms.map((r) => r.id)) },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    }

    return [];
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

  private assertPlatform(actor: AuthUser): void {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('仅平台管理员可操作');
    }
  }

  private async assertSchoolScope(actor: AuthUser, schoolId: string): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId === schoolId) return;
    throw new ForbiddenException('无权管理该学校');
  }

  private async assertGradeScope(actor: AuthUser, gradeId: string): Promise<Grade> {
    const grade = await this.gradeOrThrow(gradeId);
    if (actor.role === UserRole.ADMIN) return grade;
    if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId === grade.schoolId) return grade;
    if (actor.role === UserRole.GRADE_ADMIN && grade.gradeAdminId === actor.id) return grade;
    throw new ForbiddenException('无权管理该年级');
  }

  private async assertClassScope(actor: AuthUser, room: ClassRoom): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId === room.schoolId) return;
    if (actor.role === UserRole.GRADE_ADMIN && room.gradeId) {
      const grade = await this.grades.findOne({ where: { id: room.gradeId } });
      if (grade?.gradeAdminId === actor.id) return;
    }
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

  private async userByUsername(username: string): Promise<User> {
    const user = await this.users.findOne({ where: { username: username.trim() } });
    if (!user) throw new NotFoundException('账号不存在');
    return user;
  }

  private async resolveTeacher(username: string): Promise<User> {
    const user = await this.userByUsername(username);
    if (user.role !== UserRole.TEACHER) {
      throw new BadRequestException('班主任必须是教师账号');
    }
    return user;
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
