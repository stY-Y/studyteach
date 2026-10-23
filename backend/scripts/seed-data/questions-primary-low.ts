import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { SeedQuestion } from './types';

/**
 * 小学 1-4 年级（低年级）种子题目。
 * 对应 knowledge-points-low.ts 中的 MATH-PL-* / CHN-PL-* / ENG-PL-* 知识点。
 */
export const SEED_QUESTIONS_PRIMARY_LOW: SeedQuestion[] = [
  // ---------- 10 以内数的认识 ----------
  {
    kpCodes: ['MATH-PL-0101'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '从 0 数到 5，第 4 个数是（  ）',
    options: ['A. 3', 'B. 4', 'C. 5', 'D. 2'],
    answer: 'A',
    analysis: '按顺序数：0、1、2、3、4、5，第 4 个数是 3。',
    typicalErrors: ['把「第 4 个」当成数字 4'],
  },
  {
    kpCodes: ['MATH-PL-0101'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '5 和 3 相比，______ 更大。',
    answer: '5',
    analysis: '5 在 3 的后面，后面的数更大。',
    typicalErrors: ['受书面顺序影响认为 3 大'],
  },

  // ---------- 20 以内进位加法 ----------
  {
    kpCodes: ['MATH-PL-0102'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '8 + 5 = ______',
    options: ['A. 12', 'B. 13', 'C. 14', 'D. 15'],
    answer: 'B',
    analysis: '把 5 分成 2 和 3：8 + 2 = 10，10 + 3 = 13（凑十法）。',
    typicalErrors: ['忘记进位，写成 12 或 14'],
  },
  {
    kpCodes: ['MATH-PL-0102'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '7 + 6 = ______',
    answer: '13',
    analysis: '把 6 分成 3 和 3：7 + 3 = 10，10 + 3 = 13。',
    typicalErrors: ['把 7+6 算成 12（漏看一个）'],
  },

  // ---------- 20 以内退位减法 ----------
  {
    kpCodes: ['MATH-PL-0103'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '15 - 8 = ______',
    options: ['A. 6', 'B. 7', 'C. 8', 'D. 9'],
    answer: 'B',
    analysis: '把 15 分成 10 和 5：10 - 8 = 2，2 + 5 = 7（破十法）。',
    typicalErrors: ['用加法思路错算成 9'],
  },

  // ---------- 乘法口诀 ----------
  {
    kpCodes: ['MATH-PL-0201'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '三七 ______',
    answer: '二十一',
    analysis: '乘法口诀「三七二十一」，即 3 × 7 = 21。',
    typicalErrors: ['与「四七二十八」混淆'],
  },
  {
    kpCodes: ['MATH-PL-0201'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '6 × 8 的积是（  ）',
    options: ['A. 42', 'B. 46', 'C. 48', 'D. 54'],
    answer: 'C',
    analysis: '六八四十八。可用 6 × 8 = 6 × 4 × 2 = 24 × 2 = 48。',
    typicalErrors: ['与 6×7=42 混淆'],
  },

  // ---------- 平均分与除法 ----------
  {
    kpCodes: ['MATH-PL-0202'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '把 12 个苹果平均分给 4 个小朋友，每人分（  ）个',
    options: ['A. 2', 'B. 3', 'C. 4', 'D. 6'],
    answer: 'B',
    analysis: '12 ÷ 4 = 3，「平均分」用除法。',
    typicalErrors: ['把「平均分」当成减法一次减一个'],
  },

  // ---------- 万以内数的认识 ----------
  {
    kpCodes: ['MATH-PL-0301'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '3080 读作（  ）',
    options: ['A. 三千零八十', 'B. 三千八十', 'C. 三千八百', 'D. 三万零八十'],
    answer: 'A',
    analysis: '中间连续 0 只读一个：三千零八十。',
    typicalErrors: ['中间有 0 却漏读'],
  },

  // ---------- 长方形与正方形的周长 ----------
  {
    kpCodes: ['MATH-PL-0401'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '一个长方形长 6 厘米、宽 4 厘米，它的周长是 ______ 厘米。',
    answer: '20',
    analysis: '周长 =（长 + 宽）× 2 = (6 + 4) × 2 = 20 厘米。',
    typicalErrors: ['只算了一条长加一条宽（得 10）'],
  },

  // ---------- 同分母分数加减法 ----------
  {
    kpCodes: ['MATH-PL-0602'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.UNDERSTAND,
    content: '1/5 + 2/5 = （  ）',
    options: ['A. 3/10', 'B. 3/5', 'C. 2/5', 'D. 1/2'],
    answer: 'B',
    analysis: '同分母分数相加，分母不变，分子相加：1 + 2 = 3，得 3/5。',
    typicalErrors: ['把分子分母分别相加，错得 3/10'],
  },

  // ---------- 声母与韵母 ----------
  {
    kpCodes: ['CHN-PL-0101'], subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '下面哪一组都是**声母**？（  ）',
    options: ['A. b  p  m  f', 'B. a  o  e  i', 'C. ai  ei  ui', 'D. an  en  in'],
    answer: 'A',
    analysis: 'b、p、m、f 是声母；a、o、e、i 是单韵母；ai、ei、ui 是复韵母；an、en、in 是鼻韵母。',
    typicalErrors: ['把单韵母当成声母'],
  },

  // ---------- 汉字笔顺规则 ----------
  {
    kpCodes: ['CHN-PL-0201'], subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.UNDERSTAND,
    content: '「口」字的笔顺规则是（  ）',
    options: ['A. 先外后内再封口', 'B. 先内后外', 'C. 从上到下一笔写完', 'D. 先中间后两边'],
    answer: 'A',
    analysis: '全包围结构的字按「先外后内再封口」书写。',
    typicalErrors: ['先写里面再写外框'],
  },

  // ---------- 近义词与反义词 ----------
  {
    kpCodes: ['CHN-PL-0301'], subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '「美丽」的近义词是（  ）',
    options: ['A. 丑陋', 'B. 漂亮', 'C. 高大', 'D. 干净'],
    answer: 'B',
    analysis: '「漂亮」与「美丽」意思相近；「丑陋」是它的反义词。',
    typicalErrors: ['把反义词当近义词'],
  },

  // ---------- 古诗文背诵 ----------
  {
    kpCodes: ['CHN-PL-0401'], subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.MEMORY,
    content: '「春眠不觉晓，处处闻啼鸟」的下一句是「______」。',
    answer: '夜来风雨声，花落知多少',
    analysis: '出自孟浩然《春晓》，注意「晓」指天刚亮。',
    typicalErrors: ['与《咏鹅》《静夜思》串诗'],
  },

  // ---------- 短文阅读 ----------
  {
    kpCodes: ['CHN-PL-0402'], subject: Subject.CHINESE, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: '阅读短文：「小草从土里探出头来，嫩嫩的，绿绿的。」这句话主要写出了小草（  ）',
    options: ['A. 长得很高', 'B. 刚长出来、又嫩又绿的样子', 'C. 味道很香', 'D. 已经被踩倒了'],
    answer: 'B',
    analysis: '「探出头来」「嫩嫩的、绿绿的」写的是小草刚发芽的样子。',
    typicalErrors: ['脱离原文随意推断'],
  },

  // ---------- 26 个英文字母 ----------
  {
    kpCodes: ['ENG-PL-0101'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '字母表里排在 F 后面的是（  ）',
    options: ['A. E', 'B. G', 'C. H', 'D. D'],
    answer: 'B',
    analysis: '顺序是 …D、E、F、G…，F 后面是 G。',
    typicalErrors: ['把前面后面的字母搞反'],
  },

  // ---------- 颜色与数字 ----------
  {
    kpCodes: ['ENG-PL-0201'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '「红色」的英文是 ______',
    answer: 'red',
    analysis: 'red 红色；yellow 黄；blue 蓝；green 绿。',
    typicalErrors: ['与 green 混淆'],
  },

  // ---------- 动物与食物 ----------
  {
    kpCodes: ['ENG-PL-0202'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '下面哪个词表示「兔子」？（  ）',
    options: ['A. rabbit', 'B. panda', 'C. monkey', 'D. horse'],
    answer: 'A',
    analysis: 'rabbit 兔子；panda 熊猫；monkey 猴子；horse 马。',
    typicalErrors: ['动物词汇混淆'],
  },

  // ---------- 问候与介绍 ----------
  {
    kpCodes: ['ENG-PL-0301'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '早上见到老师，你应该说（  ）',
    options: ['A. Good night!', 'B. Good morning!', 'C. Goodbye!', 'D. Thank you!'],
    answer: 'B',
    analysis: '早上好是 Good morning!；Good night 用于晚安/道别。',
    typicalErrors: ['把早晚问候混用'],
  },

  // ---------- 名词单复数 ----------
  {
    kpCodes: ['ENG-PL-0302'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.UNDERSTAND,
    content: '「two ______」里应该填（  ）',
    options: ['A. box', 'B. boxs', 'C. boxes', 'D. a box'],
    answer: 'C',
    analysis: 'box 以 x 结尾，复数加 -es：boxes。',
    typicalErrors: ['直接加 -s 写成 boxs'],
  },
];
