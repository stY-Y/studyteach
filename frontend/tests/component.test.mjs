/**
 * 组件渲染测试：SSR 渲染学生端答题与结果组件
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) { pass += 1; console.log('  PASS  ' + name); }
  else { fail += 1; console.log('  FAIL  ' + name); }
};
const has = (html, s) => html.includes(s);

async function render(comp, props) {
  const app = createSSRApp({ render: () => h(comp, props) });
  app.config.warnHandler = () => {};
  return renderToString(app);
}

// 取自种子题库的真实题目形态
const QUESTIONS = [
  { id: 'q1', subject: 'math', stage: 'junior', type: 'single_choice', difficulty: 'easy', ability: 'memory',
    knowledgePoints: ['kp1'], content: '下列各数中，是负数的是（  ）',
    options: ['A. 0', 'B. -3', 'C. |-2|', 'D. -(-5)'] },
  { id: 'q2', subject: 'math', stage: 'junior', type: 'multiple_choice', difficulty: 'medium', ability: 'analyze',
    knowledgePoints: ['kp2'], content: '下列说法正确的是（  ）',
    options: ['A. 0 是最小的有理数', 'B. 有理数分为正有理数和负有理数'] },
  { id: 'q3', subject: 'math', stage: 'junior', type: 'fill_blank', difficulty: 'medium', ability: 'apply',
    knowledgePoints: ['kp3'], content: '计算：(-7) - (-2) = ______' },
];
const RESULT = {
  recordId: 'r1',
  stats: { total: 3, correct: 1, wrong: 2, unanswered: 0, accuracy: 0.3333 },
  weakPoints: [
    { knowledgePointId: 'uuid-1', mastery: 0.35, reason: '检测题正确率偏低，存在概念混淆' },
    { knowledgePointId: 'uuid-2', mastery: 0.8, reason: '基本掌握，个别步骤易错' },
  ],
  learningPath: ['先复习「绝对值」基础概念', '再练习 5 道同类题'],
  review: [
    { questionId: 'q1', type: 'single_choice', difficulty: 'easy',
      content: '下列各数中，是负数的是（  ）',
      options: ['A. 0', 'B. -3', 'C. |-2|', 'D. -(-5)'], knowledgePoints: ['uuid-1'],
      studentAnswer: 'A', correctAnswer: 'B', isCorrect: false,
      analysis: '|-2| = 2 是正数；0 既不是正数也不是负数。',
      typicalErrors: ['化简绝对值与相反数时符号出错'] },
    { questionId: 'q3', type: 'fill_blank', difficulty: 'medium',
      content: '计算：(-7) - (-2) = ______', options: null, knowledgePoints: ['uuid-2'],
      studentAnswer: '-5', correctAnswer: '-5', isCorrect: true,
      analysis: '减去一个数等于加上它的相反数。', typicalErrors: [] },
  ],
};

try {
  console.log('\n【A】QuizRunner 答题组件');
  const QuizRunner = (await server.ssrLoadModule('/src/components/diagnosis/QuizRunner.vue')).default;
  const quiz = await render(QuizRunner, { questions: QUESTIONS });
  check('题号进度「第 1 / 3 题」', has(quiz, '第 1 / 3 题'));
  check('渲染题干', has(quiz, '下列各数中，是负数的是'));
  check('渲染选项 A', has(quiz, 'A. 0'));
  check('渲染含括号选项 D', has(quiz, 'D. -(-5)'));
  check('题型标签「单选题」', has(quiz, '单选题'));
  check('难度标签「简单」', has(quiz, '简单'));
  check('答题卡', has(quiz, '答题卡'));
  check('未作答提示', has(quiz, '还有 3 题未作答'));
  check('已答计数', has(quiz, '已答 0 / 3'));
  check('首题「上一题」禁用', has(quiz, 'disabled'));
  check('「下一题」按钮', has(quiz, '下一题'));
  check('退出按钮', has(quiz, '退出'));

  console.log('\n【B】DiagnosisResult 结果组件');
  const Result = (await server.ssrLoadModule('/src/components/diagnosis/DiagnosisResult.vue')).default;
  const html = await render(Result, {
    result: RESULT, elapsedMs: 4200,
    nameMap: { 'uuid-1': '绝对值', 'uuid-2': '数轴与相反数' }, subject: 'math', stage: 'junior',
  });
  check('标题「诊断完成」', has(html, '诊断完成'));
  check('学科「数学」', has(html, '数学'));
  check('知识点 id 已还原中文名', has(html, '绝对值') && has(html, '数轴与相反数'));
  check('未直接暴露 uuid', !has(html, 'uuid-1'));
  check('掌握度 35%', has(html, '掌握度 35%'));
  check('掌握度 80%', has(html, '掌握度 80%'));
  check('错因文本', has(html, '存在概念混淆'));
  check('耗时 4.2 秒', has(html, '4.2 秒'));
  check('满足 10 秒要求标注', has(html, '10 秒内完成诊断分析'));
  check('补漏路径', has(html, '先复习「绝对值」基础概念'));
  check('薄弱点计数', has(html, '2 个薄弱点'));
  check('「再测一次」按钮', has(html, '再测一次'));
  check('展示学段「初中」', has(html, '初中'));

  console.log('\n【B2】成绩概览与逐题解析（本次新增）');
  check('成绩概览：总题数', has(html, '3 题正确'));
  check('成绩概览：正确率 33%', has(html, '33%'));
  check('含「逐题解析」区块', has(html, '逐题解析'));
  check('标出「正确答案」标签', has(html, '正确答案'));
  check('标出「你的选择」标签', has(html, '你的选择'));
  check('展示「你的作答」', has(html, '你的作答'));
  check('展示解析内容', has(html, '是正数；0 既不是正数也不是负数'));
  check('展示典型错因', has(html, '化简绝对值与相反数时符号出错'));
  check('答对的题也展示解析', has(html, '减去一个数等于加上它的相反数'));
  check('正确/错误题数统计', has(html, '1 题正确') && has(html, '1 题错误'));
  check('解析中知识点还原为中文名', has(html, '绝对值'));

  console.log('\n【C】结果组件边界路径');
  const slow = await render(Result, { result: RESULT, elapsedMs: 15000, nameMap: {}, subject: 'math' });
  check('超 10 秒给出提示', has(slow, '本次分析耗时较长'));
  check('显示 15.0 秒', has(slow, '15.0 秒'));

  const empty = await render(Result, {
    result: {
      recordId: 'r2',
      stats: { total: 0, correct: 0, wrong: 0, unanswered: 0, accuracy: 0 },
      weakPoints: [], learningPath: [], review: [],
    },
    elapsedMs: 900, nameMap: {}, subject: 'english',
  });
  check('无薄弱点鼓励文案', has(empty, '本次未发现明显薄弱点'));
  check('无补路时占位', has(empty, '暂无补漏建议'));
  check('空结果仍渲染耗时', has(empty, '900 毫秒'));
} catch (e) {
  fail += 1;
  console.log('\n渲染异常: ' + e.message);
} finally {
  await server.close();
}

console.log('\n===== component: 通过 ' + pass + '，失败 ' + fail + ' =====');
process.exitCode = fail ? 1 : 0;