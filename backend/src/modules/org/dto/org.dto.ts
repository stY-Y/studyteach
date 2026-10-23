import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty({ description: '学校名称' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @ApiPropertyOptional({ description: '所在地区' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  region?: string;
}

/** 任命/指定某个已存在账号（按用户名） */
export class AppointUserDto {
  @ApiProperty({ description: '目标账号的用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;
}

export class CreateGradeDto {
  @ApiProperty({ description: '学校 id' })
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({ description: '年级名（规范写法，如 八年级）' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name: string;
}

export class CreateOrgClassDto {
  @ApiProperty({ description: '年级 id' })
  @IsString()
  @IsNotEmpty()
  gradeId: string;

  @ApiProperty({ description: '班级名（如 2 班）' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  className: string;

  @ApiPropertyOptional({ description: '班主任账号（可稍后任命）' })
  @IsOptional()
  @IsString()
  teacherUsername?: string;
}

export class UpdateOrgClassDto {
  @ApiPropertyOptional({ description: '班级名' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  className?: string;

  @ApiPropertyOptional({ description: '班主任账号（传空字符串表示卸任）' })
  @IsOptional()
  @IsString()
  teacherUsername?: string;
}

export class CreateNoticeDto {
  @ApiProperty({ enum: ['grade_admin', 'teacher'], description: '下发给谁' })
  @IsIn(['grade_admin', 'teacher'], { message: '通知对象只能是年级管理员或班主任' })
  toRole: 'grade_admin' | 'teacher';

  @ApiPropertyOptional({ description: '目标年级 id（发给年级管理员时必填）' })
  @IsOptional()
  @IsString()
  gradeId?: string;

  @ApiPropertyOptional({ description: '目标班级 id（发给班主任时必填）' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty({ description: '通知标题' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ description: '通知内容' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
