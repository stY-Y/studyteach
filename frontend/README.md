# frontend 前端（PC 网页 + 手机 H5）

Vue 3 + Vite + TypeScript 响应式单页应用，**一套代码同时适配 PC 网页与手机 H5**。
面向乡村低配终端设计：**不引入任何 UI 组件库**，全局样式仅约 300 行，构建产物极小。

## 启动

```bash
# 在仓库根目录执行
npm install
npm run dev:frontend      # http://localhost:5173
```

> 后端需同时启动：`npm run dev:backend`（默认 3000 端口）
> 开发期由 Vite proxy 把 `/api` 转发到后端，**无跨域问题，前端用相对路径请求**。

## 构建

```bash
npm run build:frontend    # 产物在 frontend/dist
npm run typecheck -w frontend
```

## 目录结构

```
src/
├── main.ts                  # 入口：装配 Pinia + Router
├── App.vue                  # 根组件（启动时后台校验登录态）
├── router/index.ts          # 路由 + 登录守卫
├── stores/auth.ts           # 登录态（Pinia）
├── api/
│   ├── http.ts              # 统一请求层：JWT / 解包 / 401 / 离线回退
│   └── auth.ts              # 认证与健康检查接口
├── config/modules.ts        # 四端模块配置（角色 → 功能入口）
├── utils/
│   ├── storage.ts           # 本地存储封装
│   └── offline.ts           # 离线缓存 + 网络状态
├── styles/base.css          # 轻量设计系统（无框架依赖）
├── components/ModuleCard.vue
├── layouts/AppLayout.vue    # 外壳：顶栏 + 侧边导航 + 内容区
├── components/
│   ├── ModuleCard.vue       # 功能入口卡片
│   └── diagnosis/           # 诊断答题 QuizRunner、诊断结果 DiagnosisResult
└── views/
    ├── LoginView.vue        # 四端入口 + 登录
    ├── HomeView.vue         # 角色工作台（按角色渲染功能入口）
    ├── ModulePlaceholderView.vue
    ├── NotFoundView.vue
    └── student/
        └── DiagnosisView.vue  # 学生端 · 知识诊断（选科 → 答题 → AI 分析 → 结果）
```

## 设计要点

| 目标 | 做法 |
| --- | --- |
| 适配老旧手机 / 低配电脑 | 不引入 UI 框架，`build.target = es2015`，样式与逻辑全部手写 |
| 低带宽 / 断网可用 | 请求层支持离线回退：`cache: true` 的 GET 会写入本地缓存，断网时自动读缓存 |
| 低数字素养用户 | 基准字号 16px、点击区域 ≥44px、四端入口图形化、演示账号一键填入 |
| 四端分层入口 | 登录页四个入口卡片；工作台按角色渲染对应功能模块 |
| 一套代码双端 | 卡片栅格 手机 1 列 → 平板 2 列 → 桌面 3 列；桌面显示侧边导航，手机隐藏 |

## 性能与内存（低配终端专项）

面向「乡村老旧手机 / 低配校园电脑」，做了以下针对性优化：

| 手段 | 效果 |
| --- | --- |
| 不引入 UI 组件库 | 省掉 Element Plus 量级依赖（未压缩约 1MB+）；全局样式仅约 5KB |
| 不用 axios，用原生 fetch 封装 | 再省一个依赖及其运行时 |
| **零 `box-shadow`、零渐变** | 阴影与渐变会触发额外绘制与合成层；一律用 1px 边框替代 |
| 过渡只作用于 `background-color` / `border-color` / `color` | 避免布局重排与合成开销 |
| 路由级懒加载 | 首屏只加载当前页面的代码块 |
| vendor 单独分包 | 框架代码可长期缓存，业务更新不重复下载 |
| 关闭 sourcemap 与生产 devtools 挂钩 | 减小产物体积与运行时开销 |
| `build.target = es2015` | 兼容老旧浏览器 |
| **离线缓存双重上限** | 单条 > 64KB 不缓存（防内存尖峰）；总计 > 30 条按写入时间淘汰 |
| 缓存只落 `localStorage`，不进响应式 | 大响应不会变成长期存活的响应式对象 |
| 不使用 `KeepAlive`、不堆叠全局事件 | 页面切换即释放组件实例与订阅 |
| 首页提供「清理缓存」 | 随时释放本地空间（对应需求「不强制占用本地存储」） |

**刻意未做**：关闭 Vue Options API（`__VUE_OPTIONS_API__: false`）可再省约 10KB，
但需先在本机确认 Pinia 的选项式 store 不依赖它，避免运行时报错——留待实测后决定。

## 测试

```bash
npm test -w frontend      # 或：npm run test:frontend
```

三个测试文件（`frontend/tests/`，仅用已有依赖，无需额外安装）：

| 文件 | 覆盖内容 |
| --- | --- |
| `logic.test.mjs` | 选项字母解析（决定作答是否被正确记录）、中文标签映射、知识点 id→名称、离线缓存容量上限与淘汰 |
| `component.test.mjs` | SSR 真实渲染答题组件与结果组件（含空结果、超 10 秒等边界路径） |
| `http.test.mjs` | 按 NestJS 真实返回格式起模拟服务器，验证响应解包、JWT 附带、401、业务错误、查询参数、离线回退、超时 |

当前状态：**94 项断言全部通过**，同时 `npm run typecheck -w frontend` 零错误。

## 生产部署注意

- 使用 `createWebHistory`（HTML5 History 模式），Nginx 需配置 **history fallback**：

  ```nginx
  location / {
    try_files $uri $uri/ /index.html;
  }
  location /api/ {
    proxy_pass http://127.0.0.1:3000;
  }
  ```

- 微信小程序要求 HTTPS + 已备案域名，PC 网页同样建议走 HTTPS。

## 当前进度

**已完成**

1. **通用外壳 + 四端登录入口**：路由与登录守卫、登录态、统一请求层（JWT / 解包 / 401 / 离线回退）、离线缓存、角色工作台、模块入口。
2. **学生端 · 知识诊断**（`/diagnosis`，仅学生角色可访问）：
   - **选学段（按档案年级自动预选）+ 选科** → 单题单屏答题（答题卡跳转、进度条、未答提示）→ AI 分析中 → 薄弱点清单 + 补漏路径
   - 知识点 id 自动还原为中文名称；结果页显示实测耗时并校验「10 秒内出结果」要求
   - **学段严格隔离**：不同学段题库独立，诊断只抽本学段题目
   - **成绩概览 + 逐题解析**：正确率统计；每题展示你的作答 / 正确答案 / 解析 / 典型错因，选项中标出正确答案与错误选择（可折叠）
   - 支持我的诊断记录（可离线查看）

**待实现**：智能批改、我的学情、教师端（组卷/上传/审核）、管理端、家长端 —— 后端接口均已就绪。