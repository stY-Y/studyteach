import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { GLOBAL_API_PREFIX } from '@teachstudy/shared';

/**
 * 在 ConfigModule 加载 .env 之前，先手动读取 DB_DATABASE，
 * 以便在 TypeORM 建立连接前创建好数据目录（自定义路径也能生效）。
 */
function resolveDbPath(): string {
  let fromEnvFile: string | undefined;
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const match = fs.readFileSync(envPath, 'utf8').match(/^\s*DB_DATABASE\s*=\s*(.+?)\s*$/m);
    if (match) fromEnvFile = match[1];
  }
  return process.env.DB_DATABASE || fromEnvFile || './data/teachstudy.db';
}

async function bootstrap(): Promise<void> {
  // 确保 SQLite 数据目录存在（低配/离线环境零外部依赖）
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

  const app = await NestFactory.create(AppModule);

  // 全局路由前缀 api/v1
  app.setGlobalPrefix(GLOBAL_API_PREFIX);

  // 全局参数校验与转换
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 跨域（PC 网页 + 微信小程序）
  app.enableCors({ origin: true, credentials: true });

  // Swagger 接口文档
  const docConfig = new DocumentBuilder()
    .setTitle('青禾 API')
    .setDescription('纯公益服务 · 轻量端云一体 · 学生/教师/管理员/家长四端')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API  : http://localhost:${port}/${GLOBAL_API_PREFIX}`, 'Bootstrap');
  Logger.log(`Docs : http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();