/**
 * 种子数据播种脚本
 *
 * 运行（在 teachstudy 根目录）：
 *   npm run build:shared        # 首次需先构建共享层
 *   npm run seed                # 幂等播种（已存在则跳过）
 *   npm run seed -- --force     # 先清除种子题目再重新播种（用于刷新题目内容）
 *
 * 特点：
 *  - 幂等：知识点/院校/升学数据按自然键 upsert，题目/用户已存在则跳过
 *  - 不依赖外部服务：直接连 .env 配置的数据库（默认 better-sqlite3）
 *  - 种子题目带 source 标记，便于识别与清理，不会误删用户自建题目
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/users/users.service';
import { KnowledgePoint } from '../src/modules/knowledge/entities/knowledge-point.entity';
import { Question } from '../src/modules/questions/entities/question.entity';
import { College } from '../src/modules/volunteer/entities/college.entity';
import { EnrollmentPolicy } from '../src/modules/enrollment/entities/enrollment-policy.entity';
import { Resource } from '../src/modules/resources/entities/resource.entity';
import { School } from '../src/modules/schools/entities/school.entity';
import { ClassRoom } from '../src/modules/classes/entities/class-room.entity';
import { ClassMember } from '../src/modules/classes/entities/class-member.entity';
import { StudentProfile } from '../src/modules/users/entities/student-profile.entity';
import { StorageService } from '../src/infra/storage/storage.service';
import { ResourceStatus } from '@teachstudy/shared';

import {
  SEED_COLLEGES,
  SEED_ENROLLMENT_POLICIES,
  SEED_KNOWLEDGE_POINTS,
  SEED_PARENT_LINKS,
  SEED_QUESTIONS,
  SEED_RESOURCES,
  SEED_SCHOOL_ID,
  SEED_SCHOOLS,
  SEED_USERS,
} from './seed-data';

/** 种子题目标记（用于识别与 --force 清理） */
const SEED_QUESTION_SOURCE = 'seed:v1';

const FORCE = process.argv.includes('--force');

const stats = {
  kpInserted: 0,
  kpUpdated: 0,
  schoolUpserted: 0,
  questionInserted: 0,
  questionRemoved: 0,
  userInserted: 0,
  linkInserted: 0,
  collegeUpserted: 0,
  enrollmentUpserted: 0,
  resourceInserted: 0,
  resourceSkipped: 0,
  skipped: 0,
};

function line(label: string, value: unknown): void {
  console.log(`  ${label.padEnd(14, ' ')} ${value}`);
}

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

async function main(): Promise<void> {
  console.log('\n=== teachstudy 种子数据播种 ===\n');
  if (FORCE) {
    console.log('  [--force] 将先清除已有种子题目再重新播种\n');
  }

  // 确保 sqlite 数据目录存在（与 main.ts 行为一致）
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const ds = app.get(DataSource);

    if (FORCE) await removeSeedQuestions(ds);

    const codeToId = await seedKnowledgePoints(ds);
    await seedSchools(ds);
    await seedQuestions(ds, codeToId);
    await seedColleges(ds);
    await seedEnrollment(ds);
    await seedUsers(app);
    await seedDemoClass(ds, app);
    await seedResources(ds, app);
  } finally {
    await app.close();
  }

  console.log('\n=== 播种完成 ===');
  line('知识点', `新增 ${stats.kpInserted}，更新 ${stats.kpUpdated}`);
  line('学校', `写入 ${stats.schoolUpserted}`);
  line('题目', `新增 ${stats.questionInserted}${stats.questionRemoved ? `（清理 ${stats.questionRemoved}）` : ''}`);
  line('用户', `新增 ${stats.userInserted}`);
  line('家校绑定', `新增 ${stats.linkInserted}`);
  line('院校', `写入 ${stats.collegeUpserted}`);
  line('升学数据', `写入 ${stats.enrollmentUpserted}`);
  line('演示资源', `新增 ${stats.resourceInserted}${stats.resourceSkipped ? `（跳过 ${stats.resourceSkipped}）` : ''}`);
  line('跳过', `${stats.skipped} 项（已存在）`);

  if (stats.userInserted > 0) {
    console.log('\n=== 演示账号（本地开发用，请勿用于生产）===');
    for (const u of SEED_USERS) {
      console.log(`  ${u.role.padEnd(8, ' ')} ${u.username.padEnd(10, ' ')} / ${u.password}`);
    }
  }

  console.log('\n下一步：npm run dev:backend  然后访问 http://localhost:3000/docs\n');
}

