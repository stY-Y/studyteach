import {
  AbilityRequirement,
  DifficultyLevel,
  QuestionType,
  StudyStage,
  Subject,
} from '@teachstudy/shared';
import { SeedQuestion } from './types';

/** 初中英语扩充题目（时态 / 被动语态 / 从句 / 情态动词 / 冠词介词代词） */
export const SEED_QUESTIONS_JUNIOR_ENGLISH_EXTRA: SeedQuestion[] = [
  // ---------- 一般将来时 ----------
  {
    kpCodes: ['ENG-J-0104'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '用所给词的适当形式填空：I ______ (visit) my uncle next week.',
    answer: 'will visit',
    analysis: 'next week 表示将来，用 will + 动词原形（也可用 am going to visit）。',
    typicalErrors: ['用一般现在时或过去时'],
  },
  {
    kpCodes: ['ENG-J-0104'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: 'There ______ a sports meeting in our school tomorrow.',
    options: ['A. will be', 'B. will have', 'C. is going to have', 'D. was'],
    answer: 'A',
    analysis: 'There be 句型的将来时为 there will be，不能与 have 连用。',
    typicalErrors: ['受汉语影响写成 there will have（高频错误）'],
  },

  // ---------- 现在进行时 ----------
  {
    kpCodes: ['ENG-J-0105'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '用所给词的适当形式填空：Listen! Someone ______ (sing) in the next room.',
    answer: 'is singing',
    analysis: 'Listen! 提示动作正在进行，用现在进行时 is + singing。',
    typicalErrors: ['漏掉 be 动词'],
  },
  {
    kpCodes: ['ENG-J-0105'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'Look! The children ______ in the park.',
    options: ['A. play', 'B. are playing', 'C. played', 'D. have played'],
    answer: 'B',
    analysis: 'Look! 提示动作正在进行，用现在进行时。',
    typicalErrors: ['忽略提示词，误用一般现在时'],
  },

  // ---------- 过去进行时 ----------
  {
    kpCodes: ['ENG-J-0106'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: 'I ______ my homework at eight o\'clock last night.',
    options: ['A. do', 'B. did', 'C. was doing', 'D. am doing'],
    answer: 'C',
    analysis: 'at eight o\'clock last night 表示过去某一时刻正在进行的动作，用过去进行时。',
    typicalErrors: ['与一般过去时混淆'],
  },
  {
    kpCodes: ['ENG-J-0106'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.APPLY,
    content: '用所给词的适当形式填空：They ______ (watch) TV when I came in.',
    answer: 'were watching',
    analysis: 'when 引导的从句用一般过去时，主句表示当时正在进行的动作，用过去进行时。',
    typicalErrors: ['主语是 They 却用 was watching'],
  },

  // ---------- 被动语态 ----------
  {
    kpCodes: ['ENG-J-0107'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: 'The classroom ______ every day.',
    options: ['A. cleans', 'B. is cleaned', 'C. cleaned', 'D. is cleaning'],
    answer: 'B',
    analysis: '教室是被打扫的，主语是动作承受者，用一般现在时被动语态 is + 过去分词。',
    typicalErrors: ['用主动语态（受汉语表达习惯影响）'],
  },
  {
    kpCodes: ['ENG-J-0107'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.APPLY,
    content: '用所给词的适当形式填空：English ______ (speak) in many countries.',
    answer: 'is spoken',
    analysis: 'English 是被使用的语言，用一般现在时被动语态。',
    typicalErrors: ['过去分词形式写错'],
  },

  // ---------- 宾语从句 ----------
  {
    kpCodes: ['ENG-J-0301'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: 'Do you know ______?',
    options: ['A. where is he', 'B. where he is', 'C. where does he live', 'D. where he does live'],
    answer: 'B',
    analysis: '宾语从句必须用陈述语序，即「引导词 + 主语 + 谓语」。',
    typicalErrors: ['沿用疑问语序（最高频错误）'],
  },
  {
    kpCodes: ['ENG-J-0301'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: 'He said that he ______ busy at that time.',
    options: ['A. is', 'B. was', 'C. are', 'D. will be'],
    answer: 'B',
    analysis: '主句为过去时，宾语从句时态需相应后移，is 变为 was。',
    typicalErrors: ['从句时态与主句不一致'],
  },

  // ---------- 定语从句 ----------
  {
    kpCodes: ['ENG-J-0302'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: 'The man ______ is talking with my father is our headmaster.',
    options: ['A. which', 'B. who', 'C. whose', 'D. where'],
    answer: 'B',
    analysis: '先行词 The man 指人，且在从句中作主语，用关系代词 who。',
    typicalErrors: ['指人时误用 which'],
  },
  {
    kpCodes: ['ENG-J-0302'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: 'This is the book ______ I bought yesterday.',
    options: ['A. who', 'B. whose', 'C. which', 'D. where'],
    answer: 'C',
    analysis: '先行词 the book 指物，在从句中作宾语，用关系代词 which（或 that）。',
    typicalErrors: ['指物时误用 who'],
  },

  // ---------- 状语从句 ----------
  {
    kpCodes: ['ENG-J-0303'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'I will call you ______ I arrive in Beijing.',
    options: ['A. when', 'B. what', 'C. that', 'D. which'],
    answer: 'A',
    analysis: 'when 引导时间状语从句，意为「当……的时候」。',
    typicalErrors: ['与宾语从句引导词混淆'],
  },
  {
    kpCodes: ['ENG-J-0303'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '______ it rains tomorrow, we will stay at home.',
    options: ['A. If', 'B. Though', 'C. Because', 'D. So'],
    answer: 'A',
    analysis: 'if 引导条件状语从句。注意「主将从现」：主句用将来时，从句用一般现在时。',
    typicalErrors: ['违反「主将从现」原则，从句用 will rain'],
  },

  // ---------- 情态动词 ----------
  {
    kpCodes: ['ENG-J-0401'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'You ______ be careful when you cross the road.',
    options: ['A. must', 'B. can', 'C. may', 'D. need'],
    answer: 'A',
    analysis: 'must 表示「必须」，用于表达强烈的建议或要求。',
    typicalErrors: ['情态动词后误加 to'],
  },
  {
    kpCodes: ['ENG-J-0401'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: '— Must I finish the work now?  — No, you ______.',
    options: ['A. mustn\'t', 'B. needn\'t', 'C. can\'t', 'D. shouldn\'t'],
    answer: 'B',
    analysis: 'must 引导的疑问句，否定回答用 needn\'t（不必），不能用 mustn\'t（禁止）。',
    typicalErrors: ['用 mustn\'t 回答（高频错误）'],
  },
  {
    kpCodes: ['ENG-J-0401'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'He ______ swim very well when he was five.',
    options: ['A. can', 'B. could', 'C. must', 'D. may'],
    answer: 'B',
    analysis: '表示过去的能力用 can 的过去式 could。',
    typicalErrors: ['用 can 表示过去能力'],
  },

  // ---------- 动词不定式 ----------
  {
    kpCodes: ['ENG-J-0402'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.FILL_BLANK, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '用所给词的适当形式填空：I want ______ (go) shopping this afternoon.',
    answer: 'to go',
    analysis: 'want 后接动词不定式 to do。',
    typicalErrors: ['写成 going 或 go'],
  },
  {
    kpCodes: ['ENG-J-0402'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'She asked me ______ her with the housework.',
    options: ['A. help', 'B. to help', 'C. helping', 'D. helped'],
    answer: 'B',
    analysis: 'ask sb. to do sth. 是固定搭配。',
    typicalErrors: ['漏掉 to'],
  },

  // ---------- 冠词 ----------
  {
    kpCodes: ['ENG-J-0203'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'I have ______ apple and a banana for breakfast.',
    options: ['A. a', 'B. an', 'C. the', 'D. /'],
    answer: 'B',
    analysis: 'apple 以元音音素开头，不定冠词用 an。',
    typicalErrors: ['只按字母判断，忽略发音'],
  },
  {
    kpCodes: ['ENG-J-0203'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: '______ sun rises in the east.',
    options: ['A. A', 'B. An', 'C. The', 'D. /'],
    answer: 'C',
    analysis: '世界上独一无二的事物前用定冠词 the。',
    typicalErrors: ['漏掉定冠词'],
  },

  // ---------- 介词 ----------
  {
    kpCodes: ['ENG-J-0204'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'My birthday is ______ May 1st.',
    options: ['A. in', 'B. on', 'C. at', 'D. for'],
    answer: 'B',
    analysis: '具体到某一天（含日期）用 on；泛指月份用 in。',
    typicalErrors: ['用 in May 1st（具体日期误用 in）'],
  },
  {
    kpCodes: ['ENG-J-0204'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.MEDIUM, ability: AbilityRequirement.APPLY,
    content: 'He is very good ______ English.',
    options: ['A. at', 'B. in', 'C. on', 'D. for'],
    answer: 'A',
    analysis: 'be good at 是固定搭配，意为「擅长」。',
    typicalErrors: ['受汉语影响误用 in'],
  },

  // ---------- 代词 ----------
  {
    kpCodes: ['ENG-J-0205'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.EASY, ability: AbilityRequirement.APPLY,
    content: 'This is ______ English book.',
    options: ['A. I', 'B. my', 'C. me', 'D. mine'],
    answer: 'B',
    analysis: '名词 book 前需要形容词性物主代词 my。',
    typicalErrors: ['用名词性物主代词 mine 修饰名词'],
  },
  {
    kpCodes: ['ENG-J-0205'], subject: Subject.ENGLISH, stage: StudyStage.JUNIOR,
    type: QuestionType.SINGLE_CHOICE, difficulty: DifficultyLevel.HARD, ability: AbilityRequirement.ANALYZE,
    content: 'The red bag is ______, and the blue one is mine.',
    options: ['A. her', 'B. hers', 'C. she', 'D. herself'],
    answer: 'B',
    analysis: '此处需名词性物主代词作表语，hers 相当于 her bag。',
    typicalErrors: ['用形容词性物主代词 her 单独作表语'],
  },
];