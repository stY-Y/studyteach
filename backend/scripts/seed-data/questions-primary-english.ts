import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { SeedQuestion } from './types';

/** 小学英语（小学高段）种子题目 */
export const SEED_QUESTIONS_PRIMARY_ENGLISH: SeedQuestion[] = [
  // ---------- 名词单复数 ----------
  {
    kpCodes: ['ENG-P-0101'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '用所给词的适当形式填空：I have two ______ (apple).',
    answer: 'apples',
    analysis: 'two 后接可数名词复数，apple 直接加 -s。',
    typicalErrors: ['忽略数词 two，仍用单数'],
  },
  {
    kpCodes: ['ENG-P-0101'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '用所给词的适当形式填空：There are five ______ (box) on the floor.',
    answer: 'boxes',
    analysis: '以 x、s、sh、ch 结尾的名词变复数加 -es。',
    typicalErrors: ['直接加 -s 写成 boxs'],
  },
  {
    kpCodes: ['ENG-P-0101'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: 'There are many ______ in the library.',
    options: ['A. book', 'B. books', 'C. bookes', 'D. a book'],
    answer: 'B',
    analysis: 'many 修饰可数名词复数，book 加 -s 变为 books。',
    typicalErrors: ['在 many 后仍用单数'],
  },

  // ---------- 数词 ----------
  {
    kpCodes: ['ENG-P-0102'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.MEMORY,
    content: '用英语写出数字 12：______',
    answer: 'twelve',
    analysis: '12 的英文是 twelve（注意不是 twelth）。',
    typicalErrors: ['拼写错误，写成 twelth 或 twelf'],
  },
  {
    kpCodes: ['ENG-P-0102'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'There are ______ months in a year.',
    options: ['A. twelve', 'B. twelfth', 'C. twelveth', 'D. the twelve'],
    answer: 'A',
    analysis: '表示数量用基数词 twelve；twelfth 是序数词「第十二」。',
    typicalErrors: ['基数词与序数词混用'],
  },

  // ---------- 常见介词 ----------
  {
    kpCodes: ['ENG-P-0103'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '填空：The book is ______ the desk.（书在桌子上）',
    answer: 'on',
    analysis: '表示「在……表面上」用介词 on。',
    typicalErrors: ['与 in（在……里面）混淆'],
  },
  {
    kpCodes: ['ENG-P-0103'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'I go to school ______ bus every day.',
    options: ['A. by', 'B. on', 'C. in', 'D. at'],
    answer: 'A',
    analysis: '「乘某种交通工具」用 by + 交通工具（不加冠词）：by bus。',
    typicalErrors: ['误用 on bus 或 by a bus'],
  },

  // ---------- 一般现在时 ----------
  {
    kpCodes: ['ENG-P-0201'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '用所给词的适当形式填空：He ______ (like) apples very much.',
    answer: 'likes',
    analysis: '主语 He 是第三人称单数，一般现在时动词加 -s。',
    typicalErrors: ['用动词原形 like'],
  },
  {
    kpCodes: ['ENG-P-0201'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'We ______ TV every evening.',
    options: ['A. watch', 'B. watches', 'C. watching', 'D. watched'],
    answer: 'A',
    analysis: '主语 We 为复数，一般现在时用动词原形；every evening 表示经常性动作。',
    typicalErrors: ['误加 -es'],
  },

  // ---------- 现在进行时 ----------
  {
    kpCodes: ['ENG-P-0202'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '用所给词的适当形式填空：Look! She ______ (read) a book.',
    answer: 'is reading',
    analysis: 'Look! 提示动作正在发生，用现在进行时 be + doing，主语 She 用 is。',
    typicalErrors: ['漏掉 be 动词，只写 reading'],
  },
  {
    kpCodes: ['ENG-P-0202'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'They ______ football on the playground now.',
    options: ['A. play', 'B. are playing', 'C. played', 'D. will play'],
    answer: 'B',
    analysis: 'now 是现在进行时的标志词，主语 They 用 are + playing。',
    typicalErrors: ['忽略 now，误用一般现在时'],
  },

  // ---------- 一般将来时 ----------
  {
    kpCodes: ['ENG-P-0203'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '填空：I ______ going to visit my grandma tomorrow.（填 be 动词）',
    answer: 'am',
    analysis: 'be going to 结构中，主语 I 对应 be 动词 am。',
    typicalErrors: ['误填 is 或 are'],
  },
  {
    kpCodes: ['ENG-P-0203'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'We ______ have a party next week.',
    options: ['A. will', 'B. are', 'C. did', 'D. was'],
    answer: 'A',
    analysis: 'next week 表示将来，will + 动词原形构成一般将来时。',
    typicalErrors: ['将 will 与 be going to 结构混用'],
  },

  // ---------- 一般过去时 ----------
  {
    kpCodes: ['ENG-P-0204'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '用所给词的适当形式填空：I ______ (go) to the park yesterday.',
    answer: 'went',
    analysis: 'yesterday 表示过去，go 的过去式是 went（不规则变化）。',
    typicalErrors: ['误写 goed'],
  },
  {
    kpCodes: ['ENG-P-0204'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'She ______ a birthday cake last Sunday.',
    options: ['A. make', 'B. made', 'C. makes', 'D. is making'],
    answer: 'B',
    analysis: 'last Sunday 表示过去，make 的过去式为 made。',
    typicalErrors: ['忽略时间状语，用一般现在时'],
  },

  // ---------- There be 句型 ----------
  {
    kpCodes: ['ENG-P-0301'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '填空：There ______ a book on the desk.（填 is / are）',
    answer: 'is',
    analysis: 'There be 句型遵循就近原则，a book 为单数，用 is。',
    typicalErrors: ['误用 are'],
  },
  {
    kpCodes: ['ENG-P-0301'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '填空：There ______ two apples in the bag.（填 is / are）',
    answer: 'are',
    analysis: 'two apples 为复数，be 动词用 are。',
    typicalErrors: ['只看最近的名词单复数出错'],
  },
  {
    kpCodes: ['ENG-P-0301'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: '______ there any water in the glass?',
    options: ['A. Is', 'B. Are', 'C. Do', 'D. Does'],
    answer: 'A',
    analysis: 'water 是不可数名词，be 动词用 is；变疑问句时 is 提前。',
    typicalErrors: ['误把 water 当可数名词用 are'],
  },

  // ---------- 疑问句 ----------
  {
    kpCodes: ['ENG-P-0302'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '填空：______ is your name?（对姓名提问）',
    answer: 'What',
    analysis: '询问姓名用 What is your name?',
    typicalErrors: ['与 How、Who 混淆'],
  },
  {
    kpCodes: ['ENG-P-0302'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '填空：______ old are you?（对年龄提问）',
    answer: 'How',
    analysis: '询问年龄用 How old are you?',
    typicalErrors: ['误用 What'],
  },
  {
    kpCodes: ['ENG-P-0302'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.ANALYZE,
    content: '— ______ do you go to school?  — By bike.',
    options: ['A. What', 'B. How', 'C. Where', 'D. When'],
    answer: 'B',
    analysis: '答语 By bike 表示方式，故用 How 提问。',
    typicalErrors: ['根据 school 误选 Where'],
  },

  // ---------- 祈使句 ----------
  {
    kpCodes: ['ENG-P-0303'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '填空：______ the door, please.（关上门）',
    answer: 'Close',
    analysis: '祈使句以动词原形开头，故用 Close。',
    typicalErrors: ['误用 Closing 或 To close'],
  },
  {
    kpCodes: ['ENG-P-0303'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '______ run in the classroom!',
    options: ['A. Not', 'B. Don\'t', 'C. No', 'D. Doesn\'t'],
    answer: 'B',
    analysis: '否定祈使句用 Don\'t + 动词原形。',
    typicalErrors: ['误用 No run 或 Not run'],
  },

  // ---------- 日常问候与介绍 ----------
  {
    kpCodes: ['ENG-P-0401'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: '— How are you?  — ______',
    options: ['A. I\'m fine, thank you.', 'B. Yes, I am.', 'C. You\'re welcome.', 'D. Goodbye.'],
    answer: 'A',
    analysis: 'How are you? 是询问身体状况的问候语，应答 I\'m fine, thank you.',
    typicalErrors: ['用 Yes/No 回答特殊疑问句'],
  },
  {
    kpCodes: ['ENG-P-0401'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '— Nice to meet you.  — ______',
    options: ['A. Nice to meet you, too.', 'B. Thank you very much.', 'C. I\'m sorry.', 'D. See you.'],
    answer: 'A',
    analysis: '初次见面的固定应答为 Nice to meet you, too.',
    typicalErrors: ['用 Thank you 回应'],
  },

  // ---------- 问路与指路 ----------
  {
    kpCodes: ['ENG-P-0402'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '— ______ is the library?  — It\'s next to the bank.',
    options: ['A. What', 'B. Where', 'C. When', 'D. Who'],
    answer: 'B',
    analysis: '答语指路，故问句用 Where 询问地点。',
    typicalErrors: ['对地点提问误用 What'],
  },
  {
    kpCodes: ['ENG-P-0402'], subject: Subject.ENGLISH, stage: StudyStage.PRIMARY_HIGH,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '填空：Go ______ ahead, and then turn left.（一直向前走）',
    answer: 'straight',
    analysis: 'go straight ahead 意为「一直向前走」，是问路指路的常用表达。',
    typicalErrors: ['拼写错误，写成 strait'],
  },
];