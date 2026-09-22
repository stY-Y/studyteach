import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private buildPayload(user: {
    id: string;
    username: string;
    role: string;
    name?: string;
    schoolId?: string;
  }) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      schoolId: user.schoolId,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user || !this.usersService.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const payload = this.buildPayload(user);
    const token = await this.jwtService.signAsync(payload);
    return { token, user: payload };
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const payload = this.buildPayload(user);
    const token = await this.jwtService.signAsync(payload);
    return { token, user: payload };
  }
}