import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/base.css';

declare global {
  interface Window {
    /** index.html 的低版本浏览器检测结果 */
    __QINGHE_UNSUPPORTED__?: boolean;
  }
}

// 浏览器能力不足时，index.html 已展示升级提示，这里不再挂载 Vue，避免白屏报错
if (!window.__QINGHE_UNSUPPORTED__) {
  const app = createApp(App);

  // 先装配 Pinia，再装配路由（路由守卫里会用到登录态）
  app.use(createPinia());
  app.use(router);
  app.mount('#app');
}