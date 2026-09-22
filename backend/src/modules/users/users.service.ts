import {
  ConflictException,
  Injectable,
  NotFoundException,
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
  CreateUserDto,
  StudentProfileDto,
  TeacherProfileDto,
  UpdateProfileDto,
} from './dto/user.dto';

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
      phone: dto.phone,
      schoolId: dto.schoolId,
    });
    return this.users.save(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User | null> {
    await this.users.update(userId, dto);
    return this.findById(userId);
  }

  // ---------- 学生档案 ----------
  getStudentProfile(userId: string): Promise<StudentProfile | null> {
    return this.studentProfiles.findOne({ where: { userId } });
  }

  async saveStudentProfile(userId: string, dto: StudentProfileDto): Promise<StudentProfile> {
    const existing = await this.getStudentProfile(userId);
    const profile = existing ? Object.assign(existing, dto) : this.studentProfiles.create({ userId, ...dto });
    return this.studentProfiles.save(profile);
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
}