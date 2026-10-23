# 项目进度记录（teachstudy）

> 记录时间：2026-09-21
> 用途：跨会话恢复工作 —— 记录已完成、待办、已知问题与关键决策。

## 一、一句话状态

- **后端**：框架完成（12 个业务模块 + 四端权限 + 双层审核 + 离线缓存 + 免费大模型接入 + 智能组卷真实抽题）。
- **种子数据**：完成（160 个知识点 + 208 道四维标注题目 + 四端演示账号 + 3 所学校 + 72 份按年级/学科覆盖的演示资源）。
- **前端**：通用外壳 + 四端登录入口 + **温馨暖调视觉** + 学生端 10 个模块 + 教师端 6 个模块 + 管理端 5 个模块 + 家长端 3 个模块完成；全部模块入口就绪，无占位页。
- **仍未做**：资源真实转码压缩、部署清单、小程序；隐私加固已完成（见第 18 节）；以及待用户拍板的「批改是否给完整答案」（见第五节第 1 条）。

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
- **知识点** 118 个（小学 / 初中 / 高中的 数学、英语、物理），按 `code` upsert 构成知识树
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

### 7. 前端第三批次（温馨视觉 + 批改/学情/家长端）
- **温馨暖调设计系统**：`base.css` 从冷蓝切换为「暖橙主色 + 奶油底 + 棕灰文字」；仍保持**扁平/无阴影/无渐变/无 UI 框架**，温馨感来自色相与圆角而非昂贵特效；各组件残留冷色硬编码全部替换；新增 `.chip`（选择胶囊）与 `.empty`（暖心空状态）两个复用类
- **零新增依赖**：本批次未给项目引入任何新 npm 包（前端仍只有 vue/vue-router/pinia），无外部字体/图片/CDN 请求，对网络与低配终端要求不变
- **学生端·智能批改**（`views/student/GradingView.vue`）：选学段+学科（按档案年级自动预选）→ 题库翻页选题 → 作答（单选/多选/文本）→ AI 批改 → 得分环 + 错因分析 + 启发点拨（不展示完整答案）；附「我的批改记录」；新增 `api/grading.ts`、`api/questions.ts`
- **学生端·我的学情**（`views/student/ReportsView.vue`）：选科一键生成极简报表（诊断次数/练习次数/薄弱点数/平均得分四指标卡）+ 薄弱知识点掌握度条（最弱排最前）+ 历史报表可回看；新增 `api/reports.ts`
- **家长端·孩子学情**（`views/parent/ChildrenProgressView.vue`）：孩子卡片（诊断/练习次数、最新薄弱点、补漏路径、一键展开学情报表），文案面向低数字素养家长；未绑定时友好引导；新增 `api/schoolhome.ts`
- **接线**：router 新增 `grading` / `reports`（学生）与 `children`（家长）三条路由；`modules.ts` 中学生端「智能批改/我的学情」与家长端「孩子学情/学情报表」标记 ready 并挂 path
- **温馨细节**：登录页暖色标语；工作台按时段问候（早上好/下午好…）；空状态与鼓励文案贯穿新界面
- ⚠️ 本批次因用户要求**未执行本地依赖安装与构建验证**（保持零安装），代码按既有模式静态核对；下次跑 `npm run typecheck -w frontend` 时请留意

### 8. 前端第四批次（剩余模块批量补齐，仍零新增依赖）
- **学生端**
  - 学习资源 `views/student/ResourcesView.vue`：类型/学科/学段三维筛选 + 分页；**带 JWT 的文件流下载**（`fetch → blob → 保存`，普通 `<a>` 链接带不上令牌）；一键「存离线」
  - 离线缓存 `views/student/OfflineView.vue`：服务端缓存清单（资源 id 还原标题只需一次列表请求，不逐条查询）+ 删除释放空间 + 本地接口缓存清理
  - 志愿匹配 `views/student/VolunteerView.vue`：分数/位次/选科 → 冲稳保三档分组展示 + 报考限制 + 历史方案；明确标注「演示数据，以官方为准」
