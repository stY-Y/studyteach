import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
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
export class ChangePasswordDto {
  @ApiProperty({ description: '原密码' })
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