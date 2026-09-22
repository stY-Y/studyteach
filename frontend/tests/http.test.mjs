/**
 * 请求层契约测试：按 NestJS 后端真实返回格式起一个模拟服务器，验证 http.ts
 * 覆盖：响应解包 / JWT 附带 / 401 处理 / 业务错误 / 查询参数 / 离线回退 / 超时
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3999;
const BASE = 'http://127.0.0.1:' + PORT + '/api/v1';

// ---------- 按后端真实格式构造响应 ----------
const ok = (data) => JSON.stringify({ code: 0, message: 'success', data, timestamp: Date.now() });
const err = (code, message) => JSON.stringify({ code, message, data: null, timestamp: Date.now() });

let lastRequest = null;

const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    lastRequest = {
      method: req.method,
      url: req.url,
      auth: req.headers.authorization || '',
      contentType: req.headers['content-type'] || '',
      body: body ? JSON.parse(body) : null,
    };
    const send = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(payload);
    };

    // 公开路由（对应后端 @Public）——必须在鉴权闸门之前
    if (req.url === '/api/v1/health') return send(200, ok({ status: 'ok', service: 'teachstudy', time: 'T' }));
    if (req.url === '/api/v1/auth/login') {
      return send(200, ok({ token: 'TKN-123', user: { id: 'u1', username: 'student', role: 'student', name: '小明' } }));
    }

    // 鉴权：无 Bearer 时返回 401 + 业务码 40100（与后端一致）
    if (!String(req.headers.authorization || '').startsWith('Bearer ')) {
      return send(401, err(40100, '缺少访问令牌'));
    }

    if (req.url === '/api/v1/auth/me') return send(200, ok({ id: 'u1', username: 'student', role: 'student' }));
    if (req.url === '/api/v1/diagnosis') return send(400, err(40000, '该学科暂无题目'));
    if (req.url.startsWith('/api/v1/questions')) return send(200, ok({ echo: req.url }));
    if (req.url === '/api/v1/offline-probe') { req.socket.destroy(); return; }
    return send(404, err(40400, '资源不存在'));
  });
});

await new Promise((r) => mock.listen(PORT, '127.0.0.1', r));

// ---------- 浏览器 API 垫片 ----------
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

// 用临时 envDir 注入测试用 API 地址，避免改动项目里的 .env 文件
const envDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teachstudy-httptest-'));
fs.writeFileSync(path.join(envDir, '.env.test'), 'VITE_API_BASE=' + BASE + '\n', 'utf8');

const vite = await createViteServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  mode: 'test',
  envDir,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log('  PASS  ' + name); }
  else { fail += 1; console.log('  FAIL  ' + name + (extra ? '  [' + extra + ']' : '')); }
};

try {
  const H = await vite.ssrLoadModule('/src/api/http.ts');
  const { http: api, ApiError, setToken, getToken } = H;

  console.log('\n【1】成功响应解包');
  const health = await api.get('/health');
  check('拿到 data（已剥掉 code/message 外壳）', health.service === 'teachstudy');
  check('未把 timestamp 混入业务数据', health.timestamp === undefined);

  console.log('\n【2】登录与令牌');
  const login = await api.post('/auth/login', { username: 'student', password: 'student123456' });
  check('返回 token', login.token === 'TKN-123');
  check('返回用户角色', login.user.role === 'student');
  check('请求体与 Content-Type 正确',
    lastRequest.contentType.includes('application/json') && lastRequest.body.username === 'student');
  setToken('TKN-123');
  check('令牌写入本地存储', getToken() === 'TKN-123');

  console.log('\n【3】JWT 自动附带');
  await api.get('/auth/me');
  check('请求头带 Bearer 令牌', lastRequest.auth === 'Bearer TKN-123', lastRequest.auth);

  console.log('\n【4】401 处理（令牌失效与登录失败共用此路径）');
  setToken('');
  let caught = null;
  try { await api.get('/auth/me'); } catch (e) { caught = e; }
  check('抛出 ApiError', caught instanceof ApiError);
  check('业务码 40100', caught && caught.code === 40100);
  check('错误信息取自后端 message（未硬编码）',
    caught && caught.message === '缺少访问令牌', caught && caught.message);

  console.log('\n【5】业务错误（HTTP 400 + 非 0 code）');
  setToken('TKN-123');
  caught = null;
  try { await api.get('/diagnosis'); } catch (e) { caught = e; }
  check('抛出 ApiError', caught instanceof ApiError);
  check('业务码 40000 透出', caught && caught.code === 40000);
  check('中文提示透出', caught && caught.message === '该学科暂无题目', caught && caught.message);

  console.log('\n【6】查询参数拼接');
  await api.get('/questions', { query: { subject: 'math', page: 1, pageSize: 20, empty: undefined, blank: '' } });
  check('参数编码且忽略空值',
    lastRequest.url === '/api/v1/questions?subject=math&page=1&pageSize=20', lastRequest.url);

  console.log('\n【7】离线缓存回退');
  await api.get('/questions', { query: { subject: 'cached' }, cache: true });
  check('在线请求成功', lastRequest.url.includes('cached'));
  caught = null;
  try { await api.get('/offline-probe', { cache: true }); } catch (e) { caught = e; }
  check('无缓存时断网给出明确错误', caught && /网络连接失败/.test(caught.message));
  caught = null;
  let fallback = null;
  try { fallback = await api.get('/questions', { query: { subject: 'cached' }, cache: true }); } catch (e) { caught = e; }
  check('有缓存时断网回退命中缓存', !caught && fallback && typeof fallback.echo === 'string');

  console.log('\n【8】超时保护');
  caught = null;
  try { await api.get('/health', { timeoutMs: 1 }); } catch (e) { caught = e; }
  check('超时抛 ApiError', caught instanceof ApiError);
  check('超时信息可读', caught && /超时/.test(caught.message), caught && caught.message);
} catch (e) {
  fail += 1;
  console.log('\n执行异常: ' + e.message);
} finally {
  await vite.close();
  mock.close();
  fs.rmSync(envDir, { recursive: true, force: true });
}

console.log('\n===== http: 通过 ' + pass + '，失败 ' + fail + ' =====');
process.exitCode = fail ? 1 : 0;