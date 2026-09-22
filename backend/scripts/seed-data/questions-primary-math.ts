import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { SeedQuestion } from './types';

/** 小学数学（小学高段）种子题目 */
export const SEED_QUESTIONS_PRIMARY_MATH: SeedQuestion[] = [
  // ---------- 小数的意义与性质 ----------
  {
    kpCodes: ['MATH-P-0101'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '0.5 表示（  ）',
    options: ['A. 1/5', 'B. 1/2', 'C. 5/100', 'D. 1/50'],
    answer: 'B',
    analysis: '0.5 表示十分之五，即 5/10，化简得 1/2。',
    typicalErrors: ['把 0.5 误认为 1/5'],
  },
  {
    kpCodes: ['MATH-P-0101'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '把 3.20 化简后是 ______',
    answer: '3.2',
    analysis: '小数末尾添上 0 或去掉 0，小数的大小不变。',
    typicalErrors: ['误以为去掉 0 会改变大小'],
  },
  {
    kpCodes: ['MATH-P-0101'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: '0.7 与 0.70 的关系是（  ）',
    options: ['A. 0.7 > 0.70', 'B. 0.7 < 0.70', 'C. 0.7 = 0.70', 'D. 无法比较'],
    answer: 'C',
    analysis: '小数的末尾添 0 大小不变，故两者相等。',
    typicalErrors: ['误认为位数多的小数更大'],
  },

  // ---------- 小数的四则运算 ----------
  {
    kpCodes: ['MATH-P-0102'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '计算：0.25 + 0.75 = ______',
    answer: '1',
    analysis: '0.25 + 0.75 = 1.00，小数末尾的 0 可省略。',
    typicalErrors: ['小数点对齐出错'],
  },
  {
    kpCodes: ['MATH-P-0102'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：1.2 × 0.5 = ______',
    answer: '0.6',
    analysis: '先按整数相乘 12 × 5 = 60，两个因数共有一位小数，故积为 0.6。',
    typicalErrors: ['小数点位置点错，误答 6 或 0.06'],
  },
  {
    kpCodes: ['MATH-P-0102'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：0.6 ÷ 0.2 = ______',
    answer: '3',
    analysis: '除数是小数时，把除数化为整数：0.6 ÷ 0.2 = 6 ÷ 2 = 3。',
    typicalErrors: ['被除数与除数扩大的倍数不一致'],
  },
  {
    kpCodes: ['MATH-P-0102'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：3.6 - 1.85 = ______',
    answer: '1.75',
    analysis: '小数减法需小数点对齐，位数不够时用 0 补足：3.60 - 1.85 = 1.75。',
    typicalErrors: ['未补 0 对齐位数'],
  },

  // ---------- 分数的意义与性质 ----------
  {
    kpCodes: ['MATH-P-0103'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '3/4 的分数单位是 ______',
    answer: '1/4',
    analysis: '把单位「1」平均分成 4 份，表示其中 1 份的数就是分数单位 1/4。',
    typicalErrors: ['误答 3/4 本身'],
  },
  {
    kpCodes: ['MATH-P-0103'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '把 2/3 的分子和分母同时乘 3，得到的分数是 ______',
    answer: '6/9',
    analysis: '分数的分子和分母同乘一个非零数，分数大小不变。',
    typicalErrors: ['只乘分子或只乘分母'],
  },
  {
    kpCodes: ['MATH-P-0103'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: '下列说法正确的是（  ）',
    options: ['A. 分数的分子分母同时加 1，分数大小不变', 'B. 分数的分子分母同时乘 2，分数大小不变', 'C. 分数的分子分母同时加 0，分数大小改变', 'D. 分数的分子分母同时除以 0，分数大小不变'],
    answer: 'B',
    analysis: '分数基本性质只适用于「同乘或同除以同一个非零数」，加、减相同的数不成立，且除数不能为 0。',
    typicalErrors: ['混淆「同乘除」与「同加减」'],
  },

  // ---------- 分数的加减运算 ----------
  {
    kpCodes: ['MATH-P-0104'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：1/2 + 1/3 = ______',
    answer: '5/6',
    analysis: '先通分：1/2 = 3/6，1/3 = 2/6，相加得 5/6。',
    typicalErrors: ['分子分母分别相加，误答 2/5'],
  },
  {
    kpCodes: ['MATH-P-0104'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '计算：3/4 - 1/2 = ______',
    answer: '1/4',
    analysis: '通分得 3/4 - 2/4 = 1/4。',
    typicalErrors: ['未通分直接相减'],
  },
  {
    kpCodes: ['MATH-P-0104'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '计算：1 - 2/5 = ______',
    answer: '3/5',
    analysis: '把 1 看成 5/5，5/5 - 2/5 = 3/5。',
    typicalErrors: ['把 1 当作 1/1 直接减'],
  },

  // ---------- 分数的乘法与除法 ----------
  {
    kpCodes: ['MATH-P-0105'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：2/3 × 3/4 = ______',
    answer: '1/2',
    analysis: '分数相乘分子乘分子、分母乘分母得 6/12，约分后为 1/2。',
    typicalErrors: ['忘记约分'],
  },
  {
    kpCodes: ['MATH-P-0105'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：1/2 ÷ 1/4 = ______',
    answer: '2',
    analysis: '除以一个分数等于乘它的倒数：1/2 × 4 = 2。',
    typicalErrors: ['直接分子分母相除'],
  },
  {
    kpCodes: ['MATH-P-0105'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '计算：5/6 × 0 = ______',
    answer: '0',
    analysis: '任何数乘 0 都得 0。',
    typicalErrors: ['误答 5/6'],
  },

  // ---------- 百分数与互化 ----------
  {
    kpCodes: ['MATH-P-0106'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '把 0.35 化成百分数是 ______',
    answer: '35%',
    analysis: '小数化百分数，小数点向右移动两位并添上百分号。',
    typicalErrors: ['小数点移动方向错误'],
  },
  {
    kpCodes: ['MATH-P-0106'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '把 3/4 化成百分数是 ______',
    answer: '75%',
    analysis: '3/4 = 0.75 = 75%。',
    typicalErrors: ['分数化百分数时先算错小数'],
  },
  {
    kpCodes: ['MATH-P-0106'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '把 25% 化成小数是 ______',
    answer: '0.25',
    analysis: '百分数化小数，去掉百分号并把小数点向左移动两位。',
    typicalErrors: ['误答 25 或 2.5'],
  },

  // ---------- 因数与倍数 ----------
  {
    kpCodes: ['MATH-P-0107'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: '12 的因数共有 ______ 个',
    answer: '6',
    analysis: '12 的因数为 1、2、3、4、6、12，共 6 个。',
    typicalErrors: ['遗漏 1 或本身'],
  },
  {
    kpCodes: ['MATH-P-0107'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '下列各数中，是质数的是（  ）',
    options: ['A. 9', 'B. 15', 'C. 17', 'D. 21'],
    answer: 'C',
    analysis: '质数只有 1 和它本身两个因数。17 只有 1 和 17 两个因数。',
    typicalErrors: ['把 9、15、21 误认为质数'],
  },
  {
    kpCodes: ['MATH-P-0107'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '18 和 24 的最大公因数是 ______',
    answer: '6',
    analysis: '18 = 2×3×3，24 = 2×2×2×3，公共质因数相乘得 2×3 = 6。',
    typicalErrors: ['与最小公倍数混淆'],
  },
  {
    kpCodes: ['MATH-P-0107'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '4 和 6 的最小公倍数是 ______',
    answer: '12',
    analysis: '4 的倍数有 4、8、12…；6 的倍数有 6、12…，最小公倍数为 12。',
    typicalErrors: ['误答 24（当成乘积）'],
  },

  // ---------- 简易方程 ----------
  {
    kpCodes: ['MATH-P-0108'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '解方程：x + 5 = 12，则 x = ______',
    answer: '7',
    analysis: '两边同时减 5，得 x = 12 - 5 = 7。',
    typicalErrors: ['移项不变号'],
  },
  {
    kpCodes: ['MATH-P-0108'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '解方程：3x = 18，则 x = ______',
    answer: '6',
    analysis: '两边同时除以 3，得 x = 6。',
    typicalErrors: ['除以系数时算错'],
  },
  {
    kpCodes: ['MATH-P-0108'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '解方程：2x - 4 = 10，则 x = ______',
    answer: '7',
    analysis: '移项得 2x = 14，两边除以 2 得 x = 7。',
    typicalErrors: ['先除以 2 导致运算顺序错误'],
  },

  // ---------- 比与比例 ----------
  {
    kpCodes: ['MATH-P-0201'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '把 12 : 18 化成最简整数比是 ______',
    answer: '2:3',
    analysis: '前后项同时除以最大公因数 6，得 2 : 3。',
    typicalErrors: ['只除以公因数的一部分，未化到最简'],
  },
  {
    kpCodes: ['MATH-P-0201'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '比 3 : 5 的比值是 ______',
    answer: '3/5',
    analysis: '比值 = 前项 ÷ 后项 = 3 ÷ 5 = 3/5（即 0.6）。',
    typicalErrors: ['把比值写成 5:3'],
  },
  {
    kpCodes: ['MATH-P-0202'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: '路程一定时，速度与时间成（  ）',
    options: ['A. 正比例', 'B. 反比例', 'C. 不成比例', 'D. 无法判断'],
    answer: 'B',
    analysis: '速度 × 时间 = 路程（一定），乘积一定，故成反比例。',
    typicalErrors: ['与正比例混淆'],
  },
  {
    kpCodes: ['MATH-P-0202'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: '单价一定时，总价与数量成（  ）',
    options: ['A. 正比例', 'B. 反比例', 'C. 不成比例', 'D. 无法判断'],
    answer: 'A',
    analysis: '总价 ÷ 数量 = 单价（一定），比值一定，故成正比例。',
    typicalErrors: ['未判断「商一定」还是「积一定」'],
  },

  // ---------- 平面图形的周长与面积 ----------
  {
    kpCodes: ['MATH-P-0301'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '一个长方形长 8 厘米、宽 5 厘米，它的面积是 ______ 平方厘米',
    answer: '40',
    analysis: '长方形面积 = 长 × 宽 = 8 × 5 = 40。',
    typicalErrors: ['与周长公式混淆'],
  },
  {
    kpCodes: ['MATH-P-0301'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '一个三角形底 6 厘米、高 4 厘米，它的面积是 ______ 平方厘米',
    answer: '12',
    analysis: '三角形面积 = 底 × 高 ÷ 2 = 6 × 4 ÷ 2 = 12。',
    typicalErrors: ['忘记除以 2'],
  },
  {
    kpCodes: ['MATH-P-0301'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '一个平行四边形底 5 厘米、高 3 厘米，它的面积是 ______ 平方厘米',
    answer: '15',
    analysis: '平行四边形面积 = 底 × 高 = 5 × 3 = 15。',
    typicalErrors: ['误除以 2'],
  },

  // ---------- 长方体与正方体 ----------
  {
    kpCodes: ['MATH-P-0302'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '一个正方体的棱长是 3 厘米，它的表面积是 ______ 平方厘米',
    answer: '54',
    analysis: '正方体表面积 = 棱长 × 棱长 × 6 = 3 × 3 × 6 = 54。',
    typicalErrors: ['漏乘 6 个面'],
  },
  {
    kpCodes: ['MATH-P-0302'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '一个长方体长 4 厘米、宽 3 厘米、高 2 厘米，它的体积是 ______ 立方厘米',
    answer: '24',
    analysis: '长方体体积 = 长 × 宽 × 高 = 4 × 3 × 2 = 24。',
    typicalErrors: ['与表面积公式混淆'],
  },
  {
    kpCodes: ['MATH-P-0302'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '一个正方体的棱长是 2 厘米，它的体积是 ______ 立方厘米',
    answer: '8',
    analysis: '正方体体积 = 棱长³ = 2 × 2 × 2 = 8。',
    typicalErrors: ['误算成 2 × 3 = 6'],
  },

  // ---------- 圆 ----------
  {
    kpCodes: ['MATH-P-0303'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '在同一个圆里，直径是半径的（  ）',
    options: ['A. 2 倍', 'B. 一半', 'C. 相等', 'D. 4 倍'],
    answer: 'A',
    analysis: '同圆中直径 = 2 × 半径。',
    typicalErrors: ['与半径是直径的一半混淆'],
  },
  {
    kpCodes: ['MATH-P-0303'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '一个圆的半径是 3 厘米，它的周长是 ______ 厘米（π 取 3.14）',
    answer: '18.84',
    analysis: '圆的周长 C = 2πr = 2 × 3.14 × 3 = 18.84。',
    typicalErrors: ['误用面积公式', '漏乘 2'],
  },
  {
    kpCodes: ['MATH-P-0303'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '一个圆的半径是 2 厘米，它的面积是 ______ 平方厘米（π 取 3.14）',
    answer: '12.56',
    analysis: '圆的面积 S = πr² = 3.14 × 2 × 2 = 12.56。',
    typicalErrors: ['用 2πr 计算面积'],
  },

  // ---------- 平均数与统计图 ----------
  {
    kpCodes: ['MATH-P-0401'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '数据 2、4、6、8 的平均数是 ______',
    answer: '5',
    analysis: '平均数 = 总和 ÷ 个数 = (2+4+6+8) ÷ 4 = 5。',
    typicalErrors: ['漏加某个数或除错个数'],
  },
  {
    kpCodes: ['MATH-P-0401'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.UNDERSTAND,
    content: '要清楚地表示数量增减变化的情况，最适合用（  ）',
    options: ['A. 条形统计图', 'B. 折线统计图', 'C. 扇形统计图', 'D. 统计表'],
    answer: 'B',
    analysis: '折线统计图能直观反映数量的增减变化趋势。',
    typicalErrors: ['与条形统计图的作用混淆'],
  },

  // ---------- 可能性 ----------
  {
    kpCodes: ['MATH-P-0402'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '抛一枚质地均匀的硬币，正面朝上的可能性是 ______',
    answer: '1/2',
    analysis: '硬币只有正反两面且质地均匀，两种结果可能性相同，各为 1/2。',
    typicalErrors: ['误答「一定」或「不可能」'],
  },

  // ---------- 行程问题 ----------
  {
    kpCodes: ['MATH-P-0501'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '一辆汽车每小时行驶 60 千米，3 小时行驶 ______ 千米',
    answer: '180',
    analysis: '路程 = 速度 × 时间 = 60 × 3 = 180。',
    typicalErrors: ['公式记错，误算成 60 ÷ 3'],
  },
  {
    kpCodes: ['MATH-P-0501'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SHORT_ANSWER, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '甲、乙两人从相距 20 千米的两地同时出发相向而行，甲每小时走 4 千米，乙每小时走 6 千米。经过几小时两人相遇？',
    answer: '2 小时',
    analysis: '相遇问题：相遇时间 = 总路程 ÷ 速度和 = 20 ÷ (4 + 6) = 2（小时）。',
    typicalErrors: ['用速度差计算', '单位不统一'],
  },

  // ---------- 工程问题 ----------
  {
    kpCodes: ['MATH-P-0502'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SHORT_ANSWER, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: '一项工程，甲单独做要 10 天完成，乙单独做要 15 天完成。两人合作需要多少天完成？',
    answer: '6 天',
    analysis: '把工程量看作单位「1」，甲工效 1/10，乙工效 1/15，合作工效 1/10 + 1/15 = 1/6，故需 6 天。',
    typicalErrors: ['把工效当成具体数量而非分率', '通分计算错误'],
  },

  // ---------- 百分数应用题 ----------
  {
    kpCodes: ['MATH-P-0503'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '一件商品原价 200 元，打八折后的售价是 ______ 元',
    answer: '160',
    analysis: '打八折即按原价的 80% 出售：200 × 80% = 160。',
    typicalErrors: ['把八折理解为减去 80%'],
  },
  {
    kpCodes: ['MATH-P-0503'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '某班共有 50 人，其中男生 30 人，男生占全班的 ______ %',
    answer: '60',
    analysis: '30 ÷ 50 = 0.6 = 60%。',
    typicalErrors: ['用女生人数作分子'],
  },
  {
    kpCodes: ['MATH-P-0503'], subject: Subject.MATH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SHORT_ANSWER, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '把 1000 元存入银行，年利率为 2%，存一年可得到利息多少元？',
    answer: '20 元',
    analysis: '利息 = 本金 × 利率 × 时间 = 1000 × 2% × 1 = 20（元）。',
    typicalErrors: ['把年利率当成金额直接相加'],
  },
];