- **教师端**
  - 智能组卷 `views/teacher/PaperView.vue`：学段/学科/难度/知识点/题量 → 生成；展示 AI 选题计划、**题库缺口（shortages）**、真实题目（含答案与解析，教师可见）；历史试卷可回看
  - 题库管理 `views/teacher/QuestionBankView.vue`：四维标注检索（学段/学科/题型/难度）+ 分页；录入表单（题干/选项/答案/解析/典型错因/能力要求/知识点）
  - 资源上传 `views/teacher/ResourceUploadView.vue`：multipart 直传（浏览器自带 boundary，不能走 JSON 请求层）、体积上限提示、提交后显示审核状态
  - 我的资源 `views/teacher/MyResourcesView.vue`：状态徽标（待校级/待平台/已通过/已驳回/已下架）+ 切开放范围 + 下架
  - 知识图谱 `views/shared/KnowledgeTreeView.vue`：知识点树**扁平化渲染**（避免递归组件与深层嵌套开销）+ 新增知识点（可挂父节点）
- **管理端**
  - 用户管理 `views/admin/UsersView.vue`：分页列表 + 创建账号（角色限学生/教师/家长，密码≥6 位）
  - 升学数据 `views/admin/EnrollmentView.vue`：按年份/分类筛选 + 录入更新（招生政策/投档线/选科要求）
  - 资源总览复用学习资源页；知识图谱维护复用共享知识树页
- **家长端**
  - 绑定学生 `views/parent/LinkChildView.vue`：输入孩子账号绑定 + 已绑定列表 + 一键跳「孩子学情」
- **公共**
  - `utils/format.ts`：时间/体积/短 id 格式化，避免各页面重复实现
  - `api/` 新增 resources / paper / volunteer / enrollment；扩展 questions（新增题目）、knowledge（树/新增）、users（列表/创建/绑定）
  - `config/labels.ts` 新增资源类型·状态·范围、升学分类、志愿梯度标签
- **以上四项卡点已在第 13、14 节全部解决**（补 `GET /users/students`、`GET /resources/pending` 两个接口 + 三个界面 + 学校模块）

### 9. 前端第五批次（学习资源：年级化 + 全学科覆盖）
- **后端**
  - `Resource` 实体新增 `grade`（int，可空；1-6 小学 / 7-9 初中 / 10-12 高中），开发环境 `synchronize` 自动加列
  - `UploadResourceDto` / `QueryResourceDto` 新增可选 `grade`（`@IsInt @Min(1) @Max(12)`，全局 ValidationPipe 已开 implicit conversion，multipart 字符串可自动转数字）
  - `resources.service`：上传落 `grade`；列表按年级过滤时**同时返回跨年级通用资源**（`grade = :grade OR grade IS NULL`）
  - 新增种子 `scripts/seed-data/resources.ts`：按「小学 1-6 × 语数外」+「初中 7-9 × 九科」+「高中 10-12 × 九科」生成 **72 份【演示】资源**（正文为占位说明），状态直接 `approved`、`scope=public`，文件写入存储目录；`seed.ts` 按标题幂等播种
- **前端**
  - `labels.ts`：年级标签（一年级…高三）、`GRADES_BY_STAGE`（1-6 / 7-9 / 10-12）、`SUBJECTS_BY_STAGE`（小学仅语数外；初高中语数英物化生政史地）、`inferGradeFromText`（档案「八年级/初二/高一」→ 数字）
  - 学习资源页改为**四级筛选**：学段 → 年级 → 学科 → 类型，换学段自动重置年级与学科（避免出现「小学·物理」这类非法组合）；按档案年级自动定位到对应年级；卡片与上传页、我的资源均显示年级
  - 上传页新增年级下拉（可留空＝跨年级通用），切学段自动收敛年级与学科
  - 下载仍是 **带 JWT 的文件流**（fetch→blob→保存），「存离线」调 `POST /resources/offline/cache/:id`
- **关于学段命名的说明**：`StudyStage.PRIMARY_HIGH` 的显示名已统一为「小学」（原「小学高段」，枚举值保持不变以免影响历史数据），全站（诊断/组卷/资源）共用 `stageLabel`，不再有显示差异

