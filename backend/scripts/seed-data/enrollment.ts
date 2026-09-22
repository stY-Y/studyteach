/**
 * 升学数据种子。
 *
 * 重要说明：以下全部为【演示数据】，内容为占位示例，不代表任何真实招生政策。
 * 正式运营时必须从各省教育考试院、阳光高考平台等官方渠道同步，
 * 并标注来源与生效年份（见需求：每年同步更新全国官方招生政策、投档分数线、选科要求）。
 */
export interface SeedEnrollmentPolicy {
  year: number;
  region?: string;
  /** policy | score_line | subject_requirement */
  category: string;
  title: string;
  content: string;
}

export const SEED_ENROLLMENT_POLICIES: SeedEnrollmentPolicy[] = [
  {
    year: 2024,
    category: 'policy',
    title: '【演示】普通高校招生考试报名基本条件',
    content:
      '本条目为演示占位内容。正式数据请以当年省级教育考试院发布的《普通高等学校招生工作规定》为准。\n' +
      '一般包含：报名资格、报名时间、体检要求、志愿填报批次设置等。',
  },
  {
    year: 2024,
    category: 'score_line',
    title: '【演示】本科批次录取控制分数线',
    content:
      '本条目为演示占位内容。正式数据请以当年省级教育考试院公布的控制分数线为准。\n' +
      '示例结构：本科批 物理类 XXX 分 / 历史类 XXX 分。',
  },
  {
    year: 2024,
    category: 'subject_requirement',
    title: '【演示】普通高校招生专业选考科目要求',
    content:
      '本条目为演示占位内容。正式数据请以教育部及各省发布的《普通高校招生专业选考科目要求》为准。\n' +
      '常见要求类型：不限、物理必选、物理+化学均须选考、物理或化学或生物任选一门等。',
  },
];