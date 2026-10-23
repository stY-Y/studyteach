/**
 * 演示学校（公益平台先做轻量版：名称 / 地区 / 类型）。
 * 第一所 id 沿用既有演示账号的 schoolId（school-demo-001），保证种子账号与新学校表对齐。
 */
export interface SeedSchool {
  id: string;
  name: string;
  region: string;
  type: string;
}

/** 与 seed-data/users.ts 中的 SEED_SCHOOL_ID 保持一致（不在本文件重复导出，避免桶文件重名） */
export const DEMO_SCHOOL_ID = 'school-demo-001';

export const SEED_SCHOOLS: SeedSchool[] = [
  {
    id: DEMO_SCHOOL_ID,
    name: '会泽县第一中学',
    region: '云南省 曲靖市 会泽县',
    type: '完全中学',
  },
  {
    id: 'school-demo-002',
    name: '者海镇中心小学',
    region: '云南省 曲靖市 会泽县',
    type: '小学',
  },
  {
    id: 'school-demo-003',
    name: '鲁甸县第二中学',
    region: '云南省 昭通市 鲁甸县',
    type: '初中',
  },
];
