import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface AiConfig {
  provider: string;
  apiBase: string;
  apiKey: string;
  model: string;
}

/**
 * 集中式环境配置（从 .env 加载），通过 ConfigService 注入。
 */
export default () => {
  const env = process.env;
  const dbType = env.DB_TYPE || 'better-sqlite3';
  const isProd = env.NODE_ENV === 'production';

  // 开发默认使用 better-sqlite3（零外部依赖，适配低配/离线环境）；生产可切换 mysql/postgres
  // 两个分支的 type 宽度不同，末尾统一断言为 TypeOrmModuleOptions
  const database = (
    dbType === 'better-sqlite3'
      ? {
          type: 'better-sqlite3',
          database: env.DB_DATABASE || './data/teachstudy.db',
          autoLoadEntities: true,
          synchronize: !isProd,
        }
      : {
          type: dbType as TypeOrmModuleOptions['type'],
          host: env.DB_HOST || 'localhost',
          port: parseInt(env.DB_PORT || '3306', 10),
          username: env.DB_USERNAME || 'root',
          password: env.DB_PASSWORD || '',
          database: env.DB_DATABASE || 'teachstudy',
          autoLoadEntities: true,
          synchronize: !isProd,
        }
  ) as TypeOrmModuleOptions;

  return {
    env: env.NODE_ENV || 'development',
    port: parseInt(env.PORT || '3000', 10),
    appName: env.APP_NAME || 'teachstudy',
    encryptionKey: env.ENCRYPTION_KEY || '',
    database,
    jwt: {
      secret: env.JWT_SECRET || 'dev-secret-change-me',
      expiresIn: env.JWT_EXPIRES_IN || '7d',
    },
    ai: {
      provider: env.AI_PROVIDER || 'mock',
      apiBase: env.AI_API_BASE || '',
      apiKey: env.AI_API_KEY || '',
      model: env.AI_MODEL || 'glm-4-flash',
    } as AiConfig,
    storage: { dir: env.STORAGE_DIR || './uploads' },
    cache: { ttlSeconds: parseInt(env.CACHE_TTL_SECONDS || '300', 10) },
    throttle: {
      // @nestjs/throttler v6 的 ttl 单位为毫秒
      ttlMs: parseInt(env.THROTTLE_TTL_SECONDS || '60', 10) * 1000,
      limit: parseInt(env.THROTTLE_LIMIT || '120', 10),
    },
  };
};