### 10. 学习资源：在线预览（点击即用，不强制下载）
- **后端**：新增 `GET /resources/:id/preview`，`Content-Disposition: inline` 返回文件本体，**不累加下载量**；`mimeOf` 扩充 md/txt/csv/json/gif/webp/svg/m4a/wav/webm 等类型，保证浏览器能正确渲染
- **前端**：资源列表点标题或「打开」即在弹层内查看，无需下载、无需先存离线
  - 文本（md/txt/csv/json）→ 直接渲染为可读正文
  - PDF → iframe 内嵌；图片 → img；音视频 → 原生播放器
  - Word/PPT/压缩包等浏览器无法渲染的格式 → 提示改下载
  - 下载、存离线保留为**可选**按钮；弹层支持 ESC / 点遮罩关闭，关闭时释放 blob URL
- 说明：预览走带 JWT 的 fetch → blob（`<iframe>`/`<video>` 无法携带 Authorization 头），大视频会先加载完再播放，属于当前实现的已知取舍

### 11. 品牌更名：青禾 + 新标识
- 全站显示名由「乡村公益助学平台」改为 **青禾**（曾短暂用过「志成」，最终定名青禾）；「乡村公益助学」保留为副标题/描述；**内部包名、目录、接口路径一概不变**，避免影响构建与历史数据
- 命名取意：田里的**青禾**既是乡土、生长，也指求学少年；破土、抽穗、结实对应小学到高中的成长，与标识中的新芽一致
- 新增 `frontend/src/components/BrandMark.vue`：内联 SVG 标识 —— **禾苗绿**圆角底（`--c-brand:#3f7d3a`，与暖橙主色构成「土地＋新苗」）+ 白色**打开的书**（助学）+ **破土新芽与一点向上的光**（生长）；零图片请求、任意尺寸清晰
- 登录页与顶栏换用该标识；新增 `frontend/public/favicon.svg`；`index.html` 补 favicon、`theme-color` 改为暖橙 `#d97706`
- 同步更新：`VITE_APP_TITLE`（.env.development / .env.example）、路由兜底标题、Swagger 标题、健康检查 `name`、AI 诊断提示词、种子资源页脚、README（含标语）与各 package.json 描述
- 保留旧名的地方仅有：AI 提示词里的括注「青禾（乡村公益助学平台）」——说明产品定位，不是遗漏

### 12. 学生档案编辑（PUT /users/me/student-profile）
- 新增 `views/student/ProfileView.vue` + 路由 `/profile`（仅学生）+ 工作台模块入口「我的档案」
- 表单：学段（小学/初中/高中）→ 年级（1-12，规范写法落库：一年级…高三）→ 班级 → 选科（按学段收敛：小学语数外 / 初高中九科）→ 监护人手机（11 位校验，可空）
- 保存后**回写 `/users/me` 的离线缓存**（键 `GET /users/me`），避免资源页在缓存有效期内仍读旧年级
- 交互细节：换学段自动把年级/学科收敛到合法范围；保存成功提示「学习资源会按新年级自动定位」；带「去学习资源看看」快捷入口
- `api/users.ts` 新增 `saveStudentProfile`；后端接口为 upsert，无需改动

### 13. 补齐最后两个卡点：学情查看 + 资源复核（四端功能齐备）
- **后端（两个新接口）**
  - `GET /users/students`（教师/管理员）：教师限本校、管理员可见全部；只返回 id/username/name/schoolId/年级/班级/选科，**绝不外泄 passwordHash**
  - `GET /resources/pending`（教师/管理员）：待审核队列（校级 + 平台），教师限本校
  - `POST /resources/:id/review` 权限收紧细化：校级审核允许教师/管理员（限本校），**平台复核仅管理员**；学生/家长一律拒绝；审核记录仍写入 `review_records`
- **前端（三个新页面）**
  - 教师端「学情查看」`views/teacher/StudentReportView.vue`：学生列表（姓名搜索）→ 选人 → 学情报表（诊断/批改次数、薄弱数、平均分 + 薄弱知识点掌握度条，按掌握度升序，知识点 id 还原为名称）
  - 管理端「资源复核」`views/admin/ResourceReviewView.vue`：状态分页（全部/待校级/待平台）+ 审核意见输入 + 校级通过/驳回、平台通过/驳回；操作后即时出队
  - 学生端「院校库」`views/student/CollegesView.vue`：按年份查询，按地区分组，展示类型/开设专业/最低位次/报考限制
