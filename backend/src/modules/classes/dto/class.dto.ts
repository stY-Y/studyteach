import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({ description: '学校 id' })
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({ description: '年级（规范写法，如 八年级）' })
  @IsString()
  @IsNotEmpty()
  grade: string;

  @ApiProperty({ description: '班级名（如 2 班）' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  className: string;

  @ApiPropertyOptional({ description: '班级展示名，默认「年级 + 班级名」' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;
}

export class JoinByCodeDto {
  @ApiProperty({ description: '班级邀请码（教师创建班级后生成）' })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}

export class TransferMemberDto {
  @ApiProperty({ description: '目标班级 id（须为本人管理的班级）' })
  @IsString()
  @IsNotEmpty()
  targetClassId: string;
}

export class ReviewMemberDto {
  @ApiProperty({ enum: ['approved', 'rejected'], description: '审核结果' })
  @IsIn(['approved', 'rejected'], { message: '审核结果只能是 approved 或 rejected' })
  status: 'approved' | 'rejected';
}
