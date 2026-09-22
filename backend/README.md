# backend（乡村公益助学平台后端）

NestJS 10 + TypeScript + TypeORM，轻量端云一体架构。开发默认使用 `better-sqlite3`（零外部数据库依赖，适配低配/离线环境），生产可切换 MySQL/PostgreSQL。

## 启动

```bash
# 在仓库根目录执行
npm install
npm run build:shared      # 先构建共享层 @teachstudy/shared
npm run dev:backend       # 开发模式 http://localhost:3000/api/v1
```

Swagger 文档：`http://localhost:3000/docs`

## 接入免费 AI 大模型

AI 能力（知识诊断/智能批改/智能组卷/志愿匹配/知识点标签）通过统一门面 `AiService` 调用，已内置 OpenAI 兼容的真实模型提供方，**零额外依赖（使用 Node 原生 fetch）**。

### 步骤

1. 到任一厂商注册并获取 API Key：
   - 智谱 AI（GLM）：https://open.bigmodel.cn —— `glm-4-flash` 免费
   - 硅基流动：https://siliconflow.cn —— `Qwen/Qwen2.5-7B-Instruct` 等免费
   - 阿里百炼（通义）：https://bailian.console.aliyun.com —— `qwen-turbo` 新用户免费额度
   - DeepSeek：https://platform.deepseek.com —— `deepseek-chat` 低价
2. 编辑 `backend/.env`：

```ini
AI_PROVIDER=http
AI_API_BASE=https://open.bigmodel.cn/api/paas/v4   # 换成对应厂商地址
AI_API_KEY=你的Key
AI_MODEL=glm-4-flash                                # 换成对应模型名
```

3. 重启后端即可。`AI_PROVIDER=mock` 时是本地占位（零联网），`http` 时走真实模型。

### 验证接入（推荐先跑这个）

无需启动服务、无需数据库，一条命令验证 AI 是否真正跑通：

```bash
npm run ai:check            # 验证 知识诊断 + 智能批改
npm run ai:check -- --all   # 额外验证 智能组卷 / 志愿匹配 / 知识点标签
```

脚本（`scripts/ai-check.ts`）直接加载真实 `AiService`，会打印当前配置、每次调用耗时、返回结构，并自动校验：

- 诊断是否返回 `weakPoints` 与 `learningPath`，是否满足「10 秒内出结果」
- 批改是否返回 `score` / `errorAnalysis` / `hints`
- **点拨中是否泄露了完整标准答案**（教学规则校验）

### 厂商地址对照

