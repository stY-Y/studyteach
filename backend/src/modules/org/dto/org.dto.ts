import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
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

/** 任命某个已存在的教师账号（按用户 id） */
export class AppointStaffDto {
  @ApiProperty({ description: '被任命的教师用户 id' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class CreateGradeDto {
  @ApiProperty({ description: '学校 id' })
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({ description: '年级名（12 个标准年级之一，如 八年级 / 高一）' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name: string;
}

/** 一次性设置学校的年级组合（如小学只保留一~六年级，共 6 个） */
export class ConfigureGradesDto {
  @ApiPropertyOptional({ description: '学校 id（学校管理员可省略，默认本校）' })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiProperty({
    description: '要保留的年级名列表（12 个标准年级之一）',
    example: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
  })
  @IsArray()
  @ArrayNotEmpty({ message: '至少保留一个年级' })
  @IsString({ each: true })
  names: string[];
}

export class CreateOrgClassDto {  @ApiProperty({ description: '年级 id' })
  @IsString()
  @IsNotEmpty()
  gradeId: string;

  @ApiProperty({ description: '班级名（如 2 班）' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  className: string;

  @ApiPropertyOptional({ description: '同时任命为班级管理员的教师 id（可稍后任命）' })
  @IsOptional()
  @IsString()
  teacherUserId?: string;
}

export class UpdateOrgClassDto {
  @ApiPropertyOptional({ description: '班级名' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  className?: string;
}

export class CreateNoticeDto {
  @ApiProperty({
    enum: ['grade_admin', 'class_admin'],
    description: '下发给谁：学校管理员发年级管理员，年级管理员发班级管理员',
  })
  @IsIn(['grade_admin', 'class_admin'], {
    message: '通知对象只能是年级管理员或班级管理员',
  })
  toRole: 'grade_admin' | 'class_admin';

  @ApiPropertyOptional({ description: '目标年级 id（发给年级管理员时必填）' })
  @IsOptional()
  @IsString()
  gradeId?: string;

  @ApiPropertyOptional({ description: '目标班级 id（发给班级管理员时必填）' })
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
