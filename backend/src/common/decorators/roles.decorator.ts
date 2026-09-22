import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@teachstudy/shared';

export const ROLES_KEY = 'roles';

/** 声明接口可访问的角色（学生/教师/管理员/家长） */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);