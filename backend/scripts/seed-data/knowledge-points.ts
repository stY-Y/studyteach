import { StudyStage, Subject } from '@teachstudy/shared';

export interface SeedKnowledgePoint {
  code: string;
  name: string;
  subject: Subject;
  stage: StudyStage;
  /** 父级知识点 code，用于构建知识树 */
  parentCode?: string;
  description?: string;
  order?: number;
}

/**
 * 种子知识点（覆盖 初中数学/初中物理/初中英语/高中数学/高中物理）。
 * 说明：这是一套「可跑通全流程」的示例图谱，生产环境应替换为教研团队整理的完整课标图谱。
 */
export const SEED_KNOWLEDGE_POINTS: SeedKnowledgePoint[] = [
  // ==================== 初中数学 ====================
  { code: 'MATH-J-01', name: '有理数', subject: Subject.MATH, stage: StudyStage.JUNIOR, order: 1, description: '有理数的概念、数轴、绝对值与四则运算' },
  { code: 'MATH-J-0101', name: '有理数的概念', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-01', order: 1 },
  { code: 'MATH-J-0102', name: '数轴与相反数', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-01', order: 2 },
  { code: 'MATH-J-0103', name: '绝对值', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-01', order: 3 },
  { code: 'MATH-J-0104', name: '有理数的加减运算', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-01', order: 4 },
  { code: 'MATH-J-0105', name: '有理数的乘除与乘方', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-01', order: 5 },

  { code: 'MATH-J-02', name: '整式', subject: Subject.MATH, stage: StudyStage.JUNIOR, order: 2, description: '整式的概念、运算与乘法公式' },
  { code: 'MATH-J-0201', name: '单项式与多项式', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-02', order: 1 },
  { code: 'MATH-J-0202', name: '合并同类项', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-02', order: 2 },
  { code: 'MATH-J-0203', name: '幂的运算性质', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-02', order: 3 },
  { code: 'MATH-J-0204', name: '乘法公式', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-02', order: 4 },

  { code: 'MATH-J-03', name: '一元一次方程', subject: Subject.MATH, stage: StudyStage.JUNIOR, order: 3, description: '方程概念、解法步骤与实际应用' },
  { code: 'MATH-J-0301', name: '方程与一元一次方程的概念', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-03', order: 1 },
  { code: 'MATH-J-0302', name: '等式性质与移项法则', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-03', order: 2 },
  { code: 'MATH-J-0303', name: '去括号与去分母', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-03', order: 3 },
  { code: 'MATH-J-0304', name: '一元一次方程的应用题', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-03', order: 4 },

  { code: 'MATH-J-04', name: '图形认识初步', subject: Subject.MATH, stage: StudyStage.JUNIOR, order: 4, description: '相交线、平行线与三角形基础' },
  { code: 'MATH-J-0401', name: '相交线与对顶角', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-04', order: 1 },
  { code: 'MATH-J-0402', name: '平行线的判定与性质', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-04', order: 2 },
  { code: 'MATH-J-0403', name: '三角形的基本性质', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-04', order: 3 },

  // ==================== 初中物理 ====================
  { code: 'PHYS-J-01', name: '声现象', subject: Subject.PHYSICS, stage: StudyStage.JUNIOR, order: 1 },
  { code: 'PHYS-J-0101', name: '声音的产生与传播', subject: Subject.PHYSICS, stage: StudyStage.JUNIOR, parentCode: 'PHYS-J-01', order: 1 },
  { code: 'PHYS-J-0102', name: '声音的特性', subject: Subject.PHYSICS, stage: StudyStage.JUNIOR, parentCode: 'PHYS-J-01', order: 2 },

  { code: 'PHYS-J-02', name: '光现象', subject: Subject.PHYSICS, stage: StudyStage.JUNIOR, order: 2 },
  { code: 'PHYS-J-0201', name: '光的反射', subject: Subject.PHYSICS, stage: StudyStage.JUNIOR, parentCode: 'PHYS-J-02', order: 1 },
  { code: 'PHYS-J-0202', name: '光的折射', subject: Subject.PHYSICS, stage: StudyStage.JUNIOR, parentCode: 'PHYS-J-02', order: 2 },

  { code: 'PHYS-J-03', name: '物态变化', subject: Subject.PHYSICS, stage: StudyStage.JUNIOR, order: 3 },
  { code: 'PHYS-J-0301', name: '熔化与凝固', subject: Subject.PHYSICS, stage: StudyStage.JUNIOR, parentCode: 'PHYS-J-03', order: 1 },
  { code: 'PHYS-J-0302', name: '汽化与液化', subject: Subject.PHYSICS, stage: StudyStage.JUNIOR, parentCode: 'PHYS-J-03', order: 2 },

  // ==================== 初中英语 ====================
  { code: 'ENG-J-01', name: '时态', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, order: 1 },
  { code: 'ENG-J-0101', name: '一般现在时', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-01', order: 1 },
  { code: 'ENG-J-0102', name: '一般过去时', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-01', order: 2 },
  { code: 'ENG-J-0103', name: '现在完成时', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-01', order: 3 },

  { code: 'ENG-J-02', name: '词法', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, order: 2 },
  { code: 'ENG-J-0201', name: '名词单复数', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-02', order: 1 },
  { code: 'ENG-J-0202', name: '形容词比较级', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-02', order: 2 },

  // ==================== 高中数学 ====================
  { code: 'MATH-S-01', name: '集合与函数', subject: Subject.MATH, stage: StudyStage.SENIOR, order: 1 },
  { code: 'MATH-S-0101', name: '集合的概念与运算', subject: Subject.MATH, stage: StudyStage.SENIOR, parentCode: 'MATH-S-01', order: 1 },
  { code: 'MATH-S-0102', name: '函数的概念与表示', subject: Subject.MATH, stage: StudyStage.SENIOR, parentCode: 'MATH-S-01', order: 2 },
  { code: 'MATH-S-0103', name: '函数的单调性', subject: Subject.MATH, stage: StudyStage.SENIOR, parentCode: 'MATH-S-01', order: 3 },

  { code: 'MATH-S-02', name: '三角函数', subject: Subject.MATH, stage: StudyStage.SENIOR, order: 2 },
  { code: 'MATH-S-0201', name: '任意角与弧度制', subject: Subject.MATH, stage: StudyStage.SENIOR, parentCode: 'MATH-S-02', order: 1 },
  { code: 'MATH-S-0202', name: '三角恒等变换', subject: Subject.MATH, stage: StudyStage.SENIOR, parentCode: 'MATH-S-02', order: 2 },

  // ==================== 高中物理 ====================
  { code: 'PHYS-S-01', name: '运动学', subject: Subject.PHYSICS, stage: StudyStage.SENIOR, order: 1 },
  { code: 'PHYS-S-0101', name: '匀变速直线运动', subject: Subject.PHYSICS, stage: StudyStage.SENIOR, parentCode: 'PHYS-S-01', order: 1 },
  { code: 'PHYS-S-02', name: '力学', subject: Subject.PHYSICS, stage: StudyStage.SENIOR, order: 2 },
  { code: 'PHYS-S-0201', name: '牛顿运动定律', subject: Subject.PHYSICS, stage: StudyStage.SENIOR, parentCode: 'PHYS-S-02', order: 1 },

  // ==================== 小学数学（小学高段） ====================
  { code: 'MATH-P-01', name: '数与代数', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 1, description: '小数、分数、百分数、因数倍数与简易方程' },
  { code: 'MATH-P-0101', name: '小数的意义与性质', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-01', order: 1 },
  { code: 'MATH-P-0102', name: '小数的四则运算', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-01', order: 2 },
  { code: 'MATH-P-0103', name: '分数的意义与性质', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-01', order: 3 },
  { code: 'MATH-P-0104', name: '分数的加减运算', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-01', order: 4 },
  { code: 'MATH-P-0105', name: '分数的乘法与除法', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-01', order: 5 },
  { code: 'MATH-P-0106', name: '百分数与小数、分数的互化', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-01', order: 6 },
  { code: 'MATH-P-0107', name: '因数与倍数', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-01', order: 7 },
  { code: 'MATH-P-0108', name: '简易方程', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-01', order: 8 },

  { code: 'MATH-P-02', name: '比与比例', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 2 },
  { code: 'MATH-P-0201', name: '比的意义与化简', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-02', order: 1 },
  { code: 'MATH-P-0202', name: '正比例与反比例', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-02', order: 2 },

  { code: 'MATH-P-03', name: '图形与几何', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 3 },
  { code: 'MATH-P-0301', name: '平面图形的周长与面积', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-03', order: 1 },
  { code: 'MATH-P-0302', name: '长方体与正方体', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-03', order: 2 },
  { code: 'MATH-P-0303', name: '圆的认识与周长面积', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-03', order: 3 },

  { code: 'MATH-P-04', name: '统计与概率', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 4 },
  { code: 'MATH-P-0401', name: '平均数与统计图', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-04', order: 1 },
  { code: 'MATH-P-0402', name: '可能性', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-04', order: 2 },

  { code: 'MATH-P-05', name: '典型应用题', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 5 },
  { code: 'MATH-P-0501', name: '行程问题', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-05', order: 1 },
  { code: 'MATH-P-0502', name: '工程问题', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-05', order: 2 },
  { code: 'MATH-P-0503', name: '百分数应用题', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-P-05', order: 3 },

  // ==================== 小学英语（小学高段） ====================
  { code: 'ENG-P-01', name: '词汇', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, order: 1 },
  { code: 'ENG-P-0101', name: '名词单复数', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-01', order: 1 },
  { code: 'ENG-P-0102', name: '数词', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-01', order: 2 },
  { code: 'ENG-P-0103', name: '常见介词', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-01', order: 3 },

  { code: 'ENG-P-02', name: '时态', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, order: 2 },
  { code: 'ENG-P-0201', name: '一般现在时', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-02', order: 1 },
  { code: 'ENG-P-0202', name: '现在进行时', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-02', order: 2 },
  { code: 'ENG-P-0203', name: '一般将来时', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-02', order: 3 },
  { code: 'ENG-P-0204', name: '一般过去时', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-02', order: 4 },

  { code: 'ENG-P-03', name: '句型', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, order: 3 },
  { code: 'ENG-P-0301', name: 'There be 句型', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-03', order: 1 },
  { code: 'ENG-P-0302', name: '一般疑问句与特殊疑问句', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-03', order: 2 },
  { code: 'ENG-P-0303', name: '祈使句', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-03', order: 3 },

  { code: 'ENG-P-04', name: '情景交际', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, order: 4 },
  { code: 'ENG-P-0401', name: '日常问候与介绍', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-04', order: 1 },
  { code: 'ENG-P-0402', name: '问路与指路', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-P-04', order: 2 },

  // ==================== 初中数学（扩充） ====================
  { code: 'MATH-J-05', name: '二元一次方程组', subject: Subject.MATH, stage: StudyStage.JUNIOR, order: 5 },
  { code: 'MATH-J-0501', name: '二元一次方程组的解法', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-05', order: 1 },
  { code: 'MATH-J-0502', name: '二元一次方程组的应用', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-05', order: 2 },

  { code: 'MATH-J-06', name: '不等式与不等式组', subject: Subject.MATH, stage: StudyStage.JUNIOR, order: 6 },
  { code: 'MATH-J-0601', name: '一元一次不等式', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-06', order: 1 },
  { code: 'MATH-J-0602', name: '一元一次不等式组', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-06', order: 2 },

  { code: 'MATH-J-07', name: '因式分解', subject: Subject.MATH, stage: StudyStage.JUNIOR, order: 7 },
  { code: 'MATH-J-0701', name: '提公因式法', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-07', order: 1 },
  { code: 'MATH-J-0702', name: '公式法分解因式', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-07', order: 2 },

  { code: 'MATH-J-08', name: '分式', subject: Subject.MATH, stage: StudyStage.JUNIOR, order: 8 },
  { code: 'MATH-J-0801', name: '分式的意义与基本性质', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-08', order: 1 },
  { code: 'MATH-J-0802', name: '分式的运算', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-08', order: 2 },

  { code: 'MATH-J-09', name: '一次函数', subject: Subject.MATH, stage: StudyStage.JUNIOR, order: 9 },
  { code: 'MATH-J-0901', name: '一次函数的图象与性质', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-09', order: 1 },
  { code: 'MATH-J-0902', name: '一次函数的应用', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-09', order: 2 },

  { code: 'MATH-J-10', name: '数据的分析', subject: Subject.MATH, stage: StudyStage.JUNIOR, order: 10 },
  { code: 'MATH-J-1001', name: '平均数、中位数与众数', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-10', order: 1 },
  { code: 'MATH-J-1002', name: '方差与数据波动', subject: Subject.MATH, stage: StudyStage.JUNIOR, parentCode: 'MATH-J-10', order: 2 },

  // ==================== 初中英语（扩充） ====================
  { code: 'ENG-J-0104', name: '一般将来时', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-01', order: 4 },
  { code: 'ENG-J-0105', name: '现在进行时', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-01', order: 5 },
  { code: 'ENG-J-0106', name: '过去进行时', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-01', order: 6 },
  { code: 'ENG-J-0107', name: '被动语态', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-01', order: 7 },

  { code: 'ENG-J-03', name: '从句', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, order: 3 },
  { code: 'ENG-J-0301', name: '宾语从句', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-03', order: 1 },
  { code: 'ENG-J-0302', name: '定语从句', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-03', order: 2 },
  { code: 'ENG-J-0303', name: '状语从句', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-03', order: 3 },

  { code: 'ENG-J-04', name: '非谓语与情态动词', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, order: 4 },
  { code: 'ENG-J-0401', name: '情态动词', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-04', order: 1 },
  { code: 'ENG-J-0402', name: '动词不定式', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-04', order: 2 },

  { code: 'ENG-J-0203', name: '冠词', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-02', order: 3 },
  { code: 'ENG-J-0204', name: '介词', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-02', order: 4 },
  { code: 'ENG-J-0205', name: '代词', subject: Subject.ENGLISH, stage: StudyStage.JUNIOR, parentCode: 'ENG-J-02', order: 5 },
];