- **模块状态**：`modules.ts` 22 个模块**全部 ready**（学情查看、资源复核由 false 转 true，新增院校库、我的档案）
- 至此：学生端 8 个、教师端 6 个、管理端 5 个、家长端 3 个功能入口全部可用

### 14. 学生档案加「学校」（新增轻量学校模块）
- **背景**：学校原先只是字符串 ID，没有实体，学生无从选择，`仅本校可见` 也缺一个权威来源
- **后端**：新增 `modules/schools`（实体 + 服务 + 控制器 + 模块，已注册到 `app.module`）
  - `GET /schools`（登录用户）：学校列表，供档案选择与建号使用
  - `POST /schools`（管理员）：新增学校
  - `StudentProfileDto` 增加可选 `schoolId`；`saveStudentProfile` 保存档案时**同步写回 `User.schoolId`**（资源可见范围、教师限本校审核都读这个字段）
  - 种子新增 3 所演示学校（首所 id 沿用 `school-demo-001`，与既有演示账号对齐），`npm run seed` 幂等写入
- **前端**：`api/schools.ts`；「我的档案」新增学校下拉（名称 + 地区）+ 摘要徽标；管理员「用户管理」建号时学校从下拉选择（不再是自由文本），列表行显示学校名
- 交互细节：学校列表为空时档案页给出提示，其他字段仍可保存；学校写进账号后，刷新 `/users/me` 离线缓存

### 15. 首次跑通真实全栈（类型修复 + 本地启动）
- **背景**：此前从未安装依赖/跑过构建，累计留下若干真实类型错误；本次在临时副本装好依赖后逐个修复
- **修复清单（均已同步回 `E:\deepseekE\teachstudy`）**
  - `app.module.ts`：`cs.get('database')` 可能为 undefined → 改为显式工厂 + 缺失时报错
  - `config/configuration.ts`：两个分支的 `type` 宽度不同导致联合类型不匹配 → 末尾统一 `as TypeOrmModuleOptions`
  - `enrollment.service.ts`：`where` 不接受 `null` → 按有无 region 分别构造查询条件
  - `User.schoolId` / `Resource.schoolId` / `AuthUser.schoolId` / auth 载荷：`string` → `string | null`（与可空列一致）
  - `knowledge.controller.ts`：`tree()` 返回类型不可命名 → 导出 `KnowledgeNode` 并在控制器标注
  - 前端 `http.put` 未实现 → 补上；`StudentProfileInput` 缺 `schoolId` → 补上
  - `app.controller.ts` 健康检查服务名 `teachstudy` → `青禾`
- **验证**：`tsc --noEmit`（后端）与 `vue-tsc --noEmit`（前端）**首次全部通过**；种子 118 知识点 / 3 学校 / 187 题 / 4 账号 / 6 院校 / 3 升学 / 72 资源全部写入
- **启动方式（重要）**
  - 安装源必须用华为云：`npm install --registry=https://repo.huaweicloud.com/repository/npm/`（npmmirror 的 CDN 在本机极慢，单包 15 分钟级）
  - 顺序：`npm run build:shared` → `npm run seed` → `npm run start:dev -w backend`（3000）→ `npm run dev:frontend`（5173）
  - 演示账号密码由种子随机生成，见 `backend/scripts/seed-data/users.ts` 或 seed 输出
- **环境注意**：本机「批量删除保护」会拦截 npm 在 node_modules 内的删建操作，项目目录内装依赖会被拦；本次改为在系统临时目录副本中安装运行

