import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/** 全局 JWT 鉴权守卫（@Public 接口跳过） */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('缺少访问令牌');

    try {
      request.user = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('令牌无效或已过期');
    }
    return true;
  }

  /**
   * 取令牌：优先请求头；同时允许 query 中的 token ——
   * 仅用于 <video>/<audio> 直连场景（这些标签无法自定义 Authorization 头）。
   * 资源预览接口因此可以边下边播（配合 Range 请求）。
   */
  private extractToken(request: {
    headers?: Record<string, string>;
    query?: Record<string, unknown>;
  }): string | undefined {
    const [type, token] = request.headers?.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) return token;
    return typeof request.query?.token === 'string' ? request.query.token : undefined;
  }
}