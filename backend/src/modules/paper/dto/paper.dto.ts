import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { DifficultyLevel, StudyStage, Subject } from '@teachstudy/shared';

export class GeneratePaperDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: Subject })
  @IsEnum(Subject)
  subject: Subject;

  @ApiProperty({ enum: StudyStage, description: '学段（必填）：避免跨学段混题' })
  @IsEnum(StudyStage)
  stage: StudyStage;

  @ApiProperty({ type: [String], description: '知识点范围' })
  @IsArray()
  knowledgePoints: string[];

  @ApiProperty({ enum: DifficultyLevel })
  @IsEnum(DifficultyLevel)
  difficulty: DifficultyLevel;

  @ApiProperty({ description: '题量' })
  @IsInt()
  @Min(1)
  count: number;
}