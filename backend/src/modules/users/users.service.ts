import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { STAFF_ROLE_LABELS, StaffRole, UserRole } from '@teachstudy/shared';
import { User } from './entities/user.entity';
import { StudentProfile } from './entities/student-profile.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { ParentStudentLink } from './entities/parent-student-link.entity';
import { StaffAppointment } from '../org/entities/staff-appointment.entity';
import { School } from '../schools/entities/school.entity';
import { Grade } from '../org/entities/grade.entity';
import { ClassRoom } from '../classes/entities/class-room.entity';
import { ClassMember } from '../classes/entities/class-member.entity';
import {
  AdminResetPasswordDto,
  AdminUpdateUserDto,
  ChangePasswordDto,
  CreateUserDto,
  PromoteGradeDto,
  StudentProfileDto,
  TeacherProfileDto,
  UpdateProfileDto,
} from './dto/user.dto';

/** 强密码：8-32 位，且同时包含字母与数字 */
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,32}$/;

/** 标准 12 年级顺序（与 org 模块保持一致），用于年级升级判定 */
const STANDARD_GRADE_ORDER = [
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
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CryptoService } from '../../common/security/crypto.service';

/** 学生列表项（教师/管理员可见，剔除密码等敏感字段） */
export interface StudentListItem {
  id: string;
  username: string;
  name?: string | null;
  schoolId?: string | null;
  grade?: string | null;
  className?: string | null;
  subjects?: string[] | null;
}

/** 管理员用户列表项（脱敏：剔除 passwordHash，手机号脱敏展示） */
export interface SafeUserListItem {
  id: string;
  username: string;
  role: UserRole;
  name?: string | null;
  phone?: string | null;
  schoolId?: string | null;
  avatar?: string | null;
  /** active 正常 / disabled 已停用 */
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 当前用户安全视图（剔除 passwordHash；本人手机号/监护人手机解密明文） */
export interface SafeMeView {
  id: string;
  username: string;
  role: UserRole;
  name?: string | null;
  phone?: string | null;
  schoolId?: string | null;
  avatar?: string | null;
  /** active 正常 / disabled 已停用 */
  status: string;
  createdAt: Date;
  updatedAt: Date;
  studentProfile?: StudentProfile | null;
  teacherProfile?: TeacherProfile | null;
  /** 任命制岗位 */
  staffRoles?: string[];
  classIds?: string[];
  gradeIds?: string[];
  schoolIds?: string[];
}

/** 分层视图中的一个人（手机号已脱敏） */
export interface HierarchyPerson {
  id: string;
  username: string;
  name: string;
  role: string;
  phone: string | null;
  extra: string | null;
  /** active 正常 / disabled 已停用 */
  status: string;
  /** 所属学校（学生可能只写在档案里） */
  schoolId: string | null;
  /** 学生当前年级（编辑档案时预填） */
  grade?: string | null;
}

/** 学生 / 教师 / 家长 三个身份分区 */
export interface HierarchyBucket {
  students: HierarchyPerson[];
  teachers: HierarchyPerson[];
  parents: HierarchyPerson[];
}

export interface HierarchyClassNode extends HierarchyBucket {
  id: string;
  name: string;
  inviteCode: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(StudentProfile)
    private readonly studentProfiles: Repository<StudentProfile>,
    @InjectRepository(TeacherProfile)
    private readonly teacherProfiles: Repository<TeacherProfile>,
    @InjectRepository(ParentStudentLink)
    private readonly links: Repository<ParentStudentLink>,
    @InjectRepository(StaffAppointment)
    private readonly appointments: Repository<StaffAppointment>,
    private readonly crypto: CryptoService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 岗位上下文：随请求下发，前端据此显示管理入口。
   * 每次请求都查库，保证任命/卸任后即时生效（不必等 JWT 过期）。
   */
  async staffContext(userId: string): Promise<{
    staffRoles: string[];
    classIds: string[];
    gradeIds: string[];
    schoolIds: string[];
  }> {
    const list = await this.appointments.find({ where: { userId } });
    return {
      staffRoles: list.map((a) => a.role),
      // 按岗位区分范围，避免「班级管理员任职的年级」被误当成年级管理员范围
      classIds: list
        .filter((a) => a.role === StaffRole.CLASS_ADMIN && a.classId)
        .map((a) => a.classId as string),
      gradeIds: list
        .filter((a) => a.role === StaffRole.GRADE_ADMIN && a.gradeId)
        .map((a) => a.gradeId as string),
      schoolIds: list
        .filter((a) => a.role === StaffRole.SCHOOL_ADMIN)
        .map((a) => a.schoolId),
    };
  }

