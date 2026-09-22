/**
 * @teachstudy/shared 业务常量
 */

/** API 路由前缀 */
export const API_VERSION = 'v1';
export const API_PREFIX = 'api';
export const GLOBAL_API_PREFIX = `${API_PREFIX}/${API_VERSION}`;

/** 资源轻量化下载体积上限（单位：MB） */
export const RESOURCE_SIZE_LIMIT_MB = {
  EBOOK: 50,
  VIDEO: 200,
  AUDIO: 50,
} as const;

/** 知识诊断参数：10-15 道检测题，10 秒内出结果 */
export const DIAGNOSIS = {
  QUESTION_COUNT_MIN: 10,
  QUESTION_COUNT_MAX: 15,
  RESULT_TIMEOUT_SECONDS: 10,
} as const;

/** 智能组卷：1 分钟内生成 */
export const PAPER_GENERATION = {
  TIMEOUT_SECONDS: 60,
} as const;

/** 分页默认值 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/** 统一业务状态码 */
export const BizCode = {
  SUCCESS: 0,
  VALIDATION_ERROR: 40000,
  UPLOAD_TOO_LARGE: 40001,
  UNAUTHORIZED: 40100,
  FORBIDDEN: 40300,
  NOT_FOUND: 40400,
  CONFLICT: 40900,
  INTERNAL_ERROR: 50000,
  AI_SERVICE_ERROR: 50010,
} as const;