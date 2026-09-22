import { UserRole } from '@teachstudy/shared';
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    /** 公开页面，无需登录 */
    public?: boolean;
    title?: string;
    /** 限定可访问角色；缺省表示所有已登录角色均可访问 */
    roles?: UserRole[];
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
    // 已登录用户访问登录页 → 直接进工作台
    if (to.name === 'login' && auth.isLoggedIn) return { name: 'home' };
    return true;
  }

  if (!auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // 角色限定：角色不符时退回工作台（例如家长直接访问学生端诊断页）
  const roles = to.meta.roles;
  if (roles && roles.length > 0 && auth.user && !roles.includes(auth.user.role)) {
    return { name: 'home' };
  }

  return true;
});

router.afterEach((to) => {
  const base = (import.meta.env.VITE_APP_TITLE as string) || '乡村公益助学平台';
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base;
});

export default router;