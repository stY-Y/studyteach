import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UserRole } from '@teachstudy/shared';

export class CreateUserDto {
  @ApiProperty({ description: '登录账号' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码（至少 6 位）' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, description: '角色，管理员不可开放注册' })
  @IsOptional()
  @IsIn([UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT])
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schoolId?: string;
}

/** 修改密码：需提供原密码（首次登录由管理员设置的随机密码必须改掉） */
/** 管理员编辑人员基础信息（姓名 / 手机号 / 学校 / 身份） */
export class AdminUpdateUserDto {
  @ApiPropertyOptional({ description: '姓名' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional({ description: '手机号；传空字符串表示清空绑定' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ description: '学校 id；传空字符串表示清空' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  schoolId?: string;

  @ApiPropertyOptional({
    enum: [UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT],
    description: '身份；有管理岗位时需先卸任',
  })
  @IsOptional()
  @IsIn([UserRole.STUDENT, UserRole.TEACHER, UserRole.PARENT], {
    message: '身份只能是学生、教师或家长',
  })
  role?: UserRole;
}

/** 管理员重置密码（不传则自动生成随机临时密码） */
export class AdminResetPasswordDto {
  @ApiPropertyOptional({ description: '新密码（8-32 位，含字母和数字）；留空自动生成' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  password?: string;
}

/** 停用 / 启用账号 */
export class AdminSetStatusDto {
  @ApiProperty({ enum: ['active', 'disabled'], description: 'active 启用 / disabled 停用' })
  @IsIn(['active', 'disabled'], { message: '状态只能是 active 或 disabled' })
  status: 'active' | 'disabled';
}

/**
 * 学生年级批量升级：把某校某个年级的所有学生升到下一个年级。
 * 仅平台管理员 / 学校管理员可操作。
 */
export class PromoteGradeDto {
  @ApiProperty({ description: '学校 id' })
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({
    description: '要升级的年级（如「八年级」）。其下学生统一升到下一级；最高年级无法升级',
  })
  @IsString()
  @IsNotEmpty()
  grade: string;
}

export class ChangePasswordDto {  @ApiProperty({ description: '原密码' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ description: '新密码（至少 6 位）' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class StudentProfileDto {
  @ApiPropertyOptional({ description: '所属学校 id（来自 GET /schools）' })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  className?: string;

  @ApiPropertyOptional({ type: [String], description: '选科' })
  @IsOptional()
  @IsArray()
  subjects?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianPhone?: string;
}

export class TeacherProfileDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  subjects?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

/** 注销账号：需输入当前密码确认（不可逆操作） */
export class DeleteAccountDto {
  @ApiProperty({ description: '当前密码（用于二次确认）' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LinkParentDto {
  @ApiProperty({ description: '学生用户名/手机号' })
  @IsString()
  @IsNotEmpty()
  studentUsername: string;
}