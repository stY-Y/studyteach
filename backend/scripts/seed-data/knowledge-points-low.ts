import { StudyStage, Subject } from '@teachstudy/shared';
import { SeedKnowledgePoint } from './knowledge-points';

/**
 * 小学 1-4 年级（低年级）知识点。
 * 原有 MATH-P-* 系列实际是五、六年级（高段）内容，低年级一直「无题可抽」，
 * 这里补齐到一年级起点，让小学全学段都能做诊断。
 */
export const SEED_KNOWLEDGE_POINTS_LOW: SeedKnowledgePoint[] = [
  // ==================== 数学 1-4 年级 ====================
  { code: 'MATH-PL-01', name: '20 以内的数', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 10, description: '一年级：数数、写数、大小比较、加减法' },
  { code: 'MATH-PL-0101', name: '10 以内数的认识', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-01', order: 1 },
  { code: 'MATH-PL-0102', name: '20 以内进位加法', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-01', order: 2 },
  { code: 'MATH-PL-0103', name: '20 以内退位减法', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-01', order: 3 },

  { code: 'MATH-PL-02', name: '表内乘除法', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 11, description: '二年级：乘法口诀、平均分、倍的认识' },
  { code: 'MATH-PL-0201', name: '乘法口诀', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-02', order: 1 },
  { code: 'MATH-PL-0202', name: '平均分与除法', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-02', order: 2 },
  { code: 'MATH-PL-0203', name: '倍的认识', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-02', order: 3 },

  { code: 'MATH-PL-03', name: '万以内的数与三位数加减', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 12, description: '二、三年级：读写大数、加减法笔算' },
  { code: 'MATH-PL-0301', name: '万以内数的认识', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-03', order: 1 },
  { code: 'MATH-PL-0302', name: '三位数的加减法', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-03', order: 2 },

  { code: 'MATH-PL-04', name: '图形的周长与面积', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 13, description: '三年级：长方形、正方形、面积单位' },
  { code: 'MATH-PL-0401', name: '长方形与正方形的周长', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-04', order: 1 },
  { code: 'MATH-PL-0402', name: '面积与面积单位', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-04', order: 2 },

  { code: 'MATH-PL-05', name: '多位数乘除与运算律', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 14, description: '三、四年级：多位数乘一位数、除数是一位数的除法、四则混合运算' },
  { code: 'MATH-PL-0501', name: '多位数乘一位数', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-05', order: 1 },
  { code: 'MATH-PL-0502', name: '除数是一位数的除法', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-05', order: 2 },
  { code: 'MATH-PL-0503', name: '四则混合运算', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-05', order: 3 },

  { code: 'MATH-PL-06', name: '分数的初步认识', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, order: 15, description: '三年级：几分之一、几分之几、同分母分数加减' },
  { code: 'MATH-PL-0601', name: '几分之一与几分之几', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-06', order: 1 },
  { code: 'MATH-PL-0602', name: '同分母分数加减法', subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'MATH-PL-06', order: 2 },

  // ==================== 语文 1-4 年级 ====================
  { code: 'CHN-PL-01', name: '汉语拼音', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, order: 20, description: '一、二年级：声母韵母、拼读、标调' },
  { code: 'CHN-PL-0101', name: '声母与韵母', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, parentCode: 'CHN-PL-01', order: 1 },
  { code: 'CHN-PL-0102', name: '拼音拼读与标调', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, parentCode: 'CHN-PL-01', order: 2 },

  { code: 'CHN-PL-02', name: '识字与写字', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, order: 21, description: '一至四年级：笔顺、偏旁部首、形近字' },
  { code: 'CHN-PL-0201', name: '汉字笔顺规则', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, parentCode: 'CHN-PL-02', order: 1 },
  { code: 'CHN-PL-0202', name: '偏旁部首与形近字', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, parentCode: 'CHN-PL-02', order: 2 },

  { code: 'CHN-PL-03', name: '词语与句子', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, order: 22, description: '二至四年级：近反义词、词语搭配、标点与造句' },
  { code: 'CHN-PL-0301', name: '近义词与反义词', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, parentCode: 'CHN-PL-03', order: 1 },
  { code: 'CHN-PL-0302', name: '标点符号与句子', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, parentCode: 'CHN-PL-03', order: 2 },

  { code: 'CHN-PL-04', name: '积累与阅读', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, order: 23, description: '一至四年级：古诗背诵、成语积累、短文阅读' },
  { code: 'CHN-PL-0401', name: '古诗文背诵', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, parentCode: 'CHN-PL-04', order: 1 },
  { code: 'CHN-PL-0402', name: '短文阅读', subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH, parentCode: 'CHN-PL-04', order: 2 },

  // ==================== 英语 1-4 年级 ====================
  { code: 'ENG-PL-01', name: '字母与语音', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, order: 30, description: '一、二年级：26 个字母、自然拼读入门' },
  { code: 'ENG-PL-0101', name: '26 个英文字母', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-PL-01', order: 1 },
  { code: 'ENG-PL-0102', name: '常见字母组合发音', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-PL-01', order: 2 },

  { code: 'ENG-PL-02', name: '基础词汇', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, order: 31, description: '一至四年级：颜色、动物、数字、家庭、学校' },
  { code: 'ENG-PL-0201', name: '颜色与数字', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-PL-02', order: 1 },
  { code: 'ENG-PL-0202', name: '动物与食物', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-PL-02', order: 2 },

  { code: 'ENG-PL-03', name: '日常交际用语', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, order: 32, description: '二至四年级：问候、介绍、请求与应答' },
  { code: 'ENG-PL-0301', name: '问候与介绍', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-PL-03', order: 1 },
  { code: 'ENG-PL-0302', name: '名词单复数', subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH, parentCode: 'ENG-PL-03', order: 2 },
];
