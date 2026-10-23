import { UserRole } from '@teachstudy/shared';

/** 角色端配置 */
export interface ModuleEntry {
  key: string;
  name: string;
  /** 用 emoji 作图标：零依赖、体积极小，适配低配设备 */
  icon: string;
  desc: string;
  /** 对应的后端接口，便于对照联调 */
  api: string;
  /** 已实现界面的路由路径；缺省表示界面未实现，点击进入占位页 */
  path?: string;
  /** 界面是否已实现（false 表示仅入口占位） */
  ready: boolean;
}

export interface RoleConfig {
  role: UserRole;
  label: string;
  tagline: string;
  modules: ModuleEntry[];
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  [UserRole.STUDENT]: {
    role: UserRole.STUDENT,
    label: '学生端',
    tagline: '诊断薄弱点 · 补漏学习 · 自主提升',
    modules: [
      { key: 'diagnosis', name: '知识诊断', icon: '🧭', desc: '10-15 道检测题，10 秒内定位薄弱知识点并生成补漏路径', api: 'POST /diagnosis/start', path: '/diagnosis', ready: true },
      { key: 'password', name: '修改密码', icon: '🔐', desc: '初始密码为随机生成，首次登录请尽快修改', api: 'PATCH /users/me/password', path: '/password', ready: true },
      { key: 'grading', name: '智能批改', icon: '✍️', desc: '自动批改主客观题，给出错因分析与启发式点拨', api: 'POST /grading', path: '/grading', ready: true },
      { key: 'gradingHistory', name: '批改记录', icon: '📒', desc: '汇总每次练习的得分、错因与点拨，错题值得回头看', api: 'GET /grading', path: '/grading-history', ready: true },
      { key: 'reports', name: '我的学情', icon: '📈', desc: '极简学情报表：掌握度、薄弱点、练习量一目了然', api: 'POST /reports/generate', path: '/reports', ready: true },
      { key: 'profile', name: '我的档案', icon: '🪪', desc: '填写年级/班级/选科，资源定位与诊断默认学科更准', api: 'PUT /users/me/student-profile', path: '/profile', ready: true },
      { key: 'volunteer', name: '志愿匹配', icon: '🎓', desc: '按分数/位次/选科生成「冲稳保」方案并标注报考限制', api: 'POST /volunteer/match', path: '/volunteer', ready: true },
      { key: 'colleges', name: '院校库', icon: '🏫', desc: '按年份查看院校、专业、最低位次与报考限制', api: 'GET /volunteer/colleges', path: '/colleges', ready: true },
      { key: 'resources', name: '学习资源', icon: '📚', desc: '小学 1-6 / 初中 7-9 / 高中 10-12，按年级+学科筛选，全部免费下载', api: 'GET /resources', path: '/resources', ready: true },
      { key: 'offline', name: '离线缓存', icon: '📥', desc: '管理已下载资源，无网也能看，可随时删除释放空间', api: 'GET /resources/offline/manifest', path: '/offline', ready: true },
    ],
  },
  [UserRole.TEACHER]: {
    role: UserRole.TEACHER,
    label: '教师端',
    tagline: '智能组卷 · 资源共建 · 学情掌握',
    modules: [
      { key: 'papers', name: '智能组卷', icon: '📝', desc: '设定知识点/难度/题量，AI 出选题计划并从题库抽真题', api: 'POST /papers/generate', path: '/papers', ready: true },
      { key: 'password', name: '修改密码', icon: '🔐', desc: '初始密码为随机生成，首次登录请尽快修改', api: 'PATCH /users/me/password', path: '/password', ready: true },
      { key: 'questions', name: '题库管理', icon: '🗂️', desc: '录入与检索题目，标注知识点、难度、能力要求与典型错因', api: 'GET /questions', path: '/questions', ready: true },
      { key: 'upload', name: '资源上传', icon: '⬆️', desc: '批量上传校本试题、导学案、电子书、视频、音频', api: 'POST /resources/upload', path: '/upload', ready: true },
      { key: 'mine', name: '我的资源', icon: '📁', desc: '管理本校上传资源，可修改开放范围或下架', api: 'GET /resources/mine', path: '/resources/mine', ready: true },
      { key: 'knowledge', name: '知识图谱', icon: '🌳', desc: '查看全学段知识点树，维护知识点结构', api: 'GET /knowledge/tree', path: '/knowledge', ready: true },
      { key: 'studentReport', name: '学情查看', icon: '👀', desc: '查看本班学生学情报表：诊断次数、薄弱点与掌握度', api: 'GET /reports/student/:id', path: '/students', ready: true },
    ],
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    label: '管理员端',
    tagline: '内容审核 · 用户管理 · 数据维护',
    modules: [
      { key: 'users', name: '用户管理', icon: '👥', desc: '管理学生/教师/家长账号与档案', api: 'GET /users', path: '/users', ready: true },
      { key: 'password', name: '修改密码', icon: '🔐', desc: '初始密码为随机生成，首次登录请尽快修改', api: 'PATCH /users/me/password', path: '/password', ready: true },
      { key: 'review', name: '资源复核', icon: '✅', desc: '双层审核：校级审核 + 平台复核，通过后学生即可查看下载', api: 'POST /resources/:id/review', path: '/review', ready: true },
      { key: 'knowledge', name: '知识图谱维护', icon: '🌳', desc: '新增/调整知识点，支撑全平台精准诊断', api: 'POST /knowledge', path: '/knowledge', ready: true },
      { key: 'enrollment', name: '升学数据', icon: '📊', desc: '每年同步官方招生政策、投档分数线与选科要求', api: 'POST /enrollment', path: '/enrollment', ready: true },
      { key: 'resources', name: '资源总览', icon: '📚', desc: '查看全平台共享资源与下载热度', api: 'GET /resources', path: '/resources', ready: true },
    ],
  },
  [UserRole.PARENT]: {
    role: UserRole.PARENT,
    label: '家长端',
    tagline: '远程了解孩子学习情况',
    modules: [
      { key: 'progress', name: '孩子学情', icon: '👦', desc: '实时查看已绑定学生的学习进度与薄弱点', api: 'GET /school-home/children-progress', path: '/children', ready: true },
      { key: 'password', name: '修改密码', icon: '🔐', desc: '初始密码为随机生成，首次登录请尽快修改', api: 'PATCH /users/me/password', path: '/password', ready: true },
      { key: 'link', name: '绑定学生', icon: '🔗', desc: '输入孩子的账号完成绑定，外出务工也能随时关注', api: 'POST /users/parent/link', path: '/link', ready: true },
      { key: 'reports', name: '学情报表', icon: '📈', desc: '查看孩子的极简版学情报表', api: 'GET /reports/student/:id', path: '/children', ready: true },
    ],
  },
};

/** 四端入口（登录页展示用） */
export const ROLE_ENTRANCES = [
  { role: UserRole.STUDENT, label: '学生端', icon: '🎒', desc: '诊断 · 练习 · 提升' },
  { role: UserRole.TEACHER, label: '教师端', icon: '👩‍🏫', desc: '组卷 · 资源 · 学情' },
  { role: UserRole.ADMIN, label: '管理员端', icon: '🛠️', desc: '审核 · 用户 · 数据' },
  { role: UserRole.PARENT, label: '家长端', icon: '👨‍👩‍👦', desc: '远程看学情' },
];