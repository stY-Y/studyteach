import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** JWT 解析后的用户载荷 */
export interface AuthUser {
  id: string;
  role: string;
  username: string;
  schoolId?: string;
  name?: string;
}

/** 从请求上下文提取当前登录用户 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    return field ? user?.[field] : user;
  },
);