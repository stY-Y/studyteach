import { StaffRole, UserRole } from '@teachstudy/shared';
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { hasStaff } from '../config/staff';

declare module 'vue-router' {
  interface RouteMeta {
    /** 公开页面，无需登录 */
    public?: boolean;
    title?: string;
    /** 限定可访问角色；缺省表示所有已登录角色均可访问 */
    roles?: UserRole[];
    /** 需要某个任命岗位（平台管理员不受限）；不足时显示「您无权限管理」 */
    staff?: StaffRole;
    /** 仅平台管理员可访问 */
    platformOnly?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true, title: '登录' },
    },
    {
      // 手机号注册（公开页面，注册成功自动登录）
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { public: true, title: '注册' },
    },
    {
      // 忘记密码：手机号验证码自助重置（公开页面）
      path: '/forgot-password',
      name: 'forgotPassword',
      component: () => import('../views/ForgotPasswordView.vue'),
      meta: { public: true, title: '找回密码' },
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/HomeView.vue'),
          meta: { title: '工作台' },
        },
        {
          // 学生端 · 知识诊断（已实现界面）
          path: 'diagnosis',
          name: 'diagnosis',
          component: () => import('../views/student/DiagnosisView.vue'),
          meta: { title: '知识诊断', roles: [UserRole.STUDENT] },
        },
        {
          // 学生端 · 智能批改（已实现界面）
          path: 'grading',
          name: 'grading',
          component: () => import('../views/student/GradingView.vue'),
          meta: { title: '智能批改', roles: [UserRole.STUDENT] },
        },
        {
          // 学生端 · 我的学情（已实现界面）
          path: 'reports',
          name: 'reports',
          component: () => import('../views/student/ReportsView.vue'),
          meta: { title: '我的学情', roles: [UserRole.STUDENT] },
        },
        {
          // 学生端 · 我的档案（已实现界面：年级/班级/选科/监护人手机）
          path: 'profile',
          name: 'profile',
          component: () => import('../views/student/ProfileView.vue'),
          meta: { title: '我的档案', roles: [UserRole.STUDENT] },
        },
        {
          // 家长端 · 孩子学情（已实现界面，含学情报表）
          path: 'children',
          name: 'children',
          component: () => import('../views/parent/ChildrenProgressView.vue'),
          meta: { title: '孩子学情', roles: [UserRole.PARENT] },
        },
        {
          // 家长端 · 绑定学生（已实现界面）
          path: 'link',
          name: 'link',
          component: () => import('../views/parent/LinkChildView.vue'),
          meta: { title: '绑定学生', roles: [UserRole.PARENT] },
        },
        {
          // 修改密码已并入「账号与安全」，旧链接自动重定向
          path: 'password',
          redirect: { name: 'settings' },
        },
        {
          // 四端共用 · 账号与安全（姓名/手机号换绑、学校班级、注销）
          path: 'settings',
          name: 'settings',
          component: () => import('../views/shared/AccountSettingsView.vue'),
          meta: { title: '账号与安全' },
        },
        {
          // 权限不足提示（岗位不足 / 平台专属页面被非平台账号访问）
          path: 'no-permission',
          name: 'noPermission',
          component: () => import('../views/shared/NoPermissionView.vue'),
          meta: { title: '无权限访问' },
        },
        {
          // 平台管理员 · 学校管理（学校增删、学校管理员任命/卸任）
          path: 'school-manage',
          name: 'schoolManage',
          component: () => import('../views/admin/SchoolManageView.vue'),
          meta: { title: '学校管理', roles: [UserRole.ADMIN], platformOnly: true },
        },
        {
          // 学校管理员 · 年级管理（年级增删、年级管理员任命/卸任、通知）
          path: 'grade-manage',
          name: 'gradeManage',
          component: () => import('../views/school/GradeManageView.vue'),
          meta: {
            title: '年级管理',
            roles: [UserRole.SCHOOL_ADMIN, UserRole.ADMIN],
            staff: StaffRole.SCHOOL_ADMIN,
          },
        },
        {
          // 年级管理员 · 班级管理（班级增删、班主任任命/卸任、通知）
          path: 'class-manage',
          name: 'classManage',
          component: () => import('../views/grade/ClassManageView.vue'),
          meta: {
            title: '班级管理',
            roles: [UserRole.GRADE_ADMIN, UserRole.ADMIN],
            staff: StaffRole.GRADE_ADMIN,
          },
        },
        {
          // 学校管理员/年级管理员/班主任 · 通知收件箱
          path: 'notices',
          name: 'notices',
          component: () => import('../views/shared/NoticeView.vue'),
          meta: {
            title: '通知',
            roles: [UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.TEACHER],
          },
        },
        {
          // 学生/教师/管理员 · 我的班级（教师建班、学生申请、教师审核）
          path: 'class',
          name: 'myClass',
          component: () => import('../views/shared/MyClassView.vue'),
          meta: {
            title: '我的班级',
            roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN],
          },
        },
        {
          // 学生/教师/管理员 · 作业（教师布置，学生作答）
          path: 'homework',
          name: 'homework',
          component: () => import('../views/shared/HomeworkView.vue'),
          meta: {
            title: '作业',
            roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN],
          },
        },
        {
          // 家长/教师 · 家长与教师沟通（家长限自己孩子班级，教师限本班）
          path: 'parent-chat',
          name: 'parentChat',
          component: () => import('../views/shared/ParentChatView.vue'),
          meta: {
            title: '与老师沟通',
            roles: [UserRole.PARENT, UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN],
          },
        },
        {
          // 学生/教师/管理员 · 班级聊天（仅本班可见）
          path: 'chat',
          name: 'chat',
          component: () => import('../views/shared/ChatView.vue'),
          meta: {
            title: '班级聊天',
            // 平台管理员端不提供班级聊天
            roles: [UserRole.STUDENT, UserRole.TEACHER],
          },
        },
        {
          // 共享 · 学习资源（学生端浏览下载；管理员资源总览）
          path: 'resources',
          name: 'resources',
          component: () => import('../views/student/ResourcesView.vue'),
          meta: { title: '学习资源', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN] },
        },
        {
          // 教师端 · 我的资源（必须在 resources 之后声明，避免路径歧义）
          path: 'resources/mine',
          name: 'myResources',
          component: () => import('../views/teacher/MyResourcesView.vue'),
          meta: { title: '我的资源', roles: [UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN] },
        },
        {
          // 学生端 · 离线缓存
          path: 'offline',
          name: 'offline',
          component: () => import('../views/student/OfflineView.vue'),
          meta: { title: '离线缓存', roles: [UserRole.STUDENT] },
        },
        {
          // 学生端 · 志愿匹配
          path: 'volunteer',
          name: 'volunteer',
          component: () => import('../views/student/VolunteerView.vue'),
          meta: { title: '志愿匹配', roles: [UserRole.STUDENT] },
        },
        {
          // 学生端 · 批改记录（错题回顾，已实现界面）
          path: 'grading-history',
          name: 'gradingHistory',
          component: () => import('../views/student/GradingHistoryView.vue'),
          meta: { title: '批改记录', roles: [UserRole.STUDENT] },
        },
        {
          // 学生端 · 院校库（已实现界面）
          path: 'colleges',
          name: 'colleges',
          component: () => import('../views/student/CollegesView.vue'),
          meta: { title: '院校库', roles: [UserRole.STUDENT] },
        },
        {
          // 教师端 · 智能组卷
          path: 'papers',
          name: 'papers',
          component: () => import('../views/teacher/PaperView.vue'),
          meta: { title: '智能组卷', roles: [UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN] },
        },
        {
          // 教师端 · 学情查看（已实现界面：选学生 → 看学情报表）
          path: 'students',
          name: 'students',
          component: () => import('../views/teacher/StudentReportView.vue'),
          meta: { title: '学情查看', roles: [UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN] },
        },
        {
          // 教师端 · 题库管理
          path: 'questions',
          name: 'questions',
          component: () => import('../views/teacher/QuestionBankView.vue'),
          meta: { title: '题库管理', roles: [UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN] },
        },
        {
          // 教师端 · 资源上传
          path: 'upload',
          name: 'upload',
          component: () => import('../views/teacher/ResourceUploadView.vue'),
          meta: { title: '资源上传', roles: [UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN] },
        },
        {
          // 教师/管理员共用 · 知识图谱（查看 + 新增）
          path: 'knowledge',
          name: 'knowledge',
          component: () => import('../views/shared/KnowledgeTreeView.vue'),
          meta: { title: '知识图谱', roles: [UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN] },
        },
        {
          // 管理员 · 用户管理
          path: 'users',
          name: 'users',
          component: () => import('../views/admin/UsersView.vue'),
          meta: { title: '用户管理', roles: [UserRole.ADMIN], platformOnly: true },
        },
        {
          // 管理员 · 升学数据
          path: 'enrollment',
          name: 'enrollment',
          component: () => import('../views/admin/EnrollmentView.vue'),
          meta: { title: '升学数据', roles: [UserRole.ADMIN], platformOnly: true },
        },
        {
          // 管理员 · 资源复核（已实现界面：校级审核 + 平台复核）
          path: 'review',
          name: 'review',
          component: () => import('../views/admin/ResourceReviewView.vue'),
          meta: { title: '资源复核', roles: [UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.GRADE_ADMIN, UserRole.ADMIN] },
        },
        {
          // 尚未实现界面的模块统一走占位页
          path: 'module/:key',
          name: 'module',
          component: () => import('../views/ModulePlaceholderView.vue'),
          meta: { title: '模块' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'notFound',
      component: () => import('../views/NotFoundView.vue'),
      meta: { public: true, title: '页面不存在' },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.public) {
    // 已登录用户访问登录/注册页 → 直接进工作台
    if ((to.name === 'login' || to.name === 'register') && auth.isLoggedIn) {
      return { name: 'home' };
    }
    return true;
  }

  if (!auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // 管理岗位校验：岗位不足时给出明确的「您无权限管理」提示，而不是静默退回工作台
  let staffPassed = false;
  if (auth.user) {
    const isPlatformAdmin = auth.user.role === UserRole.ADMIN;

    if (to.meta.platformOnly) {
      if (!isPlatformAdmin) {
        return { name: 'noPermission', query: { need: 'platform', from: to.fullPath } };
      }
      staffPassed = true;
    }

    if (to.meta.staff) {
      // 平台管理员可视同具备任意管理岗位（便于平台排查问题）
      if (!isPlatformAdmin && !hasStaff(auth.user, to.meta.staff)) {
        return { name: 'noPermission', query: { need: to.meta.staff, from: to.fullPath } };
      }
      staffPassed = true;
    }
  }

  // 角色限定：角色不符时退回工作台（例如家长直接访问学生端诊断页）
  // 岗位已通过校验的页面不再看派生角色，避免「刚被任命但角色还没刷新」被误拦
  const roles = to.meta.roles;
  if (!staffPassed && roles && roles.length > 0 && auth.user && !roles.includes(auth.user.role)) {
    return { name: 'home' };
  }

  return true;
});

router.afterEach((to) => {
  const base = (import.meta.env.VITE_APP_TITLE as string) || '青禾';
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base;
});

export default router;