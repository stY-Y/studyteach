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
import { Grade } from '../src/modules/org/entities/grade.entity';
import { StaffAppointment } from '../src/modules/org/entities/staff-appointment.entity';
import { StaffService } from '../src/modules/org/staff.service';
import { StorageService } from '../src/infra/storage/storage.service';
import { ResourceStatus, StaffRole, StudyStage } from '@teachstudy/shared';

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
    await backfillQuestionClassify(ds);
    await seedColleges(ds);
    await seedEnrollment(ds);
    await seedUsers(app);
    await seedOrg(ds, app);
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

const CN_NUM: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

/** 从文本里提取年级（如「一年级：…」「二、三年级：…」），提取不到返回 null */
function extractGrade(text: string | undefined | null): number | null {
  if (!text) return null;
  const matched = text.match(/([一二三四五六七八九十]|\d{1,2})\s*年级/);
  if (!matched) return null;
  const raw = matched[1];
  const value = /^\d+$/.test(raw) ? Number(raw) : CN_NUM[raw];
  return value || null;
}

/** 学段兜底年级：小学按高段 5 年级，初中 7 年级，高中 10 年级 */
function defaultGrade(stage: StudyStage): number {
  if (stage === StudyStage.PRIMARY_HIGH) return 5;
  if (stage === StudyStage.JUNIOR) return 7;
  return 10;
}

/**
 * 章节 → 年级映射（key 为 `学段|章节名`）。
 * 种子题按「知识树顶层章节」归类，这里给出每个章节所属年级，保证 1-10 年级都能筛到题。
 * 教师新录入的题目直接选择年级，不依赖此表。
 */
const CHAPTER_GRADE: Record<string, number> = {
  // 小学语文
  'primary_high|汉语拼音': 1,
  'primary_high|识字与写字': 1,
  'primary_high|词语与句子': 2,
  'primary_high|积累与阅读': 3,
  // 小学数学
  'primary_high|20 以内的数': 1,
  'primary_high|表内乘除法': 2,
  'primary_high|万以内的数与三位数加减': 3,
  'primary_high|图形的周长与面积': 3,
  'primary_high|分数的初步认识': 3,
  'primary_high|数与代数': 5,
  'primary_high|图形与几何': 5,
  'primary_high|统计与概率': 5,
  'primary_high|典型应用题': 6,
  'primary_high|比与比例': 6,
  // 小学英语
  'primary_high|字母与语音': 3,
  'primary_high|基础词汇': 3,
  'primary_high|情景交际': 3,
  'primary_high|词汇': 4,
  'primary_high|句型': 4,
  'primary_high|日常交际用语': 4,
  'primary_high|时态': 6,
  // 初中数学
  'junior|有理数': 7,
  'junior|整式': 7,
  'junior|一元一次方程': 7,
  'junior|图形认识初步': 7,
  'junior|二元一次方程组': 8,
  'junior|不等式与不等式组': 8,
  'junior|一次函数': 8,
  'junior|分式': 8,
  'junior|因式分解': 8,
  'junior|数据的分析': 8,
  // 初中物理
  'junior|声现象': 8,
  'junior|物态变化': 8,
  'junior|光现象': 8,
  // 初中英语
  'junior|词法': 7,
  'junior|时态': 8,
  'junior|从句': 9,
  'junior|非谓语与情态动词': 9,
  // 高中
  'senior|集合与函数': 10,
  'senior|三角函数': 10,
  'senior|力学': 10,
  'senior|运动学': 10,
};

/**
 * 题库三级分类回填：年级（第 1 层）+ 章节（第 3 层）。
 * 章节取题目关联知识点的「顶层祖先」名称（知识树顶层即章节），年级从知识点描述推断。
 */
