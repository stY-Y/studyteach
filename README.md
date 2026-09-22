# 乡村公益助学平台（teachstudy）

纯公益服务：不收费、不推送商业广告、不设付费解锁门槛，所有功能与资源全免费开放。

## 架构定位

- **轻量端云一体架构**：兼容 PC 网页 + 手机 H5 + 微信小程序，无需下载大体积客户端，适配乡村老旧手机与低配校园电脑。
- **多端分层**：学生端 / 教师端 / 管理员端 / 家长端 四个独立入口，数据实时同步，操作极简。
- **离线优先**：核心功能支持离线缓存，适配低带宽、不稳定网络场景，下载资源可无网访问。
- **知识图谱**：全学段结构化知识图谱，所有题目/资源关联知识点，支撑 AI 精准诊断。

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

# 3. 播种演示数据（知识点 + 题目 + 四端演示账号）
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

已交付：**通用外壳 + 四端登录入口**，以及**学生端知识诊断完整界面**（选科 → 答题 → AI 分析 → 薄弱点与补漏路径）。
其余模块界面（批改、组卷、审核、家长端等）在后续批次实现，后端接口均已就绪。

详见 `frontend/README.md`。

## 当前阶段

- **后端**：框架完成，12 个业务模块可运行；AI 通过统一 `AiService` 接入，内置 `mock`（本地占位）与 `http`（OpenAI 兼容免费/低价大模型：智谱 GLM、通义、硅基流动、DeepSeek 等）两种提供方；种子数据含 **118 个知识点 + 187 道四维标注题目 + 四端演示账号**。
- **前端**：外壳与四端登录入口完成，业务界面待实现。
- **待办**：业务界面、资源真实转码压缩、隐私加固、部署清单。详见 `PROGRESS.md`。