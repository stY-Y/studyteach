import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** 班级定位：学校 + 年级 + 班级名 */
export class ChatTargetDto {
  @ApiProperty({ description: '学校 id' })
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({ description: '年级（规范写法，如 八年级）' })
  @IsString()
  @IsNotEmpty()
  grade: string;

  @ApiProperty({ description: '班级名（如 2 班）' })
  @IsString()
  @IsNotEmpty()
  className: string;
}

export class SendMessageDto extends ChatTargetDto {
  @ApiProperty({ description: '消息内容（最多 500 字）' })
  @IsString()
  @IsNotEmpty({ message: '消息不能为空' })
  @MaxLength(500, { message: '消息最多 500 字' })
  content: string;
}

export class QueryMessagesDto extends ChatTargetDto {
  @ApiPropertyOptional({ description: '拉取条数（默认 50，最多 100）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