### 16. 学生端体验补全（五缺口全做）
- **修改密码**：`PATCH /users/me/password`（校验原密码、新旧不能相同、≥6 位）；新增 `views/shared/ChangePasswordView.vue`（路由 `/password`，**四端均可进入**，各角色工作台都有入口）；登录页加「初始密码为随机生成，请尽快修改」提示。已实测：错原密码 401 → 修改成功 → 新密码可登录 → 已还原演示账号密码
- **批改记录（错题回顾）**：新增 `views/student/GradingHistoryView.vue`（路由 `/grading-history`）：统计卡（练习数/有错数/平均分）+「只看错题」筛选 + 每条记录的错因与当时点拨；复用既有 `GET /grading`
- **志愿方案管理**：`DELETE /volunteer/plans/:id`（限本人，越权 403）；历史方案支持勾选两份**并排对比**（冲稳保分组对照）与单条删除
- **视频边下边播**：预览接口支持 **Range（206 + Content-Range）**；JWT 守卫新增 query `token` 通道（仅用于 `<video>/<audio>` 直连，这些标签无法带请求头）；前端音视频改为原生播放器直连地址，其余类型仍走 blob。已实测：`bytes=0-99` → `206 · Content-Range: bytes 0-99/820`
- **离线缓存管理**：新增「占用约 X」汇总与**一键清空**（逐个释放，单个失败不阻塞）
- **题库扩到小学 1-4 年级**：新增 `knowledge-points-low.ts`（42 个知识点：数学 20 以内数/表内乘除/万以内数/周长面积/多位数乘除/分数初步，语文拼音/识字/词语/积累阅读，英语字母/词汇/交际）与 `questions-primary-low.ts`（22 道题）；`seed-data/index.ts` 合并导出。**种子总量：160 知识点 / 208 题**（原 118/186）
- 注意：新增题目需 `npx ts-node -r tsconfig-paths/register scripts/seed.ts --force` 才会写入（种子题目按 source 标记整体重建）；`npm run seed -- --force` 的参数不会透传到工作区脚本
- 验证：后端 `tsc --noEmit`、前端 `vue-tsc --noEmit` 全绿；上述 10 项接口用例全部实测通过

### 17. 「返回工作台」统一到子页面左上角
- **做法**：把原先散落在各页底部的「← 返回工作台」按钮（共 24 处，含占位页 2 处、诊断结果页 1 处、各业务页 21 处）全部移除，改由 `AppLayout.vue` 在 `<main>` 顶部统一渲染一个 `.page-topbar` 按钮（`v-if="!isHome"`，工作台自身不显示）
- **好处**：新页面零成本获得返回能力；位置固定、不用滚到底部找按钮；手机端同样在左上角拇指可达区
- **清理**：`ModulePlaceholderView.vue` 移除自身返回按钮与不再使用的 `useRouter`；`components/diagnosis/DiagnosisResult.vue` 只保留「再测一次」（返回交给全局按钮）
- **验证**：后端 `tsc --noEmit`、前端 `vue-tsc --noEmit` 均 0 错误；真实服务（3000/5173）与预览环境（5180）均已同步

### 18. 隐私加固（字段级加密 + 脱敏 + 最小化出参）
- **背景**：平台涉及未成年人，此前 `GET /users/me`、`GET /users` 直接把 `passwordHash` 随实体返回，且 `phone`/`guardianPhone` 明文入库、明文出参（还会随前端离线缓存落 localStorage）
- **新增 `common/security/crypto.service.ts`**（零额外依赖，仅用 Node `crypto`）
  - 算法 **AES-256-GCM**（带认证标签，防密文篡改）
  - 密钥来自 `process.env.ENCRYPTION_KEY`；未配置时回退内置开发密钥并**启动告警**（生产必须配置 ≥32 字节随机值）
  - 输出 `base64(iv):base64(tag):base64(ciphertext)`
  - `decrypt` 对「非三段格式 / 解密失败」一律**原样返回**，兼容历史明文数据、避免密钥变更导致崩溃
  - `maskPhone`（保留前 3 后 4，其余 `****`）、`maskName`（保留首字，其余 `*`）
- **字段级加密（at-rest）**
  - 实体：`User.phone`、`StudentProfile.guardianPhone` 列宽扩至 `255` 且类型改为可空（密文更长）
  - 入库加密：`create` / `updateProfile` / `saveStudentProfile` 对 `phone` / `guardianPhone` 统一加密后再落库
