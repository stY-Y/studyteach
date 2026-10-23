import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';

import configuration from './config/configuration';
import { AppController } from './app.controller';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { InfraModule } from './infra/infra.module';
import { AiModule } from './ai/ai.module';

import { AuthModule } from './modules/auth/auth.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { UsersModule } from './modules/users/users.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { DiagnosisModule } from './modules/diagnosis/diagnosis.module';
import { GradingModule } from './modules/grading/grading.module';
import { PaperModule } from './modules/paper/paper.module';
import { VolunteerModule } from './modules/volunteer/volunteer.module';
import { SchoolHomeModule } from './modules/school-home/school-home.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ChatModule } from './modules/chat/chat.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { ParentChatModule } from './modules/parent-chat/parent-chat.module';
import { ClassNoticeModule } from './modules/class-notice/class-notice.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OrgModule } from './modules/org/org.module';

@Module({
  imports: [
    // 全局配置
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // 数据库（better-sqlite3 默认，生产可切换 mysql/postgres）
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => {
        const options = cs.get<TypeOrmModuleOptions>('database');
        if (!options) {
          throw new Error('数据库配置缺失：请检查 .env 与 src/config/configuration.ts');
        }
        return options;
      },
    }),

    // 全局限流
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        throttlers: [
          { ttl: cs.get<number>('throttle.ttlMs', 60000), limit: cs.get<number>('throttle.limit', 120) },
        ],
      }),
    }),

    // 全局 JWT（四端统一认证）
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get('jwt.secret'),
        signOptions: { expiresIn: cs.get('jwt.expiresIn') },
      }),
    }),

    // 基础设施 & AI 抽象层（全局单例）
    InfraModule,
    AiModule,

    // 业务模块
    AuthModule,
    SchoolsModule,
    UsersModule,
    KnowledgeModule,
    QuestionsModule,
    ResourcesModule,
    DiagnosisModule,
    GradingModule,
    PaperModule,
    VolunteerModule,
    SchoolHomeModule,
    ReportsModule,
    EnrollmentModule,
    ClassesModule,
    ChatModule,
    HomeworkModule,
    ParentChatModule,
    ClassNoticeModule,
    DashboardModule,
    OrgModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}