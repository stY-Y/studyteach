import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryParentMessagesDto {
  @ApiProperty({ description: '班级 id' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiPropertyOptional({ description: '家长 id（教师查询时必须传）' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class SendParentMessageDto {
  @ApiProperty({ description: '班级 id' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiPropertyOptional({ description: '家长 id（教师回复时必须传）' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: '孩子 id（家长发送时可选，默认取该班第一个孩子）' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiProperty({ description: '消息内容（最多 500 字）' })
  @IsString()
  @IsNotEmpty({ message: '消息不能为空' })
  @MaxLength(500, { message: '消息最多 500 字' })
  content: string;
}
