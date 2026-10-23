import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  ChangePhoneDto,
  LoginDto,
  PhoneLoginDto,
  PhoneRegisterDto,
  RegisterDto,
  ResetPasswordByPhoneDto,
  SendSmsCodeDto,
} from './dto/auth.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: '四端统一登录' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: '注册（学生/教师/家长，管理员不开放）' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('sms/send')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: '发送手机验证码（每 IP 每分钟最多 5 次）' })
  sendSmsCode(@Body() dto: SendSmsCodeDto) {
    return this.authService.sendSmsCode(dto.phone);
  }

  @Public()
  @Post('register-phone')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: '手机号注册（验证码 + 强密码，手机号加密存储）' })
  registerByPhone(@Body() dto: PhoneRegisterDto) {
    return this.authService.registerByPhone(dto);
  }

  @Public()
  @Post('login-phone')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: '手机号 + 密码登录（统一错误信息，防账号枚举）' })
  loginByPhone(@Body() dto: PhoneLoginDto) {
    return this.authService.loginByPhone(dto);
  }

  @Public()
  @Post('password/send-code')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: '忘记密码：发送重置验证码（不暴露手机号是否注册）' })
  sendResetCode(@Body() dto: SendSmsCodeDto) {
    return this.authService.sendResetCode(dto.phone);
  }

  @Public()
  @Post('password/reset')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: '忘记密码：验证码重置密码（成功后旧令牌全部失效）' })
  resetPassword(@Body() dto: ResetPasswordByPhoneDto) {
    return this.authService.resetPasswordByPhone(dto);
  }

  @Patch('phone')
  @ApiOperation({ summary: '换绑手机号（新手机号验证码校验，登录状态即可）' })
  changePhone(@CurrentUser() user: AuthUser, @Body() dto: ChangePhoneDto) {
    return this.authService.changePhone(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: '当前登录用户' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}