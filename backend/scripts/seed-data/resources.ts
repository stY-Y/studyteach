import { ResourceScope, ResourceType, StudyStage, Subject } from '@teachstudy/shared';

/**
 * 演示资源（【演示】标记）：
 * 覆盖「小学 1-6 年级 × 语文/数学/英语」+「初中 7-9 年级 / 高中 10-12 年级 × 九科」，
 * 用于验证学生端「学段 → 年级 → 学科 → 类型」逐级筛选、下载与离线缓存链路。
 *
 * 注意：正文只是占位说明，不代表真实教学内容；真实资源请由教师通过「资源上传」提交。
 */
export interface SeedResource {
  title: string;
  /** 文件简介（演示资源自动生成，便于验证清单展示与分类） */
  description: string;
  type: ResourceType;
  subject: Subject;
  stage: StudyStage;
  /** 1-6 小学，7-9 初中，10-12 高中（高一/高二/高三） */
  grade: number;
  scope: ResourceScope;
  /** 演示文件正文（Markdown），播种时写入存储目录 */
  content: string;
}

const SUBJECT_LABELS: Record<string, string> = {
  [Subject.CHINESE]: '语文',
  [Subject.MATH]: '数学',
  [Subject.ENGLISH]: '英语',
  [Subject.PHYSICS]: '物理',
  [Subject.CHEMISTRY]: '化学',
  [Subject.BIOLOGY]: '生物',
  [Subject.POLITICS]: '政治',
  [Subject.HISTORY]: '历史',
  [Subject.GEOGRAPHY]: '地理',
};

const GRADE_LABELS: Record<number, string> = {
  1: '一年级',
  2: '二年级',
  3: '三年级',
  4: '四年级',
  5: '五年级',
  6: '六年级',
  7: '七年级',
  8: '八年级',
  9: '九年级',
  10: '高一',
  11: '高二',
  12: '高三',
};

/** 小学：语文 / 数学 / 英语 */
const PRIMARY_SUBJECTS = [Subject.CHINESE, Subject.MATH, Subject.ENGLISH];

/** 初中、高中：语文 / 数学 / 英语 / 物理 / 化学 / 生物 / 政治 / 历史 / 地理 */
const SECONDARY_SUBJECTS = [
  Subject.CHINESE,
  Subject.MATH,
  Subject.ENGLISH,
  Subject.PHYSICS,
  Subject.CHEMISTRY,
  Subject.BIOLOGY,
  Subject.POLITICS,
  Subject.HISTORY,
  Subject.GEOGRAPHY,
];

function content(stage: StudyStage, grade: number, subject: Subject): string {
  const stageLabel =
    stage === StudyStage.PRIMARY_HIGH ? '小学' : stage === StudyStage.JUNIOR ? '初中' : '高中';
  return [
    `# 【演示资源】${GRADE_LABELS[grade]}${SUBJECT_LABELS[subject]}·导学与练习`,
    '',
    '> 这是一份**演示占位资源**，用于验证平台「按学段 / 年级 / 学科筛选 → 下载 → 离线缓存」的完整链路，',
    '> 正文并非真实教学内容。',
    '',
    '## 这份资源能做什么',
    `- 学段：${stageLabel}`,
    `- 年级：${GRADE_LABELS[grade]}（grade = ${grade}）`,
    `- 学科：${SUBJECT_LABELS[subject]}`,
    '- 支持：在线预览、下载保存、加入离线缓存（断网可看）',
    '',
    '## 给老师的说明',
    '真实的教学资源（导学案、试题、电子书、音视频）请通过「资源上传」提交，',
    '经学校审核 + 平台复核后，学生即可在这里看到并免费下载。',
    '',
    '## 给同学的说明',
    '网络不好时，点「存离线」把资源存到本机；看完可以在「离线缓存」里删掉，不占空间。',
    '',
    '—— 青禾 · 纯公益 · 全免费 · 无广告',
  ].join('\n');
}

function make(
  stage: StudyStage,
  grade: number,
  subject: Subject,
  type: ResourceType,
): SeedResource {
  const kind =
    type === ResourceType.EXAM_PAPER ? '单元练习' : type === ResourceType.EBOOK ? '知识手册' : '导学案';
  return {
    title: `【演示】${GRADE_LABELS[grade]}${SUBJECT_LABELS[subject]}·${kind}`,
    description:
      `【演示】${GRADE_LABELS[grade]}${SUBJECT_LABELS[subject]}${kind}，围绕本年级本学科核心知识点整理，` +
      `可用于课堂同步讲解与课后自主复习；正文为占位内容，仅用于验证资源筛选、预览与离线缓存链路。`,
    type,
    subject,
    stage,
    grade,
    scope: ResourceScope.PUBLIC,
    content: content(stage, grade, subject),
  };
}

function buildResources(): SeedResource[] {
  const list: SeedResource[] = [];

  // 小学 1-6 年级：语文 / 数学 / 英语（导学案）
  for (let grade = 1; grade <= 6; grade += 1) {
    for (const subject of PRIMARY_SUBJECTS) {
      list.push(make(StudyStage.PRIMARY_HIGH, grade, subject, ResourceType.GUIDE_PLAN));
    }
  }

  // 初中 7-9 年级：九科（单元练习）
  for (let grade = 7; grade <= 9; grade += 1) {
    for (const subject of SECONDARY_SUBJECTS) {
      list.push(make(StudyStage.JUNIOR, grade, subject, ResourceType.EXAM_PAPER));
    }
  }

  // 高中 10-12 年级：九科（知识手册）
  for (let grade = 10; grade <= 12; grade += 1) {
    for (const subject of SECONDARY_SUBJECTS) {
      list.push(make(StudyStage.SENIOR, grade, subject, ResourceType.EBOOK));
    }
  }

  return list;
}

/** 72 份演示资源：18（小学）+ 27（初中）+ 27（高中） */
export const SEED_RESOURCES: SeedResource[] = buildResources();