async function backfillQuestionClassify(ds: DataSource): Promise<void> {
  const kpRepo = ds.getRepository(KnowledgePoint);
  const qRepo = ds.getRepository(Question);

  const points = await kpRepo.find();
  const byId = new Map(points.map((k) => [k.id, k]));

  const questions = await qRepo.find();
  let updated = 0;

  for (const q of questions) {
    if (q.grade && q.chapter) continue;

    // 知识点向上追溯：链尾是章节（顶层节点），链上任一级有年级描述就采用
    const chain: KnowledgePoint[] = [];
    let cursor = q.knowledgePoints?.[0] ? byId.get(q.knowledgePoints[0]) : undefined;
    let guard = 0;
    while (cursor && guard < 10) {
      chain.push(cursor);
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
      guard += 1;
    }

    const chapter = chain.length ? chain[chain.length - 1].name : null;
    let grade = q.grade ?? null;

    // 优先级：章节映射 > 知识点描述 > 学段兜底
    if (!grade && chapter) {
      grade = CHAPTER_GRADE[`${q.stage}|${chapter}`] ?? null;
    }
    if (!grade) {
      for (const node of chain) {
        const found = extractGrade(node.description);
        if (found) {
          grade = found;
          break;
        }
      }
    }
    if (!grade) grade = defaultGrade(q.stage);

    await qRepo.update(q.id, { grade, chapter: q.chapter ?? chapter });
    updated += 1;
  }

  if (updated > 0) {
    console.log(`  题目三级分类回填：${updated} 道（年级 / 章节）\n`);
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

/** 标准 12 个年级：小学 6 + 初中 3 + 高中 3 */
const STANDARD_GRADES = [
  '一年级',
  '二年级',
  '三年级',
  '四年级',
  '五年级',
  '六年级',
  '七年级',
  '八年级',
  '九年级',
  '高一',
  '高二',
  '高三',
];

/** 幂等写入一条任命（不使用 actor 校验，直接落库，用于演示数据） */
async function ensureAppointment(
  ds: DataSource,
  data: {
    userId: string;
    role: StaffRole;
    scopeId: string;
    schoolId: string;
    gradeId?: string | null;
    classId?: string | null;
    appointedBy?: string | null;
  },
): Promise<boolean> {
  const repo = ds.getRepository(StaffAppointment);
  const exists = await repo.findOne({
    where: { userId: data.userId, role: data.role, scopeId: data.scopeId },
  });
  if (exists) return false;
  await repo.save(
    repo.create({
      userId: data.userId,
      role: data.role,
      scopeId: data.scopeId,
      schoolId: data.schoolId,
      gradeId: data.gradeId ?? null,
      classId: data.classId ?? null,
      appointedBy: data.appointedBy ?? null,
    }),
  );
  return true;
}

/**
 * 演示组织架构：学校下建满 12 个年级（小学 6 + 初中 3 + 高中 3），
 * 并演示「平台 → 学校管理员 → 年级管理员」的任命链路。
 */
async function seedOrg(ds: DataSource, app: INestApplicationContext): Promise<void> {
  const usersService = app.get(UsersService);
  const staff = app.get(StaffService);
  const grades = ds.getRepository(Grade);

  const schoolAdmin = await usersService.findByUsername('schooladmin');
  const gradeAdmin = await usersService.findByUsername('gradeadmin');

  let created = 0;
  const existingGrades = await grades.find({ where: { schoolId: SEED_SCHOOL_ID } });
  if (existingGrades.length === 0) {
    // 只在学校还没有任何年级时初始化 12 个；学校管理员改过年级个数后，seed 不再覆盖
    for (let i = 0; i < STANDARD_GRADES.length; i += 1) {
      await grades.save(
        grades.create({ schoolId: SEED_SCHOOL_ID, name: STANDARD_GRADES[i], order: i }),
      );
      created += 1;
    }
  } else {
    // 已有配置：仅校正顺序，不增删
    for (const g of existingGrades) {
      const order = STANDARD_GRADES.indexOf(g.name);
      if (order >= 0 && g.order !== order) {
        await grades.update(g.id, { order });
      }
    }
  }
  if (created > 0) console.log(`  已创建 ${created} 个标准年级（小学 6 + 初中 3 + 高中 3）`);
  else console.log(`  学校已有 ${existingGrades.length} 个年级，保留现有配置`);

  const gradeEight = await grades.findOne({
    where: { schoolId: SEED_SCHOOL_ID, name: '八年级' },
  });

  // 平台管理员任命学校管理员（每校最多 2 名）
  if (schoolAdmin) {
    const added = await ensureAppointment(ds, {
      userId: schoolAdmin.id,
      role: StaffRole.SCHOOL_ADMIN,
      scopeId: SEED_SCHOOL_ID,
      schoolId: SEED_SCHOOL_ID,
    });
    if (added) console.log('  任命 schooladmin 为学校管理员');
  }

  // 学校管理员任命年级管理员（每校每年级最多 2 名）
  if (gradeAdmin && gradeEight) {
    const added = await ensureAppointment(ds, {
      userId: gradeAdmin.id,
      role: StaffRole.GRADE_ADMIN,
      scopeId: gradeEight.id,
      schoolId: SEED_SCHOOL_ID,
      gradeId: gradeEight.id,
      appointedBy: schoolAdmin?.id ?? null,
    });
    if (added) console.log('  任命 gradeadmin 为八年级管理员');
    if (!gradeEight.gradeAdminId) {
      await grades.update(gradeEight.id, { gradeAdminId: gradeAdmin.id });
    }
  }

  for (const id of [schoolAdmin?.id, gradeAdmin?.id]) {
    if (id) await staff.recalcRole(id);
  }

  console.log('  演示组织：12 个年级 + 学校管理员 1 名 + 八年级管理员 1 名\n');
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

  const gradeEight = await ds
    .getRepository(Grade)
    .findOne({ where: { schoolId: SEED_SCHOOL_ID, name: '八年级' } });

  const rooms = ds.getRepository(ClassRoom);
  let room = await rooms.findOne({ where: { teacherId: teacher.id } });
  if (!room) {
    room = await rooms.save(
      rooms.create({
        schoolId: SEED_SCHOOL_ID,
        gradeId: gradeEight?.id ?? null,
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
  } else if (!room.gradeId && gradeEight) {
    await rooms.update(room.id, { gradeId: gradeEight.id });
  }

  // 年级管理员任命班级管理员（每班最多 2 名；教师可同时兼任年级管理员）
  const staff = app.get(StaffService);
  const appointed = await ensureAppointment(ds, {
    userId: teacher.id,
    role: StaffRole.CLASS_ADMIN,
    scopeId: room.id,
    schoolId: room.schoolId,
    gradeId: room.gradeId,
    classId: room.id,
  });
  if (appointed) console.log('  任命 teacher 为「八年级 2 班」班级管理员\n');
  await staff.recalcRole(teacher.id);

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