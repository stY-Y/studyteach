import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** 发布班级通知 */
export class CreateClassNoticeDto {
  @ApiProperty({ description: '通知标题', maxLength: 80 })
  @IsString()
  @IsNotEmpty({ message: '请填写通知标题' })
  @MaxLength(80, { message: '标题最多 80 字' })
  title: string;

  @ApiProperty({ description: '通知正文', maxLength: 2000 })
  @IsString()
  @IsNotEmpty({ message: '请填写通知内容' })
  @MaxLength(2000, { message: '通知内容最多 2000 字' })
  content: string;

  @ApiPropertyOptional({ description: '是否置顶' })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

/** 修改班级通知（仅传需要改的字段） */
export class UpdateClassNoticeDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(80, { message: '标题最多 80 字' })
  title?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '内容不能为空' })
  @MaxLength(2000, { message: '通知内容最多 2000 字' })
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