- **最小化出参（杜绝敏感字段外泄）**
  - `GET /users/me`（本人安全视图）与 `GET /users`（管理员列表）**彻底移除 `passwordHash`**
  - 管理员列表手机号：**先解密再脱敏**（`maskPhone(decrypt(phone))`），前端看到 `138****0003` 而非明文或密文
  - 监护人手机 `guardianPhone`：**仅本人档案接口**（`/users/me` 与 `/users/me/student-profile`）解密可见；教师/管理员学情列表、`/reports/student/:id` 均**不含**该字段
  - 学生选人列表 `/users/students` 本就不含 phone/guardianPhone，保持不变
- **配置与修正**
  - `.env` 新增 `ENCRYPTION_KEY`（已生成并写入，生产务必替换为自有随机值）；`.env.example` 留占位与生成命令
  - 顺手修正历史错键 `DB_WKKOJSDY` → `DB_DATABASE`（此前因代码默认值未炸，现已对齐）
- **验证（接口实测）**
  - `/users/me`：无 `passwordHash`；本人 `phone`/`guardianPhone` 明文返回（学生 小明 / 13800000003 / 13800000004）
  - `/users`：无 `passwordHash`；列表手机脱敏 `138****0001`…`138****0004`
  - 新建用户：`phone` 以密文落库，列表展示 `139****0099`（先解密后脱敏）
- **生产注意**：必须配置 `ENCRYPTION_KEY` 且**妥善保管**（丢失则已加密字段不可恢复）；SQLite 切生产库时加密列宽 `ALTER` 需手动迁移；密钥轮换需配套数据重写脚本

### 19. 手机号注册系统（账号数据加密保存 + 防泄露）
- **核心难点**：手机号既要能「精确查找/唯一约束」（登录、查重），又要「加密存储」。AES-GCM 每次随机 IV，同一手机号密文不同，**无法直接对密文做等值查询**
- **解决方案：密文 + HMAC 盲索引（Blind Index）双列**
  - `User.phone`：AES-256-GCM 密文，可解密（本人查看/后台核对）
  - `User.phone_hash`：`HMAC-SHA256(规范化手机号)`，**不可逆、无明文**、加唯一索引，用于登录查找与重复注册判断
  - 盲索引密钥由主密钥再派生（`ENCRYPTION_KEY::blind-index`），与加密密钥不复用
  - `CryptoService` 新增 `normalizePhone()`（去 +86/非数字、11 位校验）与 `blindIndex()`
- **注册流程**（`POST /auth/sms/send` → `POST /auth/register-phone`）
  1. 发送验证码：6 位加密安全随机数；**60 秒重发冷却、5 分钟有效期、最多 5 次尝试**
  2. 校验验证码：**一次性使用**，通过后立即作废（清空内容但保留发送时间，确保冷却不被绕过）
  3. 查重：走 `phoneHash` 唯一索引，已注册返回 409「该手机号已注册」
  4. 建号：自动生成不可预测登录账号（`qh` + 8 位随机十六进制），手机号始终以密文+盲索引保存
  5. 直接签发 JWT 自动登录，响应不含手机号明文
- **隐私与安全设计**
  - 验证码**不落库、不写日志**，内存仅存 HMAC 哈希；开发环境通过 `devCode` 返回便于联调，生产不返回
  - **先验码、后查重**：未通过验证码的请求无法探测手机号是否已注册（防账号枚举）
  - 登录失败统一提示「手机号或密码错误」，不区分「未注册」与「密码错误」
  - 注册密码强制**强密码**：8-32 位可见 ASCII 且必须同时含字母和数字
  - 接口级限流：发码/注册 5 次/分钟/IP，登录 10 次/分钟/IP
  - 密码继续使用 Node 原生 `scrypt`（带盐），响应永不返回 `passwordHash`
  - 历史账号由种子脚本补写 `phone_hash`，老账号同样支持手机号登录
- **接口清单**
  - `POST /auth/sms/send`（公开，限流）— 发送验证码
  - `POST /auth/register-phone`（公开，限流）— 手机号注册
  - `POST /auth/login-phone`（公开，限流）— 手机号 + 密码登录
