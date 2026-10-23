import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole, UserRole } from '@teachstudy/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * 全局角色守卫（无 @Roles 声明的接口放行）。
 *
 * 任命制下一个人可能身兼数岗，因此把「派生角色 + 全部岗位」合并成能力集合：
 * 担任班级管理员时同时具备教师权限，担任年级/学校管理员时同时具备对应管理权限。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const abilities = new Set<string>([user?.role, ...((user?.staffRoles as string[]) ?? [])]);

    if (abilities.has(StaffRole.CLASS_ADMIN)) abilities.add(UserRole.TEACHER);
    if (abilities.has(StaffRole.GRADE_ADMIN)) abilities.add(UserRole.GRADE_ADMIN);
    if (abilities.has(StaffRole.SCHOOL_ADMIN)) abilities.add(UserRole.SCHOOL_ADMIN);

    return required.some((role) => abilities.has(role));
  }
}