  // ---------- 密码（Node 原生 scrypt，无额外原生依赖） ----------
  hashPassword(plain: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(plain, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(plain: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const test = scryptSync(plain, salt, 64);
    const buf = Buffer.from(hash, 'hex');
    return test.length === buf.length && timingSafeEqual(test, buf);
  }

  // ---------- 账号 ----------
  findByUsername(username: string): Promise<User | null> {
    return this.users.findOne({ where: { username } });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  /** 按手机号查找（走盲索引，不查明文、不解密全表） */
  findByPhone(phone: string): Promise<User | null> {
    const hash = this.crypto.blindIndex(phone);
    if (!hash) return Promise.resolve(null);
    return this.users.findOne({ where: { phoneHash: hash } });
  }

  /**
   * 教师/管理员：可见的学生列表（教师限本校，管理员可见全部）。
   * 供教师端「学情查看」选人使用 —— 这是此前缺的关键接口。
   */
  async listStudents(actor: AuthUser): Promise<StudentListItem[]> {
    const where: { role: UserRole; schoolId?: string } = { role: UserRole.STUDENT };
    if (actor.role !== UserRole.ADMIN) {
      // 教师：只看到本校学生；未绑定学校的教师返回空列表
      if (!actor.schoolId) return [];
      where.schoolId = actor.schoolId;
    }

    const students = await this.users.find({ where, order: { createdAt: 'DESC' } });
    if (students.length === 0) return [];

    const profiles = await this.studentProfiles.find();
    const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

    // 只返回前端需要的字段，绝不外泄 passwordHash
    return students.map((u) => {
      const p = profileByUser.get(u.id);
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        schoolId: u.schoolId,
        grade: p?.grade ?? null,
        className: p?.className ?? null,
        subjects: p?.subjects ?? null,
      };
    });
  }

  list(page = 1, pageSize = 20): Promise<[User[], number]> {
    return this.users.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.findByUsername(dto.username);
    if (exists) throw new ConflictException('账号已存在');
    const user = this.users.create({
      username: dto.username,
      passwordHash: this.hashPassword(dto.password),
      role: dto.role ?? UserRole.STUDENT,
      name: dto.name,
      // 手机号：密文（可还原）+ 盲索引（可精确查找/唯一约束）
      phone: this.crypto.encrypt(dto.phone),
      phoneHash: this.crypto.blindIndex(dto.phone),
      schoolId: dto.schoolId,
    });
    return this.users.save(user);
  }

  /**
   * 手机号注册：自动生成不可预测的登录账号（避免手机号被当作账号明文展示），
   * 手机号本身只以「密文 + 盲索引」形式保存。
   */
  async createByPhone(input: {
    phone: string;
    password: string;
    name?: string;
    role?: UserRole;
    schoolId?: string;
  }): Promise<User> {
    const username = await this.generateUsername();
    return this.create({
      username,
      password: input.password,
      role: input.role ?? UserRole.STUDENT,
      name: input.name,
      phone: this.crypto.normalizePhone(input.phone) ?? input.phone,
      // 教师与学生注册时都绑定学校：学校是任命链的归属单位
      schoolId: input.schoolId,
    });
  }

  /** 生成不可预测的登录账号（q + 8 位随机十六进制），并保证唯一 */
  private async generateUsername(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const candidate = `qh${randomBytes(4).toString('hex')}`;
      if (!(await this.findByUsername(candidate))) return candidate;
    }
    throw new ConflictException('账号生成失败，请重试');
  }

  /** 历史数据回填：为已有手机号但缺少盲索引的账号补写（种子/升级用） */
  async backfillPhoneHashes(): Promise<number> {
    const rows = await this.users.find();
    let count = 0;
    for (const user of rows) {
      if (user.phone && !user.phoneHash) {
        const plain = this.crypto.decrypt(user.phone);
        const hash = this.crypto.blindIndex(plain);
        if (hash) {
          await this.users.update(user.id, { phoneHash: hash });
          count += 1;
        }
      }
    }
    return count;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User | null> {
    const patch: Partial<User> = { ...dto };
    // 手机号属敏感字段：入库加密，并同步盲索引
    if (dto.phone !== undefined) {
      patch.phone = this.crypto.encrypt(dto.phone);
      patch.phoneHash = this.crypto.blindIndex(dto.phone);
    }
    await this.users.update(userId, patch);
    return this.findById(userId);
  }

  // ---------- 学生档案 ----------
  getStudentProfile(userId: string): Promise<StudentProfile | null> {
    return this.studentProfiles.findOne({ where: { userId } });
  }

  /**
   * 学生档案视图：解密监护人手机（学生本人查看时明文，便于核对）。
   * 任何非本人的学情/列表接口都不调用本方法，确保监护人手机不外泄。
   */
  async getStudentProfileView(userId: string): Promise<StudentProfile | null> {
    const profile = await this.getStudentProfile(userId);
    if (profile) {
      profile.guardianPhone = this.crypto.decrypt(profile.guardianPhone);
    }
    return profile;
  }

  async saveStudentProfile(userId: string, dto: StudentProfileDto): Promise<StudentProfile> {
    const existing = await this.getStudentProfile(userId);
    const prevGrade = existing?.grade ?? null;
    const prevSchoolId = existing?.schoolId ?? null;
    const prevClassId = existing?.classId ?? null;

    const profile = existing
      ? Object.assign(existing, dto)
      : this.studentProfiles.create({ userId, ...dto });
    // 监护人手机属敏感字段，入库前加密
    if (dto.guardianPhone !== undefined) {
      profile.guardianPhone = this.crypto.encrypt(dto.guardianPhone);
    }

    // 年级或学校变了 → 自动退出原班级，避免「人已换年级却还留在原班」
    const gradeChanged = dto.grade !== undefined && dto.grade !== prevGrade;
    const schoolChanged =
      dto.schoolId !== undefined && (dto.schoolId || null) !== (prevSchoolId || null);
    if (prevClassId && (gradeChanged || schoolChanged)) {
      await this.dataSource
        .getRepository(ClassMember)
        .delete({ classId: prevClassId, studentId: userId });
      profile.classId = null;
    }

    const saved = await this.studentProfiles.save(profile);

    // 学校同时写进账号：资源「仅本校可见」、教师限本校审核都读 User.schoolId
    if (dto.schoolId !== undefined) {
      const schoolId = dto.schoolId || null;
      const user = await this.findById(userId);
      if (user && user.schoolId !== schoolId) {
        await this.users.update(userId, { schoolId });
      }
    }
    return saved;
  }

  /** 修改密码：校验原密码后重设（管理员创建的随机密码必须由本人改掉） */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ updated: true }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('账号不存在');
    if (!this.verifyPassword(dto.oldPassword, user.passwordHash)) {
      throw new UnauthorizedException('原密码错误');
    }
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('新密码不能与原密码相同');
    }
    await this.users.update(userId, {
      passwordHash: this.hashPassword(dto.newPassword),
      // 令牌版本 +1：其他设备上的旧令牌立即失效，必须用新密码重新登录
      tokenVersion: (user.tokenVersion ?? 0) + 1,
    });
    return { updated: true };
  }

