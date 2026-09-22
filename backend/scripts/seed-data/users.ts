import { UserRole } from '@teachstudy/shared';

/** 演示学校 id（项目暂无 School 实体，先用字符串标识） */
export const SEED_SCHOOL_ID = 'school-demo-001';

export interface SeedUser {
  username: string;
  password: string;
  role: UserRole;
  name: string;
  phone?: string;
  schoolId?: string;
  studentProfile?: {
    grade?: string;
    className?: string;
    subjects?: string[];
    guardianPhone?: string;
  };
  teacherProfile?: {
    subjects?: string[];
    title?: string;
  };
}

/**
 * 演示账号（四端各一个）。
 * 密码仅供本地开发演示，生产环境务必修改或删除这些账号。
 */
export const SEED_USERS: SeedUser[] = [
  {
    username: 'admin',
    password: 'admin123456',
    role: UserRole.ADMIN,
    name: '平台管理员',
    phone: '13800000001',
  },
  {
    username: 'teacher',
    password: 'teacher123456',
    role: UserRole.TEACHER,
    name: '张老师',
    phone: '13800000002',
    schoolId: SEED_SCHOOL_ID,
    teacherProfile: { subjects: ['math'], title: '中学一级教师' },
  },
  {
    username: 'student',
    password: 'student123456',
    role: UserRole.STUDENT,
    name: '小明',
    phone: '13800000003',
    schoolId: SEED_SCHOOL_ID,
    studentProfile: {
      grade: '八年级',
      className: '2 班',
      subjects: ['物理', '化学', '生物'],
      guardianPhone: '13800000004',
    },
  },
  {
    username: 'parent',
    password: 'parent123456',
    role: UserRole.PARENT,
    name: '小明家长',
    phone: '13800000004',
    schoolId: SEED_SCHOOL_ID,
  },
];

/** 家校绑定关系（家长 -> 学生） */
export const SEED_PARENT_LINKS: Array<{ parentUsername: string; studentUsername: string }> = [
  { parentUsername: 'parent', studentUsername: 'student' },
];