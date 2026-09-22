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

export class LinkParentDto {
  @ApiProperty({ description: '学生用户名/手机号' })
  @IsString()
  @IsNotEmpty()
  studentUsername: string;
}