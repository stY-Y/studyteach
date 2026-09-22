/**
 * 纯逻辑测试（不依赖浏览器）
 * 运行：npm test -w frontend
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 浏览器 API 垫片（storage / offline 需要）
const store = new Map();
globalThis.localStorage = {
  get length() { return store.size; },
  key: (i) => Array.from(store.keys())[i] ?? null,
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  clear: () => store.clear(),
};
try {
  Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true, writable: true });
} catch { /* ignore */ }
globalThis.window = globalThis;
globalThis.addEventListener = () => {};

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

let pass = 0;
let fail = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass += 1; console.log('  PASS  ' + name); }
  else { fail += 1; console.log('  FAIL  ' + name + '\n          期望 ' + e + '\n          实际 ' + a); }
};

try {
  console.log('\n【1】选项字母解析 optionLetter（决定学生作答是否正确记录）');
  const L = await server.ssrLoadModule('/src/config/labels.ts');
  check('A. 0        -> A', L.optionLetter('A. 0', 0), 'A');
  check('B. -3       -> B', L.optionLetter('B. -3', 1), 'B');
  check('C. |-2|     -> C', L.optionLetter('C. |-2|', 2), 'C');
  check('D. -(-5)    -> D', L.optionLetter('D. -(-5)', 3), 'D');
  check('A. 0.6      -> A', L.optionLetter('A. 0.6', 0), 'A');
  check('无字母前缀时按序号推导', L.optionLetter('1/2', 1), 'B');
  check('全角括号 A）x -> A', L.optionLetter('A）x', 0), 'A');

  console.log('\n【2】中文标签');
  check('subjectLabel(math)', L.subjectLabel('math'), '数学');
  check('subjectLabel(english)', L.subjectLabel('english'), '英语');
  check('difficultyLabel(hard)', L.difficultyLabel('hard'), '较难');
  check('questionTypeLabel(single_choice)', L.questionTypeLabel('single_choice'), '单选题');
  check('questionTypeLabel(fill_blank)', L.questionTypeLabel('fill_blank'), '填空题');
  check('未知值原样返回', L.subjectLabel('unknown_x'), 'unknown_x');

  console.log('\n【3】知识点 id → 名称');
  const K = await server.ssrLoadModule('/src/api/knowledge.ts');
  const map = K.buildNameMap([
    { id: 'uuid-1', code: 'MATH-J-0103', name: '绝对值', order: 1 },
    { id: 'uuid-2', code: 'MATH-J-0203', name: '幂的运算性质', order: 2 },
  ]);
  check('按 id 查', map['uuid-1'], '绝对值');
  check('按 code 查（兼容兜底）', map['MATH-J-0203'], '幂的运算性质');

  console.log('\n【4】离线缓存策略（容量上限 / 淘汰 / 大响应跳过）');
  const O = await server.ssrLoadModule('/src/utils/offline.ts');
  O.offline.clear();
  O.offline.save('k1', { a: 1 });
  check('保存后可读取', O.offline.load('k1'), { a: 1 });
  check('size() 计数', O.offline.size(), 1);

  O.offline.save('big', { blob: 'x'.repeat(70 * 1024) });
  check('单条 >64KB 不入缓存（防内存尖峰）', O.offline.load('big'), null);

  O.offline.clear();
  for (let i = 0; i < 40; i += 1) O.offline.save('e' + i, { i });
  check('条目数被限制在 30', O.offline.size(), 30);
  check('最旧的 e0 被淘汰', O.offline.load('e0'), null);
  check('最新的 e39 保留', O.offline.load('e39'), { i: 39 });
  check('中间的 e15 保留', O.offline.load('e15'), { i: 15 });
  check('clear() 返回条数并清空', [O.offline.clear(), O.offline.size()], [30, 0]);

  console.log('\n【5】年级 → 学段 推断（用于自动预选，防止跨学段混题）');
  check('八年级 -> junior', L.inferStageFromGrade('八年级'), 'junior');
  check('初二 -> junior', L.inferStageFromGrade('初二'), 'junior');
  check('高一年级 -> senior（顺序陷阱：不能被「一年级」判成小学）', L.inferStageFromGrade('高一年级'), 'senior');
  check('高三 -> senior', L.inferStageFromGrade('高三'), 'senior');
  check('六年级 -> primary_high', L.inferStageFromGrade('六年级'), 'primary_high');
  check('小学五年级 -> primary_high', L.inferStageFromGrade('小学五年级'), 'primary_high');
  check('空字符串 -> null', L.inferStageFromGrade(''), null);
  check('无法识别 -> null', L.inferStageFromGrade('火箭班'), null);
  check('stageLabel(junior)', L.stageLabel('junior'), '初中');
  check('stageLabel(未指定)', L.stageLabel(undefined), '未指定学段');
  check('学段选项数量', L.STAGE_OPTIONS.length, 3);
} catch (e) {
  fail += 1;
  console.log('\n执行异常: ' + e.message);
} finally {
  await server.close();
}

console.log('\n===== logic: 通过 ' + pass + '，失败 ' + fail + ' =====');
process.exitCode = fail ? 1 : 0;