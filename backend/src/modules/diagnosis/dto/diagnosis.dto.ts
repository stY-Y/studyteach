import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StudyStage, Subject } from '@teachstudy/shared';

export class StartDiagnosisDto {
  @ApiProperty({ enum: Subject })
  @IsEnum(Subject)
  subject: Subject;

  @ApiProperty({ enum: StudyStage, description: '学段（必填）：避免跨学段混题' })
  @IsEnum(StudyStage)
  stage: StudyStage;

  @ApiPropertyOptional({ type: [String], description: '指定知识点范围（缺省全学科随机）' })
  @IsOptional()
  @IsArray()
  knowledgePoints?: string[];
}

export class SubmitAnswersDto {
  @ApiProperty({ description: '作答 [{ questionId, answer }]' })
  @IsArray()
  @IsNotEmpty()
  answers: Array<{ questionId: string; answer: string }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}