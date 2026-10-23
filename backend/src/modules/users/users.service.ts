import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { UserRole } from '@teachstudy/shared';
import { User } from './entities/user.entity';
import { StudentProfile } from './entities/student-profile.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { ParentStudentLink } from './entities/parent-student-link.entity';
import {
  ChangePasswordDto,
  CreateUserDto,
  StudentProfileDto,
  TeacherProfileDto,
  UpdateProfileDto,
} from './dto/user.dto';
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
  createdAt: Date;
  updatedAt: Date;
  studentProfile?: StudentProfile | null;
  teacherProfile?: TeacherProfile | null;
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
    private readonly crypto: CryptoService,
  ) {}

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
  }): Promise<User> {
    const username = await this.generateUsername();
    return this.create({
      username,
      password: input.password,
      role: input.role ?? UserRole.STUDENT,
      name: input.name,
      phone: this.crypto.normalizePhone(input.phone) ?? input.phone,
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
    const profile = existing
      ? Object.assign(existing, dto)
      : this.studentProfiles.create({ userId, ...dto });
    // 监护人手机属敏感字段，入库前加密
    if (dto.guardianPhone !== undefined) {
      profile.guardianPhone = this.crypto.encrypt(dto.guardianPhone);
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
    await this.users.update(userId, { passwordHash: this.hashPassword(dto.newPassword) });
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
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  /**
   * 当前用户安全视图：剔除 passwordHash；本人手机号、监护人手机解密为明文（本人可见）。
   */
  async getMeView(userId: string): Promise<SafeMeView | null> {
    const base = await this.findById(userId);
    if (!base) return null;
    const studentProfile =
      base.role === UserRole.STUDENT ? await this.getStudentProfileView(userId) : null;
    const teacherProfile =
      base.role === UserRole.TEACHER ? await this.getTeacherProfile(userId) : null;
    return {
      id: base.id,
      username: base.username,
      role: base.role,
      name: base.name,
      phone: this.crypto.decrypt(base.phone),
      schoolId: base.schoolId,
      avatar: base.avatar,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      studentProfile,
      teacherProfile,
    };
  }
}