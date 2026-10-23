import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StudyStage, Subject } from '@teachstudy/shared';

export class CreateKnowledgePointDto {
  @ApiPropertyOptional({
    description: '唯一编码。留空由系统按「学科-学段-序号」自动生成，如 MATH-J-003',
  })
  @IsOptional()
  @IsString()
  code?: string;

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