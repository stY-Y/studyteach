import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  ResourceScope,
  ResourceType,
  ReviewLevel,
  ReviewResult,
  StudyStage,
  Subject,
} from '@teachstudy/shared';

export class UploadResourceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  type: ResourceType;

  @ApiProperty({ enum: Subject })
  @IsEnum(Subject)
  subject: Subject;

  @ApiProperty({ enum: StudyStage })
  @IsEnum(StudyStage)
  stage: StudyStage;

  @ApiPropertyOptional({ description: '知识点 id 的 JSON 数组字符串（留空则自动匹配）' })
  @IsOptional()
  @IsString()
  knowledgePoints?: string;

  @ApiProperty({ enum: ResourceScope, description: '开放范围：仅本校/全平台共享' })
  @IsEnum(ResourceScope)
  scope: ResourceScope;
}

export class UpdateResourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: ResourceScope })
  @IsOptional()
  @IsEnum(ResourceScope)
  scope?: ResourceScope;
}

export class ReviewResourceDto {
  @ApiProperty({ enum: ReviewLevel, description: '审核层级：校级/平台' })
  @IsEnum(ReviewLevel)
  level: ReviewLevel;

  @ApiProperty({ enum: ReviewResult })
  @IsEnum(ReviewResult)
  result: ReviewResult;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class QueryResourceDto {
  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @ApiPropertyOptional({ enum: Subject })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;

  @ApiPropertyOptional({ enum: StudyStage })
  @IsOptional()
  @IsEnum(StudyStage)
  stage?: StudyStage;
}