| 厂商 | AI_API_BASE | 免费/低价模型 |
| --- | --- | --- |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` |
| 阿里通义 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |

> 代码会自动拼接 `/chat/completions`，也可在 `AI_API_BASE` 直接填完整地址。

## 种子数据（初始化演示数据）

首次启动前建议先播种，否则题库为空，诊断与组卷会无题可用。

```bash
npm run seed             # 幂等播种（已存在则跳过）
npm run seed -- --force  # 清除种子题目后重新播种（用于刷新题目内容）
```

播种内容：

| 类别 | 内容 |
| --- | --- |
| 知识点 | 118 个，覆盖 小学高段 / 初中 / 高中 的 数学、英语、物理，按 `code` upsert 构成知识树 |
| 题目 | 187 道，绑定知识点，均标注「考查知识点 / 难度层级 / 能力要求 / 典型错因」四维 |
| 演示账号 | 四端各一个：`admin` / `teacher` / `student` / `parent`（密码见播种脚本输出） |
| 家校绑定 | 家长账号已绑定学生账号，可直接在家校互通模块查看学情 |
| 院校库 / 升学数据 | 均为【演示】占位数据，正式运营必须替换为官方数据 |

> 种子题目带 `source = seed:v1` 标记，便于识别与清理；`--force` 只清理带该标记的题目，**不会误删你自己录入的题目**。

## 分层结构

```
src/
├── main.ts                 # 入口：全局前缀/校验/CORS/Swagger/数据目录
├── app.module.ts           # 根模块：DB/限流/JWT/全局守卫与拦截器
├── config/configuration.ts # 集中式环境配置（.env）
├── common/                 # 通用层：装饰器/守卫/拦截器/过滤器
│   ├── decorators/         # @Public @Roles @CurrentUser
│   ├── guards/             # JwtAuthGuard / RolesGuard（全局）
│   ├── interceptors/       # TransformInterceptor 统一响应
│   └── filters/            # AllExceptionsFilter 统一错误
├── infra/                  # 基础设施：存储/缓存/队列/离线缓存（全局）
├── ai/                     # AI 抽象层：AiService 门面 + Mock/HTTP 提供方
└── modules/                # 业务模块（见根 README 模块表）
```

## 统一约定

- 路由前缀：`/api/v1`
- 统一响应：`{ code, message, data, timestamp }`，成功 `code=0`
- 认证：`Authorization: Bearer <JWT>`，四端角色 `student/teacher/admin/parent`
- 角色控制：`@Roles(...)` 声明；`@Public()` 跳过鉴权

## 主要接口一览

| 模块 | 路由 | 说明 |
| --- | --- | --- |
| 认证 | `POST /auth/login` `POST /auth/register` `GET /auth/me` | 四端统一登录 |
| 用户 | `GET/PATCH /users/me` `GET/POST /users` | 档案与家校绑定 |
| 知识图谱 | `GET /knowledge` `GET /knowledge/tree` | 全学段知识点树 |
| 题库 | `GET /questions` `POST /questions` | 四维标注题目 |
| 共享资源 | `POST /resources/upload` `POST /resources/:id/review` `GET /resources/:id/download` | 上传/双层审核/免费下载 |
| 知识诊断 | `POST /diagnosis/start` `POST /diagnosis/:id/submit` `GET /diagnosis/:id` | 10-15 题诊断（**必须传 `stage` 学段**）；提交后返回逐题解析 |
| 智能批改 | `POST /grading` | 错因 + 启发点拨 |
| 智能组卷 | `POST /papers/generate` | 学段/知识点/难度/题量（**必须传 `stage` 学段**） |
| 志愿匹配 | `POST /volunteer/match` | 冲稳保方案 |
| 家校互通 | `GET /school-home/children-progress` | 家长查学情 |
| 学情报表 | `POST /reports/generate` | 极简报表 |
| 升学数据 | `GET /enrollment` `POST /enrollment` | 政策/投档线/选科 |

## 诊断的「答案可见性」规则

- `POST /diagnosis/start`（作答前）：**剥离 `answer` 与 `analysis`**，学生无法提前看到答案
- `POST /diagnosis/:id/submit`（提交后）：返回 `review` 数组，逐题给出
  `studentAnswer`（你的作答）、`correctAnswer`（正确答案）、`isCorrect`、`analysis`（解析）、`typicalErrors`（典型错因），
  以及 `stats`（总题数 / 答对数 / 未答数 / 正确率）
- `GET /diagnosis/:id`：可回看逐题解析（**仅本人可看**，已做归属校验）

> 作答判定由 `common/utils/answer.util.ts` 负责，容错全角半角、大小写、多选题顺序、± 多种写法、分数与小数等价、判断题多种写法。
>
> 注意：`POST /grading`（智能批改）仍遵循需求中的教学规则 —— **只给启发式点拨，不输出完整答案**；诊断结果页给出答案是「检测后复盘」场景，两者不冲突。

## 学段隔离（重要）

题目与知识点都带 `stage`（小学高段 / 初中 / 高中）字段。**抽题必须按学段过滤**，否则会把不同学段的题混进同一份诊断或试卷。

- `QuestionsService.pickByKnowledgePoints(subject, stage, kps, count)` 与 `pickQuestions({ subject, stage, ... })` 均强制按学段过滤
- `POST /diagnosis/start` 与 `POST /papers/generate` 的 `stage` 为**必填**
- 诊断记录与试卷都会落库学段，便于回溯与统计

> 注意：学段 ≠ 年级。当前数据模型只到学段粒度；若需「七年级/八年级」级别的过滤，需给 `Question` / `KnowledgePoint` 增加 `grade` 字段并重新标注题库。

## 智能组卷机制

`POST /papers/generate` 不是让大模型直接编题，而是两段式：

1. **AI 制定选题计划**：模型只决定「考哪些知识点 / 什么题型 / 什么难度 / 各几道」，输出 `blueprint`；
2. **服务层从题库真实抽题**：`QuestionsService.pickQuestions()` 按计划逐条取题，条件不满足时逐步放宽
   （精确匹配 → 放宽难度 → 放宽题型 → 同科目兜底），并保证同一题不重复入选。

题库题量不足时不会静默凑数，而是在试卷 `meta.shortages` 中记录缺口，教师端可据此补录题目。
生成结果包含 `blueprint`（选题计划）、`questions`（真实题目）、`meta`（请求/实际题量与缺口）、`summary`（组卷说明）。

## 扩展其它 AI 提供方

在 `src/ai/providers/` 新增实现 `AiProvider` 接口的类，在 `AiModule` 注册并在 `AiService.resolveProvider` 增加分支即可；业务模块无需改动。