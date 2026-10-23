import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DifficultyLevel, QuestionType, StudyStage, Subject } from '@teachstudy/shared';

/** 作业题目：传 questionId 表示选题库已有题；否则按自建题处理并写入题库 */
export class HomeworkQuestionDto {
  @ApiPropertyOptional({ description: '题库题目 id（选题库已有题目时传）' })
  @IsOptional()
  @IsString()
  questionId?: string;

  @ApiPropertyOptional({ description: '题干（自建题必填）' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiPropertyOptional({ description: '参考答案' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  answer?: string;

  @ApiPropertyOptional({ description: '解析' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  analysis?: string;

  @ApiPropertyOptional({ enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ enum: Subject })
  @IsOptional()
  @IsEnum(Subject)
  subject?: Subject;

  @ApiPropertyOptional({ enum: StudyStage })
  @IsOptional()
  @IsEnum(StudyStage)
  stage?: StudyStage;

  @ApiPropertyOptional({ type: [String], description: '关联知识点 id' })
  @IsOptional()
  @IsArray()
  knowledgePoints?: string[];
}

export class CreateHomeworkDto {
  @ApiProperty({ description: '班级 id（需为该班创建教师）' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ description: '作业标题' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ description: '作业说明' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: '截止时间（ISO 字符串）' })
  @IsOptional()
  @IsString()
  dueAt?: string;

  @ApiProperty({ type: [HomeworkQuestionDto] })
  @IsArray()
  @ArrayMinSize(1, { message: '请至少选择或上传一道题' })
  questions: HomeworkQuestionDto[];
}

export class ClassQueryDto {
  @ApiProperty({ description: '班级 id' })
  @IsString()
  @IsNotEmpty()
  classId: string;
}

export class SubmitHomeworkDto {
  @ApiProperty({ description: '题号键 -> 作答' })
  @IsObject()
  answers: Record<string, string>;
}
