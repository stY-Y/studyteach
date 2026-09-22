/**
 * 院校库种子数据。
 *
 * 重要说明：以下全部为【演示数据】，院校名称与位次均为占位，不具备任何参考价值。
 * 平台正式运营时，必须替换为各省教育考试院/阳光高考平台公布的官方数据，
 * 并按「每年同步更新」的要求维护（见需求：升学数据更新）。
 */
export interface SeedCollege {
  name: string;
  region: string;
  type: string;
  majors: string[];
  minRank: number;
  requirements: string[];
  year: number;
}

export const SEED_COLLEGES: SeedCollege[] = [
  {
    name: '【演示】理工大学 A',
    region: '示例省',
    type: '理工类',
    majors: ['计算机科学与技术', '电子信息工程', '自动化'],
    minRank: 20000,
    requirements: ['选科要求：物理 + 化学', '部分专业有色觉要求'],
    year: 2024,
  },
  {
    name: '【演示】师范大学 B',
    region: '示例省',
    type: '师范类',
    majors: ['汉语言文学', '数学与应用数学', '英语'],
    minRank: 35000,
    requirements: ['选科要求：不限', '师范类专业需面试'],
    year: 2024,
  },
  {
    name: '【演示】综合大学 C',
    region: '示例省',
    type: '综合类',
    majors: ['法学', '工商管理', '新闻传播学'],
    minRank: 28000,
    requirements: ['选科要求：不限'],
    year: 2024,
  },
  {
    name: '【演示】医科大学 D',
    region: '示例省',
    type: '医药类',
    majors: ['临床医学', '口腔医学', '护理学'],
    minRank: 15000,
    requirements: ['选科要求：物理 + 化学 + 生物', '色盲色弱限报'],
    year: 2024,
  },
  {
    name: '【演示】农业大学 E',
    region: '示例省',
    type: '农林类',
    majors: ['农学', '动物医学', '食品科学与工程'],
    minRank: 55000,
    requirements: ['选科要求：物理或化学或生物'],
    year: 2024,
  },
  {
    name: '【演示】职业技术学院 F',
    region: '示例省',
    type: '职业院校',
    majors: ['机电一体化技术', '护理', '学前教育'],
    minRank: 120000,
    requirements: ['选科要求：不限', '部分专业需体检'],
    year: 2024,
  },
];