/** 清除已有种子题目（仅按 source 标记，不影响用户自建题目） */
async function removeSeedQuestions(ds: DataSource): Promise<void> {
  const result = await ds.getRepository(Question).delete({ source: SEED_QUESTION_SOURCE });
  stats.questionRemoved = result.affected ?? 0;
}

/** 学校：按 id upsert（演示数据） */
async function seedSchools(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(School);

  for (const s of SEED_SCHOOLS) {
    const found = await repo.findOne({ where: { id: s.id } });
    if (found) {
      await repo.update(found.id, { name: s.name, region: s.region, type: s.type });
    } else {
      await repo.save(repo.create(s));
    }
    stats.schoolUpserted += 1;
  }
}

/** 知识点：按 code upsert，返回 code -> id 映射 */
async function seedKnowledgePoints(ds: DataSource): Promise<Map<string, string>> {
  const repo = ds.getRepository(KnowledgePoint);
  const codeToId = new Map<string, string>();

  for (const kp of await repo.find()) {
    codeToId.set(kp.code, kp.id);
  }

  // 父级优先，保证 parentId 能解析
  const ordered = [...SEED_KNOWLEDGE_POINTS].sort(
    (a, b) => (a.parentCode ? 1 : 0) - (b.parentCode ? 1 : 0),
  );

  for (const item of ordered) {
    const parentId = item.parentCode ? codeToId.get(item.parentCode) : undefined;
    const existsId = codeToId.get(item.code);

    if (existsId) {
      await repo.update(existsId, {
        name: item.name,
        subject: item.subject,
        stage: item.stage,
        parentId,
        description: item.description,
        order: item.order ?? 0,
      });
      stats.kpUpdated += 1;
    } else {
      const saved = await repo.save(
        repo.create({
          code: item.code,
          name: item.name,
          subject: item.subject,
          stage: item.stage,
          parentId,
          description: item.description,
          order: item.order ?? 0,
        }),
      );
      codeToId.set(saved.code, saved.id);
      stats.kpInserted += 1;
    }
  }

  return codeToId;
}

/** 题目：已存在种子题目则跳过（除非 --force 已清理） */
async function seedQuestions(ds: DataSource, codeToId: Map<string, string>): Promise<void> {
  const repo = ds.getRepository(Question);

  const existing = await repo.count({ where: { source: SEED_QUESTION_SOURCE } });
  if (existing > 0) {
    stats.skipped += existing;
    console.log(`  题目已存在 ${existing} 道，跳过（如需刷新请加 --force）\n`);
    return;
  }

  for (const q of SEED_QUESTIONS) {
    const kpIds = q.kpCodes
      .map((code) => codeToId.get(code))
      .filter((id): id is string => Boolean(id));

    if (kpIds.length === 0) {
      stats.skipped += 1;
      continue;
    }

    await repo.save(
      repo.create({
        subject: q.subject,
        stage: q.stage,
        type: q.type,
        difficulty: q.difficulty,
        ability: q.ability,
        knowledgePoints: kpIds,
        content: q.content,
        options: q.options,
        answer: q.answer,
        analysis: q.analysis,
        typicalErrors: q.typicalErrors,
        source: SEED_QUESTION_SOURCE,
        status: 'approved',
      }),
    );
    stats.questionInserted += 1;
  }
}

/** 院校库：按名称 upsert（演示数据） */
async function seedColleges(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(College);

  for (const c of SEED_COLLEGES) {
    const found = await repo.findOne({ where: { name: c.name } });
    if (found) {
      await repo.update(found.id, c);
    } else {
      await repo.save(repo.create(c));
    }
    stats.collegeUpserted += 1;
  }
}

/** 升学数据：按 年份+地区+类别 去重写入（演示数据） */
async function seedEnrollment(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(EnrollmentPolicy);

  for (const p of SEED_ENROLLMENT_POLICIES) {
    const found = await repo.findOne({
      where: { year: p.year, region: p.region, category: p.category },
    });
    if (found) {
      await repo.update(found.id, { title: p.title, content: p.content });
    } else {
      await repo.save(repo.create(p));
    }
    stats.enrollmentUpserted += 1;
  }
}

/**
 * 演示资源：按标题幂等写入（72 份，覆盖小学 1-6 / 初中 7-9 / 高中 10-12 的对应学科）。
 * 正文写入存储目录，资源状态直接为「已通过」，便于学生端立即体验下载与离线缓存。
 */
