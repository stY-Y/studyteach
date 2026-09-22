/**
 * 作答判定工具
 * 用于诊断逐题批改，容错常见书写差异，避免「明明答对却被判错」。
 */

/** 归一化：全角转半角、去空白、统一大写 */
export function normalizeAnswer(input?: string | null): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase();
}

/** 解析「a/b」形式的分数为数值；不是分数则返回 null */
function parseFraction(text: string): number | null {
  const matched = text.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (!matched) return null;
  const denominator = Number(matched[2]);
  if (!denominator) return null;
  return Number(matched[1]) / denominator;
}

/** 判断题的等价写法 */
const TRUE_TOKENS = ['对', '正确', 'T', 'TRUE', '√', 'YES', '是'];
const FALSE_TOKENS = ['错', '错误', 'F', 'FALSE', '×', 'NO', '否'];

/**
 * 判断作答是否正确。
 * 容错项：全角/半角、大小写、空白、多选题选项顺序、± 的多种写法、
 *        分数与小数等价（1/2 = 0.5）、判断题多种写法。
 */
export function isAnswerCorrect(
  studentAnswer?: string | null,
  correctAnswer?: string | null,
): boolean {
  const s = normalizeAnswer(studentAnswer);
  const c = normalizeAnswer(correctAnswer);
  if (!s || !c) return false;
  if (s === c) return true;

  // 多选题：字母集合相同即正确（与先后顺序无关）
  if (/^[A-Z]+$/.test(s) && /^[A-Z]+$/.test(c) && s.length > 1 && c.length > 1) {
    return [...s].sort().join('') === [...c].sort().join('');
  }

  // ±x 的多种写法
  if (c.startsWith('±')) {
    const v = c.slice(1);
    const variants = [
      v,
      `+${v}`,
      `-${v}`,
      `±${v}`,
      `${v}或-${v}`,
      `-${v}或${v}`,
      `${v}或+${v}`,
      `${v},-${v}`,
    ];
    if (variants.includes(s)) return true;
  }

  // 分数与小数等价
  const sf = parseFraction(s);
  const cf = parseFraction(c);
  if (sf !== null && cf !== null && Math.abs(sf - cf) < 1e-9) return true;

  // 判断题等价写法
  if (TRUE_TOKENS.includes(s) && TRUE_TOKENS.includes(c)) return true;
  if (FALSE_TOKENS.includes(s) && FALSE_TOKENS.includes(c)) return true;

  return false;
}
