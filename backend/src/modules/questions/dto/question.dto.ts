import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';

export class CreateQuestionDto {
  @ApiProperty({ enum: Subject })
  @IsEnum(Subject)
  subject: Subject;

  @ApiProperty({ enum: StudyStage })
  @IsEnum(StudyStage)
  stage: StudyStage;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ enum: DifficultyLevel })
  @IsEnum(DifficultyLevel)
  difficulty: DifficultyLevel;

  @ApiProperty({ enum: AbilityRequirement })
  @IsEnum(AbilityRequirement)
  ability: AbilityRequirement;

  @ApiProperty({ type: [String], description: '关联知识点 id' })
  @IsArray()
  knowledgePoints: string[];

  @ApiProperty({ description: '题干' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  analysis?: string;

  @ApiPropertyOptional({ type: [String], description: '典型错因' })
  @IsOptional()
  @IsArray()
  typicalErrors?: string[];

  @ApiPropertyOptional({ description: '来源（公开授权/原创公益）' })
  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional({ enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ enum: AbilityRequirement })
  @IsOptional()
  @IsEnum(AbilityRequirement)
  ability?: AbilityRequirement;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  knowledgePoints?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  analysis?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  typicalErrors?: string[];
}