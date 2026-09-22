# 项目进度记录（teachstudy）

> 记录时间：2026-09-21
> 用途：跨会话恢复工作 —— 记录已完成、待办、已知问题与关键决策。

## 一、一句话状态

- **后端**：框架完成（12 个业务模块 + 四端权限 + 双层审核 + 离线缓存 + 免费大模型接入 + 智能组卷真实抽题）。
- **种子数据**：完成（118 个知识点 + 187 道四维标注题目 + 四端演示账号）。
- **前端**：通用外壳 + 四端登录入口 + **学生端知识诊断完整界面**（含成绩概览与逐题解析）完成；已建测试套件（**94 项断言全绿**）；其余模块界面待实现。
- **尚未实现**：其余业务界面（批改/组卷/审核/家长端）、资源真实转码压缩、隐私加固、部署清单。

## 二、下次继续：立即恢复步骤

```bash
cd E:\deepseekE\teachstudy
npm install          # 请在「普通终端」执行，不要在 DSH 沙箱内执行（原因见第六节）
npm run build:shared
npm run seed         # 播种演示数据
npm run dev:backend  # 终端 A → http://localhost:3000/api/v1
npm run dev:frontend # 终端 B → http://localhost:5173
```

打开 `http://localhost:5173`，登录页「演示账号」折叠区可一键填入：

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 学生 | `student` | `student123456` |
| 教师 | `teacher` | `teacher123456` |
| 管理员 | `admin` | `admin123456` |
| 家长 | `parent` | `parent123456` |

想快速查看学生端（无需装依赖，直接可开）：

```bash
node E:\deepseekE\_preview\mock-api.mjs   # → http://localhost:5173（演示账号 student / student123456）
```

验证真实大模型（可选）：

```bash
# 先在 backend/.env 填好 AI_PROVIDER=http / AI_API_BASE / AI_API_KEY / AI_MODEL
npm run ai:check            # 验证 知识诊断 + 智能批改
npm run ai:check -- --all   # 额外验证 组卷 / 志愿 / 标签
```

## 三、目录结构

```
teachstudy/
├── README.md             # 项目总览
├── PROGRESS.md           # 本文件
├── package.json          # npm workspaces 根
├── shared/               # 共享层（前后端类型契约）
│   ├── src/{enums,constants,types,index}.ts
│   └── dist/             # 已构建
├── backend/              # 后端
│   ├── src/{main,app.module,app.controller}.ts
│   ├── src/config/       # 集中式配置
│   ├── src/common/       # 装饰器/守卫/拦截器/过滤器
│   ├── src/infra/        # 存储/缓存/队列/离线缓存
│   ├── src/ai/           # AI 抽象层 + 两个提供方 + 选题计划工具
│   ├── src/modules/      # 12 个业务模块
│   ├── scripts/          # ai-check.ts（AI 自检）、seed.ts（播种）、seed-data/
│   └── .env / .env.example
└── frontend/             # 前端（Vue 3 + Vite）
    ├── vite.config.ts    # /api 代理到后端；alias 直引 shared 源码
    ├── src/api/          # http.ts（统一请求层）、auth.ts
    ├── src/stores/       # Pinia 登录态
    ├── src/router/       # 路由 + 登录守卫
    ├── src/config/       # 四端模块配置
    ├── src/utils/        # storage.ts、offline.ts（离线缓存）
    ├── src/styles/       # base.css（轻量设计系统，无 UI 框架）
    ├── src/layouts/      # AppLayout.vue（顶栏 + 侧边导航）
    ├── src/components/   # ModuleCard、diagnosis/（QuizRunner、DiagnosisResult）
    ├── src/views/        # LoginView / HomeView / NotFound / student/DiagnosisView 等
    └── tests/            # logic / component / http 三个测试文件（npm test）
```

## 四、已完成清单

### 1. 平台基础（后端）
- 四端统一认证（student / teacher / admin / parent），JWT + 全局守卫 + `@Roles` 角色控制
- 全局参数校验、统一响应结构 `{code,message,data,timestamp}`、统一异常过滤
- 全局限流、Swagger 文档（`/docs`）、CORS
- 基础设施：文件存储（含体积上限校验）、进程内缓存、异步队列抽象、离线缓存
- 数据库：开发默认 better-sqlite3（零外部依赖），生产可切 MySQL/PostgreSQL

