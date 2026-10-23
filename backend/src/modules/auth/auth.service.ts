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
    const payload = this.buildPayload(user);
    const token = await this.jwtService.signAsync(payload);
    return { token, user: payload };
  }

  async register(dto: RegisterDto) {
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
    // 学生注册必须绑定学校、年级、班级（班级聊天与作业都依赖这三项）
    if (role === UserRole.STUDENT && (!dto.schoolId || !dto.grade || !dto.className)) {
      throw new BadRequestException('学生注册需选择学校、年级与班级');
    }

    const user = await this.usersService.createByPhone({
      phone: dto.phone,
      password: dto.password,
      name: dto.name,
      role,
    });

    if (role === UserRole.STUDENT) {
      await this.usersService.saveStudentProfile(user.id, {
        schoolId: dto.schoolId,
        grade: dto.grade,
        className: dto.className,
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
    const payload = this.buildPayload(user);
    return { token: await this.jwtService.signAsync(payload), user: payload };
  }
}