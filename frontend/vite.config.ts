import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * 前端构建配置（面向乡村低配终端优化）
 *
 * 内存与体积策略：
 *  - 开发期 proxy 转发 /api 到后端，前端用相对路径请求，天然无跨域
 *  - build.target = es2015，兼容老旧手机与低配校园电脑的浏览器
 *  - 路由级懒加载（见 src/router）→ 首屏只加载当前页面代码
 *  - vendor 单独分包 → 框架代码可长期缓存，业务更新不重复下载
 *  - 关闭生产环境 devtools 挂钩，减少运行时开销
 */
export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 直接引用共享层源码：前端无需先构建 shared 即可开发
      '@teachstudy/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },

  define: {
    // 生产构建移除 devtools 相关代码路径
    __VUE_PROD_DEVTOOLS__: false,
  },

  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    target: 'es2015',
    cssCodeSplit: true,
    // 关闭 sourcemap：大幅减小产物体积（低带宽场景优先）
    sourcemap: false,
    // 减小体积：不把小于 2KB 的资源内联为 base64
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        // 框架代码单独分包：可长期缓存，且首屏解析量可控
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
});