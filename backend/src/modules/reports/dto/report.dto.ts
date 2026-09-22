import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Subject } from '@teachstudy/shared';

export class GenerateReportDto {
  @ApiProperty({ enum: Subject })
  @IsEnum(Subject)
  subject: Subject;
}