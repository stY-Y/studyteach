import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@teachstudy/shared';
import { CreateUserDto } from '../../users/dto/user.dto';

/** 大陆手机号（11 位，1 开头，第二位 3-9） */
const PHONE_PATTERN = /^1[3-9]\d{9}$/;
/** 强密码：8-32 位可见 ASCII，且必须同时包含字母和数字 */
const STRONG_PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[\x21-\x7e]{8,32}$/;

export class LoginDto {
  @ApiProperty({ description: '账号' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6)
  password: string;
}

/** 注册入参与用户创建一致（角色可选，管理员不开放注册） */
export class RegisterDto extends CreateUserDto {}

/** 发送手机验证码 */
export class SendSmsCodeDto {
  @ApiProperty({ description: '手机号（11 位）', example: '13800138000' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: '请输入正确的 11 位手机号' })
  phone: string;
}

/** 手机号注册（验证码 + 强密码） */
export class PhoneRegisterDto {
  @ApiProperty({ description: '手机号（11 位）', example: '13800138000' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: '请输入正确的 11 位手机号' })
  phone: string;

  @ApiProperty({ description: '6 位短信验证码' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码为 6 位数字' })
  code: string;

  @ApiProperty({ description: '密码：8-32 位，需同时包含字母和数字' })
  @IsString()
  @Matches(STRONG_PASSWORD_PATTERN, {
    message: '密码需 8-32 位，且同时包含字母和数字',
  })
  password: string;

  @ApiPropertyOptional({ description: '姓名（可空）' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  name?: string;

  @ApiPropertyOptional({ enum: [UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT] })
  @IsOptional()
  @IsIn([UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT], {
    message: '仅支持注册学生、教师或家长账号',
  })
  role?: UserRole;

  @ApiPropertyOptional({ description: '学校 id（学生必填，来自 GET /schools）' })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({ description: '年级（学生必填，规范写法如 八年级）' })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({ description: '班级名（学生必填，如 2 班）' })
  @IsOptional()
  @IsString()
  className?: string;
}

/** 换绑手机号（需新手机号验证码） */
export class ChangePhoneDto {
  @ApiProperty({ description: '新手机号（11 位）', example: '13800138000' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: '请输入正确的 11 位手机号' })
  phone: string;

  @ApiProperty({ description: '新手机号收到的 6 位验证码' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码为 6 位数字' })
  code: string;
}

/** 手机号 + 密码登录 */
export class PhoneLoginDto {
  @ApiProperty({ description: '手机号（11 位）', example: '13800138000' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: '请输入正确的 11 位手机号' })
  phone: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6)
  password: string;
}
/**
 * 忘记密码：手机号 + 验证码 + 新密码。
 * 验证码与注册共用同一套服务（6 位、5 分钟、5 次尝试、60 秒冷却）。
 */
export class ResetPasswordByPhoneDto {
  @ApiProperty({ description: '注册时使用的手机号（11 位）', example: '13800138000' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: '请输入正确的 11 位手机号' })
  phone: string;

  @ApiProperty({ description: '手机号收到的 6 位验证码' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码为 6 位数字' })
  code: string;

  @ApiProperty({ description: '新密码：8-32 位，需同时包含字母与数字' })
  @IsString()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,32}$/, {
    message: '密码需 8-32 位，且同时包含字母和数字',
  })
  password: string;
}