### 2. 十二个业务模块（后端）
认证 auth、用户 users（含家校绑定）、知识图谱 knowledge、题库 questions、
共享资源 resources（上传/双层审核/免费下载/离线缓存/下架）、知识诊断 diagnosis、
智能批改 grading、智能组卷 paper、志愿匹配 volunteer、家校互通 school-home、
学情报表 reports、升学数据 enrollment。

### 3. AI 能力
- `AiProvider` 抽象接口 + `AiService` 统一门面
- `MockAiProvider`（本地占位，零联网，开箱即用）
- `OpenAiCompatibleProvider`（真实模型，Node 原生 fetch，零额外依赖）
- 兼容厂商：智谱 GLM / 硅基流动 / 阿里通义 / DeepSeek / Moonshot / 本地 Ollama
- 教学规则已固化进提示词：批改**不输出完整答案**，仅启发式点拨

### 4. 智能组卷（两段式，AI 不编题）
1. AI 只制定**选题计划**（考哪些知识点 / 什么题型 / 什么难度 / 各几道）
2. 服务层按计划**从题库真实抽题**，条件不足时逐步放宽（精确匹配 → 放宽难度 → 放宽题型 → 同科目兜底）
3. 题库题量不足记录在 `meta.shortages`，不静默凑数

### 5. 种子数据
- **知识点** 118 个（小学高段 / 初中 / 高中的 数学、英语、物理），按 `code` upsert 构成知识树
- **题目** 187 道，四维标注（知识点/难度/能力要求/典型错因），全部带解析
- 分布：小学数学 48、小学英语 27、初中数学 63、初中英语 32、初中物理 7、高中数学 6、高中物理 4
- **四端演示账号** + 家校绑定关系
- **院校库 / 升学数据**：明确标注为【演示】占位数据，避免传播失真的招生信息
- 幂等设计：种子题目标记 `source = seed:v1`，`--force` 只清理带标记的题目

### 6. 前端（本批次）
- **通用外壳**：顶栏（品牌/角色/在线状态/用户/退出）+ 桌面侧边导航 + 内容区，离线时显示提示条
- **四端登录入口**：登录页四个角色入口卡片，登录后按账号真实角色进入对应工作台
- **角色工作台**：按角色渲染功能入口卡片（含对应后端接口标注），并显示后端连通性检测
- **统一请求层**：自动附带 JWT、解包后端响应、401 自动清理登录态、支持离线回退
- **离线缓存**：`cache: true` 的 GET 请求写入本地，断网自动读缓存；网络状态实时提示
- **零 UI 框架 + 零重绘制**：全局样式手写约 5KB；**不用 box-shadow / 渐变**（改用 1px 边框），过渡只作用于颜色类属性
- **内存控制**：路由级懒加载、vendor 分包、关闭 sourcemap 与生产 devtools 挂钩、无 KeepAlive；离线缓存单条 >64KB 不缓存、总计 >30 条按写入时间淘汰，且**淘汰走轻量索引，不解析缓存正文**；首页提供一键清理缓存
- **响应式**：卡片栅格 手机 1 列 → 平板 2 列 → 桌面 3 列
- **测试套件**（`frontend/tests/`）：逻辑 34 项 + 组件渲染 41 项 + 请求层契约 19 项 = **94 项全绿**；`npm test -w frontend`
- **学生端知识诊断**：选**学段**（按档案年级自动预选）+ 选科开测 → 单题单屏答题（答题卡/进度/未答提示）→ AI 分析中 → 薄弱点清单 + 补漏路径；知识点 id 还原中文名；结果页显示实测耗时并校验「10 秒内」要求；支持诊断记录（可离线看）
- **逐题解析**：提交后返回每题的对错、你的作答、**正确答案**、**解析**与典型错因；选项中标出正确答案与学生选择；作答前不下发答案（`/diagnosis/start` 剥离 `answer`/`analysis`），提交后才给出

### 7. 需求对齐的关键机制
| 需求 | 落地位置 |
| --- | --- |
| 纯公益全免费、无广告、无付费墙 | 全代码无任何收费/广告逻辑 |
| 四端分层入口 | 后端 `UserRole` + `RolesGuard`；前端登录页四端入口 + 角色工作台 |
| 校级审核 + 平台复核双层 | `resources.review()` + `ReviewRecord` |
| 资源体积上限 50M/200M/50M | `RESOURCE_SIZE_LIMIT_MB` + `StorageService.assertSizeLimit` |
| 核心功能离线缓存、可随时删除 | 后端 `OfflineService`；前端 `utils/offline.ts` |
| 全学段知识图谱、题目四维标注 | `KnowledgePoint` + `Question`；种子覆盖 小学高段→初中→高中 |
| 诊断 10-15 题、10 秒内出结果 | `DIAGNOSIS` 常量 + 自检脚本实测耗时断言 |
| 组卷 1 分钟内 | `PAPER_GENERATION` 常量 + 提供方 60s 超时 |
| 每年更新升学数据 | `enrollment` 模块 upsert + `year` 字段 |
| 低数字素养友好 | 前端基准字号 16px、点击区 ≥44px、演示账号一键填入；后端极简学情报表 |
| 适配老旧手机/低配电脑 | 前端不引入 UI 框架、`es2015` 目标；后端 SQLite + 轻量依赖 |

