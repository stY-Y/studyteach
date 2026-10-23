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
import { StudentProfile } from '../users/entities/student-profile.entity';
import { User } from '../users/entities/user.entity';
import { ClassRoom } from './entities/class-room.entity';
import { ClassMember } from './entities/class-member.entity';
import { CreateClassDto } from './dto/class.dto';
import { StaffService } from '../org/staff.service';

/** 带统计的班级（教师视图） */
export type ClassWithCounts = ClassRoom & { memberCount: number; pendingCount: number };

/** 学生视角的班级 + 我的申请状态 */
export interface StudentClassItem {
  classRoom: ClassRoom;
  status: string;
  memberId: string;
  appliedAt: Date;
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(ClassRoom)
    private readonly rooms: Repository<ClassRoom>,
    @InjectRepository(ClassMember)
    private readonly memberRepo: Repository<ClassMember>,
    @InjectRepository(StudentProfile)
    private readonly profiles: Repository<StudentProfile>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly staff: StaffService,
  ) {}

  // ---------- 班级管理（任命制） ----------

  /**
   * 建班统一由年级管理员在「班级管理」中完成（org 模块）。
   * 这里保留方法只为给出明确指引，避免旧入口静默失败。
   */
  async create(_actor: AuthUser, _dto: CreateClassDto): Promise<ClassRoom> {
    throw new ForbiddenException('班级由年级管理员在「班级管理」中统一创建');
  }

  /** 我担任班级管理员的班级（含兼任与历史数据），附已通过人数与待审人数 */
  async listManaged(actor: AuthUser): Promise<ClassWithCounts[]> {
    let rooms: ClassRoom[];

    if (actor.role === UserRole.ADMIN) {
      rooms = await this.rooms.find({ order: { createdAt: 'DESC' } });
    } else {
      const ctx = await this.staff.contextOf(actor.id);
      const ids = new Set(ctx.classIds);
      // 兼容早期数据：teacherId 直接指向本人的班级
      const legacy = await this.rooms.find({ where: { teacherId: actor.id } });
      legacy.forEach((r) => ids.add(r.id));

      rooms =
        ids.size === 0
          ? []
          : await this.rooms.find({ where: { id: In([...ids]) }, order: { createdAt: 'DESC' } });
    }

    return Promise.all(
      rooms.map(async (room) => ({
        ...room,
        memberCount: await this.memberRepo.count({ where: { classId: room.id, status: 'approved' } }),
        pendingCount: await this.memberRepo.count({ where: { classId: room.id, status: 'pending' } }),
      })),
    );
  }

  /** 班级成员与申请列表（仅班级创建者/管理员） */
  async members(actor: AuthUser, classId: string) {
    const room = await this.getClassOrThrow(classId);
    await this.assertManager(actor, room);

    const list = await this.memberRepo.find({
      where: { classId },
      order: { createdAt: 'ASC' },
    });
    return { classRoom: room, members: list };
  }

  /** 审核申请：通过后把学生档案绑定到该班，学生才能使用聊天与作业 */
  async review(
    actor: AuthUser,
    classId: string,
    memberId: string,
    status: 'approved' | 'rejected',
  ) {
    const room = await this.getClassOrThrow(classId);
    await this.assertManager(actor, room);

    const member = await this.memberRepo.findOne({ where: { id: memberId, classId } });
    if (!member) throw new NotFoundException('申请记录不存在');

    member.status = status;
    member.reviewedAt = new Date();
    const saved = await this.memberRepo.save(member);

    if (status === 'approved') {
      await this.bindStudentProfile(member.studentId, room);
    }
    return saved;
  }

  /** 移除成员 / 学生主动退出 */
  async removeMember(actor: AuthUser, classId: string, studentId: string): Promise<{ removed: true }> {
    const room = await this.getClassOrThrow(classId);
    const isSelf = actor.id === studentId && actor.role === UserRole.STUDENT;
    if (!isSelf) await this.assertManager(actor, room);

    const member = await this.memberRepo.findOne({ where: { classId, studentId } });
    if (member) await this.memberRepo.remove(member);

    const profile = await this.profiles.findOne({ where: { userId: studentId } });
    if (profile && profile.classId === classId) {
      await this.profiles.update(profile.id, { classId: null });
    }
    return { removed: true };
  }

  /**
   * 转班：教师把已通过的学生转到自己管理的另一个班级。
   * 转移成员记录并同步学生档案（classId / 学校 / 年级 / 班级名）。
   */
  async transferMember(
    actor: AuthUser,
    classId: string,
    studentId: string,
    targetClassId: string,
  ): Promise<{ transferred: true; classId: string }> {
    if (targetClassId === classId) {
      throw new BadRequestException('目标班级不能与原班级相同');
    }

    const from = await this.getClassOrThrow(classId);
    const to = await this.getClassOrThrow(targetClassId);
    await this.assertManager(actor, from);
    await this.assertManager(actor, to);
    if (to.status !== 'active') throw new BadRequestException('目标班级已停用');

    const member = await this.memberRepo.findOne({ where: { classId, studentId } });
    if (!member || member.status !== 'approved') {
      throw new BadRequestException('该学生不在此班级（或尚未通过审核）');
    }

    const target = await this.memberRepo.findOne({
      where: { classId: targetClassId, studentId },
    });
    if (target) {
      if (target.status === 'approved') throw new ConflictException('学生已在目标班级');
      target.status = 'approved';
      target.reviewedAt = new Date();
      await this.memberRepo.save(target);
    } else {
      await this.memberRepo.save(
        this.memberRepo.create({
          classId: targetClassId,
          studentId,
          studentName: member.studentName,
          status: 'approved',
          reviewedAt: new Date(),
        }),
      );
    }

    await this.memberRepo.remove(member);
    await this.bindStudentProfile(studentId, to);
    return { transferred: true, classId: targetClassId };
  }

  // ---------- 学生：申请与查询 ----------

  /** 学生：我已加入/申请中的班级 */
  async listMine(actor: AuthUser): Promise<StudentClassItem[]> {
    const rows = await this.memberRepo.find({
      where: { studentId: actor.id },
      order: { createdAt: 'DESC' },
    });
    if (rows.length === 0) return [];

    const rooms = await this.rooms.findBy({ id: In(rows.map((r) => r.classId)) });
    const roomById = new Map(rooms.map((r) => [r.id, r]));

    return rows
      .map((m) => {
        const room = roomById.get(m.classId);
        if (!room) return null;
        return {
          classRoom: room,
          status: m.status,
          memberId: m.id,
          appliedAt: m.createdAt,
        } satisfies StudentClassItem;
      })
      .filter((x): x is StudentClassItem => x !== null);
  }

  /** 学生：可申请的班级（同校同年级，排除已申请过的） */
  async listAvailable(actor: AuthUser): Promise<ClassRoom[]> {
    const profile = await this.profiles.findOne({ where: { userId: actor.id } });
    if (!profile || !profile.schoolId || !profile.grade) {
      throw new BadRequestException('请先在「账号与安全」补全学校与年级');
    }

    const applied = await this.memberRepo.find({ where: { studentId: actor.id } });
    const appliedIds = new Set(applied.map((m) => m.classId));

    const rooms = await this.rooms.find({
      where: {
        schoolId: profile.schoolId,
        grade: profile.grade,
        status: 'active',
      },
      order: { createdAt: 'DESC' },
    });
    return rooms.filter((r) => !appliedIds.has(r.id));
  }

  /** 学生申请加入班级 */
  async join(actor: AuthUser, classId: string): Promise<ClassMember> {
    if (actor.role !== UserRole.STUDENT) {
      throw new ForbiddenException('仅学生可以申请加入班级');
    }
    const room = await this.getClassOrThrow(classId);
    if (room.status !== 'active') throw new BadRequestException('该班级已停止接收申请');

    const existing = await this.memberRepo.findOne({
      where: { classId, studentId: actor.id },
    });
    if (existing) {
      if (existing.status === 'approved') throw new ConflictException('你已加入该班级');
      if (existing.status === 'pending') throw new ConflictException('申请审核中，请耐心等待');
      // 曾被拒绝：允许重新申请
      existing.status = 'pending';
      existing.reviewedAt = null;
      return this.memberRepo.save(existing);
    }

    return this.memberRepo.save(
      this.memberRepo.create({
        classId,
        studentId: actor.id,
        studentName: actor.name ?? actor.username,
        status: 'pending',
      }),
    );
  }

  /** 学生凭邀请码申请 */
  async joinByCode(actor: AuthUser, inviteCode: string): Promise<ClassMember> {
    const room = await this.rooms.findOne({
      where: { inviteCode: inviteCode.trim().toUpperCase(), status: 'active' },
    });
    if (!room) throw new NotFoundException('邀请码无效或班级已停用');
    return this.join(actor, room.id);
  }

  // ---------- 供聊天/作业复用的权限判断 ----------

  async getClassOrThrow(classId: string): Promise<ClassRoom> {
    const room = await this.rooms.findOne({ where: { id: classId } });
    if (!room) throw new NotFoundException('班级不存在');
    return room;
  }

  /** 学生是否为该班审核通过的成员 */
  async isApprovedMember(studentId: string, classId: string): Promise<boolean> {
    const member = await this.memberRepo.findOne({ where: { classId, studentId } });
    return member?.status === 'approved';
  }

  /** 学生已加入（审核通过）的全部班级 id */
  async getApprovedClassIds(studentId: string): Promise<string[]> {
    const rows = await this.memberRepo.find({ where: { studentId, status: 'approved' } });
    return rows.map((r) => r.classId);
  }

  /** 是否可管理该班：班级管理员（可多名/兼任）、该年级年级管理员、本校学校管理员、平台管理员 */
  async canManage(actor: AuthUser, classId: string): Promise<boolean> {
    if (actor.role === UserRole.ADMIN) return true;

    const room = await this.rooms.findOne({ where: { id: classId } });
    if (!room) return false;

    if (await this.staff.isClassAdmin(actor.id, room.id)) return true;
    if (room.gradeId && (await this.staff.isGradeAdmin(actor.id, room.gradeId))) return true;
    if (await this.staff.isSchoolAdmin(actor.id, room.schoolId)) return true;
    // 兼容早期数据：teacherId 直接指向本人
    return room.teacherId === actor.id;
  }

  async assertManager(actor: AuthUser, room: ClassRoom): Promise<void> {
    const ok = await this.canManage(actor, room.id);
    if (!ok) throw new ForbiddenException('只有该班的班级管理员可以管理该班级');
  }

  /** 审核通过后把学生档案绑定到班级（学校/年级/班级名同步，兼容旧逻辑） */
  private async bindStudentProfile(studentId: string, room: ClassRoom): Promise<void> {
    const profile = await this.profiles.findOne({ where: { userId: studentId } });
    if (profile) {
      await this.profiles.update(profile.id, {
        classId: room.id,
        schoolId: room.schoolId,
        grade: room.grade,
        className: room.className,
      });
      return;
    }
    await this.profiles.save(
      this.profiles.create({
        userId: studentId,
        classId: room.id,
        schoolId: room.schoolId,
        grade: room.grade,
        className: room.className,
      }),
    );
  }

  private async generateInviteCode(): Promise<string> {
    for (let i = 0; i < 10; i += 1) {
      // 8 位大写十六进制，易读易输入
      const code = randomBytes(4).toString('hex').toUpperCase();
      const exists = await this.rooms.findOne({ where: { inviteCode: code } });
      if (!exists) return code;
    }
    throw new ConflictException('邀请码生成失败，请重试');
  }
}