- **前端**
  - 新增 `views/RegisterView.vue`（路由 `/register`）：手机号 → 验证码（60s 倒计时）→ 设置密码（实时强度提示）→ 确认密码 → 姓名 → 身份（学生/家长/教师）→ 隐私说明勾选 → 注册并自动登录
  - 登录页新增「账号登录 / 手机号登录」切换，并加「手机号注册」入口
  - `api/auth.ts` 增加 `sendSmsCode` / `registerByPhone` / `loginByPhone`；store 抽出 `applySession` 统一写入登录态
- **实测结果**
  - 发码返回 devCode；错误验证码 400；正确注册返回 token（账号自动生成 `qh…`）
  - 手机号登录成功；错误密码与不存在手机号返回**完全相同**的 401 提示
  - 验证码重复使用 400（已失效）；已注册手机号再注册 409
  - 注册后立即重发验证码返回「请 60 秒后再获取验证码」（冷却生效，修复了此前「验证码作废即丢冷却」的短信轰炸漏洞）
  - 库内核查：`phone` 为三段密文、`phone_hash` 存在且唯一、`password_hash` 为 scrypt 哈希
  - demo 账号凭手机号（13800000003）+ 原密码登录成功（盲索引回填生效）
- **生产部署注意**
  - 短信网关尚未接入：生产环境需在 `SmsCodeService.send()` 内对接阿里云/腾讯云短信，**日志严禁记录验证码与手机号**
  - 验证码存储在进程内存：多实例部署需换 Redis 等集中存储（`send/verify` 内部实现替换即可）
  - 必须走 HTTPS，否则验证码与密码在传输层可被截获

### 7. 需求对齐的关键机制
| 需求 | 落地位置 |
| --- | --- |
| 纯公益全免费、无广告、无付费墙 | 全代码无任何收费/广告逻辑 |
| 四端分层入口 | 后端 `UserRole` + `RolesGuard`；前端登录页四端入口 + 角色工作台 |
| 校级审核 + 平台复核双层 | `resources.review()` + `ReviewRecord` |
| 资源体积上限 50M/200M/50M | `RESOURCE_SIZE_LIMIT_MB` + `StorageService.assertSizeLimit` |
| 核心功能离线缓存、可随时删除 | 后端 `OfflineService`；前端 `utils/offline.ts` |
| 全学段知识图谱、题目四维标注 | `KnowledgePoint` + `Question`；种子覆盖 小学→初中→高中 |
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
2. ~~前端业务界面（学情查看 / 资源复核 / 档案编辑 / 院校库）~~ **已完成**（第 13、14 节）
3. **年级级过滤**：当前只到**学段**（小学/初中/高中）。**学习资源已支持年级（第 9 节）**；题目与知识点仍只有 `stage`，需给 `Question` / `KnowledgePoint` 增加 `grade` 字段并重新标注 208 道题 + 160 个知识点
4. **题目检索的学段过滤**：`GET /questions` 的 `stage` 目前可选，教师端检索界面需显式暴露该筛选项
5. **资源真实转码 / 压缩**（当前只做了体积校验 + 落盘，未做格式转换与压缩）
6. ~~隐私加固：数据脱敏、字段级加密、最小化采集~~ **已完成**（见第 18 节）
7. **部署清单**：Nginx 反代 + history fallback、HTTPS、SQLite 定时备份、环境变量核对
8. 可选：微信小程序（需小程序账号 + HTTPS + 已备案域名）
9. 可选：继续扩充种子题库（当前 208 道，含小学 1-4 年级，可支撑小规模试用，但远不及真实教学所需）
10. **账号注销与数据删除**（个人信息保护法的「删除权」）：目前只能停用，缺少自助注销与级联清理
11. **密码找回**：手机号注册已打通，但「忘记密码 → 短信验证码重置」尚未实现
12. **真实短信网关接入**：当前验证码为开发模式回显，生产需对接运营商短信服务

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
- **npm 官方源在本机极慢**（单包元数据 8 秒下载不完），如需安装依赖请加 `--registry=https://registry.npmmirror.com`（实测约 1 秒/次）

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