## 五、待办（按优先级）

1. **❗待用户确认**：智能批改是否也要给完整答案与解析
   - 用户最初需求写的是「仅启发式点拨，**不输出完整答案**」，已按此实现
   - 但后续用户要求「要给答案、要有解析」——已在**知识诊断**落地
   - **两者是否统一，需用户拍板**（统一后批改会变成「对答案工具」）
2. **前端业务界面**：学生端 智能批改 / 我的学情；教师端（组卷/上传/审核）；管理端；家长端（知识诊断已完成）
3. **年级级过滤**：当前只到**学段**（小学高段/初中/高中）。若要「七年级/八年级」精度，需给
   `Question` / `KnowledgePoint` 增加 `grade` 字段并**重新标注 187 道题 + 118 个知识点**
4. **题目检索的学段过滤**：`GET /questions` 的 `stage` 目前可选，教师端检索界面需显式暴露该筛选项
5. **资源真实转码 / 压缩**（当前只做了体积校验 + 落盘，未做格式转换与压缩）
6. **隐私加固**：数据脱敏、字段级加密、最小化采集（涉及未成年人）
7. **部署清单**：Nginx 反代 + history fallback、HTTPS、SQLite 定时备份、环境变量核对
8. 可选：微信小程序（需小程序账号 + HTTPS + 已备案域名）
9. 可选：继续扩充种子题库（当前 187 道，可支撑小规模试用，但远不及真实教学所需）

## 六、已修复问题（重要，避免重犯）

| 问题 | 影响 | 修复 |
| --- | --- | --- |
| **全项目文件都带 UTF-8 BOM**（145 个） | `package.json` 被 Vite/PostCSS 的严格 `JSON.parse` 判为非法；`.env` 首行键名可能被污染 | 已全部清除 BOM。**注意：本环境用 `Set-Content -Encoding utf8` 会写入 BOM，必须改用 `[System.IO.File]::WriteAllText($p,$t,[System.Text.UTF8Encoding]::new($false))`** |
| **前端 401 错误信息被硬编码** | 后端登录失败也返回 401，学生在登录页输错密码会看到误导性的「登录已过期」而非「账号或密码错误」 | `http.ts` 改为优先透出后端 `message`，仅在缺失时回退默认文案 |
| **抽题未按学段过滤（严重）** | `Question` 有 `stage` 字段却从未参与过滤：初中生抽 12 道数学题，题池是全部 117 道（跨小/初/高），期望仅命中初中 6.5 道、混进小学约 4.9 道 —— **近一半检测题是错学段，诊断结果不可信**。教师组卷同样受影响 | `pickByKnowledgePoints` / `pickQuestions` 增加 `stage` 条件；`StartDiagnosisDto` / `GeneratePaperDto` 新增必填 `stage`；`Paper` / `DiagnosisRecord` 落库学段；前端知识诊断新增**学段选择**（并按档案年级自动预选） |

## 六之二、环境限制与重要更正

### 1. npm 在本沙箱的真实限制（**已更正早前的错误判断**）

早前把 `npm install` 失败归因为「沙箱禁用符号链接」，**这是错的**。真实原因有两条，都与 npm 本身无关：

- **主因：指定的 `workdir` 不存在。** 若给命令的 `workdir` 目录尚未创建，harness 启动进程时 cwd 无效，
  Node 报 `Error: spawn D:\deepseekharness\...\node.exe ENOENT` —— 错误信息指向 node.exe，**极具误导性**。
  **正确做法**：先用默认工作目录把目录建好，再在**下一个命令**里切进去。
- **次因：沙箱禁止子进程 spawn（EPERM）。** npm 运行包的生命周期脚本时会 spawn 子进程而被拒。
  用 `--ignore-scripts` 可绕过（纯解压、不跑 postinstall）；若要构建原生模块（如 better-sqlite3），
  需按规程申请一次更宽沙箱权限（本会话已成功用过 `danger-full-access`）。

