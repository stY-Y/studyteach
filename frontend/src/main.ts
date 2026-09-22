import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/base.css';

const app = createApp(App);

// 先装配 Pinia，再装配路由（路由守卫里会用到登录态）
app.use(createPinia());
app.use(router);
app.mount('#app');