  // ---------- 教师档案 ----------
  getTeacherProfile(userId: string): Promise<TeacherProfile | null> {
    return this.teacherProfiles.findOne({ where: { userId } });
  }

  async saveTeacherProfile(userId: string, dto: TeacherProfileDto): Promise<TeacherProfile> {
    const existing = await this.getTeacherProfile(userId);
    const profile = existing ? Object.assign(existing, dto) : this.teacherProfiles.create({ userId, ...dto });
    return this.teacherProfiles.save(profile);
  }

  // ---------- 家校绑定 ----------
  async linkParent(parentUserId: string, studentUsername: string): Promise<ParentStudentLink> {
    // 一个手机号（家长账号）最多绑定 3 名学生，防止一号多用
    const bound = await this.links.count({ where: { parentUserId, status: 'approved' } });
    if (bound >= 3) {
      throw new BadRequestException('一个手机号最多绑定 3 名学生');
    }

    const student = await this.findByUsername(studentUsername);
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('未找到该学生账号');
    }
    const exists = await this.links.findOne({
      where: { parentUserId, studentUserId: student.id },
    });
    if (exists) throw new ConflictException('已绑定该学生');
    return this.links.save(
      this.links.create({ parentUserId, studentUserId: student.id, status: 'approved' }),
    );
  }

  listChildren(parentUserId: string): Promise<ParentStudentLink[]> {
    return this.links.find({ where: { parentUserId, status: 'approved' } });
  }

  /** 换绑手机号：新号未被占用时更新密文与盲索引（验证码校验由 auth 模块完成） */
  async changePhone(userId: string, phone: string): Promise<{ updated: true }> {
    const normalized = this.crypto.normalizePhone(phone);
    const hash = this.crypto.blindIndex(normalized);
    if (!normalized || !hash) throw new BadRequestException('手机号格式不正确');

    const occupied = await this.users.findOne({ where: { phoneHash: hash } });
    if (occupied && occupied.id !== userId) {
      throw new ConflictException('该手机号已被其他账号使用');
    }

    await this.users.update(userId, {
      phone: this.crypto.encrypt(normalized),
      phoneHash: hash,
    });
    return { updated: true };
  }

  /**
   * 注销账号：校验密码后删除账号与全部个人数据（个人信息保护法「删除权」）。
   * 教学公共资产（已上传资源、已发布作业）保留，仅解除个人关联。
   */
  async deleteAccount(userId: string, password: string): Promise<{ deleted: true }> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('账号不存在');
    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('密码错误，无法注销账号');
    }
    await this.purgeUser(userId);
    return { deleted: true };
  }

  /** 级联清理并删除账号（本人注销与管理员删除共用） */
  private async purgeUser(userId: string): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      await m.query('DELETE FROM chat_messages WHERE sender_id = ?', [userId]);
      await m.query('DELETE FROM homework_submissions WHERE student_id = ?', [userId]);
      await m.query(
        'DELETE FROM parent_student_links WHERE parent_user_id = ? OR student_user_id = ?',
        [userId, userId],
      );
      await m.query('DELETE FROM diagnosis_records WHERE student_id = ?', [userId]);
      await m.query('DELETE FROM grading_records WHERE student_id = ?', [userId]);
      await m.query('DELETE FROM study_reports WHERE student_id = ?', [userId]);
      await m.query('DELETE FROM volunteer_plans WHERE student_id = ?', [userId]);
      await m.query('DELETE FROM student_profiles WHERE user_id = ?', [userId]);
      await m.query('DELETE FROM teacher_profiles WHERE user_id = ?', [userId]);
      await m.query('DELETE FROM staff_appointments WHERE user_id = ?', [userId]);
      await m.query('DELETE FROM parent_teacher_messages WHERE sender_id = ?', [userId]);
      await m.query('UPDATE class_rooms SET teacher_id = ? WHERE teacher_id = ?', ['unassigned', userId]);
      // 教学公共资产保留，仅解除个人关联
      await m.query('UPDATE resources SET owner_id = ? WHERE owner_id = ?', ['deleted-user', userId]);
      // 班级通知属班级公共信息，保留正文，只解除发布人关联
      await m.query('UPDATE class_notices SET from_user_id = ? WHERE from_user_id = ?', [
        'deleted-user',
        userId,
      ]);
      await m.query('DELETE FROM users WHERE id = ?', [userId]);
    });
  }

  // ---------- 平台管理员：人员管理 ----------

  private assertNotSelf(actor: AuthUser, targetId: string, action: string): void {
    if (actor.id === targetId) {
      throw new BadRequestException(`不能${action}自己的账号`);
    }
  }

  /** 管理员编辑任意人员的基础信息（姓名 / 手机号 / 学校 / 身份） */
  async adminUpdateUser(actor: AuthUser, targetId: string, dto: AdminUpdateUserDto): Promise<SafeMeView | null> {
    const user = await this.findById(targetId);
    if (!user) throw new NotFoundException('账号不存在');

    const patch: Partial<User> = {};

    if (dto.name !== undefined) patch.name = dto.name.trim();

    if (dto.phone !== undefined) {
      const normalized = this.crypto.normalizePhone(dto.phone);
      if (normalized) {
        const exists = await this.findByPhone(normalized);
        if (exists && exists.id !== targetId) {
          throw new ConflictException('该手机号已被其他账号使用');
        }
        patch.phone = this.crypto.encrypt(normalized);
        patch.phoneHash = this.crypto.blindIndex(normalized);
      } else {
        patch.phone = null;
        patch.phoneHash = null;
      }
    }

    if (dto.schoolId !== undefined) {
      patch.schoolId = dto.schoolId.trim() || null;
    }

    if (dto.role !== undefined && dto.role !== user.role) {
      this.assertNotSelf(actor, targetId, '修改身份');
      if (user.role === UserRole.ADMIN) {
        throw new BadRequestException('不能修改平台管理员的身份');
      }
      const appointments = await this.appointments.count({ where: { userId: targetId } });
      if (appointments > 0) {
        throw new BadRequestException('该账号仍有管理岗位，请先卸任后再修改身份');
      }
      patch.role = dto.role;
    }

    await this.users.update(targetId, patch);
    const updated = await this.findById(targetId);
    // 返回脱敏视图：管理员批量查看时不应把明文手机号带回前端缓存
    return updated ? this.toSafeUser(updated) : null;
  }

  /** 管理员重置密码（不传则生成随机临时密码，仅本次返回明文） */
  async adminResetPassword(
    actor: AuthUser,
    targetId: string,
    dto: AdminResetPasswordDto,
  ): Promise<{ username: string; password: string }> {
    this.assertNotSelf(actor, targetId, '重置密码');
    const user = await this.findById(targetId);
    if (!user) throw new NotFoundException('账号不存在');

    const plain = dto.password?.trim() || this.generateTempPassword();
    if (dto.password && !PASSWORD_RE.test(plain)) {
      throw new BadRequestException('密码需 8-32 位，且同时包含字母和数字');
    }

    await this.users.update(targetId, {
      passwordHash: this.hashPassword(plain),
      // 重置密码后旧令牌立即失效（账号可能已泄露）
      tokenVersion: (user.tokenVersion ?? 0) + 1,
    });
    return { username: user.username, password: plain };
  }

  /** 凭手机号验证码重置密码（验证码由 AuthService 先行校验） */
  async resetPasswordByPhone(userId: string, newPassword: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('账号不存在');
    await this.users.update(userId, {
      passwordHash: this.hashPassword(newPassword),
      tokenVersion: (user.tokenVersion ?? 0) + 1,
    });
  }

  /**
   * 学生年级批量升级：把某校某个年级的所有学生升到下一级。
   * 升级后学生自动退出原班级（年级变了），需重新申请新年级的班级。
   * 最高年级（高三）无法升级。
   */
  async promoteGrade(
    actor: AuthUser,
    dto: PromoteGradeDto,
  ): Promise<{ promoted: number; from: string; to: string | null; skipped: number }> {
    const from = dto.grade.trim();
    const idx = STANDARD_GRADE_ORDER.indexOf(from);
    if (idx < 0) throw new BadRequestException(`无法识别的年级：${from}`);
    if (idx >= STANDARD_GRADE_ORDER.length - 1) {
      throw new BadRequestException(`${from}已是最高年级，无法再升级`);
    }
    const to = STANDARD_GRADE_ORDER[idx + 1];

    const profiles = await this.studentProfiles.find({
      where: { schoolId: dto.schoolId, grade: from },
    });
    if (profiles.length === 0) {
      return { promoted: 0, from, to, skipped: 0 };
    }

    let promoted = 0;
    let skipped = 0;
    await this.dataSource.transaction(async () => {
      for (const p of profiles) {
        // 已在班级里：升级 = 退班（年级变了，需要重新申请新年级的班级）
        if (p.classId) {
          await this.dataSource
            .getRepository(ClassMember)
            .delete({ classId: p.classId, studentId: p.userId });
        }
        // 年级变更同时清空班级归属（年级变了需重新申请新班级）
        await this.studentProfiles.update(p.id, { grade: to });
        await this.dataSource.query(
          'UPDATE student_profiles SET class_id = NULL, class_name = NULL WHERE id = ?',
          [p.id],
        );
        promoted += 1;
      }
    });

    return { promoted, from, to, skipped };
  }

  /** 停用 / 启用账号（停用后立即无法登录，旧令牌失效） */
  async adminSetStatus(actor: AuthUser, targetId: string, status: 'active' | 'disabled') {
    const user = await this.findById(targetId);
    if (!user) throw new NotFoundException('账号不存在');
    if (status === 'disabled') {
      this.assertNotSelf(actor, targetId, '停用');
      if (user.role === UserRole.ADMIN) {
        throw new BadRequestException('不能停用平台管理员账号');
      }
    }
    await this.users.update(targetId, { status });
    return { id: targetId, status };
  }

  /** 删除任意人员账号（级联清理个人数据，教学资源保留） */
  async adminDeleteUser(actor: AuthUser, targetId: string) {
    this.assertNotSelf(actor, targetId, '删除');
    const user = await this.findById(targetId);
    if (!user) throw new NotFoundException('账号不存在');
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('不能删除平台管理员账号');
    }
    await this.purgeUser(targetId);
    return { deleted: true };
  }

  /** 管理员调整学生的学校与年级（班级仍走学生申请 + 班级管理员审核） */
  async adminSaveStudentProfile(actor: AuthUser, targetId: string, dto: StudentProfileDto) {
    const user = await this.findById(targetId);
    if (!user) throw new NotFoundException('账号不存在');
    if (user.role !== UserRole.STUDENT) {
      throw new BadRequestException('该账号不是学生，无法设置学生档案');
    }
    return this.saveStudentProfile(targetId, dto);
  }

  /** 随机临时密码：12 位，确保同时含字母与数字 */
  private generateTempPassword(): string {
    const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const pick = (set: string) => set[randomBytes(1)[0] % set.length];
    const chars = [pick(letters), pick(digits)];
    while (chars.length < 12) {
      const set = randomBytes(1)[0] % 2 === 0 ? letters : digits;
      chars.push(pick(set));
    }
    // 打乱顺序，避免前两位固定为字母+数字
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = randomBytes(1)[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  /**
   * 管理员用户列表项：剔除 passwordHash，手机号脱敏展示（避免敏感信息落入前端离线缓存）。
   */
  toSafeUser(u: User): SafeUserListItem {
    return {
      id: u.id,
      username: u.username,
      role: u.role,
      name: u.name,
      // 先解密（兼容历史明文），再脱敏展示，避免把密文透出给前端
      phone: this.crypto.maskPhone(this.crypto.decrypt(u.phone)),
      schoolId: u.schoolId,
      avatar: u.avatar,
      status: u.status ?? 'active',
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  // ---------- 用户分层视图（学校 → 年级 → 班级 → 身份分区） ----------

  /**
   * 管理端「用户管理」的分层数据。
   *
   * 层级：学校 → 年级 → 班级，班级内再按 学生 / 家长 / 教师 三个身份分区。
   * - 学生：按档案 `classId` 归班；未入班的按年级归到「未分配」，再不行归到学校级
   * - 教师：按 `staff_appointments.class_admin` 归班（可带多个班）；未带班的归到学校级
   * - 家长：按其孩子所在班级归位（多个孩子可能出现在多个班级）；无孩子的归到学校级
   *
   * 平台管理员不属于任何学校，单独返回。
   * 演示规模下全量查询后内存分组，数据量增长后可改为分页 + SQL 分组。
   */
  async hierarchy(actor: AuthUser) {
    const [schools, grades, rooms, allUsers, profiles, links, appointments] = await Promise.all([
      this.dataSource.getRepository(School).find({ order: { createdAt: 'ASC' } }),
      this.dataSource.getRepository(Grade).find({ order: { order: 'ASC' } }),
      this.dataSource.getRepository(ClassRoom).find({ order: { className: 'ASC' } }),
      this.users.find(),
      this.studentProfiles.find(),
      this.links.find({ where: { status: 'approved' } }),
      this.appointments.find(),
    ]);

    const scopeSchoolId =
      actor.role === UserRole.ADMIN ? null : (actor.schoolId ?? '__none__');

    const userById = new Map(allUsers.map((u) => [u.id, u]));
    const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
    const roomsById = new Map(rooms.map((r) => [r.id, r]));

    const person = (u: User, extra?: string): HierarchyPerson => ({
      id: u.id,
      username: u.username,
      name: u.name ?? u.username,
      role: u.role,
      phone: this.crypto.maskPhone(this.crypto.decrypt(u.phone)),
      extra: extra ?? null,
      status: u.status ?? 'active',
      schoolId: u.schoolId,
    });

    /** 学生额外带上档案里的学校与年级，便于管理员编辑 */
    const studentPerson = (u: User): HierarchyPerson => {
      const p = profileByUser.get(u.id);
      return {
        ...person(u),
        schoolId: u.schoolId ?? p?.schoolId ?? null,
        grade: p?.grade ?? null,
      };
    };

    /** 学生 → 班级 id */
    const classOfStudent = (studentId: string): string | null => {
      const p = profileByUser.get(studentId);
      return p?.classId && roomsById.has(p.classId) ? p.classId : null;
    };

    /** 教师 → 班级 id 列表（班级管理员任命） */
    const classesOfTeacher = new Map<string, string[]>();
    for (const a of appointments) {
      if (a.role !== 'class_admin' || !a.classId) continue;
      const arr = classesOfTeacher.get(a.userId) ?? [];
      arr.push(a.classId);
      classesOfTeacher.set(a.userId, arr);
    }

    /** 家长 → 孩子（用于展示「家长 · 小明」） */
    const childrenOfParent = new Map<string, string[]>();
    for (const l of links) {
      const arr = childrenOfParent.get(l.parentUserId) ?? [];
      arr.push(l.studentUserId);
      childrenOfParent.set(l.parentUserId, arr);
    }

    const visibleSchools = scopeSchoolId
      ? schools.filter((s) => s.id === scopeSchoolId)
      : schools;

    type Person = HierarchyPerson;
    type Bucket = HierarchyBucket;
    type ClassNode = HierarchyClassNode;

    const emptyBucket = (): HierarchyBucket => ({ students: [], teachers: [], parents: [] });
    const newClassNode = (room: ClassRoom): HierarchyClassNode => ({
      id: room.id,
      name: room.name,
      inviteCode: room.inviteCode,
      students: [],
      teachers: [],
      parents: [],
    });

    /** 已被某所学校收纳的账号；剩下的放进顶层「未归属学校」桶，确保账号不凭空消失 */
    const placed = new Set<string>();

    const schoolNodes = visibleSchools.map((school) => {
      const schoolGrades = grades.filter((g) => g.schoolId === school.id);
      const schoolRooms = rooms.filter((r) => r.schoolId === school.id);

      // 先建好本校全部班级，再把人一次性归位（避免按年级重复遍历导致重复计数）
      const classesByGrade = new Map<string, ClassNode[]>();
      const classById = new Map<string, ClassNode>();
      for (const grade of schoolGrades) {
        const nodes = schoolRooms
          .filter((r) => r.gradeId === grade.id)
          .map((room) => newClassNode(room));
        classesByGrade.set(grade.id, nodes);
        for (const node of nodes) classById.set(node.id, node);
      }

      const schoolBucket = emptyBucket();
      const gradeBuckets = new Map<string, Bucket>();
      const bucketOfGrade = (gradeId: string) => {
        let b = gradeBuckets.get(gradeId);
        if (!b) {
          b = emptyBucket();
          gradeBuckets.set(gradeId, b);
        }
        return b;
      };

      // 学生：一次遍历
      for (const u of allUsers) {
        if (u.role !== UserRole.STUDENT) continue;
        const p = profileByUser.get(u.id);
        if (u.schoolId !== school.id && p?.schoolId !== school.id) continue;
        placed.add(u.id);

        const classId = classOfStudent(u.id);
        const node = classId ? classById.get(classId) : null;
        if (node) {
          node.students.push(studentPerson(u));
          continue;
        }
        // 未入班：按档案里的年级归到年级未分配，否则归到学校未分配
        const grade = p?.grade ? schoolGrades.find((g) => g.name === p.grade) : null;
        (grade ? bucketOfGrade(grade.id) : schoolBucket).students.push(studentPerson(u));
      }

      // 教师：一次遍历（可带多个班）
      for (const u of allUsers) {
        if (![UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN].includes(u.role)) {
          continue;
        }
        if (u.schoolId !== school.id) continue;
        placed.add(u.id);

        const label = this.staffLabel(u.id, appointments);
        const classIds = (classesOfTeacher.get(u.id) ?? []).filter((id) => classById.has(id));
        if (classIds.length === 0) {
          schoolBucket.teachers.push(person(u, label));
        } else {
          for (const id of classIds) classById.get(id)?.teachers.push(person(u, label));
        }
      }

      // 家长：一次遍历，按孩子所在班级归位（多个孩子可能跨班）
      for (const u of allUsers) {
        if (u.role !== UserRole.PARENT) continue;

        const children = childrenOfParent.get(u.id) ?? [];
        const childNames: string[] = [];
        const classIds = new Set<string>();
        const childSchoolIds: string[] = [];
        for (const childId of children) {
          const child = userById.get(childId);
          if (child) {
            childNames.push(child.name ?? child.username);
            if (child.schoolId) childSchoolIds.push(child.schoolId);
          }
          const classId = classOfStudent(childId);
          if (classId) classIds.add(classId);
        }

        // 家长自己没填学校时，用孩子所在学校判断归属
        if (u.schoolId !== school.id && !childSchoolIds.includes(school.id)) continue;
        placed.add(u.id);

        const label = `家长 · ${childNames.join('、') || '未绑定孩子'}`;
        const inThisSchool = [...classIds].filter((id) => classById.has(id));
        if (inThisSchool.length === 0) {
          schoolBucket.parents.push(person(u, childNames.join('、') || '未绑定孩子'));
        } else {
          for (const id of inThisSchool) classById.get(id)?.parents.push(person(u, label));
        }
      }

      const gradeNodes = schoolGrades.map((grade) => {
        const nodes = classesByGrade.get(grade.id) ?? [];
        return {
          id: grade.id,
          name: grade.name,
          classCount: nodes.length,
          classes: nodes,
          unassigned: gradeBuckets.get(grade.id) ?? emptyBucket(),
        };
      });

      const sum = (pick: (b: Bucket) => number) =>
        gradeNodes.reduce(
          (n, g) => n + g.classes.reduce((m, c) => m + pick(c), 0) + pick(g.unassigned),
          0,
        ) + pick(schoolBucket);

      return {
        id: school.id,
        name: school.name,
        region: school.region,
        gradeCount: gradeNodes.length,
        grades: gradeNodes,
        unassigned: schoolBucket,
        totals: {
          students: sum((b) => b.students.length),
          teachers: sum((b) => b.teachers.length),
          parents: sum((b) => b.parents.length),
          classes: gradeNodes.reduce((n, g) => n + g.classCount, 0),
        },
      };
    });

    const leftStudents = allUsers.filter((u) => u.role === UserRole.STUDENT && !placed.has(u.id));
    const leftTeachers = allUsers.filter(
      (u) =>
        [UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN].includes(u.role) &&
        !placed.has(u.id),
    );
    const leftParents = allUsers.filter((u) => u.role === UserRole.PARENT && !placed.has(u.id));

    const isPlatform = actor.role === UserRole.ADMIN;
    const unassigned: HierarchyBucket = isPlatform
      ? {
          students: leftStudents.map((u) => studentPerson(u)),
          teachers: leftTeachers.map((u) => person(u, this.staffLabel(u.id, appointments))),
          parents: leftParents.map((u) => person(u, '未归属学校')),
        }
      : { students: [], teachers: [], parents: [] };

    return {
      totals: {
        schools: visibleSchools.length,
        grades: schoolNodes.reduce((n, s) => n + s.gradeCount, 0),
        classes: schoolNodes.reduce((n, s) => n + s.totals.classes, 0),
        students:
          schoolNodes.reduce((n, s) => n + s.totals.students, 0) +
          (isPlatform ? leftStudents.length : 0),
        teachers:
          schoolNodes.reduce((n, s) => n + s.totals.teachers, 0) +
          (isPlatform ? leftTeachers.length : 0),
        parents:
          schoolNodes.reduce((n, s) => n + s.totals.parents, 0) +
          (isPlatform ? leftParents.length : 0),
      },
      /** 未归属任何学校的账号（缺学校信息，建议补全） */
      unassigned,
      /** 平台管理员不属于任何学校，单独列出 */
      platformAdmins: allUsers
        .filter((u) => u.role === UserRole.ADMIN)
        .map((u) => person(u)),
      schools: schoolNodes,
    };
  }

  /** 岗位中文（用于年级/学校管理员标注） */
  private staffLabel(userId: string, appointments: StaffAppointment[]): string | undefined {
    const roles = appointments.filter((a) => a.userId === userId).map((a) => a.role);
    if (roles.length === 0) return undefined;
    const labels = roles
      .map((r) => STAFF_ROLE_LABELS[r as StaffRole] ?? r)
      .filter((v, i, arr) => arr.indexOf(v) === i);
    return labels.join(' · ');
  }

  /**
   * 当前用户安全视图：剔除 passwordHash；本人手机号、监护人手机解密为明文（本人可见）。
   */
  async getMeView(userId: string): Promise<SafeMeView | null> {
    const base = await this.findById(userId);
    if (!base) return null;
    const studentProfile =
      base.role === UserRole.STUDENT ? await this.getStudentProfileView(userId) : null;
    // 教师被任命为管理员后 role 会变成 school_admin / grade_admin，仍应返回教师档案
    const teacherProfile =
      base.role !== UserRole.STUDENT && base.role !== UserRole.PARENT
        ? await this.getTeacherProfile(userId)
        : null;
    const staff = await this.staffContext(userId);
    return {
      id: base.id,
      username: base.username,
      role: base.role,
      name: base.name,
      phone: this.crypto.decrypt(base.phone),
      schoolId: base.schoolId,
      avatar: base.avatar,
      status: base.status ?? 'active',
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      studentProfile,
      teacherProfile,
      staffRoles: staff.staffRoles,
      classIds: staff.classIds,
      gradeIds: staff.gradeIds,
      schoolIds: staff.schoolIds,
    };
  }
}