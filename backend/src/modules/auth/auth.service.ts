import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
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
  ResetPasswordByPhoneDto,
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
    tokenVersion?: number;
  }) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      schoolId: user.schoolId,
      /** v = 令牌版本，改密码后旧令牌版本不匹配即失效 */
      v: user.tokenVersion ?? 0,
    };
  }

  /**
   * 登录/注册返回的完整用户信息：基础字段 + 任命岗位。
   *
   * 前端工作台按岗位决定显示哪些入口（我的班级、班级聊天、年级管理等），
   * 所以登录响应必须带上 staffRoles，否则刚登录时会看不到这些入口
   * （之前只有 /auth/me 带，登录后不会自动再拉一次）。
   */
  private async payloadWithStaff(user: {
    id: string;
    username: string;
    role: string;
    name?: string;
    schoolId?: string | null;
    tokenVersion?: number;
  }) {
    const base = this.buildPayload(user);
    const staff = await this.usersService.staffContext(user.id);
    return {
      ...base,
      staffRoles: staff.staffRoles,
      classIds: staff.classIds,
      gradeIds: staff.gradeIds,
      schoolIds: staff.schoolIds,
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
    const payload = await this.payloadWithStaff(user);
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
    const payload = await this.payloadWithStaff(user);
    const token = await this.jwtService.signAsync(payload);
    return { token, user: payload };
  }

  /**
   * 忘记密码 —— 发送验证码。
   *
   * 统一响应结构、统一冷却：未注册的号码也走同一路径，避免本接口被用来枚举手机号。
   * devCode 只在「该号码已注册」时透出，避免开发联调时误以为验证码发丢了。
   * （接入真实短信网关后，建议对未注册号码也发通用文案短信，或改用其他防枚举手段）
   */
  async sendResetCode(phone: string): Promise<{
    sent: true;
    cooldownSeconds: number;
    devCode: string | null;
  }> {
    const user = await this.usersService.findByPhone(phone);
    // 未注册号码也占用同一套冷却并返回同样的结构：本接口不能用来枚举手机号
    const result = this.smsCode.send(phone);
    return {
      sent: true,
      cooldownSeconds: result.cooldownSeconds,
      // 开发模式只对已注册号码透出验证码，省得联调时以为码没发出去
      devCode: user ? result.devCode : null,
    };
  }

  /**
   * 忘记密码 —— 验证码重置。
   * 先验码（证明手机号归属）再查号，未注册时才提示「尚未注册」，不构成枚举风险。
   */
  async resetPasswordByPhone(dto: ResetPasswordByPhoneDto) {
    this.smsCode.verify(dto.phone, dto.code);

    const user = await this.usersService.findByPhone(dto.phone);
    if (!user) throw new NotFoundException('该手机号尚未注册');

    await this.usersService.resetPasswordByPhone(user.id, dto.password);
    return { reset: true, username: user.username };
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

    const payload = await this.payloadWithStaff(user);
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
    const payload = await this.payloadWithStaff(user);
    return { token: await this.jwtService.signAsync(payload), user: payload };
  }
}