async function seedResources(ds: DataSource, app: INestApplicationContext): Promise<void> {
  const repo = ds.getRepository(Resource);
  const storage = app.get(StorageService);
  const admin = await app.get(UsersService).findByUsername('admin');

  if (!admin) {
    console.log('  未找到 admin 账号，跳过演示资源播种\n');
    return;
  }

  for (const r of SEED_RESOURCES) {
    const exists = await repo.findOne({ where: { title: r.title } });
    if (exists) {
      stats.resourceSkipped += 1;
      continue;
    }

    const buffer = Buffer.from(r.content, 'utf8');
    const fileKey = storage.save(`seed/resources/${r.stage}-${r.grade}-${r.subject}.md`, buffer);

    await repo.save(
      repo.create({
        title: r.title,
        type: r.type,
        subject: r.subject,
        stage: r.stage,
        grade: r.grade,
        knowledgePoints: [],
        fileKey,
        fileSize: buffer.length,
        format: '.md',
        ownerId: admin.id,
        schoolId: admin.schoolId ?? SEED_SCHOOL_ID,
        scope: r.scope,
        status: ResourceStatus.APPROVED,
        downloads: 0,
      }),
    );
    stats.resourceInserted += 1;
  }
}

/** 用户与家校绑定：已存在则跳过（复用 UsersService，保证密码哈希一致） */
async function seedUsers(app: INestApplicationContext): Promise<void> {
  const usersService = app.get(UsersService);

  for (const u of SEED_USERS) {
    const exists = await usersService.findByUsername(u.username);
    if (exists) {
      stats.skipped += 1;
      continue;
    }

    const user = await usersService.create({
      username: u.username,
      password: u.password,
      role: u.role,
      name: u.name,
      phone: u.phone,
      schoolId: u.schoolId ?? SEED_SCHOOL_ID,
    });

    if (u.studentProfile) {
      await usersService.saveStudentProfile(user.id, u.studentProfile);
    }
    if (u.teacherProfile) {
      await usersService.saveTeacherProfile(user.id, u.teacherProfile);
    }
    stats.userInserted += 1;
  }

  for (const link of SEED_PARENT_LINKS) {
    const parent = await usersService.findByUsername(link.parentUsername);
    const student = await usersService.findByUsername(link.studentUsername);
    if (!parent || !student) continue;

    const children = await usersService.listChildren(parent.id);
    if (children.some((c) => c.studentUserId === student.id)) {
      stats.skipped += 1;
      continue;
    }

    await usersService.linkParent(parent.id, link.studentUsername);
    stats.linkInserted += 1;
  }

  // 历史账号补写手机号盲索引（升级后让老账号也能用手机号登录）
  const backfilled = await usersService.backfillPhoneHashes();
  if (backfilled > 0) {
    console.log(`  已为 ${backfilled} 个历史账号补写手机号盲索引\n`);
  }
}

/**
 * 演示班级：teacher 创建「八年级 2 班」，student 已审核通过并绑定档案。
 * 新流程下学生必须加入班级才能使用聊天与作业，种子保证演示开箱可用。
 */
async function seedDemoClass(ds: DataSource, app: INestApplicationContext): Promise<void> {
  const usersService = app.get(UsersService);
  const teacher = await usersService.findByUsername('teacher');
  const student = await usersService.findByUsername('student');
  if (!teacher || !student) return;

  const rooms = ds.getRepository(ClassRoom);
  let room = await rooms.findOne({ where: { teacherId: teacher.id } });
  if (!room) {
    room = await rooms.save(
      rooms.create({
        schoolId: SEED_SCHOOL_ID,
        grade: '八年级',
        className: '2 班',
        name: '八年级 2 班',
        teacherId: teacher.id,
        teacherName: teacher.name,
        inviteCode: 'QINGHE01',
        status: 'active',
      }),
    );
    console.log('  已创建演示班级：八年级 2 班（邀请码 QINGHE01）\n');
  }

  const members = ds.getRepository(ClassMember);
  const exists = await members.findOne({
    where: { classId: room.id, studentId: student.id },
  });
  if (!exists) {
    await members.save(
      members.create({
        classId: room.id,
        studentId: student.id,
        studentName: student.name,
        status: 'approved',
        reviewedAt: new Date(),
      }),
    );
  }

  const profiles = ds.getRepository(StudentProfile);
  const profile = await profiles.findOne({ where: { userId: student.id } });
  if (profile) {
    await profiles.update(profile.id, {
      classId: room.id,
      schoolId: room.schoolId,
      grade: room.grade,
      className: room.className,
    });
  }
}

void main().catch((e) => {
  Logger.error(`播种失败：${(e as Error).message}`, (e as Error).stack, 'Seed');
  process.exitCode = 1;
});