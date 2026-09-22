import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { SeedQuestion } from './types';

/** 初中数学 + 高中数学 种子题目 */
export const SEED_QUESTIONS_MATH: SeedQuestion[] = [
  // ---------- 有理数的概念 ----------
  {
    kpCodes: ['MATH-J-0101'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '下列各数中，是负数的是（  ）',
    options: ['A. 0', 'B. -3', 'C. |-2|', 'D. -(-5)'],
    answer: 'B',
    analysis: '|-2| = 2 是正数；-(-5) = 5 是正数；0 既不是正数也不是负数。只有 -3 是负数。',
    typicalErrors: ['化简绝对值与相反数时符号出错', '误认为 0 是负数'],
  },
  {
    kpCodes: ['MATH-J-0101'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '填空：-(-7) = ______',
    answer: '7',
    analysis: '负负得正，-(-7) = 7。',
    typicalErrors: ['符号化简错误，误答 -7'],
  },
  {
    kpCodes: ['MATH-J-0101'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.UNDERSTAND,
    content: '下列说法正确的是（  ）',
    options: ['A. 0 是最小的有理数', 'B. 有理数分为正有理数和负有理数', 'C. 0 既不是正数也不是负数', 'D. 负整数不属于有理数'],
    answer: 'C',
    analysis: '有理数按符号分为正有理数、0、负有理数三类，0 不可遗漏。没有最小的有理数。',
    typicalErrors: ['分类时遗漏 0', '误认为 0 是最小有理数'],
  },

  // ---------- 数轴与相反数 ----------
  {
    kpCodes: ['MATH-J-0102'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '数轴上表示 -2 的点与原点的距离是（  ）',
    options: ['A. -2', 'B. 2', 'C. 0', 'D. 1/2'],
    answer: 'B',
    analysis: '距离是非负数，表示 -2 的点到原点距离为 2。',
    typicalErrors: ['把距离写成负数'],
  },
  {
    kpCodes: ['MATH-J-0102'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.UNDERSTAND,
    content: '若 a 与 b 互为相反数，则 a + b = ______',
    answer: '0',
    analysis: '互为相反数的两个数之和为 0。',
    typicalErrors: ['与倒数概念混淆'],
  },
  {
    kpCodes: ['MATH-J-0102'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '数轴上点 A 表示 -3，将点 A 向右移动 5 个单位长度后，表示的数是（  ）',
    options: ['A. -8', 'B. 2', 'C. -2', 'D. 8'],
    answer: 'B',
    analysis: '-3 + 5 = 2，向右移动即加上移动的长度。',
    typicalErrors: ['左右移动与加减符号对应关系搞反'],
  },

  // ---------- 绝对值 ----------
  {
    kpCodes: ['MATH-J-0103'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '|-5| = （  ）',
    options: ['A. -5', 'B. 5', 'C. 0', 'D. ±5'],
    answer: 'B',
    analysis: '绝对值表示到原点的距离，|-5| = 5。',
    typicalErrors: ['误把绝对值当作相反数'],
  },
  {
    kpCodes: ['MATH-J-0103'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '若 |x| = 3，则 x = ______',
    answer: '±3',
    analysis: '绝对值为 3 的数有两个：3 和 -3。',
    typicalErrors: ['只答 3，漏掉负解'],
  },
  {
    kpCodes: ['MATH-J-0103'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: '若 |a| = -a，则 a 一定是（  ）',
    options: ['A. 正数', 'B. 负数', 'C. 非正数', 'D. 非负数'],
    answer: 'C',
    analysis: '|a| 是非负数，故 -a ≥ 0，即 a ≤ 0，a 为非正数（含 0）。',
    typicalErrors: ['忽略 a = 0 的情况，误选 B'],
  },

  // ---------- 有理数的加减运算 ----------
  {
    kpCodes: ['MATH-J-0104'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '计算：(-3) + 5 = ______',
    answer: '2',
    analysis: '异号两数相加，取绝对值较大数的符号，并用较大绝对值减去较小绝对值：5 - 3 = 2。',
    typicalErrors: ['符号判定错误'],
  },
  {
    kpCodes: ['MATH-J-0104'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：(-7) - (-2) = ______',
    answer: '-5',
    analysis: '减去一个数等于加上它的相反数：-7 + 2 = -5。',
    typicalErrors: ['减负数时未转化为加法，误答 -9'],
  },
  {
    kpCodes: ['MATH-J-0104'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算 -6 + 2 - (-3) 的结果是（  ）',
    options: ['A. -1', 'B. -7', 'C. 5', 'D. 11'],
    answer: 'A',
    analysis: '-6 + 2 = -4；-4 - (-3) = -4 + 3 = -1。',
    typicalErrors: ['运算顺序或符号处理错误'],
  },

  // ---------- 有理数的乘除与乘方 ----------
  {
    kpCodes: ['MATH-J-0105'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '计算：(-2) × 3 = ______',
    answer: '-6',
    analysis: '异号相乘得负。',
    typicalErrors: ['符号处理错误'],
  },
  {
    kpCodes: ['MATH-J-0105'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：(-2)³ = ______',
    answer: '-8',
    analysis: '(-2)³ = (-2)×(-2)×(-2) = -8，负数的奇次幂为负。',
    typicalErrors: ['与 -2³ 混淆，或误答 8'],
  },
  {
    kpCodes: ['MATH-J-0105'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: '下列运算正确的是（  ）',
    options: ['A. (-2)² = -4', 'B. -2² = 4', 'C. (-2)³ = -8', 'D. (-1)¹⁰⁰ = -1'],
    answer: 'C',
    analysis: '(-2)² = 4；-2² = -(2²) = -4；(-1)¹⁰⁰ = 1。故只有 C 正确。',
    typicalErrors: ['分不清 (-2)² 与 -2² 的区别', '偶数次幂符号判断错误'],
  },

  // ---------- 单项式与多项式 ----------
  {
    kpCodes: ['MATH-J-0201'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '单项式 -3x²y 的系数是（  ）',
    options: ['A. 3', 'B. -3', 'C. -3x²', 'D. 2'],
    answer: 'B',
    analysis: '单项式的系数包含符号，即 -3。',
    typicalErrors: ['漏掉负号'],
  },
  {
    kpCodes: ['MATH-J-0201'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.UNDERSTAND,
    content: '多项式 2x² - 3x + 1 的次数是 ______',
    answer: '2',
    analysis: '多项式的次数是次数最高项的次数，2x² 的次数为 2。',
    typicalErrors: ['误答为项数 3'],
  },

  // ---------- 合并同类项 ----------
  {
    kpCodes: ['MATH-J-0202'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：3a - 5a = ______',
    answer: '-2a',
    analysis: '同类项系数相减，字母部分不变：(3-5)a = -2a。',
    typicalErrors: ['只算系数丢掉字母'],
  },
  {
    kpCodes: ['MATH-J-0202'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: '下列各组中，是同类项的是（  ）',
    options: ['A. 2x²y 与 2xy²', 'B. -3ab 与 5ba', 'C. 2a 与 2a²', 'D. x 与 y'],
    answer: 'B',
    analysis: '同类项要求所含字母相同且相同字母的指数也相同，与系数无关。5ba 与 -3ab 字母及指数完全一致。',
    typicalErrors: ['只看系数不看字母指数'],
  },

  // ---------- 幂的运算性质 ----------
  {
    kpCodes: ['MATH-J-0203'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'a³ · a² = （  ）',
    options: ['A. a⁵', 'B. a⁶', 'C. 2a⁵', 'D. a⁹'],
    answer: 'A',
    analysis: '同底数幂相乘，底数不变，指数相加：a³⁺² = a⁵。',
    typicalErrors: ['指数相乘误答 a⁶'],
  },
  {
    kpCodes: ['MATH-J-0203'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：(x²)³ = ______',
    answer: 'x⁶',
    analysis: '幂的乘方，底数不变，指数相乘：2×3 = 6。',
    typicalErrors: ['与同底数幂相乘混淆，误答 x⁵'],
  },
  {
    kpCodes: ['MATH-J-0203'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: '下列计算正确的是（  ）',
    options: ['A. a²·a³ = a⁶', 'B. (a²)³ = a⁵', 'C. a⁶ ÷ a² = a³', 'D. (ab)² = a²b²'],
    answer: 'D',
    analysis: '积的乘方等于各因式分别乘方，(ab)² = a²b²。其余：A 应为 a⁵，B 应为 a⁶，C 应为 a⁴。',
    typicalErrors: ['混淆同底数幂相乘、幂的乘方、同底数幂相除三条性质'],
  },

  // ---------- 乘法公式 ----------
  {
    kpCodes: ['MATH-J-0204'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '计算：(x + 2)(x - 2) = ______',
    answer: 'x² - 4',
    analysis: '平方差公式 (a+b)(a-b) = a² - b²。',
    typicalErrors: ['漏写中间项或误用完全平方公式'],
  },
  {
    kpCodes: ['MATH-J-0204'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.MEMORY,
    content: '(a + b)² = （  ）',
    options: ['A. a² + b²', 'B. a² + 2ab + b²', 'C. a² - 2ab + b²', 'D. a² + ab + b²'],
    answer: 'B',
    analysis: '完全平方公式中间项为 2ab。',
    typicalErrors: ['漏掉中间项 2ab'],
  },

  // ---------- 一元一次方程的概念 ----------
  {
    kpCodes: ['MATH-J-0301'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.UNDERSTAND,
    content: '下列方程中是一元一次方程的是（  ）',
    options: ['A. x² = 1', 'B. 2x + 1 = 5', 'C. x + y = 3', 'D. 1/x = 2'],
    answer: 'B',
    analysis: '一元一次方程需满足：只含一个未知数、未知数次数为 1、且是整式方程。',
    typicalErrors: ['忽略「整式方程」条件，误选 D'],
  },
  {
    kpCodes: ['MATH-J-0301'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '若 x = 2 是方程 3x - a = 4 的解，则 a = ______',
    answer: '2',
    analysis: '代入得 3×2 - a = 4，即 6 - a = 4，解得 a = 2。',
    typicalErrors: ['代入时符号出错'],
  },

  // ---------- 等式性质与移项 ----------
  {
    kpCodes: ['MATH-J-0302'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '解方程 2x + 3 = 11，则 x = ______',
    answer: '4',
    analysis: '移项得 2x = 11 - 3 = 8，两边同除以 2 得 x = 4。',
    typicalErrors: ['移项忘记变号'],
  },
  {
    kpCodes: ['MATH-J-0302'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.UNDERSTAND,
    content: '由 3x = 2x + 5 得到 3x - 2x = 5，这一步的依据是（  ）',
    options: ['A. 等式性质 1（两边同加同减）', 'B. 等式性质 2（两边同乘同除）', 'C. 乘法分配律', 'D. 加法结合律'],
    answer: 'A',
    analysis: '两边同时减去 2x，属于等式性质 1。',
    typicalErrors: ['混淆等式两条性质'],
  },

  // ---------- 去括号与去分母 ----------
  {
    kpCodes: ['MATH-J-0303'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '方程 2(x - 1) = 4 的解是 x = ______',
    answer: '3',
    analysis: '去括号得 2x - 2 = 4，移项得 2x = 6，故 x = 3。',
    typicalErrors: ['去括号时漏乘常数项'],
  },
  {
    kpCodes: ['MATH-J-0303'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.APPLY,
    content: '方程 x/2 - 1 = 1 的解是 x = ______',
    answer: '4',
    analysis: '移项得 x/2 = 2，两边同乘 2 得 x = 4。',
    typicalErrors: ['去分母时漏乘不含分母的项'],
  },

  // ---------- 一元一次方程的应用 ----------
  {
    kpCodes: ['MATH-J-0304'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SHORT_ANSWER, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '某班共有学生 45 人，其中男生比女生多 5 人。求女生人数。',
    answer: '女生 20 人',
    analysis: '设女生 x 人，则男生 (x+5) 人，列方程 x + (x+5) = 45，解得 2x = 40，x = 20。',
    typicalErrors: ['设元后等量关系找错', '解方程后忘记回答实际问题'],
  },
  {
    kpCodes: ['MATH-J-0304'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SHORT_ANSWER, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: '一件商品按成本加价 40% 标价，再打 8 折出售，售价为 224 元。求这件商品的成本。',
    answer: '成本 200 元',
    analysis: '设成本 x 元，标价 1.4x 元，售价 1.4x × 0.8 = 1.12x = 224，解得 x = 200。',
    typicalErrors: ['把「加价 40%」理解为乘以 0.4', '打折与标价的基数关系搞错'],
  },

  // ---------- 相交线与对顶角 ----------
  {
    kpCodes: ['MATH-J-0401'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '两条直线相交所成的对顶角的关系是（  ）',
    options: ['A. 互余', 'B. 互补', 'C. 相等', 'D. 不确定'],
    answer: 'C',
    analysis: '对顶角相等。',
    typicalErrors: ['与邻补角概念混淆'],
  },
  {
    kpCodes: ['MATH-J-0401'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '若一个角是 35°，则它的余角是 ______ 度',
    answer: '55',
    analysis: '两角互余则和为 90°，90° - 35° = 55°。',
    typicalErrors: ['与补角（和为 180°）混淆'],
  },

  // ---------- 平行线 ----------
  {
    kpCodes: ['MATH-J-0402'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.UNDERSTAND,
    content: '两直线平行，同位角的关系是（  ）',
    options: ['A. 相等', 'B. 互补', 'C. 互余', 'D. 不确定'],
    answer: 'A',
    analysis: '两直线平行，同位角相等。',
    typicalErrors: ['与同旁内角互补混淆'],
  },
  {
    kpCodes: ['MATH-J-0402'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.MEMORY,
    content: '两直线平行，同旁内角 ______（填「相等」或「互补」）',
    answer: '互补',
    analysis: '两直线平行，同旁内角互补（和为 180°）。',
    typicalErrors: ['与同位角相等混淆'],
  },

  // ---------- 三角形 ----------
  {
    kpCodes: ['MATH-J-0403'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '三角形的内角和是（  ）',
    options: ['A. 90°', 'B. 180°', 'C. 270°', 'D. 360°'],
    answer: 'B',
    analysis: '三角形内角和为 180°。',
    typicalErrors: ['与四边形内角和 360° 混淆'],
  },
  {
    kpCodes: ['MATH-J-0403'], subject: Subject.MATH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '三角形两边长分别为 3 和 5，则第三边 x 的取值范围是 ______',
    answer: '2 < x < 8',
    analysis: '由三角形三边关系：两边之差 < 第三边 < 两边之和，即 5-3 < x < 5+3。',
    typicalErrors: ['只考虑两边之和，遗漏两边之差'],
  },

  // ==================== 高中数学 ====================
  {
    kpCodes: ['MATH-S-0101'], subject: Subject.MATH, stage: StudyStage.SENIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '设集合 A = {1, 2, 3}，B = {2, 3, 4}，则 A ∩ B = （  ）',
    options: ['A. {1, 2, 3, 4}', 'B. {2, 3}', 'C. {1, 4}', 'D. ∅'],
    answer: 'B',
    analysis: '交集取两个集合的公共元素，即 {2, 3}。',
    typicalErrors: ['交集与并集符号混淆'],
  },
  {
    kpCodes: ['MATH-S-0101'], subject: Subject.MATH, stage: StudyStage.SENIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '设集合 A = {1, 2}，B = {2, 3}，则 A ∪ B = ______',
    answer: '{1, 2, 3}',
    analysis: '并集取两个集合的所有元素，重复元素只计一次。',
    typicalErrors: ['重复元素重复书写'],
  },
  {
    kpCodes: ['MATH-S-0102'], subject: Subject.MATH, stage: StudyStage.SENIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.UNDERSTAND,
    content: '函数 f(x) = 1/(x - 2) 的定义域是（  ）',
    options: ['A. x ≠ 0', 'B. x ≠ 2', 'C. x > 2', 'D. 全体实数'],
    answer: 'B',
    analysis: '分母不为零，故 x - 2 ≠ 0，即 x ≠ 2。',
    typicalErrors: ['只考虑分子，忽略分母限制'],
  },
  {
    kpCodes: ['MATH-S-0103'], subject: Subject.MATH, stage: StudyStage.SENIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: '函数 f(x) = x² 在区间 (0, +∞) 上是（  ）',
    options: ['A. 增函数', 'B. 减函数', 'C. 先增后减', 'D. 常函数'],
    answer: 'A',
    analysis: '在 (0, +∞) 上任取 x₁ < x₂，则 x₁² < x₂²，故为增函数。',
    typicalErrors: ['忽略所给区间，直接凭抛物线图形判断'],
  },
  {
    kpCodes: ['MATH-S-0201'], subject: Subject.MATH, stage: StudyStage.SENIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '把 60° 化为弧度是 ______',
    answer: 'π/3',
    analysis: '180° = π 弧度，故 60° = 60 × π/180 = π/3。',
    typicalErrors: ['角度与弧度换算比倒置'],
  },
  {
    kpCodes: ['MATH-S-0202'], subject: Subject.MATH, stage: StudyStage.SENIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.MEMORY,
    content: '填空：sin²α + cos²α = ______',
    answer: '1',
    analysis: '同角三角函数基本关系式。',
    typicalErrors: ['与 tanα = sinα/cosα 混淆'],
  },
];