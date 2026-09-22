import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const ENROLLMENT_CATEGORIES = ['policy', 'score_line', 'subject_requirement'] as const;

export class UpsertEnrollmentPolicyDto {
  @ApiProperty({ description: '年份' })
  @IsInt()
  year: number;

  @ApiPropertyOptional({ description: '地区（可空=全国）' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ enum: ENROLLMENT_CATEGORIES })
  @IsIn(ENROLLMENT_CATEGORIES)
  category: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}