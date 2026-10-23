# 青禾（teachstudy）

> 青青禾苗，向阳生长 —— 乡村公益助学平台。纯公益、全免费、无广告、无付费墙。

纯公益服务：不收费、不推送商业广告、不设付费解锁门槛，所有功能与资源全免费开放。

## 架构定位

- **轻量端云一体架构**：兼容 PC 网页 + 手机 H5 + 微信小程序，无需下载大体积客户端，适配乡村老旧手机与低配校园电脑。
- **多端分层**：学生端 / 教师端 / 管理员端 / 家长端 四个独立入口，数据实时同步，操作极简。
- **离线优先**：核心功能支持离线缓存，适配低带宽、不稳定网络场景，下载资源可无网访问。
- **知识图谱**：全学段结构化知识图谱，所有题目/资源关联知识点，支撑 AI 精准诊断。

## 运行环境与浏览器兼容性

| 使用场景 | 支持情况 |
| --- | --- |
| **Windows 11 / 10** | 完整支持，使用最新版 Edge 或 Chrome 即可 |
| **Windows 7** | 可用，但浏览器需 **Chrome 109 / Edge 109**（最后支持 Win7 的版本）或 Firefox 115 ESR；**IE11 不支持**（Vue 3 本身不支持 IE11） |
| **手机** | Android 8+ / iOS 14+ 系统浏览器、微信内置浏览器（响应式布局） |
| **后端服务端** | Node.js ≥ 18（Win10/11、Linux、macOS）。**不建议在 Windows 7 上直接跑后端**：Node 18+ 官方已不支持 Win7，建议后端部署到服务器/云，Win7 电脑只作客户端用浏览器访问 |

已做的低配/老旧环境优化：

- 前端构建目标 `es2015`，零 UI 组件库、无外部字体/CDN 请求，首屏与内存开销低
- 未使用 `color-mix()`、`:has()`、container query 等新特性，Win7 上 Chrome 109 可正常渲染
- 低版本浏览器访问时，`index.html` 会先用内联 ES5 脚本检测能力，显示中文「请升级浏览器」提示，**不会白屏**
- 兼容范围声明在 `frontend/package.json` 的 `browserslist`；后端 `engines` 声明 `node >= 18`

尚未做的部分：没有在 Win7/10/11 三套系统上逐一真机回归（当前开发与验证环境为 Windows 11）；也没有 IE11 支持计划。

## 目录结构

```
teachstudy/
├── shared/       # 共享层：前后端共用的枚举/常量/接口契约（链接桥梁）
├── backend/      # 后端：NestJS + TypeScript，轻量端云一体服务
└── frontend/     # 前端：Vue 3 + Vite 响应式（PC 网页 + 手机 H5 一套代码）
```

## 快速开始

```bash
# 1. 安装依赖（npm workspaces 一次性安装三个子包）
npm install

# 2. 构建共享层（后端依赖 @teachstudy/shared；前端直接引用其源码）
npm run build:shared

# 3. 播种演示数据（知识点 + 题目 + 四端演示账号 + 72 份按年级/学科演示资源）
npm run seed

# 4. 启动后端（http://localhost:3000/api/v1）
npm run dev:backend

# 5. 另开一个终端，启动前端（http://localhost:5173）
npm run dev:frontend

# 6. 生产构建与启动
npm run build:all
npm run start:backend

# 7. 验证免费大模型接入（可选，需先在 backend/.env 里填 AI_API_KEY）
npm run ai:check
```

- 前端入口：`http://localhost:5173`（演示账号见登录页「演示账号」折叠区）
- 接口文档（Swagger）：`http://localhost:3000/docs`

## 核心模块（后端）

| 模块 | 目录 | 说明 |
| --- | --- | --- |
| 认证 | `backend/src/modules/auth` | 四端统一登录、JWT、角色鉴权 |
| 用户 | `backend/src/modules/users` | 学生/教师/管理员/家长档案、家校绑定 |
| 知识图谱 | `backend/src/modules/knowledge` | 全学段知识点树 |
| 题库 | `backend/src/modules/questions` | 题目（知识点/难度/能力/错因四维标注） |
| 共享资源 | `backend/src/modules/resources` | 上传/转码/压缩/双层审核/下载 |
| 知识诊断 | `backend/src/modules/diagnosis` | 10-15 题精准诊断 + 补漏路径 |
| 智能批改 | `backend/src/modules/grading` | 主客观题批改 + 错因 + 启发点拨 |
| 智能组卷 | `backend/src/modules/paper` | AI 出选题计划 + 从题库抽真题 |
| 志愿匹配 | `backend/src/modules/volunteer` | 冲稳保方案 + 报考限制标注 |
| 家校互通 | `backend/src/modules/school-home` | 家长实时查看学情进度 |
| 学情报表 | `backend/src/modules/reports` | 极简版学情报表 |
| 升学数据 | `backend/src/modules/enrollment` | 招生政策/投档线/选科要求年度更新 |

## 前端

Vue 3 + Vite + TypeScript，**一套代码适配 PC 网页与手机 H5**，**不引入任何 UI 组件库**（全局样式约 300 行），构建产物体积小，面向乡村低配终端。

已交付：通用外壳 + 四端登录入口（温馨暖调视觉）、学生端 6 个模块、教师端 5 个模块、管理端 4 个模块、家长端 2 个模块。
仅剩「教师端学情查看」「管理员资源复核」两个界面待做（缺后端列表接口），详见 `PROGRESS.md`。

详见 `frontend/README.md`。

## 当前阶段

- **后端**：框架完成，12 个业务模块可运行；AI 通过统一 `AiService` 接入，内置 `mock`（本地占位）与 `http`（OpenAI 兼容免费/低价大模型：智谱 GLM、通义、硅基流动、DeepSeek 等）两种提供方；种子数据含 **118 个知识点 + 187 道四维标注题目 + 四端演示账号**。
- **前端**：外壳、四端登录、14 个业务模块界面完成（学生/教师/管理/家长），暖调扁平视觉、零 UI 框架、零新增依赖。
- **待办**：教师学情查看与资源复核（需后端补列表接口）、档案编辑、院校库、资源真实转码压缩、隐私加固、部署清单。详见 `PROGRESS.md`。