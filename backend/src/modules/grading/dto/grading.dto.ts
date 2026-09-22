import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GradeQuestionDto {
  @ApiProperty({ description: '题目 id' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ description: '学生作答' })
  @IsString()
  answer: string;
}