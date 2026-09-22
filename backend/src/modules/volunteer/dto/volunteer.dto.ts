import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, Min } from 'class-validator';

export class MatchVolunteerDto {
  @ApiProperty({ description: '分数' })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiProperty({ description: '位次' })
  @IsNumber()
  @Min(1)
  rank: number;

  @ApiProperty({ type: [String], description: '选科' })
  @IsArray()
  subjects: string[];
}