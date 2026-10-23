import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSchoolDto {
  @ApiProperty({ description: '学校名称（唯一）' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '地区：省 / 市 / 县' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '类型：小学 / 初中 / 九年一贯制 / 完全中学 / 高中' })
  @IsOptional()
  @IsString()
  type?: string;
}
