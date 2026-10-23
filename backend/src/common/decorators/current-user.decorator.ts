import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** JWT 解析后的用户载荷 */
export interface AuthUser {
  id: string;
  role: string;
  username: string;
  schoolId?: string | null;
  name?: string;
  /** 任命制岗位（school_admin / grade_admin / class_admin），可多个 */
  staffRoles?: string[];
  /** 担任班级管理员的班级 id */
  classIds?: string[];
  /** 担任年级管理员的年级 id */
  gradeIds?: string[];
  /** 担任学校管理员的学校 id */
  schoolIds?: string[];
}

/** 从请求上下文提取当前登录用户 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    return field ? user?.[field] : user;
  },
);