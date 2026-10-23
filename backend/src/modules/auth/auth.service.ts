import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@teachstudy/shared';
import { UsersService } from '../users/users.service';
import {
  ChangePhoneDto,
  LoginDto,
  PhoneLoginDto,
  PhoneRegisterDto,
  RegisterDto,
} from './dto/auth.dto';
import { SmsCodeService } from './sms-code.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly smsCode: SmsCodeService,
  ) {}

  private buildPayload(user: {
    id: string;
    username: string;
    role: string;
    name?: string;
    schoolId?: string | null;
  }) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      schoolId: user.schoolId,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user || !this.usersService.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('账号或密码错误');
    }
    // 放在密码校验之后：未通过密码验证的请求无法探测账号是否被停用
    if (user.status === 'disabled') {
      throw new UnauthorizedException('账号已被停用，请联系平台管理员');
    }
    const payload = this.buildPayload(user);
    const token = await this.jwtService.signAsync(payload);
    return { token, user: payload };
  }

  async register(dto: RegisterDto) {
    const role = dto.role ?? UserRole.STUDENT;
    // 学生与教师注册都必须绑定学校（教师入职某校后才能被该校任命）
    if ((role === UserRole.STUDENT || role === UserRole.TEACHER) && !dto.schoolId) {
      throw new BadRequestException(
        role === UserRole.STUDENT ? '学生注册需选择学校' : '教师注册需选择所在学校',
      );
    }
    if (role === UserRole.STUDENT && !dto.schoolId) {
      throw new BadRequestException('学生注册需选择学校');
    }

    const user = await this.usersService.create(dto);
    const payload = this.buildPayload(user);
    const token = await this.jwtService.signAsync(payload);
    return { token, user: payload };
  }

  // ---------- 手机号注册 / 登录（隐私优先） ----------

  /** 发送短信验证码（开发环境额外返回 devCode 便于联调，生产不返回） */
  sendSmsCode(phone: string): { cooldownSeconds: number; devCode: string | null } {
    return this.smsCode.send(phone);
  }

  /**
   * 手机号注册。
   * 顺序刻意先「验码」后「查重」：未通过验证码的请求无法探测手机号是否已注册。
   */
  async registerByPhone(dto: PhoneRegisterDto) {
    this.smsCode.verify(dto.phone, dto.code);

    const exists = await this.usersService.findByPhone(dto.phone);
    if (exists) throw new ConflictException('该手机号已注册，请直接登录');

    const role = dto.role ?? UserRole.STUDENT;
    // 学生与教师注册都必须绑定学校：学校是任命链的归属单位
    if ((role === UserRole.STUDENT || role === UserRole.TEACHER) && !dto.schoolId) {
      throw new BadRequestException(
        role === UserRole.STUDENT ? '学生注册需选择学校' : '教师注册需选择所在学校',
      );
    }
    // 学生另需年级；班级改为注册后「申请加入」（教师建班、班级管理员审核）
    if (role === UserRole.STUDENT && !dto.grade) {
      throw new BadRequestException('学生注册需选择年级');
    }

    const user = await this.usersService.createByPhone({
      phone: dto.phone,
      password: dto.password,
      name: dto.name,
      role,
      schoolId: dto.schoolId,
    });

    if (role === UserRole.STUDENT) {
      await this.usersService.saveStudentProfile(user.id, {
        schoolId: dto.schoolId,
        grade: dto.grade,
      });
    }

    const payload = this.buildPayload(user);
    return { token: await this.jwtService.signAsync(payload), user: payload };
  }

  /** 换绑手机号：先验证新手机号验证码，再更新（校验新号未被占用） */
  async changePhone(userId: string, dto: ChangePhoneDto) {
    this.smsCode.verify(dto.phone, dto.code);
    return this.usersService.changePhone(userId, dto.phone);
  }

  /** 手机号 + 密码登录（统一错误信息，不泄露手机号是否已注册） */
  async loginByPhone(dto: PhoneLoginDto) {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user || !this.usersService.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('手机号或密码错误');
    }
    if (user.status === 'disabled') {
      throw new UnauthorizedException('账号已被停用，请联系平台管理员');
    }
    const payload = this.buildPayload(user);
    return { token: await this.jwtService.signAsync(payload), user: payload };
  }
}