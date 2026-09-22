import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { CreateUserDto } from '../../users/dto/user.dto';

export class LoginDto {
  @ApiProperty({ description: '账号' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6)
  password: string;
}

/** 注册入参与用户创建一致（角色可选，管理员不开放注册） */
export class RegisterDto extends CreateUserDto {}