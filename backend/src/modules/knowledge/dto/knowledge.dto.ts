import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StudyStage, Subject } from '@teachstudy/shared';

export class CreateKnowledgePointDto {
  @ApiProperty({ description: '唯一编码，如 MATH-7-01' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: Subject })
  @IsEnum(Subject)
  subject: Subject;

  @ApiPropertyOptional({ enum: StudyStage })
  @IsOptional()
  @IsEnum(StudyStage)
  stage?: StudyStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateKnowledgePointDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: StudyStage })
  @IsOptional()
  @IsEnum(StudyStage)
  stage?: StudyStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  order?: number;
}