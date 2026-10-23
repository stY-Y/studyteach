import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** 班级定位（按班级 id） */
export class ChatTargetDto {
  @ApiProperty({ description: '班级 id（需已通过入班审核）' })
  @IsString()
  @IsNotEmpty()
  classId: string;
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