> **结论：本沙箱内前端依赖可正常安装（约 1 分钟），`vue-tsc` 与 `vite build` 均可跑通。**

### 2. 文件编码（务必遵守）

本环境用 `Set-Content -Encoding utf8` **会写入 UTF-8 BOM**，会使 `package.json` 被严格 `JSON.parse` 判为非法。
**必须用**：`[System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))`

### 3. 其它

- 内置 write 工具在本工作区不可用（硬链接 EISDIR），本项目文件均用 pwsh 写入
- 沙箱内 WMI 被拦截，无法读取内存/显卡（CPU 已确认为 Ryzen 9 8940HX，16核32线程）
- **前端已通过 `vue-tsc`（0 错误）与 `vite build`，测试 94 项全绿**
- **后端仍只在校验过一次 `tsc --noEmit`**（当时发现 3 处 bug 并修复）；此后后端改动靠静态核对 ——
  首次在本机运行 `npm run typecheck -w backend` 时请留意报错
- 已清理的临时产物：`node_modules`、`.npmcache`、`_fetest`、`_npmtest`、`_tscheck`

## 六之三、学生端预览环境（可随时打开）

位置：`E:\deepseekE\_preview`（**不属于产品代码**，仅为便于查看而搭的演示环境，仅约 230 KB）

```bash
node E:\deepseekE\_preview\mock-api.mjs     # → http://localhost:5173
```

- 内含**构建好的前端静态产物** + 一个**零依赖** Node 服务器（只用内置模块，**无需 npm install**）
- 演示账号：`student` / `student123456`
- **诊断评估是真实逻辑**：逐题比对答案、按知识点算掌握度、生成薄弱点与逐题解析，与后端 `mock` 提供方行为一致
- 演示题库：小学数学 8 道 + 初中数学 14 道 + 高中数学 6 道（用于演示学段隔离）
- 验证脚本：`verify-stage.mjs`（学段隔离）、`verify-review.mjs`（逐题解析）

## 七、关键决策记录

| 决策点 | 选择 | 原因 |
| --- | --- | --- |
| 整体架构 | 轻量端云一体 | 兼容 PC 网页 + 手机 + 小程序，适配乡村低配终端 |
| 后端技术栈 | NestJS + TypeScript | 轻量、与前端共享类型、生态成熟 |
| 数据库 | 开发 SQLite，生产可切 MySQL/PG | 零外部依赖，契合低配/离线场景 |
| 共享层 | 独立 `shared` workspace | 前后端接口契约统一，避免各端语义漂移 |
| AI 接入 | Provider 抽象 + mock/http 双实现 | 换厂商/换模型不改业务代码 |
| 组卷方式 | AI 出计划 + 题库抽真题 | 避免 AI 编造题目（幻觉），保证题目真实可用 |
| 种子数据 | 脚本播种而非 SQL 文件 | 复用实体定义，天然类型安全、跨数据库通用 |
| 升学数据 | 种子内明确标注【演示】 | 避免传播失真的招生信息（涉及学生前途） |
| 前端技术栈 | Vue 3 + Vite 响应式单页 | 一套代码覆盖 PC + 手机 H5；生态成熟 |
| 前端 UI | **不引入组件库**，手写轻量样式 | 乡村老旧终端带不动 Element Plus 级别的依赖 |
| 前端请求 | 原生 fetch 封装，不用 axios | 进一步减小体积 |
| 前后端联调 | Vite proxy + 相对路径 `/api` | 开发期无跨域，生产期由 Nginx 反代，前端代码无需改动 |
| 小程序策略 | 先用微信内 H5，小程序后续再做 | 小程序需 HTTPS + 已备案域名（备案 1-3 周），H5 可立即上线 |

## 八、AI 成本结论（三条路）

| 路径 | 成本 | 适用 |
| --- | --- | --- |
| 免费 API（智谱 GLM-4-Flash、硅基流动免费模型等） | 免费，需注册拿 Key | 开发验证、小规模 |
| 本地 Ollama 跑开源模型 | 完全免费（需硬件） | 规模化、数据不出校、离线场景 |
| 付费 API（DeepSeek 等） | 低价按量 | 省心、需要稳定质量 |

**结论**：起步阶段用免费 API 验证效果即可；真部署时后端可跑在学校现有电脑或廉价 CPU 云服务器上，
AI 继续走 API。长期规模化必然产生算力/托管成本，属资源问题而非技术问题。